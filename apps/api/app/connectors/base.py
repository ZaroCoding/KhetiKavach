"""Every external call goes through `fetch_json` (CLAUDE.md hard rule 3).

Order of attempts: fresh cache -> upstream (timeout, one retry with backoff) -> last real cached
response -> raise SourceUnavailable. A source disabled in `source_switches` skips the upstream.
Each result carries provenance that flows unchanged to the API response and the UI.
"""

import asyncio
import hashlib
import json
import logging
import time
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any
from urllib.parse import urlencode

import httpx

from app import db

log = logging.getLogger("connectors")
_client: httpx.AsyncClient | None = None


class SourceUnavailable(RuntimeError):
    def __init__(self, source: str, reason: str):
        super().__init__(f"{source}: {reason}")
        self.source = source
        self.reason = reason


@dataclass
class FetchResult:
    source: str  # a SourceName
    data: Any
    status: str  # "live" | "cached"
    fetched_at: datetime
    request_url: str
    note: str | None = None
    fell_back_to_cache: bool = False


def client() -> httpx.AsyncClient:
    global _client
    if _client is None:
        _client = httpx.AsyncClient(
            headers={"User-Agent": "KhetKavach/1.0 (FORGE hackathon; non-commercial)"},
            follow_redirects=True,
        )
    return _client


def cache_key(source: str, url: str, params: dict[str, Any] | None, body: Any) -> str:
    canon = json.dumps(
        {"s": source, "u": url, "p": params or {}, "b": body}, sort_keys=True, default=str
    )
    return f"{source}:{hashlib.sha256(canon.encode()).hexdigest()}"


def display_url(url: str, params: dict[str, Any] | None) -> str:
    return f"{url}?{urlencode(params, doseq=True)}" if params else url


async def is_disabled(source: str) -> bool:
    try:
        row = await db.pool().fetchrow(
            "SELECT disabled FROM source_switches WHERE source=$1", source
        )
        return bool(row and row["disabled"])
    except Exception:
        return False


async def record_health(source: str, ok: bool, latency_ms: int, error: str | None = None) -> None:
    """Bookkeeping for /health. Never allowed to break a fetch."""
    try:
        if ok:
            await db.pool().execute(
                """INSERT INTO source_health(source, last_ok_at, last_latency_ms)
                   VALUES ($1, now(), $2)
                   ON CONFLICT (source) DO UPDATE SET last_ok_at = now(), last_latency_ms = $2""",
                source,
                latency_ms,
            )
        else:
            await db.pool().execute(
                """INSERT INTO source_health(source, last_error_at, last_error, last_latency_ms)
                   VALUES ($1, now(), $2, $3)
                   ON CONFLICT (source) DO UPDATE SET last_error_at = now(), last_error = $2,
                     last_latency_ms = $3""",
                source,
                (error or "")[:500],
                latency_ms,
            )
    except Exception:
        log.debug("source_health update skipped for %s", source)


async def _cached(key: str) -> Any:
    try:
        return await db.pool().fetchrow(
            "SELECT response, fetched_at, expires_at FROM api_cache WHERE key=$1", key
        )
    except Exception:
        return None


async def _store(key: str, source: str, payload: Any, ttl_s: int) -> None:
    try:
        await db.pool().execute(
            """INSERT INTO api_cache(key, source, response, fetched_at, expires_at)
               VALUES ($1, $2, $3, now(), now() + $4::interval)
               ON CONFLICT (key) DO UPDATE SET response = EXCLUDED.response,
                 fetched_at = now(), expires_at = EXCLUDED.expires_at""",
            key,
            source,
            payload,
            timedelta(seconds=ttl_s),
        )
    except Exception:
        log.debug("cache write skipped for %s", source)


async def fetch_json(
    source: str,
    url: str,
    *,
    params: dict[str, Any] | None = None,
    ttl_s: int = 3600,
    timeout_s: float = 8.0,
    method: str = "GET",
    json_body: Any = None,
    headers: dict[str, str] | None = None,
    cache_discriminator: str = "",
) -> FetchResult:
    key = cache_key(source + cache_discriminator, url, params, json_body)
    shown = display_url(url, params)
    cached = await _cached(key)
    now = datetime.now(UTC)
    if cached and cached["expires_at"] > now:
        return FetchResult(source, cached["response"], "cached", cached["fetched_at"], shown)

    if await is_disabled(source):
        if cached:
            return FetchResult(
                source,
                cached["response"],
                "cached",
                cached["fetched_at"],
                shown,
                note="source disabled by admin; serving last real response",
                fell_back_to_cache=True,
            )
        raise SourceUnavailable(source, "disabled by admin (kill switch)")

    last_error = ""
    for attempt in range(2):
        t0 = time.perf_counter()
        try:
            resp = await client().request(
                method, url, params=params, json=json_body, headers=headers, timeout=timeout_s
            )
            latency = int((time.perf_counter() - t0) * 1000)
            if resp.status_code == 429:
                raise httpx.HTTPStatusError(
                    "rate limited (429)", request=resp.request, response=resp
                )
            resp.raise_for_status()
            payload = resp.json()
            await record_health(source, True, latency)
            await _store(key, source, payload, ttl_s)
            return FetchResult(source, payload, "live", datetime.now(UTC), shown)
        except Exception as exc:  # timeout, HTTP error, invalid JSON
            latency = int((time.perf_counter() - t0) * 1000)
            last_error = f"{type(exc).__name__}: {exc}"[:300]
            await record_health(source, False, latency, last_error)
            if attempt == 0:
                await asyncio.sleep(0.6)

    if cached:
        return FetchResult(
            source,
            cached["response"],
            "cached",
            cached["fetched_at"],
            shown,
            note=f"upstream failed ({last_error}); serving last real response",
            fell_back_to_cache=True,
        )
    raise SourceUnavailable(source, last_error)


async def fetch_computed(
    source: str,
    key_parts: dict[str, Any],
    fn: Callable[[], Awaitable[Any]],
    *,
    ttl_s: int,
    timeout_s: float,
    request_url: str,
) -> FetchResult:
    """Same contract as fetch_json for sources read through an SDK (STAC + COG windows).

    `fn` performs the upstream work and returns JSON-serialisable data; its result is cached.
    """
    key = cache_key(source, request_url, key_parts, None)
    cached = await _cached(key)
    if cached and cached["expires_at"] > datetime.now(UTC):
        return FetchResult(source, cached["response"], "cached", cached["fetched_at"], request_url)
    if await is_disabled(source):
        if cached:
            return FetchResult(
                source,
                cached["response"],
                "cached",
                cached["fetched_at"],
                request_url,
                note="source disabled by admin; serving last real response",
                fell_back_to_cache=True,
            )
        raise SourceUnavailable(source, "disabled by admin (kill switch)")
    last_error = ""
    for attempt in range(2):
        t0 = time.perf_counter()
        try:
            data = await asyncio.wait_for(fn(), timeout=timeout_s)
            await record_health(source, True, int((time.perf_counter() - t0) * 1000))
            await _store(key, source, data, ttl_s)
            return FetchResult(source, data, "live", datetime.now(UTC), request_url)
        except Exception as exc:
            last_error = f"{type(exc).__name__}: {exc}"[:300]
            await record_health(source, False, int((time.perf_counter() - t0) * 1000), last_error)
            if attempt == 0:
                await asyncio.sleep(0.6)
    if cached:
        return FetchResult(
            source,
            cached["response"],
            "cached",
            cached["fetched_at"],
            request_url,
            note=f"upstream failed ({last_error}); serving last real response",
            fell_back_to_cache=True,
        )
    raise SourceUnavailable(source, last_error)
