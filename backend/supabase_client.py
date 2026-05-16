from supabase import create_client, Client
from config import settings

_supabase_client: Client | None = None


def get_supabase() -> Client:
    """Return a singleton Supabase client, creating it on first call."""
    global _supabase_client
    if _supabase_client is None:
        if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
            raise RuntimeError(
                "SUPABASE_URL and SUPABASE_ANON_KEY must be set in the environment."
            )
        _supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    return _supabase_client
