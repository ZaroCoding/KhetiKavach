"""Assessment schemas: POST /api/assessments, GET /api/assessments/{id}, Risk, PlanAction."""

from datetime import date, datetime
from enum import StrEnum
from typing import Annotated, Literal
from uuid import UUID

from pydantic import AfterValidator, BaseModel, Field

from app.schemas.common import DataFreshness, Evidence, Language, Source
from app.schemas.fields import today_utc

AS_OF_EARLIEST = date(2021, 1, 1)


def check_as_of(value: date | None) -> date | None:
    if value is None:
        return value
    if value < AS_OF_EARLIEST:
        raise ValueError("as_of must be on or after 2021-01-01")
    if value > today_utc():
        raise ValueError("as_of must not be in the future")
    return value


class AssessmentStatus(StrEnum):
    queued = "queued"
    running = "running"
    completed = "completed"
    completed_degraded = "completed_degraded"
    failed = "failed"


class AssessmentMode(StrEnum):
    live = "live"
    replay = "replay"


class Hazard(StrEnum):
    dry_spell = "dry_spell"
    heavy_rain = "heavy_rain"


class Severity(StrEnum):
    low = "low"
    moderate = "moderate"
    high = "high"
    severe = "severe"


class RiskMethod(StrEnum):
    ensemble = "ensemble"
    deterministic_replay = "deterministic_replay"


class AssessmentCreate(BaseModel):
    """Request body for POST /api/assessments. `as_of` omitted or null means live."""

    field_id: UUID
    as_of: Annotated[date | None, AfterValidator(check_as_of)] = None
    language: Language = Language.en


class AssessmentAccepted(BaseModel):
    assessment_id: UUID
    status: Literal["queued"]
    stream_url: str
    result_url: str


class MemberCount(BaseModel):
    total: int
    exceeding: int


class EnsembleMembers(BaseModel):
    """Per-model member counts. Shape pending [R-3]; null in deterministic_replay."""

    ecmwf: MemberCount | None
    gfs: MemberCount | None


class Threshold(BaseModel):
    description: str
    value: float
    unit: str


class Risk(BaseModel):
    hazard: Hazard
    probability: float | None = Field(ge=0, le=1)
    severity: Severity
    threshold: Threshold
    horizon_days: int
    crop_stage: str
    stage_weight: float
    method: RiskMethod
    members: EnsembleMembers | None
    driver_ids: list[str]
    uncertainty_note: str | None


class Citation(BaseModel):
    chunk_id: UUID
    doc_title: str
    page: int
    plan_year: int


class PlanAction(BaseModel):
    id: str
    when: date
    text: str
    language: Language
    citation: Citation
    numbers_used: list[float]


class AssessmentOut(BaseModel):
    id: UUID
    field_id: UUID
    status: AssessmentStatus
    mode: AssessmentMode
    as_of: date | None
    language: Language
    model_version: str | None
    created_at: datetime
    completed_at: datetime | None
    risks: list[Risk]
    evidence: list[Evidence]
    plan: list[PlanAction]
    sources: list[Source]
    data_freshness: DataFreshness
