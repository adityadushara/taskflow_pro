from flask import Blueprint, jsonify, request
from app.config import Config
from app.services.email_service import EmailService

health_bp = Blueprint("health", __name__)

@health_bp.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint to verify backend service status and optional diagnostics."""
    if request.args.get("diagnostics") == "1" or request.args.get("verbose") == "true":
        provider = EmailService.get_provider_name()
        smtp_user = Config.SMTP_USER or ""
        masked_user = (smtp_user[:2] + "***" + smtp_user[smtp_user.find("@"):]) if "@" in smtp_user else (bool(smtp_user))
        return jsonify({
            "status": "ok",
            "email": {
                "provider": provider,
                "configured": bool(
                    (provider in ("smtp", "gmail") and Config.SMTP_USER and Config.SMTP_PASSWORD) or
                    (provider == "gmail_webhook" and Config.GMAIL_WEBHOOK_URL)
                ),
                "smtp_host": Config.SMTP_HOST if provider in ("smtp", "gmail") else None,
                "smtp_user": masked_user if provider in ("smtp", "gmail") else None,
            }
        }), 200

    return jsonify({
        "status": "ok"
    }), 200

@health_bp.route("/health/email", methods=["GET"])
def health_email():
    """Diagnostic endpoint to inspect email delivery configuration."""
    provider = EmailService.get_provider_name()
    smtp_user = Config.SMTP_USER or ""
    masked_user = (smtp_user[:2] + "***" + smtp_user[smtp_user.find("@"):]) if "@" in smtp_user else (bool(smtp_user))
    return jsonify({
        "status": "ok",
        "provider": provider,
        "configured": bool(
            (provider == "gmail_webhook" and Config.GMAIL_WEBHOOK_URL) or
            (provider in ("smtp", "gmail") and Config.SMTP_USER and Config.SMTP_PASSWORD)
        ),
        "smtp_host": Config.SMTP_HOST if provider in ("smtp", "gmail") else None,
        "smtp_user": masked_user if provider in ("smtp", "gmail") else None,
    }), 200

@health_bp.route("/health/test-send", methods=["GET", "POST"])
def health_test_send():
    """Diagnostic endpoint to test email dispatch and return full network trace."""
    recipient = request.args.get("to") or Config.SMTP_USER or "drew34938@gmail.com"
    provider = EmailService.get_provider_name()
    try:
        success = EmailService._dispatch_email_sync(
            recipient=recipient,
            subject="Railway Test Email",
            body_text="Testing transactional email delivery from Hairdrama Tasks backend.",
            body_html="<p>Testing transactional email delivery from <strong>Hairdrama Tasks backend</strong>.</p>"
        )
        if success:
            return jsonify({
                "status": "sent",
                "provider": provider,
                "recipient": recipient
            }), 200
        else:
            return jsonify({
                "status": "failed",
                "provider": provider,
                "recipient": recipient,
                "error": EmailService.get_last_error() or "Email provider rejected or failed to deliver message"
            }), 500
    except Exception as e:
        import traceback
        return jsonify({
            "status": "error",
            "provider": provider,
            "recipient": recipient,
            "error_type": type(e).__name__,
            "error_message": str(e),
            "traceback": traceback.format_exc()
        }), 500
