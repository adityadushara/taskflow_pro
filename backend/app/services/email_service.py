import os
import smtplib
import logging
import threading
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formatdate, make_msgid, formataddr
from typing import Dict, Any, Optional
import requests
from app.config import Config
from app.services.email_templates import (
    render_welcome_email,
    render_task_created_email,
    render_task_completed_email,
    render_task_deleted_email,
)

logger = logging.getLogger(__name__)

class EmailService:
    """
    Decoupled transactional email notification service.
    Handles automated notifications for:
      1. Account creation (Welcome email with onboarding overview)
      2. Task creation (Task title, priority, due date, description)
      3. Task completion (Turnaround time, overdue/on-time analytics, metrics)
      4. Task deletion (Audit notice with task snapshot and deleter info)
      5. Task assignment (Delegate alerts)
    Isolates email delivery so transient network or sandbox restrictions never block database operations.
    Supports Resend API (HTML + Plaintext), SMTP, and clean console logging fallback.
    """

    @classmethod
    def get_provider_name(cls) -> str:
        provider = None
        try:
            from flask import has_app_context, current_app
            if has_app_context():
                provider = current_app.config.get("EMAIL_PROVIDER")
        except Exception:
            pass

        if not provider:
            provider = Config.EMAIL_PROVIDER or "none"

        provider = str(provider).strip().lower()
        if provider == "brevo":
            return "brevo"
        if provider == "resend":
            return "resend"
        if provider in ("smtp", "gmail", "google"):
            return "smtp"

        # Auto-detect Brevo if API key is provided
        brevo_key = getattr(Config, "BREVO_API_KEY", "") or os.getenv("BREVO_API_KEY", "")
        if brevo_key:
            return "brevo"

        # Auto-detect Resend if API key is provided
        resend_key = getattr(Config, "RESEND_API_KEY", "") or os.getenv("RESEND_API_KEY", "")
        if resend_key:
            return "resend"

        # Auto-detect SMTP if user and password are provided
        smtp_user = getattr(Config, "SMTP_USER", "") or os.getenv("SMTP_USER", "")
        smtp_pass = getattr(Config, "SMTP_PASSWORD", "") or os.getenv("SMTP_PASSWORD", "")
        if smtp_user and smtp_pass:
            return "smtp"

        return provider

    # --------------------------------------------------------------------------
    # 1. ACCOUNT CREATION / WELCOME EMAIL
    # --------------------------------------------------------------------------
    @classmethod
    def send_welcome_email(
        cls,
        user: Dict[str, Any],
        temporary_password: Optional[str] = None
    ) -> bool:
        """
        Sends a personalized, creative welcome email upon user account creation.
        """
        recipient_email = user.get("email")
        if not recipient_email:
            logger.warning("EmailService.send_welcome_email: No recipient email provided.")
            return False

        user_name = user.get("full_name") or user.get("name") or recipient_email.split("@")[0] or "there"
        subject = f"Welcome to Hairdrama Task Hub, {user_name}"

        html_content, text_content = render_welcome_email(
            user=user,
            frontend_url=Config.FRONTEND_URL,
            temporary_password=temporary_password
        )

        return cls._dispatch_email(
            recipient=recipient_email,
            subject=subject,
            body_text=text_content,
            body_html=html_content
        )

    # --------------------------------------------------------------------------
    # 2. TASK CREATED EMAIL
    # --------------------------------------------------------------------------
    @classmethod
    def send_task_created_email(
        cls,
        task: Dict[str, Any],
        creator: Dict[str, Any],
        assignee: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Notifies task creator (and assignee) of successful task creation with all details.
        """
        recipient_email = creator.get("email")
        if not recipient_email and creator.get("id"):
            try:
                from app.services.user_service import UserService
                user_p = UserService.get_user_by_id(creator["id"])
                if user_p:
                    recipient_email = user_p.get("email")
            except Exception:
                pass

        if not recipient_email:
            logger.warning(f"EmailService.send_task_created_email: No recipient email found for creator: {creator}")
            return False

        task_title = task.get("title", "Untitled Task")
        subject = f"Task Created: {task_title}"

        html_content, text_content = render_task_created_email(
            task=task,
            creator=creator,
            assignee=assignee,
            frontend_url=Config.FRONTEND_URL
        )

        return cls._dispatch_email(
            recipient=recipient_email,
            subject=subject,
            body_text=text_content,
            body_html=html_content
        )

    # --------------------------------------------------------------------------
    # 3. TASK ASSIGNED EMAIL
    # --------------------------------------------------------------------------
    @classmethod
    def send_task_assigned_email(
        cls,
        task: Dict[str, Any],
        assignee: Dict[str, Any],
        assigner: Dict[str, Any]
    ) -> bool:
        """
        Notifies an assignee when a task has been assigned or delegated to them.
        """
        recipient_email = assignee.get("email")
        if not recipient_email:
            logger.info("EmailService: No recipient email found for assignee.")
            return False

        assignee_name = assignee.get("full_name") or recipient_email.split("@")[0] or "there"
        assigner_name = assigner.get("full_name") or assigner.get("email", "").split("@")[0] or "A teammate"
        task_title = task.get("title", "Untitled Task")
        subject = f"Task Assigned: {task_title}"

        # Render styled task card for assignee
        html_content, text_content = render_task_created_email(
            task=task,
            creator=assigner,
            assignee=assignee,
            frontend_url=Config.FRONTEND_URL
        )

        return cls._dispatch_email(
            recipient=recipient_email,
            subject=subject,
            body_text=text_content,
            body_html=html_content
        )

    # --------------------------------------------------------------------------
    # 4. TASK COMPLETED EMAIL (WITH METRICS, TURNAROUND & OVERDUE AUDIT)
    # --------------------------------------------------------------------------
    @classmethod
    def send_task_completed_email(
        cls,
        task: Dict[str, Any],
        completed_by: Dict[str, Any],
        recipient: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Notifies stakeholders when a task is completed.
        Includes complete turnaround duration, overdue analysis, and performance scorecard.
        """
        if not recipient or not recipient.get("email"):
            return False

        recipient_email = recipient.get("email")
        task_title = task.get("title", "Untitled Task")
        subject = f"Task Completed: {task_title} (Performance Summary)"

        html_content, text_content = render_task_completed_email(
            task=task,
            completed_by=completed_by,
            recipient=recipient,
            frontend_url=Config.FRONTEND_URL
        )

        return cls._dispatch_email(
            recipient=recipient_email,
            subject=subject,
            body_text=text_content,
            body_html=html_content
        )

    # --------------------------------------------------------------------------
    # 5. TASK DELETED EMAIL
    # --------------------------------------------------------------------------
    @classmethod
    def send_task_deleted_email(
        cls,
        task: Dict[str, Any],
        deleted_by: Dict[str, Any],
        recipient: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Notifies creator and assignees when a task is permanently removed.
        Provides immutable snapshot and deleter details.
        """
        if not recipient or not recipient.get("email"):
            return False

        recipient_email = recipient.get("email")
        task_title = task.get("title", "Untitled Task")
        subject = f"Task Deleted: {task_title}"

        html_content, text_content = render_task_deleted_email(
            task=task,
            deleted_by=deleted_by,
            recipient=recipient,
            frontend_url=Config.FRONTEND_URL
        )

        return cls._dispatch_email(
            recipient=recipient_email,
            subject=subject,
            body_text=text_content,
            body_html=html_content
        )

    # --------------------------------------------------------------------------
    # DISPATCH LOGIC (RESEND / SMTP / CONSOLE)
    # --------------------------------------------------------------------------
    @classmethod
    def _dispatch_email(
        cls,
        recipient: str,
        subject: str,
        body_text: str,
        body_html: Optional[str] = None
    ) -> bool:
        """
        Dispatches email asynchronously in a daemon thread so the calling HTTP
        request responds instantly (sub-100ms) without blocking on SMTP or network latency.
        Runs synchronously in test mode to support mock assertions.
        """
        is_testing = getattr(Config, "TESTING", False) or os.getenv("FLASK_ENV") == "testing"
        try:
            from flask import has_app_context, current_app
            if has_app_context():
                is_testing = is_testing or current_app.config.get("TESTING", False)
        except Exception:
            pass

        if is_testing:
            return cls._dispatch_email_sync(recipient, subject, body_text, body_html)

        # Background daemon thread so HTTP response is returned immediately
        thread = threading.Thread(
            target=cls._dispatch_email_sync,
            args=(recipient, subject, body_text, body_html),
            daemon=True
        )
        thread.start()
        return True

    @classmethod
    def _dispatch_email_sync(
        cls,
        recipient: str,
        subject: str,
        body_text: str,
        body_html: Optional[str] = None
    ) -> bool:
        """
        Synchronous worker that connects to Resend or SMTP and sends the email.
        Catches all network and credential exceptions to ensure operations never crash.
        """
        provider = cls.get_provider_name()
        from_address = getattr(Config, "EMAIL_FROM", None) or os.getenv("EMAIL_FROM", "Hairdrama Tasks <onboarding@resend.dev>")

        try:
            # 1. Brevo (Sendinblue) REST API Integration (HTTPS port 443 - works on Railway)
            if provider == "brevo":
                api_key = getattr(Config, "BREVO_API_KEY", "") or os.getenv("BREVO_API_KEY", "")
                if not api_key:
                    logger.warning("EmailService: Brevo API key missing. Logging to console.")
                    return cls._log_mock_email(recipient, subject, body_text)

                sender_name = "Hairdrama Tasks"
                sender_email = "drew34938@gmail.com"
                if from_address:
                    if "<" in from_address and ">" in from_address:
                        sender_name = from_address.split("<")[0].strip() or "Hairdrama Tasks"
                        sender_email = from_address.split("<")[1].split(">")[0].strip()
                    elif "@" in from_address:
                        sender_email = from_address.strip()

                payload = {
                    "sender": {"name": sender_name, "email": sender_email},
                    "to": [{"email": recipient}],
                    "subject": subject,
                    "htmlContent": body_html or f"<p>{body_text}</p>",
                    "textContent": body_text,
                }

                res = requests.post(
                    "https://api.brevo.com/v3/smtp/email",
                    headers={
                        "api-key": api_key,
                        "Content-Type": "application/json",
                    },
                    json=payload,
                    timeout=10
                )

                if res.status_code in (200, 201):
                    res_data = res.json() if res.content else {}
                    msg_id = res_data.get("messageId", "ok")
                    print(f"[EMAIL SENT via Brevo] ID: {msg_id} | To: {recipient} | Subject: {subject}")
                    return True
                else:
                    error_msg = f"Brevo HTTP {res.status_code}: {res.text}"
                    cls._last_error = error_msg
                    print(f"[EmailService Brevo Error] {error_msg}")
                    return False

            # 2. Resend API Integration
            elif provider == "resend":
                api_key = Config.RESEND_API_KEY or os.getenv("RESEND_API_KEY", "")
                if not api_key:
                    logger.warning("EmailService: Resend API key missing. Logging to console.")
                    return cls._log_mock_email(recipient, subject, body_text)

                payload: Dict[str, Any] = {
                    "from": from_address,
                    "to": [recipient],
                    "subject": subject,
                    "text": body_text,
                }
                if body_html:
                    payload["html"] = body_html

                res = requests.post(
                    "https://api.resend.com/emails",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                    timeout=10
                )

                if res.status_code in (200, 201):
                    res_data = res.json() if res.content else {}
                    email_id = res_data.get("id", "ok")
                    logger.info(f"[EmailService Resend] ID: {email_id} | To: {recipient}")
                    try:
                        print(f"[EMAIL SENT via Resend] ID: {email_id} | To: {recipient} | Subject: {subject}")
                    except UnicodeEncodeError:
                        safe_subj = subject.encode("ascii", "replace").decode("ascii")
                        print(f"[EMAIL SENT via Resend] ID: {email_id} | To: {recipient} | Subject: {safe_subj}")
                    return True
                elif res.status_code == 403 and "testing emails" in res.text:
                    # Sandbox testing restriction notice: Resend only permits sending to account owner
                    import re
                    match = re.search(r"\(([^)]+@[^)]+)\)", res.text)
                    authorized_owner = match.group(1) if match else os.getenv("RESEND_DEV_FALLBACK_TO", "adityadusharaa@gmail.com")

                    if authorized_owner and recipient.strip().lower() != authorized_owner.strip().lower():
                        print(f"[Resend Sandbox] Recipient '{recipient}' blocked by test domain. Forwarding to verified owner '{authorized_owner}'...")
                        forward_subject = f"[Sandbox for {recipient}] {subject}"
                        banner = (
                            f"<div style='background-color:#fef3c7;border:1px solid #f59e0b;padding:14px 18px;margin-bottom:20px;border-radius:10px;font-size:13px;color:#92400e;line-height:1.5;'>"
                            f"⚠️ <strong>Resend Sandbox Notice:</strong> This notification was intended for <strong>{recipient}</strong>. "
                            f"Because <code>onboarding@resend.dev</code> is active, Resend requires domain verification to deliver to external addresses. "
                            f"It was delivered to your registered email (<code>{authorized_owner}</code>) for development preview.<br>"
                            f"<span style='font-size:11px;color:#b45309;'>To deliver directly to {recipient}, verify your domain at <a href='https://resend.com/domains' style='color:#b45309;font-weight:700;'>resend.com/domains</a>.</span>"
                            f"</div>"
                        )
                        forward_html = banner + (body_html or f"<p>{body_text}</p>")
                        forward_text = f"[Sandbox Notice: Originally destined for {recipient}]\n\n{body_text}"

                        retry_res = requests.post(
                            "https://api.resend.com/emails",
                            headers={
                                "Authorization": f"Bearer {api_key}",
                                "Content-Type": "application/json",
                            },
                            json={
                                "from": from_address,
                                "to": [authorized_owner],
                                "subject": forward_subject,
                                "text": forward_text,
                                "html": forward_html
                            },
                            timeout=10
                        )
                        if retry_res.status_code in (200, 201):
                            retry_data = retry_res.json() if retry_res.content else {}
                            print(f"[EMAIL SENT via Sandbox Forward] ID: {retry_data.get('id')} | Intended for: {recipient} -> Delivered to: {authorized_owner}")
                            return True

                    print(f"[Resend Sandbox Restriction] Delivery restricted to verified owner account. Notice: {res.text}")
                    return cls._log_mock_email(recipient, subject, body_text)
                else:
                    logger.warning(f"EmailService Resend response ({res.status_code}): {res.text}")
                    return cls._log_mock_email(recipient, subject, body_text)

            # 2. SMTP / Gmail Integration
            elif provider in ("smtp", "gmail"):
                host = getattr(Config, "SMTP_HOST", "smtp.gmail.com") or os.getenv("SMTP_HOST", "smtp.gmail.com")
                try:
                    port = int(getattr(Config, "SMTP_PORT", 587) or os.getenv("SMTP_PORT", 587))
                except (ValueError, TypeError):
                    port = 587
                user = (getattr(Config, "SMTP_USER", "") or os.getenv("SMTP_USER", "")).strip()
                raw_password = (getattr(Config, "SMTP_PASSWORD", "") or os.getenv("SMTP_PASSWORD", "")).strip()
                password = raw_password.replace(" ", "")
                from_email = from_address if (from_address and "onboarding@resend.dev" not in from_address) else f"Hairdrama Tasks <{user}>"

                if not user or not password:
                    logger.warning("EmailService: Gmail/SMTP credentials not provided in env. Logging to console.")
                    print("[EmailService Notice] SMTP credentials missing in environment variables. Check Railway / .env settings.")
                    return cls._log_mock_email(recipient, subject, body_text)

                msg = MIMEMultipart("alternative")
                # RFC 5322 Standard Headers
                msg["Date"] = formatdate(localtime=True)
                msg["Message-ID"] = make_msgid(domain="gmail.com")
                
                # RFC 2047 Encoded From and Reply-To
                sender_title = "Hairdrama Task Hub"
                msg["From"] = formataddr((sender_title, user))
                msg["Reply-To"] = formataddr((sender_title, user))
                msg["To"] = recipient
                msg["Subject"] = subject

                # Anti-Spam Transactional Identifiers
                msg["Auto-Submitted"] = "auto-generated"
                msg["X-Auto-Response-Suppress"] = "All"
                msg["Precedence"] = "bulk"

                # MIME alternative: plain text first, HTML second
                msg.attach(MIMEText(body_text, "plain", "utf-8"))
                if body_html:
                    msg.attach(MIMEText(body_html, "html", "utf-8"))

                sent = False
                try:
                    if port == 465:
                        with smtplib.SMTP_SSL(host, 465, timeout=12) as server:
                            server.login(user, password)
                            server.send_message(msg)
                            sent = True
                    else:
                        with smtplib.SMTP(host, port, timeout=12) as server:
                            server.starttls()
                            server.login(user, password)
                            server.send_message(msg)
                            sent = True
                except Exception as primary_err:
                    logger.warning(f"[SMTP] Port {port} connection attempt failed: {primary_err}. Attempting port 465 SSL fallback...")
                    try:
                        with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=12) as server:
                            server.login(user, password)
                            server.send_message(msg)
                            sent = True
                            logger.info("[SMTP] Successfully sent via port 465 SSL fallback.")
                    except Exception as fallback_err:
                        logger.error(f"[SMTP] Port 465 SSL fallback also failed: {fallback_err}")
                        raise primary_err

                if sent:
                    try:
                        print(f"[EMAIL SENT via Gmail/SMTP] To: {recipient} | Subject: {subject}")
                    except UnicodeEncodeError:
                        safe_subj = subject.encode("ascii", "replace").decode("ascii")
                        print(f"[EMAIL SENT via Gmail/SMTP] To: {recipient} | Subject: {safe_subj}")
                    return True

            # 3. Default Mock / Console Output
            else:
                return cls._log_mock_email(recipient, subject, body_text)

        except Exception as e:
            cls._last_error = str(e)
            logger.error(f"EmailService notice: {str(e)}")
            print(f"[EmailService Error] Delivery attempt failed: {e}")
            cls._log_mock_email(recipient, subject, body_text)
            return False

    @classmethod
    def get_last_error(cls) -> Optional[str]:
        """Returns the most recent error message encountered during email dispatch."""
        return getattr(cls, "_last_error", None)

    @classmethod
    def _log_mock_email(cls, recipient: str, subject: str, body: str) -> bool:
        """Clean console output for development and sandbox verification."""
        separator = "=" * 60
        try:
            print(f"\n{separator}\n[HAIRDRAMA EMAIL NOTIFICATION]\nTo: {recipient}\nSubject: {subject}\n\n{body}\n{separator}\n")
        except UnicodeEncodeError:
            safe_body = body.encode("ascii", "replace").decode("ascii")
            safe_subj = subject.encode("ascii", "replace").decode("ascii")
            print(f"\n{separator}\n[HAIRDRAMA EMAIL NOTIFICATION]\nTo: {recipient}\nSubject: {safe_subj}\n\n{safe_body}\n{separator}\n")
        logger.info(f"[EmailService Mock] Dispatched to {recipient} | {subject}")
        return True
