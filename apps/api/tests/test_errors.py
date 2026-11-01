"""Every non-2xx response uses the error envelope (CONTRACTS.md)."""

from fastapi.testclient import TestClient

from app.main import app


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
