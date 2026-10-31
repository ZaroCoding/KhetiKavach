"""Shared types from docs/CONTRACTS.md: SourceName, Evidence, Source, freshness, error envelope."""

from datetime import datetime
from enum import StrEnum
from typing import Any

from pydantic import (
    BaseModel,
    ConfigDict,
    JsonValue,
    model_serializer,
    model_validator,
)
from pydantic import (
    SerializerFunctionWrapHandler as _WrapHandler,
)


class SourceName(StrEnum):
    planetary_computer_s2 = "planetary_computer_s2"
    planetary_computer_s1 = "planetary_computer_s1"
    sentinel_hub = "sentinel_hub"
    open_meteo_ensemble = "open_meteo_ensemble"
    open_meteo_forecast = "open_meteo_forecast"
    open_meteo_archive = "open_meteo_archive"
    open_meteo_historical_forecast = "open_meteo_historical_forecast"
    imd_gridded = "imd_gridded"
    imd_api = "imd_api"
    nasa_power = "nasa_power"
    bhuvan = "bhuvan"
    gemini = "gemini"
    crida_plans = "crida_plans"
    esp32_sensor = "esp32_sensor"
    nominatim = "nominatim"


class EvidenceStatus(StrEnum):
    live = "live"
    cached = "cached"
    archived = "archived"
    unavailable = "unavailable"


class Language(StrEnum):
    en = "en"
    hi = "hi"
    pa = "pa"


class SeriesPoint(BaseModel):
    ts: datetime
    value: float


class Evidence(BaseModel):
    """A number the user sees, with provenance. Scalar or time series, never a placeholder.

    Exactly one of `value` / `series` is set, except when `status` is `unavailable`, where both
    are null. On the wire the unused key is omitted.
    """

    id: str
    variable: str
    value: float | None = None
    series: list[SeriesPoint] | None = None
    unit: str | None = None
    source: SourceName
    source_url: str | None = None
    fetched_at: datetime
    status: EvidenceStatus

    @model_validator(mode="after")
    def _value_or_series(self) -> "Evidence":
        has_value = self.value is not None
        has_series = self.series is not None
        if self.status is EvidenceStatus.unavailable:
            if has_value or has_series:
                raise ValueError("unavailable evidence must not carry a value or series")
        elif has_value == has_series:
            raise ValueError("evidence must carry exactly one of value or series")
        return self

    @model_serializer(mode="wrap")
    def _omit_unused_value_key(self, handler: _WrapHandler) -> dict[str, Any]:
        data: dict[str, Any] = handler(self)
        if self.series is not None:
            data.pop("value", None)
        else:
            data.pop("series", None)
        return data


class Source(BaseModel):
    name: SourceName
    url: str | None
    status: EvidenceStatus
    fetched_at: datetime
    attribution: str


class SourceFreshness(BaseModel):
    fetched_at: datetime
    status: EvidenceStatus


class DataFreshness(BaseModel):
    oldest_fetched_at: datetime | None
    newest_fetched_at: datetime | None
    per_source: dict[SourceName, SourceFreshness]


class FieldError(BaseModel):
    """One entry of a 422 `details` array."""

    field: str
    reason: str


class ErrorBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str
    message: str
    details: list[FieldError] | dict[str, JsonValue] | None = None


class ErrorEnvelope(BaseModel):
    """Body of every non-2xx JSON response except GET /health (CONTRACTS.md, error envelope)."""

    error: ErrorBody
