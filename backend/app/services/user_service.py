import uuid
from typing import Dict, Any, List, Optional
from app.utils.supabase_client import get_supabase_client

class UserService:
    @staticmethod
    def is_valid_uuid(val: str) -> bool:
        """Validate if a string is a valid UUID."""
        try:
            uuid.UUID(str(val))
            return True
        except (ValueError, AttributeError, TypeError):
            return False

    @classmethod
    def get_or_sync_profile(cls, current_user: Dict[str, Any]) -> Dict[str, Any]:
        """
        Retrieves user profile from the database, or inserts a new one if it does
        not yet exist (e.g. freshly authenticated via Google OAuth).
        """
        user_id = current_user.get("id")
        email = current_user.get("email", "")
        meta = current_user.get("user_metadata", {}) or {}
        full_name = meta.get("full_name") or meta.get("name") or email.split("@")[0]
        avatar_url = meta.get("avatar_url") or meta.get("picture") or ""

        supabase = get_supabase_client()
        res = supabase.table("profiles").select("*").eq("id", user_id).execute()

        if res.data and len(res.data) > 0:
            return res.data[0]

        # Insert new profile record
        new_profile = {
            "id": user_id,
            "email": email,
            "full_name": full_name,
            "avatar_url": avatar_url
        }
        insert_res = supabase.table("profiles").upsert(new_profile).execute()
        if insert_res.data and len(insert_res.data) > 0:
            return insert_res.data[0]
        return new_profile

    @classmethod
    def list_users(cls) -> List[Dict[str, Any]]:
        """
        Returns list of users available for task assignment.
        Only exposes safe public fields: id, email, full_name, avatar_url.
        """
        supabase = get_supabase_client()
        res = supabase.table("profiles").select("id, email, full_name, avatar_url").order("full_name").execute()
        return res.data or []

    @classmethod
    def search_users(cls, query: str) -> List[Dict[str, Any]]:
        """
        Searches users by email or full name safely.
        """
        clean_query = query.strip()
        if not clean_query:
            return cls.list_users()

        supabase = get_supabase_client()
        # ILIKE search with parameterization
        res = supabase.table("profiles").select("id, email, full_name, avatar_url")\
            .or_(f"email.ilike.%{clean_query}%,full_name.ilike.%{clean_query}%")\
            .limit(20)\
            .execute()
        return res.data or []

    @classmethod
    def get_user_by_id(cls, user_id: str) -> Optional[Dict[str, Any]]:
        """Look up user by UUID."""
        if not cls.is_valid_uuid(user_id):
            return None
        supabase = get_supabase_client()
        res = supabase.table("profiles").select("id, email, full_name, avatar_url").eq("id", user_id).execute()
        if res.data and len(res.data) > 0:
            return res.data[0]
        return None
