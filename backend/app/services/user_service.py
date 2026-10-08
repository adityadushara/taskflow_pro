import uuid
from typing import Dict, Any, List, Optional
from app.utils.supabase_client import get_supabase_client
from app.services.email_service import EmailService

class UserService:
    _WELCOMED_USER_IDS = set()

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
        Dispatches welcome email for newly created accounts.
        """
        user_id = current_user.get("id")
        email = current_user.get("email", "")
        meta = current_user.get("user_metadata", {}) or {}
        full_name = meta.get("full_name") or meta.get("name") or email.split("@")[0]
        avatar_url = meta.get("avatar_url") or meta.get("picture") or ""

        supabase = get_supabase_client()
        res = supabase.table("profiles").select("*").eq("id", user_id).execute()

        is_new_user = not res.data or len(res.data) == 0

        if not is_new_user:
            profile = res.data[0]
        else:
            # Insert new profile record
            new_profile = {
                "id": user_id,
                "email": email,
                "full_name": full_name,
                "avatar_url": avatar_url
            }
            insert_res = supabase.table("profiles").upsert(new_profile).execute()
            profile = insert_res.data[0] if (insert_res.data and len(insert_res.data) > 0) else new_profile

        # Dispatch welcome email once per user
        if is_new_user or (not meta.get("welcome_email_sent") and user_id not in cls._WELCOMED_USER_IDS):
            cls._WELCOMED_USER_IDS.add(user_id)
            try:
                EmailService.send_welcome_email(profile)
                if user_id:
                    supabase.auth.admin.update_user_by_id(
                        user_id,
                        {"user_metadata": {**meta, "welcome_email_sent": True}}
                    )
            except Exception as e:
                print(f"[UserService Notice] Welcome email dispatch notice: {e}")

        return profile

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

    @classmethod
    def get_user_by_email(cls, email: str) -> Optional[Dict[str, Any]]:
        """Look up user by email address."""
        clean_email = (email or "").strip().lower()
        if not clean_email:
            return None
        supabase = get_supabase_client()
        res = supabase.table("profiles").select("id, email, full_name, avatar_url").ilike("email", clean_email).execute()
        if res.data and len(res.data) > 0:
            return res.data[0]
        return None

    @classmethod
    def get_or_create_by_email(cls, email: str) -> Optional[Dict[str, Any]]:
        """
        Looks up user by email address. If user does not exist in the workspace,
        automatically provisions a new team account via Supabase Auth Admin.
        """
        clean_email = (email or "").strip().lower()
        if not clean_email or "@" not in clean_email:
            return None

        # 1. Existing user check
        existing = cls.get_user_by_email(clean_email)
        if existing:
            return existing

        supabase = get_supabase_client()

        # 2. Provision invited user account
        try:
            display_name = clean_email.split("@")[0].replace(".", " ").title()
            temp_password = f"Welcome_{uuid.uuid4().hex[:10]}!"
            auth_res = supabase.auth.admin.create_user({
                "email": clean_email,
                "password": temp_password,
                "email_confirm": True,
                "user_metadata": {
                    "full_name": display_name,
                    "avatar_url": "",
                    "welcome_email_sent": True
                }
            })
            if auth_res.user:
                user_id = str(auth_res.user.id)
                cls._WELCOMED_USER_IDS.add(user_id)
                
                # Check profile trigger created record
                res = supabase.table("profiles").select("id, email, full_name, avatar_url").eq("id", user_id).execute()
                new_user_dict = res.data[0] if (res.data and len(res.data) > 0) else {
                    "id": user_id,
                    "email": clean_email,
                    "full_name": display_name,
                    "avatar_url": ""
                }

                # Dispatch welcome onboarding email
                try:
                    EmailService.send_welcome_email(new_user_dict, temporary_password=temp_password)
                except Exception as email_err:
                    print(f"[UserService Notice] Failed to send welcome email to provisioned user: {email_err}")

                return new_user_dict
        except Exception as e:
            print(f"[UserService Notice] Provisioning user for {clean_email}: {e}")
            fallback = cls.get_user_by_email(clean_email)
            if fallback:
                return fallback

        return None

