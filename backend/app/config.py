import os
from dotenv import load_dotenv

# Load environment variables from .env if present
load_dotenv()

class Config:
    """Base configuration loaded from environment variables."""
    FLASK_ENV = os.getenv("FLASK_ENV", "development")
    PORT = int(os.getenv("PORT", 5000))
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
    
    # Supabase Configuration
    SUPABASE_URL = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")
    
    # Email Service Configuration
    EMAIL_PROVIDER = os.getenv("EMAIL_PROVIDER", "none")
    RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
    
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
