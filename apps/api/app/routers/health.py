"""GET /health (CONTRACTS.md): 200 when ok or degraded, 503 only when the database is down."""

import asyncio
import time
from importlib.metadata import PackageNotFoundError, version

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app import db
from app.risk import model as dry_model
from app.schemas import SOURCE_NAMES, DbHealth, HealthResponse, Latency, SourceHealth

router = APIRouter()

_CACHE_TTL_S = 10.0
_cached_body: HealthResponse | None = None
_cached_time: float = 0.0


def _package_version() -> str:
    try:
        return version("khetkavach-api")
    except PackageNotFoundError:
        return "unknown"


def _percentile(values: list[int], q: float) -> int | None:
    if not values:
        return None
    ordered = sorted(values)
    return ordered[min(len(ordered) - 1, round(q * (len(ordered) - 1)))]


@router.get("/health", response_model=HealthResponse)
async def health() -> JSONResponse:
    global _cached_body, _cached_time
    now = time.monotonic()
    if _cached_body is not None and (now - _cached_time) < _CACHE_TTL_S:
        return JSONResponse(
            _cached_body.model_dump(mode="json"),
            status_code=503 if _cached_body.db.status == "down" else 200,
        )

    metrics = dry_model.metrics()
    model_version = str(metrics["version"]) if metrics else None
    sources = {
        s: SourceHealth(status="unknown", last_latency_ms=None, last_ok_at=None, disabled=False)
        for s in SOURCE_NAMES
    }
    db_health = DbHealth(status="down", latency_ms=None)
    latency = Latency(p50_ms=None, p95_ms=None)
    if not db.is_connected():
        await db.init_pool()
    if db.is_connected():
        try:
            t0 = time.perf_counter()
            sources_query = """SELECT s.source, h.last_ok_at, h.last_error_at, h.last_latency_ms,
                                      COALESCE(w.disabled, false) AS disabled
                               FROM unnest($1::text[]) AS s(source)
                               LEFT JOIN source_health h ON h.source = s.source
                               LEFT JOIN source_switches w ON w.source = s.source"""
            durations_query = """
                SELECT (EXTRACT(EPOCH FROM (completed_at - created_at)) * 1000)::int AS ms
                FROM assessments WHERE status IN ('completed', 'completed_degraded')
                ORDER BY completed_at DESC LIMIT 10
            """
            rows, durations = await asyncio.gather(
                db.pool().fetch(sources_query, list(SOURCE_NAMES)),
                db.pool().fetch(durations_query),
            )
            db_health = DbHealth(status="ok", latency_ms=int((time.perf_counter() - t0) * 1000))
            for r in rows:
                ok, err = r["last_ok_at"], r["last_error_at"]
                status = "unknown"
                if ok and (not err or ok >= err):
                    status = "ok"
                elif err:
                    status = "degraded" if ok else "down"
                sources[r["source"]] = SourceHealth(
                    status=status,
                    last_latency_ms=r["last_latency_ms"],
                    last_ok_at=ok,
                    disabled=r["disabled"],
                )
            ms = [int(r["ms"]) for r in durations if r["ms"] is not None]
            latency = Latency(p50_ms=_percentile(ms, 0.5), p95_ms=_percentile(ms, 0.95))
        except Exception:
            db_health = DbHealth(status="down", latency_ms=None)
    degraded = db_health.status == "down" or any(
        v.status != "ok" or v.disabled for v in sources.values() if v.status != "unknown"
    )
    body = HealthResponse(
        status="degraded" if degraded else "ok",
        version=_package_version(),
        model_version=model_version,
        db=db_health,
        sources=sources,
        latency=latency,
    )
    _cached_body = body
    _cached_time = now
    return JSONResponse(
        body.model_dump(mode="json"), status_code=503 if db_health.status == "down" else 200
    )
