"""GET /health response (CONTRACTS.md, Q-18)."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.schemas.common import SourceName


class DbHealth(BaseModel):
    status: Literal["ok", "down"]
    latency_ms: int | None


class SourceHealth(BaseModel):
    status: Literal["ok", "degraded", "down", "unknown"]
    last_latency_ms: int | None
    last_ok_at: datetime | None
    disabled: bool


class LatencySummary(BaseModel):
    p50_ms: int | None
    p95_ms: int | None


class HealthOut(BaseModel):
    status: Literal["ok", "degraded"]
    version: str
    model_version: str | None
    db: DbHealth
    sources: dict[SourceName, SourceHealth]
    latency: LatencySummary
