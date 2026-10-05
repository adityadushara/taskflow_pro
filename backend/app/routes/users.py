from flask import Blueprint, request, g
from app.middleware.auth import require_auth
from app.services.user_service import UserService
from app.utils.responses import success_response, error_response

users_bp = Blueprint("users", __name__)

@users_bp.route("/me", methods=["GET"])
@require_auth
def get_current_user_profile():
    """
    GET /api/me
    Returns profile information for the authenticated user.
    """
    try:
        profile = UserService.get_or_sync_profile(g.current_user)
        return success_response(data=profile)
    except Exception as e:
        return error_response(
            code="PROFILE_FETCH_FAILED",
            message="Failed to retrieve user profile",
            status_code=500,
            details=str(e)
        )

@users_bp.route("/users", methods=["GET"])
@require_auth
def list_users():
    """
    GET /api/users
    Returns users available to be assigned tasks.
    """
    try:
        users = UserService.list_users()
        return success_response(data=users)
    except Exception as e:
        return error_response(
            code="USERS_FETCH_FAILED",
            message="Failed to list assignable users",
            status_code=500,
            details=str(e)
        )

@users_bp.route("/users/search", methods=["GET"])
@require_auth
def search_users():
    """
    GET /api/users/search?q=<query>
    Searches users by email or display name.
    """
    query = request.args.get("q", "").strip()
    try:
        users = UserService.search_users(query)
        return success_response(data=users)
    except Exception as e:
        return error_response(
            code="USER_SEARCH_FAILED",
            message="Failed to execute user search",
            status_code=500,
            details=str(e)
        )
