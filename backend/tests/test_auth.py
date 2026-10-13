from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_login_returns_token_for_valid_credentials():
    response = client.post(
        "/auth/login",
        json={
            "username": "admin",
            "password": "admin123",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["token_type"] == "bearer"
    assert "access_token" in payload
    assert payload["user"]["username"] == "admin"


def test_login_rejects_invalid_credentials():
    response = client.post(
        "/auth/login",
        json={
            "username": "admin",
            "password": "wrong-password",
        },
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid username or password."
