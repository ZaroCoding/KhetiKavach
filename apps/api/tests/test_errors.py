"""Every non-2xx response uses the error envelope (CONTRACTS.md, rulings B-22 and B-23).

The database is unreachable in tests, so only paths that fail before or without it are exercised
against the real app; the 500 and 503-from-asyncpg paths use a tiny app with the same handlers.
"""

import logging
from collections.abc import Iterator
from datetime import date, timedelta

import asyncpg
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app import errors, ratelimit
from app.errors import ApiError
from app.main import app
from app.ratelimit import RateLimiter

A_UUID = "00000000-0000-4000-8000-000000000001"  # test input: well-formed, no such field


@pytest.fixture(autouse=True)
def fresh_limits() -> Iterator[None]:
    ratelimit.reset_all()
    yield
    ratelimit.reset_all()


def _error(response_json: dict[str, object]) -> dict[str, object]:
    error = response_json["error"]
    assert isinstance(error, dict)
    return error


def test_validation_error_uses_envelope() -> None:
    with TestClient(app) as client:
        response = client.post("/api/fields", json={"crop": "banana"})
    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "VALIDATION_ERROR"
    assert isinstance(error["details"], list) and error["details"][0]["field"]


def test_unknown_assessment_id_is_404_envelope() -> None:
    with TestClient(app) as client:
        response = client.get("/api/assessments/not-a-uuid")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


def test_admin_requires_key() -> None:
    with TestClient(app) as client:
        response = client.get("/api/admin/sources")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"


def test_unknown_route_is_404_envelope() -> None:
    with TestClient(app) as client:
        response = client.get("/api/does-not-exist")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


def test_wrong_method_is_405_envelope() -> None:
    with TestClient(app) as client:
        response = client.delete("/api/fields")
    assert response.status_code == 405
    assert response.json()["error"]["code"] == "METHOD_NOT_ALLOWED"


def test_database_down_is_503_envelope() -> None:
    with TestClient(app) as client:
        response = client.get("/api/fields")
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "UPSTREAM_UNAVAILABLE"


def test_unknown_district_filter_is_422_with_field() -> None:
    with TestClient(app) as client:
        response = client.get("/api/fields", params={"district_code": "XX_NOWHERE"})
    assert response.status_code == 422
    details = _error(response.json())["details"]
    assert isinstance(details, list) and details[0]["field"] == "district_code"


def test_future_as_of_is_422_before_the_database_is_touched() -> None:
    tomorrow = (date.today() + timedelta(days=2)).isoformat()
    with TestClient(app) as client:
        response = client.post("/api/assessments", json={"field_id": A_UUID, "as_of": tomorrow})
    assert response.status_code == 422
    assert "future" in str(_error(response.json())["message"])


def test_as_of_before_2021_is_422() -> None:
    with TestClient(app) as client:
        response = client.post("/api/assessments", json={"field_id": A_UUID, "as_of": "2020-12-31"})
    assert response.status_code == 422
    assert "2021-01-01" in str(_error(response.json())["message"])


def test_non_uuid_field_id_is_404() -> None:
    with TestClient(app) as client:
        response = client.post("/api/assessments", json={"field_id": "abc"})
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


def test_short_geocode_query_is_422() -> None:
    with TestClient(app) as client:
        response = client.get("/api/geocode", params={"q": "a"})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_telegram_webhook_rejects_a_wrong_secret() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/api/telegram/webhook",
            json={},
            headers={"X-Telegram-Bot-Api-Secret-Token": "not-the-secret"},
        )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"


def test_monitor_job_requires_the_admin_key() -> None:
    with TestClient(app) as client:
        response = client.post("/api/jobs/monitor")
    assert response.status_code == 401


def test_sensor_reading_out_of_range_is_422() -> None:
    reading = {
        "device_id": "probe-1",
        "soil_moisture_pct": 140,  # test input: above 100 %
        "temp_c": 20,
        "rh_pct": 50,
        "ts": "2026-11-01T00:00:00Z",
    }
    with TestClient(app) as client:
        response = client.post("/api/sensors/ingest", json=reading)
    assert response.status_code == 422


# ---------------------------------------------------------------- 500 and database errors
def _failing_app() -> FastAPI:
    tiny = FastAPI()
    errors.install(tiny)

    @tiny.get("/boom")
    async def boom() -> None:
        raise RuntimeError("secret-token-in-message")

    @tiny.get("/lost")
    async def lost() -> None:
        raise asyncpg.PostgresConnectionError("connection lost")

    return tiny


def test_unhandled_error_is_500_envelope_without_leaking_the_message(
    caplog: pytest.LogCaptureFixture,
) -> None:
    with caplog.at_level(logging.INFO):
        response = TestClient(_failing_app(), raise_server_exceptions=False).get("/boom")
    assert response.status_code == 500
    assert _error(response.json())["code"] == "INTERNAL_ERROR"
    assert "secret-token-in-message" not in response.text
    assert "secret-token-in-message" not in caplog.text  # the log names the type and route only
    assert "RuntimeError" in caplog.text


def test_lost_database_connection_is_503_not_500() -> None:
    response = TestClient(_failing_app(), raise_server_exceptions=False).get("/lost")
    assert response.status_code == 503
    assert _error(response.json())["code"] == "UPSTREAM_UNAVAILABLE"


# ---------------------------------------------------------------- 429
def test_limiter_allows_the_limit_then_429_with_retry_after() -> None:
    limiter = RateLimiter(limit=3, window_s=60)
    for second in range(3):
        limiter.hit("client", now=float(second))
    with pytest.raises(ApiError) as caught:
        limiter.hit("client", now=3.0)
    assert caught.value.status == 429
    assert caught.value.code == "RATE_LIMITED"
    assert caught.value.headers == {"Retry-After": "58"}  # oldest hit at t=0 expires at t=60


def test_limiter_window_slides_and_clients_are_independent() -> None:
    limiter = RateLimiter(limit=1, window_s=10)
    limiter.hit("a", now=0.0)
    limiter.hit("b", now=0.0)  # another client has its own bucket
    with pytest.raises(ApiError):
        limiter.hit("a", now=9.0)
    limiter.hit("a", now=10.5)  # the first hit has left the window


def test_admin_route_returns_429_envelope_after_30_requests() -> None:
    with TestClient(app) as client:
        statuses = [client.get("/api/admin/sources").status_code for _ in range(31)]
        blocked = client.get("/api/admin/sources")
    assert statuses[:30] == [401] * 30  # no key: refused, but counted
    assert statuses[30] == 429
    assert blocked.status_code == 429
    assert _error(blocked.json())["code"] == "RATE_LIMITED"
    assert int(blocked.headers["Retry-After"]) >= 1
