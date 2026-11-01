"""Pydantic v2 models for every shape in docs/CONTRACTS.md (mirrored in apps/web/lib/types.ts)."""

from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

SourceName = Literal[
    "planetary_computer_s2",
    "planetary_computer_s1",
    "sentinel_hub",
    "open_meteo_ensemble",
    "open_meteo_forecast",
    "open_meteo_archive",
    "open_meteo_single_runs",
    "imd_gridded",
    "imd_api",
    "nasa_power",
    "bhuvan",
    "gemini",
    "groq",
    "crida_plans",
    "esp32_sensor",
    "nominatim",
]
SOURCE_NAMES: tuple[str, ...] = SourceName.__args__  # type: ignore[attr-defined]

Status = Literal["live", "cached", "archived", "unavailable"]
Crop = Literal["wheat", "rice", "cotton", "soybean"]
Language = Literal["en", "hi", "pa"]
Hazard = Literal["dry_spell", "heavy_rain", "harvest_rain"]
Severity = Literal["low", "moderate", "high", "severe", "unknown"]
Method = Literal["ensemble", "multi_model", "deterministic_replay", "model", "climatology"]
AssessmentStatus = Literal["queued", "running", "completed", "completed_degraded", "failed"]
EventName = Literal[
    "node_started",
    "tool_result",
    "gate_failed",
    "fallback_used",
    "verifier_rejected",
    "done",
    "error",
]
StepStatus = Literal["started", "succeeded", "failed", "retried", "skipped"]

ATTRIBUTION: dict[str, str] = {
    "planetary_computer_s2": (
        "Contains modified Copernicus Sentinel-2 data, via Microsoft Planetary Computer"
    ),
    "planetary_computer_s1": (
        "Contains modified Copernicus Sentinel-1 data, via Microsoft Planetary Computer"
    ),
    "sentinel_hub": (
        "Contains modified Copernicus Sentinel data, via Copernicus Data Space Ecosystem"
    ),
    "open_meteo_ensemble": "Weather data by Open-Meteo.com (CC BY 4.0); ECMWF and NOAA ensembles",
    "open_meteo_forecast": "Weather data by Open-Meteo.com (CC BY 4.0)",
    "open_meteo_archive": (
        "Weather data by Open-Meteo.com (CC BY 4.0); ERA5 / ERA5-Land, Copernicus"
    ),
    "open_meteo_single_runs": "Weather data by Open-Meteo.com (CC BY 4.0); archived ECMWF IFS runs",
    "imd_gridded": "IMD Pune 0.25 deg gridded rainfall (Pai et al. 2014), via imdlib",
    "imd_api": "India Meteorological Department",
    "nasa_power": "NASA POWER Project, NASA Langley Research Center",
    "bhuvan": "NRSC Bhuvan, ISRO",
    "gemini": "Plan wording by Google Gemini",
    "groq": "Plan wording by an open model hosted on Groq",
    "crida_plans": "ICAR-CRIDA District Agriculture Contingency Plans",
    "esp32_sensor": "In-field soil-moisture probe",
    "nominatim": "Boundaries and places © OpenStreetMap contributors (ODbL), via Nominatim",
}


# ------------------------------------------------------------------ shared types
class SeriesPoint(BaseModel):
    ts: datetime
    value: float


class Evidence(BaseModel):
    id: str
    variable: str
    value: float | None = None
    series: list[SeriesPoint] | None = None
    unit: str | None = None
    source: SourceName
    source_url: str | None = None
    fetched_at: datetime
    status: Status


class Threshold(BaseModel):
    description: str
    value: float
    unit: str


class MemberCount(BaseModel):
    total: int
    exceeding: int


class Members(BaseModel):
    ecmwf: MemberCount | None = None
    gfs: MemberCount | None = None


class Window(BaseModel):
    start: date
    end: date


class Risk(BaseModel):
    hazard: Hazard
    probability: float | None
    probability_ci90: tuple[float, float] | None = None
    climatology_probability: float | None = None
    severity: Severity
    threshold: Threshold
    horizon_days: int
    crop_stage: str
    stage_weight: float
    method: Method
    members: Members | None = None
    driver_ids: list[str] = []
    explanation: list[str] = []
    window: Window | None = None
    uncertainty_note: str | None = None


class Citation(BaseModel):
    chunk_id: str
    doc_title: str
    page: int
    plan_year: int


class PlanAction(BaseModel):
    id: str
    when: date
    text: str
    language: Language
    citation: Citation
    numbers_used: list[float] = []


class Source(BaseModel):
    name: SourceName
    url: str | None = None
    status: Status
    fetched_at: datetime
    attribution: str


class FreshnessItem(BaseModel):
    fetched_at: datetime
    status: Status


class DataFreshness(BaseModel):
    oldest_fetched_at: datetime | None = None
    newest_fetched_at: datetime | None = None
    per_source: dict[str, FreshnessItem] = {}


# ------------------------------------------------------------------ districts + fields
class District(BaseModel):
    code: str
    name: str
    state: str
    bbox: tuple[float, float, float, float] | None
    bbox_source: SourceName
    plan_title: str
    plan_year: int
    plan_chunks: int


class GeoJSONPolygon(BaseModel):
    type: Literal["Polygon"]
    coordinates: list[list[list[float]]]


class FieldCreate(BaseModel):
    name: str | None = Field(default=None, max_length=80)
    geometry: GeoJSONPolygon
    crop: Crop
    sowing_date: date
    district_code: str


class FieldOut(BaseModel):
    id: str
    short_code: str
    name: str | None
    geometry: dict[str, Any]
    crop: Crop
    sowing_date: date
    district_code: str
    created_at: datetime


class Place(BaseModel):
    name: str
    lat: float
    lon: float
    district: str | None


# ------------------------------------------------------------------ assessments
class AssessmentCreate(BaseModel):
    field_id: str
    as_of: date | None = None
    language: Language = "en"


class AssessmentAccepted(BaseModel):
    assessment_id: str
    status: AssessmentStatus
    stream_url: str
    result_url: str


class AssessmentOut(BaseModel):
    id: str
    field_id: str
    status: AssessmentStatus
    mode: Literal["live", "replay"]
    as_of: date | None
    language: Language
    model_version: str | None
    created_at: datetime
    completed_at: datetime | None
    risks: list[Risk] = []
    evidence: list[Evidence] = []
    plan: list[PlanAction] = []
    plan_summary: str | None = None
    plan_generator: Literal["llm", "rule_based", "none"] | None = None
    replay_basis: Literal["archived_forecast", "observed_rain_model"] | None = None
    sources: list[Source] = []
    data_freshness: DataFreshness


# ------------------------------------------------------------------ ops
class SensorReading(BaseModel):
    device_id: str
    soil_moisture_pct: float = Field(ge=0, le=100)
    temp_c: float = Field(ge=-20, le=70)
    rh_pct: float = Field(ge=0, le=100)
    ts: datetime


class MonitorRequest(BaseModel):
    field_ids: list[str] | None = None


class MonitorResult(BaseModel):
    checked: int
    alerted: int
    skipped: int
    errors: int


class AdminSource(BaseModel):
    source: SourceName
    disabled: bool
    updated_at: datetime | None


class DbHealth(BaseModel):
    status: Literal["ok", "down"]
    latency_ms: int | None


class SourceHealth(BaseModel):
    status: Literal["ok", "degraded", "down", "unknown"]
    last_latency_ms: int | None
    last_ok_at: datetime | None
    disabled: bool


class Latency(BaseModel):
    p50_ms: int | None
    p95_ms: int | None


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded"]
    version: str
    model_version: str | None
    db: DbHealth
    sources: dict[str, SourceHealth]
    latency: Latency
