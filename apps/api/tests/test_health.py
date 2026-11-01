"""With no database (as in CI), /health must report it down with HTTP 503, not crash."""

from fastapi.testclient import TestClient

from app.main import app


def test_health_reports_database_down_with_503() -> None:
    with TestClient(app) as client:
        response = client.get("/health")
    assert response.status_code == 503
    body = response.json()
    assert body["db"]["status"] == "down"
    assert body["status"] == "degraded"
    assert set(body["sources"]) >= {"open_meteo_ensemble", "sentinel_hub", "nominatim"}


def test_health_version_matches_package_metadata() -> None:
    from importlib.metadata import version

    with TestClient(app) as client:
        assert client.get("/health").json()["version"] == version("khetkavach-api")
