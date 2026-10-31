"""Remaining request and response schemas: geocode, sensors, Telegram, monitor job, admin, OK."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, JsonValue

from app.schemas.common import SourceName


class GeocodeResult(BaseModel):
    """Result item fields are provisional until [R-12] is ruled."""

    display_name: str
    lat: float
    lon: float


class SensorIngest(BaseModel):
    """P1 sensor reading. Header X-Device-Key is checked separately."""

    device_id: str
    soil_moisture_pct: float
    temp_c: float
    rh_pct: float
    ts: datetime


class ReceivedResponse(BaseModel):
    received: bool


class TelegramUpdate(BaseModel):
    """Subset of the Telegram Bot API Update object that the webhook reads."""

    model_config = ConfigDict(extra="allow")

    update_id: int
    message: dict[str, JsonValue] | None = None


class OkResponse(BaseModel):
    ok: bool


class MonitorRequest(BaseModel):
    field_ids: list[UUID] | None = None


class MonitorResult(BaseModel):
    checked: int
    alerted: int
    skipped: int
    errors: int


class AdminSourceItem(BaseModel):
    source: SourceName
    disabled: bool
    updated_at: datetime | None
