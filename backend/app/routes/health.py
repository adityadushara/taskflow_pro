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
                    (provider == "smtp" and Config.SMTP_USER and Config.SMTP_PASSWORD) or
                    (provider == "resend" and Config.RESEND_API_KEY)
                ),
                "smtp_host": Config.SMTP_HOST if provider == "smtp" else None,
                "smtp_user": masked_user if provider == "smtp" else None,
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
            (provider == "smtp" and Config.SMTP_USER and Config.SMTP_PASSWORD) or
            (provider == "resend" and Config.RESEND_API_KEY)
        ),
        "smtp_host": Config.SMTP_HOST if provider == "smtp" else None,
        "smtp_user": masked_user if provider == "smtp" else None,
    }), 200
