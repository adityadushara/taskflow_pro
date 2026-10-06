import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any, Optional
import requests
from app.config import Config

logger = logging.getLogger(__name__)

class EmailService:
    """
    Decoupled email notification service.
    Handles notifications for task creation, task assignment, and task completion.
    Isolates task execution so email issues never block or fail database operations.
    Supports Resend API, SMTP, or clean console logging.
    """

    @classmethod
    def get_provider_name(cls) -> str:
        provider = (Config.EMAIL_PROVIDER or "none").lower()
        if provider == "none" and Config.RESEND_API_KEY:
            return "resend"
        return provider

    @classmethod
    def send_task_created_email(
        cls,
        task: Dict[str, Any],
        creator: Dict[str, Any],
        assignee: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Notifies task creator of successful task creation.
        """
        recipient_email = creator.get("email")
        if not recipient_email:
            return False

        creator_name = creator.get("full_name") or creator.get("email", "").split("@")[0] or "there"
        assignee_label = (assignee.get("full_name") or assignee.get("email")) if assignee else "Unassigned"
        due_label = task.get("due_date") or "No deadline set"

        subject = f"[Hairdrama Task Manager] Task Created: {task.get('title')}"
        message = (
            f"Hello {creator_name},\n\n"
            f"Your new task has been successfully created in Hairdrama Task Hub:\n\n"
            f"• Title: {task.get('title')}\n"
            f"• Priority: {str(task.get('priority', 'medium')).upper()}\n"
            f"• Due Date: {due_label}\n"
            f"• Assignee: {assignee_label}\n\n"
            f"You can view, edit, or track progress directly in your workspace dashboard.\n"
        )

        return cls._dispatch_email(recipient_email, subject, message)

    @classmethod
    def send_task_assigned_email(
        cls,
        task: Dict[str, Any],
        assignee: Dict[str, Any],
        assigner: Dict[str, Any]
    ) -> bool:
        """
        Notifies an assignee when a task has been assigned to them.
        """
        recipient_email = assignee.get("email")
        if not recipient_email:
            logger.info("EmailService: No recipient email found for assignee.")
            return False

        assignee_name = assignee.get("full_name") or recipient_email.split("@")[0] or "there"
        assigner_name = assigner.get("full_name") or assigner.get("email", "").split("@")[0] or "A teammate"
        due_label = task.get("due_date") or "No deadline set"

        subject = f"[Hairdrama Task Manager] New Task Assigned: {task.get('title')}"
        message = (
            f"Hello {assignee_name},\n\n"
            f"{assigner_name} has assigned a new task to you in Hairdrama Task Hub:\n\n"
            f"• Title: {task.get('title')}\n"
            f"• Priority: {str(task.get('priority', 'medium')).upper()}\n"
            f"• Due Date: {due_label}\n\n"
            f"Log in to your dashboard to review and update this task.\n"
        )

        return cls._dispatch_email(recipient_email, subject, message)

    @classmethod
    def send_task_completed_email(
        cls,
        task: Dict[str, Any],
        completed_by: Dict[str, Any],
        recipient: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Notifies relevant stakeholders (creator/assignee) when a task is completed.
        """
        if not recipient or not recipient.get("email"):
            return False

        recipient_email = recipient.get("email")
        recipient_name = recipient.get("full_name") or recipient_email.split("@")[0] or "there"
        completer_name = completed_by.get("full_name") or completed_by.get("email", "").split("@")[0] or "A collaborator"

        subject = f"[Hairdrama Task Manager] Task Completed: {task.get('title')}"
        message = (
            f"Hello {recipient_name},\n\n"
            f"Great news! The task '{task.get('title')}' was marked as COMPLETED by {completer_name}.\n\n"
            f"• Task: {task.get('title')}\n"
            f"• Priority: {str(task.get('priority', 'medium')).upper()}\n"
            f"• Status: COMPLETED\n\n"
            f"Activity history has been permanently recorded in Hairdrama Task Hub.\n"
        )

        return cls._dispatch_email(recipient_email, subject, message)

    @classmethod
    def _dispatch_email(cls, recipient: str, subject: str, body: str) -> bool:
        """
        Safely dispatches the email via Resend, SMTP, or logs to console.
        Catches all network and credential exceptions to never crash task logic.
        """
        provider = cls.get_provider_name()
        try:
            # 1. Resend API Integration
            if provider == "resend" or (Config.RESEND_API_KEY and provider != "smtp"):
                api_key = Config.RESEND_API_KEY
                if not api_key:
                    logger.warning("EmailService: Resend API key missing. Logging to console.")
                    return cls._log_mock_email(recipient, subject, body)

                res = requests.post(
                    "https://api.resend.com/emails",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "from": os.getenv("EMAIL_FROM", "Hairdrama Tasks <onboarding@resend.dev>"),
                        "to": [recipient],
                        "subject": subject,
                        "text": body,
                    },
                    timeout=5
                )
                if res.status_code in (200, 201):
                    print(f"📧 [EMAIL SENT via Resend] To: {recipient} | Subject: {subject}")
                    return True
                else:
                    logger.warning(f"EmailService Resend response ({res.status_code}): {res.text}")
                    return cls._log_mock_email(recipient, subject, body)

            # 2. SMTP Integration (e.g. Gmail / SendGrid / Custom SMTP)
            elif provider == "smtp":
                host = os.getenv("SMTP_HOST", "smtp.gmail.com")
                port = int(os.getenv("SMTP_PORT", 587))
                user = os.getenv("SMTP_USER", "")
                password = os.getenv("SMTP_PASSWORD", "")
                from_email = os.getenv("EMAIL_FROM", user or "tasks@hairdrama.com")

                if not user or not password:
                    logger.warning("EmailService: SMTP credentials not provided. Logging to console.")
                    return cls._log_mock_email(recipient, subject, body)

                msg = MIMEMultipart()
                msg["From"] = from_email
                msg["To"] = recipient
                msg["Subject"] = subject
                msg.attach(MIMEText(body, "plain"))

                with smtplib.SMTP(host, port, timeout=5) as server:
                    server.starttls()
                    server.login(user, password)
                    server.send_message(msg)

                print(f"📧 [EMAIL SENT via SMTP] To: {recipient} | Subject: {subject}")
                return True

            # 3. Default Mock / Console Output
            else:
                return cls._log_mock_email(recipient, subject, body)

        except Exception as e:
            logger.error(f"EmailService: Notification delivery notice: {str(e)}")
            cls._log_mock_email(recipient, subject, body)
            return True

    @classmethod
    def _log_mock_email(cls, recipient: str, subject: str, body: str) -> bool:
        """Clean console output for development and verification."""
        separator = "=" * 60
        print(f"\n{separator}\n📧 [HAIRDRAMA EMAIL NOTIFICATION]\nTo: {recipient}\nSubject: {subject}\n\n{body}\n{separator}\n")
        logger.info(f"[EmailService Mock] Dispatched to {recipient} | {subject}")
        return True
