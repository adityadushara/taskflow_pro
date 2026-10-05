import os
from typing import Optional
from supabase import create_client, Client
from app.config import Config

_supabase_client: Optional[Client] = None

def get_supabase_client() -> Client:
    """
    Returns a singleton instance of the Supabase Admin client initialized
    with the service role key. This client has full administrative access
    to execute authorized database queries and verify JWTs.
    """
    global _supabase_client
    if _supabase_client is None:
        url = Config.SUPABASE_URL or os.getenv("SUPABASE_URL", "")
        key = Config.SUPABASE_SERVICE_ROLE_KEY or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
        
        if not url or not key:
            # Fallback placeholder for unit test environments where external Supabase is mocked
            url = url or "https://placeholder-project.supabase.co"
            key = key or "placeholder-service-role-key"
            
        _supabase_client = create_client(url, key)
    return _supabase_client

def reset_supabase_client_for_testing(mock_client=None):
    """Allows test fixtures to inject mock Supabase clients."""
    global _supabase_client
    _supabase_client = mock_client
