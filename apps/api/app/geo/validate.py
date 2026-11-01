"""Field polygon validation. Every failure carries a human-readable reason (HTTP 422)."""

from dataclasses import dataclass
from datetime import date
from typing import Any

from pyproj import Geod
from shapely.geometry import Polygon, shape
from shapely.validation import explain_validity

MAX_AREA_HA = 50.0
MIN_AREA_HA = 0.05
# Generous bounding box around India (mainland and islands) for the first, cheap check.
INDIA_BBOX = (68.0, 6.5, 97.5, 37.5)

_geod = Geod(ellps="WGS84")


class FieldValidationError(ValueError):
    def __init__(self, field: str, reason: str):
        super().__init__(reason)
        self.field = field
        self.reason = reason


@dataclass
class ValidPolygon:
    polygon: Polygon
    area_ha: float
    centroid_lat: float
    centroid_lon: float


def geodesic_area_ha(poly: Polygon) -> float:
    area_m2, _ = _geod.geometry_area_perimeter(poly)
    return float(abs(area_m2)) / 10_000.0


def validate_polygon(geojson: dict[str, Any]) -> ValidPolygon:
    try:
        poly = shape(geojson)
    except Exception as exc:
        raise FieldValidationError("geometry", f"geometry could not be parsed: {exc}") from exc
    if poly.geom_type != "Polygon":
        raise FieldValidationError("geometry", f"expected a Polygon, got {poly.geom_type}")
    if len(poly.exterior.coords) < 4:
        raise FieldValidationError("geometry", "polygon needs at least 3 distinct corners")
    if not poly.is_valid:
        raise FieldValidationError(
            "geometry",
            f"polygon is invalid ({explain_validity(poly)}); redraw it without crossing edges",
        )
    lon0, lat0, lon1, lat1 = poly.bounds
    b = INDIA_BBOX
    if lon0 < b[0] or lat0 < b[1] or lon1 > b[2] or lat1 > b[3]:
        raise FieldValidationError("geometry", "field lies outside India")
    area = geodesic_area_ha(poly)
    if area > MAX_AREA_HA:
        raise FieldValidationError(
            "geometry",
            f"field is {area:.1f} ha; the limit is {MAX_AREA_HA:.0f} ha (draw one field)",
        )
    if area < MIN_AREA_HA:
        raise FieldValidationError(
            "geometry", f"field is {area:.3f} ha; below the {MIN_AREA_HA} ha minimum"
        )
    c = poly.centroid
    return ValidPolygon(poly, area, float(c.y), float(c.x))


def check_in_district(
    v: ValidPolygon, bbox: tuple[float, float, float, float], district_name: str, all_names: str
) -> None:
    lon0, lat0, lon1, lat1 = bbox
    if not (lon0 <= v.centroid_lon <= lon1 and lat0 <= v.centroid_lat <= lat1):
        raise FieldValidationError(
            "district_code",
            f"field centre is outside {district_name} district; contingency plans are indexed "
            f"for {all_names} only",
        )


def validate_sowing_date(sowing: date, today: date) -> None:
    # Past seasons are allowed on purpose: Time Machine replays register 2023-2026 fields.
    if sowing > today:
        raise FieldValidationError("sowing_date", "sowing date is in the future")
    if sowing.year < 2017:
        raise FieldValidationError("sowing_date", "sowing date is before 2017 (Sentinel-2 history)")
