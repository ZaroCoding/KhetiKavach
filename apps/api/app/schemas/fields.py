"""Field and district schemas: GET /api/districts, POST/GET /api/fields (CONTRACTS.md)."""

from datetime import UTC, date, datetime
from enum import StrEnum
from typing import Annotated, Literal
from uuid import UUID

from pydantic import AfterValidator, BaseModel, Field, ValidationInfo, field_validator

from app.domain import DISTRICT_CODES, district_by_code
from app.geo import validate_field_polygon


class Crop(StrEnum):
    wheat = "wheat"
    rice = "rice"
    cotton = "cotton"
    soybean = "soybean"


class District(BaseModel):
    code: str
    name: str
    bbox: tuple[float, float, float, float] = Field(
        description="[min_lon, min_lat, max_lon, max_lat], WGS84"
    )


class PolygonGeometry(BaseModel):
    """GeoJSON Polygon, SRID 4326. Coordinates are [lon, lat] positions per ring."""

    type: Literal["Polygon"]
    coordinates: list[list[list[float]]]


def check_district_code(value: str) -> str:
    if value not in DISTRICT_CODES:
        raise ValueError(
            f"unknown district_code {value!r}; expected one of {', '.join(DISTRICT_CODES)}"
        )
    return value


DistrictCode = Annotated[str, AfterValidator(check_district_code)]


def today_utc() -> date:
    return datetime.now(UTC).date()


class FieldCreate(BaseModel):
    """Request body for POST /api/fields.

    Field order matters: `district_code` is validated before `geometry`, so the geometry
    validator can read it from `info.data` and apply the district bbox rule.
    """

    name: str | None = None
    district_code: DistrictCode
    geometry: PolygonGeometry
    crop: Crop
    sowing_date: date

    @field_validator("geometry")
    @classmethod
    def _polygon_rules(cls, geometry: PolygonGeometry, info: ValidationInfo) -> PolygonGeometry:
        code = info.data.get("district_code")
        district = district_by_code(code) if isinstance(code, str) else None
        try:
            validate_field_polygon(
                geometry.coordinates,
                district_name=district.name if district else None,
                district_bbox=district.bbox if district else None,
            )
        except ValueError as exc:
            raise ValueError(str(exc)) from exc
        return geometry

    @field_validator("sowing_date")
    @classmethod
    def _not_in_future(cls, value: date) -> date:
        if value > today_utc():
            raise ValueError("sowing_date must not be in the future")
        return value


class FieldOut(BaseModel):
    id: UUID
    short_code: str
    name: str | None
    geometry: PolygonGeometry
    crop: Crop
    sowing_date: date
    district_code: str
    created_at: datetime
