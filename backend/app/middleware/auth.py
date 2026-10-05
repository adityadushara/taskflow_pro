from functools import wraps
from flask import request, g, current_app
from app.utils.responses import error_response
from app.utils.supabase_client import get_supabase_client

def require_auth(f):
    """
    Decorator to protect Flask endpoints by validating Supabase JWT access tokens.
    Extracts Bearer token from the Authorization header and verifies it with Supabase Auth.
    Attaches current user dictionary to flask.g.current_user.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # 1. Allow simulated test users in testing environment if configured
        if current_app.config.get("TESTING") and request.headers.get("X-Test-User-Id"):
            g.current_user = {
                "id": request.headers.get("X-Test-User-Id"),
                "email": request.headers.get("X-Test-User-Email", "test@example.com"),
                "user_metadata": {
                    "full_name": request.headers.get("X-Test-User-Name", "Test User"),
                    "avatar_url": ""
                }
            }
            return f(*args, **kwargs)

        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return error_response(
                code="UNAUTHENTICATED",
                message="Authorization header missing. Please provide a valid Bearer token.",
                status_code=401
            )

        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            return error_response(
                code="UNAUTHENTICATED",
                message="Invalid Authorization header format. Expected 'Bearer <token>'.",
                status_code=401
            )

        access_token = parts[1]

        try:
            supabase = get_supabase_client()
            user_response = supabase.auth.get_user(access_token)
            
            if not user_response or not user_response.user:
                return error_response(
                    code="UNAUTHENTICATED",
                    message="Invalid or expired access token.",
                    status_code=401
                )
            
            user = user_response.user
            g.current_user = {
                "id": str(user.id),
                "email": user.email,
                "user_metadata": getattr(user, "user_metadata", {}) or {}
            }
        except Exception as e:
            # Mask detailed stack trace from client, log safely
            current_app.logger.warning(f"Auth verification failed: {str(e)}")
            return error_response(
                code="UNAUTHENTICATED",
                message="Authentication verification failed or session expired.",
                status_code=401
            )

        return f(*args, **kwargs)

    return decorated_function
