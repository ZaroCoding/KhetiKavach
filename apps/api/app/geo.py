"""Polygon checks for POST /api/fields: validity, India extent, district bbox, area.

Each check raises ValueError with a human-readable reason; the schema layer turns that into a 422.
"""

from pyproj import Geod
from shapely.geometry import Polygon, box
from shapely.validation import explain_validity

from app.domain import INDIA_BBOX, MAX_FIELD_AREA_HA

_INDIA = box(*INDIA_BBOX)
_GEOD = Geod(ellps="WGS84")
_SQUARE_METRES_PER_HECTARE = 10_000.0


def build_polygon(rings: list[list[list[float]]]) -> Polygon:
    """Build a shapely Polygon from GeoJSON rings of [lon, lat] positions."""
    if not rings:
        raise ValueError("polygon must have at least one ring")
    for ring in rings:
        if len(ring) < 4:
            raise ValueError("each polygon ring needs at least 4 positions (first equals last)")
        if any(len(position) != 2 for position in ring):
            raise ValueError("each polygon position must be [longitude, latitude]")
        if ring[0] != ring[-1]:
            raise ValueError("polygon ring is not closed: first and last positions differ")
    return Polygon(rings[0], rings[1:])


def polygon_area_ha(polygon: Polygon) -> float:
    """Geodesic area on the WGS84 ellipsoid, in hectares."""
    area_m2, _ = _GEOD.geometry_area_perimeter(polygon)
    return abs(area_m2) / _SQUARE_METRES_PER_HECTARE


def validate_field_polygon(
    rings: list[list[list[float]]],
    *,
    district_name: str | None,
    district_bbox: tuple[float, float, float, float] | None,
) -> None:
    """Run every geometry rule in the order the API reports them. Raises ValueError on the first."""
    polygon = build_polygon(rings)

    if not polygon.is_valid:
        raise ValueError(f"polygon is invalid or self-intersecting ({explain_validity(polygon)})")

    if not _INDIA.covers(polygon):
        raise ValueError("polygon lies outside India's bounding box")

    if district_bbox is not None and district_name is not None:
        min_lon, min_lat, max_lon, max_lat = district_bbox
        centroid = polygon.centroid
        if not (min_lon <= centroid.x <= max_lon and min_lat <= centroid.y <= max_lat):
            raise ValueError(
                f"polygon centroid lies outside the {district_name} district bounding box"
            )

    area_ha = polygon_area_ha(polygon)
    if area_ha > MAX_FIELD_AREA_HA:
        raise ValueError(f"polygon area is {area_ha:.2f} ha; the limit is {MAX_FIELD_AREA_HA:g} ha")
