"""Stub routes: input validation (422, 401, 404) and 501 with the contract error envelope.

Also checks that OpenAPI documents every stub's responses and the SSE event union.
"""

from datetime import UTC, date, datetime, timedelta
from typing import Any
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app

client = TestClient(app)

STUB_CALLS: list[tuple[str, str, dict[str, Any] | None, dict[str, str] | None]] = []


def _assert_501(response: Any) -> None:
    assert response.status_code == 501, response.text
    body = response.json()
    assert set(body) == {"error"}
    assert body["error"]["code"] == "NOT_IMPLEMENTED"
    assert isinstance(body["error"]["message"], str) and body["error"]["message"]


def test_districts_is_a_501_stub() -> None:
    _assert_501(client.get("/api/districts"))


@pytest.mark.parametrize("q", ["", "   "])
def test_geocode_rejects_empty_query_with_422(q: str) -> None:
    response = client.get("/api/geocode", params={"q": q})
    assert response.status_code == 422
    assert response.json()["error"]["details"][0]["field"] == "q"


def test_geocode_missing_query_is_422() -> None:
    response = client.get("/api/geocode")
    assert response.status_code == 422
    assert response.json()["error"]["details"][0]["field"] == "q"


def test_geocode_valid_query_is_501() -> None:
    _assert_501(client.get("/api/geocode", params={"q": "Khanna"}))


def test_assessment_future_as_of_is_422() -> None:
    tomorrow = datetime.now(UTC).date() + timedelta(days=1)
    response = client.post(
        "/api/assessments", json={"field_id": str(uuid4()), "as_of": tomorrow.isoformat()}
    )
    assert response.status_code == 422
    assert response.json()["error"]["details"][0]["field"] == "as_of"
    assert "not be in the future" in response.json()["error"]["details"][0]["reason"]


def test_assessment_as_of_before_2021_is_422() -> None:
    response = client.post(
        "/api/assessments", json={"field_id": str(uuid4()), "as_of": "2020-12-31"}
    )
    assert response.status_code == 422
    assert "2021-01-01" in response.json()["error"]["details"][0]["reason"]


def test_assessment_bad_language_is_422() -> None:
    response = client.post("/api/assessments", json={"field_id": str(uuid4()), "language": "fr"})
    assert response.status_code == 422
    assert response.json()["error"]["details"][0]["field"] == "language"


def test_assessment_valid_as_of_is_501() -> None:
    past = (datetime.now(UTC).date() - timedelta(days=7)).isoformat()
    response = client.post("/api/assessments", json={"field_id": str(uuid4()), "as_of": past})
    _assert_501(response)


def test_assessment_null_as_of_means_live_and_is_501() -> None:
    response = client.post("/api/assessments", json={"field_id": str(uuid4()), "as_of": None})
    _assert_501(response)


def test_assessment_card_non_uuid_id_is_404() -> None:
    response = client.get("/api/assessments/not-a-uuid")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


def test_assessment_card_valid_id_is_501() -> None:
    _assert_501(client.get(f"/api/assessments/{uuid4()}"))


def test_stream_non_uuid_id_is_404_json() -> None:
    response = client.get("/api/assessments/nope/stream")
    assert response.status_code == 404
    assert response.headers["content-type"].startswith("application/json")


def test_stream_valid_id_is_501() -> None:
    _assert_501(client.get(f"/api/assessments/{uuid4()}/stream"))


def test_sensor_ingest_without_device_key_is_401() -> None:
    body = {
        "device_id": "dev-1",
        "soil_moisture_pct": 0.0,
        "temp_c": 0.0,
        "rh_pct": 0.0,
        "ts": "2026-10-01T00:00:00Z",
    }
    response = client.post("/api/sensors/ingest", json=body)
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"


def test_sensor_ingest_bad_body_is_422_before_the_stub() -> None:
    response = client.post(
        "/api/sensors/ingest", json={"device_id": "dev-1"}, headers={"X-Device-Key": "k"}
    )
    assert response.status_code == 422


def test_telegram_wrong_secret_is_401(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(get_settings(), "telegram_webhook_secret", "expected-secret")
    response = client.post(
        "/api/telegram/webhook",
        json={"update_id": 1},
        headers={"X-Telegram-Bot-Api-Secret-Token": "wrong"},
    )
    assert response.status_code == 401


def test_telegram_unset_secret_rejects_everything(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(get_settings(), "telegram_webhook_secret", "")
    response = client.post(
        "/api/telegram/webhook",
        json={"update_id": 1},
        headers={"X-Telegram-Bot-Api-Secret-Token": ""},
    )
    assert response.status_code == 401


def test_telegram_correct_secret_reaches_the_stub(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(get_settings(), "telegram_webhook_secret", "expected-secret")
    response = client.post(
        "/api/telegram/webhook",
        json={"update_id": 1},
        headers={"X-Telegram-Bot-Api-Secret-Token": "expected-secret"},
    )
    _assert_501(response)


def test_monitor_without_admin_key_is_401() -> None:
    response = client.post("/api/jobs/monitor")
    assert response.status_code == 401


def test_monitor_wrong_admin_key_is_401(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(get_settings(), "admin_key", "real-admin-key")
    response = client.post("/api/jobs/monitor", headers={"X-Admin-Key": "wrong"})
    assert response.status_code == 401


def test_monitor_bad_field_id_is_422(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(get_settings(), "admin_key", "real-admin-key")
    response = client.post(
        "/api/jobs/monitor",
        json={"field_ids": ["not-a-uuid"]},
        headers={"X-Admin-Key": "real-admin-key"},
    )
    assert response.status_code == 422


def test_monitor_correct_admin_key_reaches_the_stub(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(get_settings(), "admin_key", "real-admin-key")
    response = client.post("/api/jobs/monitor", headers={"X-Admin-Key": "real-admin-key"})
    _assert_501(response)


def test_admin_disable_unknown_source_is_404(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(get_settings(), "admin_key", "real-admin-key")
    response = client.post(
        "/api/admin/sources/not_a_source/disable", headers={"X-Admin-Key": "real-admin-key"}
    )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


def test_admin_enable_known_source_reaches_the_stub(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(get_settings(), "admin_key", "real-admin-key")
    response = client.post(
        "/api/admin/sources/nominatim/enable", headers={"X-Admin-Key": "real-admin-key"}
    )
    _assert_501(response)


def test_admin_list_without_key_is_401() -> None:
    assert client.get("/api/admin/sources").status_code == 401


def test_openapi_documents_501_for_every_stub() -> None:
    schema = client.get("/openapi.json").json()
    stub_paths = [
        ("get", "/api/districts"),
        ("get", "/api/geocode"),
        ("post", "/api/fields"),
        ("get", "/api/fields"),
        ("post", "/api/assessments"),
        ("get", "/api/assessments/{assessment_id}"),
        ("get", "/api/assessments/{assessment_id}/stream"),
        ("post", "/api/sensors/ingest"),
        ("post", "/api/telegram/webhook"),
        ("post", "/api/jobs/monitor"),
        ("get", "/api/admin/sources"),
        ("post", "/api/admin/sources/{source}/disable"),
        ("post", "/api/admin/sources/{source}/enable"),
    ]
    for method, path in stub_paths:
        responses = schema["paths"][path][method]["responses"]
        assert "501" in responses, f"{method} {path} lacks a 501 response"
        assert responses["501"]["content"]["application/json"]["schema"] == {
            "$ref": "#/components/schemas/ErrorEnvelope"
        }


def test_openapi_422_is_the_error_envelope_not_fastapi_default() -> None:
    schema = client.get("/openapi.json").json()
    responses = schema["paths"]["/api/fields"]["post"]["responses"]
    assert responses["422"]["content"]["application/json"]["schema"] == {
        "$ref": "#/components/schemas/ErrorEnvelope"
    }


def test_openapi_publishes_the_sse_event_union() -> None:
    schema = client.get("/openapi.json").json()
    sse = schema["components"]["schemas"]["SseEvent"]
    assert sse["discriminator"]["propertyName"] == "event"
    assert len(sse["oneOf"]) == 7
    stream = schema["paths"]["/api/assessments/{assessment_id}/stream"]["get"]["responses"]["200"]
    assert "text/event-stream" in stream["content"]


def test_openapi_field_create_polygon_is_typed() -> None:
    schema = client.get("/openapi.json").json()
    polygon = schema["components"]["schemas"]["PolygonGeometry"]
    assert polygon["properties"]["type"]["const"] == "Polygon"


def test_as_of_helper_uses_utc_today() -> None:
    from app.schemas.assessments import check_as_of

    assert check_as_of(None) is None
    assert check_as_of(date(2021, 1, 1)) == date(2021, 1, 1)
