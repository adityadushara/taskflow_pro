import pytest
from app import create_app

@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client

def test_health_check(client):
    """Test that the /api/health endpoint returns 200 and status ok."""
    response = client.get("/api/health")
    assert response.status_code == 200
    json_data = response.get_json()
    assert json_data == {"status": "ok"}
