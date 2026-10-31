"""POST /api/fields: one test per 422 rule, plus the valid path (501 stub).

The polygons are test inputs (CLAUDE.md, logic-test inputs): small rings placed at real locations
inside the Ludhiana (PUNJAB5) and Dharwad (KA7) district bounding boxes.
"""

from datetime import UTC, datetime, timedelta
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

# Ludhiana city area, centred near 75.80E 30.90N. A 0.002 deg square is about 4 ha.
LUDHIANA_SMALL_SQUARE: list[list[list[float]]] = [
    [[75.800, 30.900], [75.802, 30.900], [75.802, 30.902], [75.800, 30.902], [75.800, 30.900]]
]

# A 0.007 deg square is about 52 ha, just over the 50 ha limit.
LUDHIANA_OVER_50_HA: list[list[list[float]]] = [
    [[75.800, 30.900], [75.807, 30.900], [75.807, 30.907], [75.800, 30.907], [75.800, 30.900]]
]

# Self-intersecting "bow tie": two edges cross at the middle.
BOWTIE_SELF_INTERSECTING: list[list[list[float]]] = [
    [[75.800, 30.900], [75.802, 30.902], [75.802, 30.900], [75.800, 30.902], [75.800, 30.900]]
]

# Not closed: the last position does not repeat the first.
RING_NOT_CLOSED: list[list[list[float]]] = [
    [[75.800, 30.900], [75.802, 30.900], [75.802, 30.902], [75.800, 30.902]]
]

# Inside India, but in Afghanistan's neighbourhood: outside the India extent.
OUTSIDE_INDIA: list[list[list[float]]] = [
    [[66.900, 33.000], [66.902, 33.000], [66.902, 33.002], [66.900, 33.002], [66.900, 33.000]]
]

# Dharwad (Karnataka) square, used against the Ludhiana district code.
DHARWAD_SQUARE: list[list[list[float]]] = [
    [[75.000, 15.400], [75.002, 15.400], [75.002, 15.402], [75.000, 15.402], [75.000, 15.400]]
]


def _body(
    *,
    coordinates: list[list[list[float]]] = LUDHIANA_SMALL_SQUARE,
    district_code: str = "PUNJAB5",
    crop: str = "wheat",
    sowing_date: str | None = None,
) -> dict[str, Any]:
    if sowing_date is None:
        sowing_date = (datetime.now(UTC).date() - timedelta(days=30)).isoformat()
    return {
        "name": "test field",
        "geometry": {"type": "Polygon", "coordinates": coordinates},
        "crop": crop,
        "sowing_date": sowing_date,
        "district_code": district_code,
    }


def _details_by_field(response: Any) -> dict[str, str]:
    body = response.json()
    assert body["error"]["code"] == "VALIDATION_ERROR"
    return {item["field"]: item["reason"] for item in body["error"]["details"]}


def _assert_422_on(response: Any, field: str, reason_fragment: str) -> None:
    assert response.status_code == 422, response.text
    reasons = _details_by_field(response)
    assert field in reasons, reasons
    assert reason_fragment in reasons[field], reasons[field]


def test_valid_field_passes_validation_and_reaches_the_stub() -> None:
    response = client.post("/api/fields", json=_body())
    assert response.status_code == 501
    assert response.json()["error"]["code"] == "NOT_IMPLEMENTED"


def test_self_intersecting_polygon_is_422() -> None:
    response = client.post("/api/fields", json=_body(coordinates=BOWTIE_SELF_INTERSECTING))
    _assert_422_on(response, "geometry", "self-intersecting")


def test_unclosed_ring_is_422() -> None:
    response = client.post("/api/fields", json=_body(coordinates=RING_NOT_CLOSED))
    _assert_422_on(response, "geometry", "not closed")


def test_polygon_outside_india_is_422() -> None:
    response = client.post("/api/fields", json=_body(coordinates=OUTSIDE_INDIA))
    _assert_422_on(response, "geometry", "outside India's bounding box")


def test_centroid_outside_selected_district_is_422() -> None:
    response = client.post(
        "/api/fields", json=_body(coordinates=DHARWAD_SQUARE, district_code="PUNJAB5")
    )
    _assert_422_on(response, "geometry", "outside the Ludhiana district bounding box")


def test_area_over_50_ha_is_422() -> None:
    response = client.post("/api/fields", json=_body(coordinates=LUDHIANA_OVER_50_HA))
    _assert_422_on(response, "geometry", "the limit is 50 ha")


def test_small_field_inside_district_is_accepted() -> None:
    response = client.post(
        "/api/fields", json=_body(coordinates=LUDHIANA_SMALL_SQUARE, district_code="PUNJAB5")
    )
    assert response.status_code == 501


def test_unknown_district_code_is_422() -> None:
    response = client.post("/api/fields", json=_body(district_code="ZZ9"))
    _assert_422_on(response, "district_code", "unknown district_code")


def test_future_sowing_date_is_422() -> None:
    tomorrow = (datetime.now(UTC).date() + timedelta(days=1)).isoformat()
    response = client.post("/api/fields", json=_body(sowing_date=tomorrow))
    _assert_422_on(response, "sowing_date", "must not be in the future")


def test_crop_outside_enum_is_422() -> None:
    response = client.post("/api/fields", json=_body(crop="maize"))
    _assert_422_on(response, "crop", "wheat")


def test_missing_required_fields_are_422_with_field_paths() -> None:
    response = client.post("/api/fields", json={"name": "no geometry"})
    assert response.status_code == 422
    fields = set(_details_by_field(response))
    assert {"geometry", "crop", "sowing_date", "district_code"} <= fields


@pytest.mark.parametrize(
    "path",
    ["/api/fields?district_code=ZZ9"],
)
def test_unknown_district_filter_on_list_is_422(path: str) -> None:
    response = client.get(path)
    _assert_422_on(response, "district_code", "unknown district_code")


def test_known_district_filter_on_list_reaches_the_stub() -> None:
    assert client.get("/api/fields?district_code=KA7").status_code == 501


def test_422_body_uses_the_error_envelope() -> None:
    response = client.post("/api/fields", json=_body(crop="maize"))
    assert set(response.json().keys()) == {"error"}
    assert set(response.json()["error"].keys()) == {"code", "message", "details"}
