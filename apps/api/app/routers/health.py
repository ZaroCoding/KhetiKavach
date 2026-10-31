"""GET /health (no /api prefix). Reports real database connectivity.

Returns 200 when the top-level status is ok or degraded, and 503 only when the database is down
(CONTRACTS.md, Q-18). Per-source health is not tracked yet, so every source reports `unknown`,
and the top-level status is `degraded` (the contract treats unknown as not ok).
"""

from importlib.metadata import PackageNotFoundError, version
from typing import Literal, cast

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.db import probe_database
from app.schemas.common import SourceName
from app.schemas.health import DbHealth, HealthOut, LatencySummary, SourceHealth

router = APIRouter(tags=["health"])


def _package_version() -> str:
    try:
        return version("khetkavach-api")
    except PackageNotFoundError:
        return "unknown"


@router.get(
    "/health",
    response_model=HealthOut,
    responses={503: {"model": HealthOut, "description": "Database is down"}},
    summary="Service, database and source health",
)
def health() -> HealthOut | JSONResponse:
    probe = probe_database(get_settings().database_url)
    sources = {
        name: SourceHealth(
            status="unknown",
            last_latency_ms=None,
            last_ok_at=None,
            disabled=name.value in probe.disabled_sources,
        )
        for name in SourceName
    }
    all_sources_ok = all(s.status == "ok" and not s.disabled for s in sources.values())
    top_status: Literal["ok", "degraded"] = "ok" if probe.ok and all_sources_ok else "degraded"
    body = HealthOut(
        status=top_status,
        version=_package_version(),
        model_version=None,
        db=DbHealth(status="ok" if probe.ok else "down", latency_ms=probe.latency_ms),
        sources=sources,
        latency=LatencySummary(p50_ms=None, p95_ms=None),
    )
    if not probe.ok:
        return JSONResponse(
            status_code=503, content=cast(dict[str, object], body.model_dump(mode="json"))
        )
    return body
