"""GET /health: real database connectivity (503 only when the database is down)."""

from importlib.metadata import version

import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app
from app.schemas.common import SourceName

client = TestClient(app)

UNREACHABLE_URL = "postgresql+psycopg://nobody:nothing@127.0.0.1:1/none"


def test_health_reports_database_down_with_503(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(get_settings(), "database_url", UNREACHABLE_URL)
    response = client.get("/health")
    assert response.status_code == 503
    body = response.json()
    assert body["status"] == "degraded"
    assert body["db"] == {"status": "down", "latency_ms": None}
    assert set(body["sources"]) == {s.value for s in SourceName}


def test_health_reports_unconfigured_database_as_down(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(get_settings(), "database_url", "")
    response = client.get("/health")
    assert response.status_code == 503
    assert response.json()["db"]["status"] == "down"


def test_health_version_matches_package_metadata(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(get_settings(), "database_url", UNREACHABLE_URL)
    assert client.get("/health").json()["version"] == version("khetkavach-api")


@pytest.mark.skipif(not get_settings().database_url, reason="DATABASE_URL not set")
def test_health_reports_database_ok_against_the_configured_database() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["db"]["status"] == "ok"
    assert isinstance(body["db"]["latency_ms"], int)
    assert body["status"] == "degraded"  # every source is unknown until source tracking exists
    assert all(item["status"] == "unknown" for item in body["sources"].values())
