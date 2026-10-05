import pytest
from unittest.mock import patch, MagicMock
from app import create_app

@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client

def test_missing_auth_header(client):
    """Endpoints requiring authentication return 401 when no token is supplied."""
    response = client.get("/api/me")
    assert response.status_code == 401
    json_data = response.get_json()
    assert json_data["success"] is False
    assert json_data["error"]["code"] == "UNAUTHENTICATED"

def test_invalid_auth_header_format(client):
    """Endpoints return 401 when Authorization header does not use Bearer scheme."""
    response = client.get("/api/me", headers={"Authorization": "Basic 12345"})
    assert response.status_code == 401
    json_data = response.get_json()
    assert json_data["success"] is False
    assert json_data["error"]["code"] == "UNAUTHENTICATED"

def test_authenticated_user_profile_sync(client):
    """Authenticated user profile is retrieved or synced correctly."""
    user_id = "11111111-1111-1111-1111-111111111111"
    headers = {
        "X-Test-User-Id": user_id,
        "X-Test-User-Email": "developer@example.com",
        "X-Test-User-Name": "Jane Developer"
    }

    mock_profile = {
        "id": user_id,
        "email": "developer@example.com",
        "full_name": "Jane Developer",
        "avatar_url": ""
    }

    with patch("app.services.user_service.UserService.get_or_sync_profile", return_value=mock_profile):
        response = client.get("/api/me", headers=headers)
        assert response.status_code == 200
        json_data = response.get_json()
        assert json_data["success"] is True
        assert json_data["data"]["id"] == user_id
        assert json_data["data"]["email"] == "developer@example.com"

def test_users_list_unauthenticated(client):
    """GET /api/users requires authentication."""
    response = client.get("/api/users")
    assert response.status_code == 401
