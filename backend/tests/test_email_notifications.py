import pytest
from unittest.mock import patch, MagicMock
from app import create_app
from app.config import Config
from app.services.email_service import EmailService
from app.services.email_templates import (
    calculate_task_performance,
    format_duration,
    render_welcome_email,
    render_task_created_email,
    render_task_completed_email,
    render_task_deleted_email,
)

class TestConfig(Config):
    TESTING = True
    EMAIL_PROVIDER = "resend"
    RESEND_API_KEY = "re_test_key_mock_12345"
    EMAIL_FROM = "Hairdrama Tasks <onboarding@resend.dev>"
    FRONTEND_URL = "http://localhost:3000"

@pytest.fixture
def app():
    app = create_app(TestConfig)
    return app

@pytest.fixture
def client(app):
    return app.test_client()

# ==============================================================================
# 1. Performance and Duration Calculation Tests
# ==============================================================================
def test_format_duration():
    assert format_duration(45) == "0 minutes"
    assert format_duration(120) == "2 minutes"
    assert format_duration(3660) == "1 hour, 1 minute"
    assert format_duration(90000) == "1 day, 1 hour"
    assert format_duration(180000) == "2 days, 2 hours"

def test_calculate_task_performance_on_time():
    created = "2026-10-06T10:00:00+00:00"
    completed = "2026-10-07T14:30:00+00:00"
    due = "2026-10-08T18:00:00+00:00"

    perf = calculate_task_performance(created, completed, due)
    assert perf["has_due_date"] is True
    assert perf["is_overdue"] is False
    assert "1 day, 4 hours" in perf["turnaround_str"]
    assert "ahead of deadline" in perf["schedule_summary"]
    assert perf["status_tag"] == "ON TIME"

def test_calculate_task_performance_overdue():
    created = "2026-10-01T09:00:00+00:00"
    completed = "2026-10-05T15:00:00+00:00"
    due = "2026-10-04T12:00:00+00:00"

    perf = calculate_task_performance(created, completed, due)
    assert perf["has_due_date"] is True
    assert perf["is_overdue"] is True
    assert "4 days, 6 hours" in perf["turnaround_str"]
    assert "Overdue by 1 day, 3 hours" in perf["schedule_summary"]
    assert perf["status_tag"] == "COMPLETED AFTER DEADLINE"

def test_calculate_task_performance_no_deadline():
    created = "2026-10-05T09:00:00+00:00"
    completed = "2026-10-05T10:15:00+00:00"

    perf = calculate_task_performance(created, completed, None)
    assert perf["has_due_date"] is False
    assert perf["is_overdue"] is False
    assert "1 hour, 15 minutes" in perf["turnaround_str"]
    assert "no fixed deadline" in perf["schedule_summary"]

# ==============================================================================
# 2. Template Rendering Tests
# ==============================================================================
def test_render_welcome_email():
    user = {
        "email": "sarah@example.com",
        "full_name": "Sarah Connor",
    }
    html_out, text_out = render_welcome_email(user, frontend_url="http://localhost:3000")
    assert "Sarah Connor" in html_out
    assert "Hairdrama Task Hub" in html_out
    assert "Launch Your Dashboard" in html_out
    assert "http://localhost:3000/dashboard" in html_out
    assert "Sarah Connor" in text_out

def test_render_task_created_email():
    task = {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "title": "Build Email Notifications",
        "description": "Integrate Resend transactional emails with templates.",
        "priority": "high",
        "due_date": "2026-10-15T18:00:00+00:00",
        "created_at": "2026-10-08T10:00:00+00:00"
    }
    creator = {"full_name": "Aditya", "email": "aditya@example.com"}
    assignee = {"full_name": "Dev", "email": "dev@example.com"}

    html_out, text_out = render_task_created_email(task, creator, assignee)
    assert "Build Email Notifications" in html_out
    assert "Integrate Resend transactional emails" in html_out
    assert "HIGH" in html_out
    assert "Aditya" in html_out
    assert "Dev" in html_out
    assert "Build Email Notifications" in text_out

def test_render_task_completed_email_with_turnaround_and_overdue():
    task = {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "title": "Database Optimization",
        "description": "Index composite keys on task_activity.",
        "priority": "urgent",
        "created_at": "2026-10-06T10:00:00+00:00",
        "completed_at": "2026-10-08T14:35:00+00:00",
        "due_date": "2026-10-07T12:00:00+00:00"  # Overdue by 1 day 2h 35m
    }
    completer = {"full_name": "Alex Tech", "email": "alex@example.com"}
    recipient = {"full_name": "Manager", "email": "manager@example.com"}

    html_out, text_out = render_task_completed_email(task, completer, recipient)
    assert "Database Optimization" in html_out
    assert "COMPLETED AFTER DEADLINE" in html_out
    assert "Time Needed to Complete" in html_out
    assert "2 days, 4 hours" in html_out
    assert "Alex Tech" in html_out
    assert "Database Optimization" in text_out
    assert "Overdue by 1 day, 2 hours" in text_out

def test_render_task_deleted_email():
    task = {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "title": "Deprecated Pipeline",
        "description": "Old cron job script.",
        "priority": "low",
        "status": "todo"
    }
    deleter = {"full_name": "Lead Admin", "email": "admin@example.com"}
    recipient = {"full_name": "Owner", "email": "owner@example.com"}

    html_out, text_out = render_task_deleted_email(task, deleter, recipient)
    assert "Deprecated Pipeline" in html_out
    assert "TASK DELETED" in html_out
    assert "Lead Admin" in html_out
    assert "Old cron job script" in html_out
    assert "Deprecated Pipeline" in text_out

# ==============================================================================
# 3. EmailService Dispatch Tests with Mock Resend
# ==============================================================================
@patch("requests.post")
def test_email_service_resend_dispatch(mock_post, app):
    mock_post.return_value = MagicMock(status_code=200, json=lambda: {"id": "resend_123"}, content=b"{}")

    with app.app_context():
        success = EmailService.send_welcome_email(
            user={"email": "tester@example.com", "full_name": "Tester"}
        )
        assert success is True
        assert mock_post.called
        call_kwargs = mock_post.call_args[1]
        payload = call_kwargs["json"]
        assert payload["to"] == ["tester@example.com"]
        assert "Welcome to Hairdrama Task Hub" in payload["subject"]
        assert "html" in payload
        assert "text" in payload

@patch("requests.post")
def test_email_service_resend_task_completed(mock_post, app):
    mock_post.return_value = MagicMock(status_code=200, json=lambda: {"id": "resend_456"}, content=b"{}")

    with app.app_context():
        task = {
            "id": "uuid-123",
            "title": "Frontend Redesign",
            "created_at": "2026-10-06T10:00:00+00:00",
            "completed_at": "2026-10-06T12:00:00+00:00",
            "due_date": "2026-10-07T12:00:00+00:00"
        }
        success = EmailService.send_task_completed_email(
            task=task,
            completed_by={"full_name": "Alex", "email": "alex@example.com"},
            recipient={"full_name": "Bob", "email": "bob@example.com"}
        )
        assert success is True
        assert mock_post.called
        payload = mock_post.call_args[1]["json"]
        assert payload["to"] == ["bob@example.com"]
        assert "Task Completed: Frontend Redesign" in payload["subject"]
        assert "2 hours" in payload["text"]

@patch("requests.post")
def test_email_service_resend_task_deleted(mock_post, app):
    mock_post.return_value = MagicMock(status_code=200, json=lambda: {"id": "resend_789"}, content=b"{}")

    with app.app_context():
        task = {
            "id": "uuid-999",
            "title": "Redundant Job",
            "status": "todo",
            "priority": "low"
        }
        success = EmailService.send_task_deleted_email(
            task=task,
            deleted_by={"full_name": "Admin", "email": "admin@example.com"},
            recipient={"full_name": "Owner", "email": "owner@example.com"}
        )
        assert success is True
        payload = mock_post.call_args[1]["json"]
        assert payload["to"] == ["owner@example.com"]
        assert "Task Deleted: Redundant Job" in payload["subject"]

@patch("requests.post")
def test_email_service_gmail_webhook_dispatch(mock_post):
    mock_post.return_value = MagicMock(status_code=200, json=lambda: {"status": "success"}, content=b'{"status":"success"}')

    class WebhookConfig(Config):
        TESTING = True
        EMAIL_PROVIDER = "gmail_webhook"
        GMAIL_WEBHOOK_URL = "https://script.google.com/macros/s/mock_test/exec"

    webhook_app = create_app(WebhookConfig)
    with webhook_app.app_context():
        success = EmailService.send_welcome_email(
            user={"email": "drew34938@gmail.com", "full_name": "Drew"}
        )
        assert success is True
        assert mock_post.called
        call_url = mock_post.call_args[0][0]
        call_kwargs = mock_post.call_args[1]
        assert call_url == "https://script.google.com/macros/s/mock_test/exec"
        payload = call_kwargs["json"]
        assert payload["to"] == "drew34938@gmail.com"
        assert "Welcome to Hairdrama Task Hub" in payload["subject"]
        assert "html" in payload
        assert "body" in payload

