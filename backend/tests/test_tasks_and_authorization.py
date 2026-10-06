import pytest
from unittest.mock import patch, MagicMock
from app import create_app

@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client

USER_1_ID = "11111111-1111-1111-1111-111111111111"
USER_2_ID = "22222222-2222-2222-2222-222222222222"
UNAUTHORIZED_USER_ID = "99999999-9999-9999-9999-999999999999"
TASK_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"

def auth_headers(user_id, email="user@example.com", name="Test User"):
    return {
        "X-Test-User-Id": user_id,
        "X-Test-User-Email": email,
        "X-Test-User-Name": name,
        "Content-Type": "application/json"
    }

def test_task_creation_valid(client):
    """User can successfully create a task."""
    payload = {
        "title": "Complete backend API",
        "description": "Write all routes and services",
        "priority": "high",
        "due_date": "2026-10-10T18:00:00Z"
    }
    mock_task = {
        "id": TASK_ID,
        "title": payload["title"],
        "description": payload["description"],
        "status": "todo",
        "priority": "high",
        "created_by": USER_1_ID,
        "assigned_to": None,
        "due_date": payload["due_date"],
        "created_at": "2026-10-05T20:00:00Z"
    }

    with patch("app.services.task_service.TaskService.create_task", return_value=(mock_task, None)):
        response = client.post("/api/tasks", json=payload, headers=auth_headers(USER_1_ID))
        assert response.status_code == 201
        data = response.get_json()
        assert data["success"] is True
        assert data["data"]["title"] == "Complete backend API"

def test_task_creation_invalid_title(client):
    """Validation fails if title is empty."""
    payload = {"title": "   ", "priority": "high"}
    response = client.post("/api/tasks", json=payload, headers=auth_headers(USER_1_ID))
    assert response.status_code == 400
    data = response.get_json()
    assert data["success"] is False
    assert data["error"]["code"] == "VALIDATION_ERROR"

def test_task_creation_invalid_priority(client):
    """Validation fails if priority is not one of low/medium/high/urgent."""
    payload = {"title": "Test Task", "priority": "super-urgent"}
    response = client.post("/api/tasks", json=payload, headers=auth_headers(USER_1_ID))
    assert response.status_code == 400
    data = response.get_json()
    assert data["success"] is False
    assert data["error"]["code"] == "VALIDATION_ERROR"

def test_task_retrieval_invalid_id(client):
    """Invalid UUID format returns 400."""
    response = client.get("/api/tasks/not-a-valid-uuid", headers=auth_headers(USER_1_ID))
    assert response.status_code == 400
    data = response.get_json()
    assert data["error"]["code"] == "INVALID_ID"

def test_unauthorized_task_access(client):
    """User who is neither creator nor assignee cannot access task (403)."""
    with patch("app.services.task_service.TaskService.get_task", return_value=(None, {"code": "FORBIDDEN", "message": "You are not authorized to view this task."})):
        response = client.get(f"/api/tasks/{TASK_ID}", headers=auth_headers(UNAUTHORIZED_USER_ID))
        assert response.status_code == 403
        data = response.get_json()
        assert data["error"]["code"] == "FORBIDDEN"

def test_task_update_assignee_only_status(client):
    """Assignee trying to edit title/description is rejected with 403."""
    with patch("app.services.task_service.TaskService.update_task", return_value=(None, {
        "code": "FORBIDDEN",
        "message": "Assignees are only permitted to update task status."
    })):
        response = client.patch(
            f"/api/tasks/{TASK_ID}",
            json={"title": "Hacked Title"},
            headers=auth_headers(USER_2_ID)
        )
        assert response.status_code == 403
        data = response.get_json()
        assert data["error"]["code"] == "FORBIDDEN"

def test_task_complete(client):
    """Task completion marks status completed."""
    completed_task = {
        "id": TASK_ID,
        "status": "completed",
        "completed_at": "2026-10-05T20:30:00Z"
    }
    with patch("app.services.task_service.TaskService.complete_task", return_value=(completed_task, None)):
        response = client.post(f"/api/tasks/{TASK_ID}/complete", headers=auth_headers(USER_1_ID))
        assert response.status_code == 200
        data = response.get_json()
        assert data["data"]["status"] == "completed"

def test_task_deletion_unauthorized(client):
    """Non-creator attempting to delete task receives 403."""
    with patch("app.services.task_service.TaskService.delete_task", return_value=(False, {
        "code": "FORBIDDEN",
        "message": "Only the task creator can delete this task."
    })):
        response = client.delete(f"/api/tasks/{TASK_ID}", headers=auth_headers(USER_2_ID))
        assert response.status_code == 403
        data = response.get_json()
        assert data["error"]["code"] == "FORBIDDEN"

def test_task_assignment_to_nonexistent_user(client):
    """Assigning to non-existent user returns 404."""
    with patch("app.services.user_service.UserService.get_user_by_id", return_value=None):
        payload = {
            "title": "Task with invalid assignee",
            "priority": "medium",
            "assigned_to": "33333333-3333-3333-3333-333333333333"
        }
        response = client.post("/api/tasks", json=payload, headers=auth_headers(USER_1_ID))
        assert response.status_code == 404
        data = response.get_json()
        assert data["error"]["code"] == "USER_NOT_FOUND"

def test_task_creation_with_assignee_email(client):
    """User can assign task directly using email address."""
    mock_assignee = {
        "id": USER_2_ID,
        "email": "sarah.jenkins@hairdrama.com",
        "full_name": "Sarah Jenkins",
        "avatar_url": ""
    }
    with patch("app.services.user_service.UserService.get_or_create_by_email", return_value=mock_assignee), \
         patch("app.services.task_service.get_supabase_client") as mock_supabase, \
         patch("app.services.task_service.TaskService.log_activity"), \
         patch("app.services.email_service.EmailService.send_task_assigned_email"):

        mock_supabase.return_value.table.return_value.insert.return_value.execute.return_value.data = [{
            "id": TASK_ID,
            "title": "Brand UI Refresh",
            "priority": "high",
            "status": "todo",
            "created_by": USER_1_ID,
            "assigned_to": USER_2_ID
        }]

        payload = {
            "title": "Brand UI Refresh",
            "priority": "high",
            "assigned_to_email": "sarah.jenkins@hairdrama.com"
        }
        response = client.post("/api/tasks", json=payload, headers=auth_headers(USER_1_ID))
        assert response.status_code == 201
        data = response.get_json()
        assert data["success"] is True
        assert data["data"]["assigned_to"] == USER_2_ID

