"""OpenStreetMap Nominatim: district bounding boxes and place search (rulings B-1, B-12).

Usage policy: at most 1 request per second and an identifying User-Agent; responses are cached
(boundaries for a year, place searches for 30 days), so normal use stays far below the limit.
"""

from typing import Any

from app.config import get_settings
from app.connectors.base import FetchResult, fetch_json

SEARCH_URL = "https://nominatim.openstreetmap.org/search"


async def district_bbox(query: str) -> tuple[tuple[float, float, float, float], FetchResult]:
    """Return (min_lon, min_lat, max_lon, max_lat) of the best administrative match."""
    params = {"q": query, "format": "jsonv2", "countrycodes": "in", "limit": 3}
    res = await fetch_json(
        "nominatim",
        SEARCH_URL,
        params=params,
        ttl_s=365 * 86400,
        timeout_s=get_settings().weather_timeout_s,
    )
    rows: list[dict[str, Any]] = res.data
    admin = [r for r in rows if r.get("category") == "boundary" or r.get("class") == "boundary"]
    candidates = admin or rows
    if not candidates:
        raise LookupError(f"no boundary found for {query!r}")
    best = candidates[0]
    south, north, west, east = (float(v) for v in best["boundingbox"])
    return (west, south, east, north), res


async def search_places(text: str) -> tuple[list[dict[str, Any]], FetchResult]:
    params = {"q": text, "format": "jsonv2", "countrycodes": "in", "limit": 5, "addressdetails": 1}
    res = await fetch_json(
        "nominatim",
        SEARCH_URL,
        params=params,
        ttl_s=30 * 86400,
        timeout_s=get_settings().weather_timeout_s,
    )
    out = []
    for r in res.data:
        addr = r.get("address", {})
        out.append(
            {
                "name": r.get("display_name", ""),
                "lat": float(r["lat"]),
                "lon": float(r["lon"]),
                "district": addr.get("state_district") or addr.get("county"),
            }
        )
    return out, res
