import uuid

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def unique_username(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


def get_admin_headers():
    login = client.post(
        "/auth/login",
        json={
            "username": "admin",
            "password": "admin123",
        },
    )
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_admin_can_fetch_users():
    response = client.get("/users", headers=get_admin_headers())

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert any(item["username"] == "admin" for item in data)


def test_non_admin_user_cannot_create_users():
    manager_username = unique_username("manager")
    viewer_username = unique_username("viewer")
    admin_headers = get_admin_headers()

    create_response = client.post(
        "/users",
        headers=admin_headers,
        json={
            "username": manager_username,
            "password": "manager123",
            "role": "manager",
        },
    )

    assert create_response.status_code == 201

    manager_login = client.post(
        "/auth/login",
        json={
            "username": manager_username,
            "password": "manager123",
        },
    )
    manager_token = manager_login.json()["access_token"]

    forbidded_response = client.post(
        "/users",
        headers={"Authorization": f"Bearer {manager_token}"},
        json={
            "username": viewer_username,
            "password": "viewer123",
            "role": "viewer",
        },
    )

    assert forbidded_response.status_code == 403
