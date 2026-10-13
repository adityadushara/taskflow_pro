import os
from dotenv import load_dotenv

# Load environment variables from .env if present
load_dotenv()

class Config:
    """Base configuration loaded from environment variables."""
    FLASK_ENV = os.getenv("FLASK_ENV", "development")
    # Safe port parsing
    try:
        PORT = int(os.getenv("PORT") or 5000)
    except (ValueError, TypeError):
        PORT = 5000

    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
    
    # Supabase Configuration
    SUPABASE_URL = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")
    
    # Email Service Configuration (Direct Gmail Integration)
    EMAIL_PROVIDER = os.getenv("EMAIL_PROVIDER", "gmail")
    GMAIL_WEBHOOK_URL = os.getenv("GMAIL_WEBHOOK_URL", "")
    EMAIL_FROM = os.getenv("EMAIL_FROM", "Hairdrama Tasks <drew34938@gmail.com>")
    
    # SMTP / Gmail Service Configuration
    SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
    try:
        SMTP_PORT = int(os.getenv("SMTP_PORT") or 587)
    except (ValueError, TypeError):
        SMTP_PORT = 587
    SMTP_USER = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
    
    @classmethod
    def validate(cls):
        """Validate critical configuration settings in production."""
        if cls.FLASK_ENV == "production":
            missing = []
            if not cls.SUPABASE_URL:
                missing.append("SUPABASE_URL")
            if not cls.SUPABASE_SERVICE_ROLE_KEY:
                missing.append("SUPABASE_SERVICE_ROLE_KEY")
            if missing:
                raise ValueError(f"Missing required environment variables: {', '.join(missing)}")
