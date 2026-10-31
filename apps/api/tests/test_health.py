from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_reports_ok_and_unknown_db() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["db"] == "unknown"
    assert isinstance(body["version"], str) and body["version"]


def test_health_version_matches_package_metadata() -> None:
    from importlib.metadata import version

    assert client.get("/health").json()["version"] == version("khetkavach-api")
