"""
Supabase Service — Supabase client for auth, chat storage, and audit logging.

Uses lazy import so the module loads cleanly even when the supabase
package is not installed in the local dev environment.
"""

from __future__ import annotations

from app.config import settings
import logging
from typing import TYPE_CHECKING, Optional, Any

if TYPE_CHECKING:
    from supabase import Client

logger = logging.getLogger(__name__)

# Lazy import — supabase client only needed when SUPABASE_URL is configured
_supabase_client: Optional[Any] = None


def _get_supabase() -> Any:
    """Lazy-init the Supabase client."""
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        logger.warning("Supabase credentials missing — service unavailable.")
        _supabase_client = None
        return None
    try:
        from supabase import create_client
        _supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
        logger.info("Supabase service initialized.")
    except ImportError:
        logger.warning("supabase package not installed — install with: pip install supabase")
        _supabase_client = None
    except Exception as e:
        logger.error("Failed to initialize Supabase client: %s", e)
        _supabase_client = None
    return _supabase_client


class SupabaseService:
    """Supabase client wrapper for auth, storage, and logging."""

    def is_available(self) -> bool:
        return _get_supabase() is not None

    def save_message(self, session_id: int, role: str, content: str, metadata: dict = None):
        client = _get_supabase()
        if not client:
            return None
        from supabase import Client
        return client.table("messages").insert({
            "session_id": session_id,
            "role": role,
            "content": content,
            "metadata": metadata or {},
        }).execute()

    def save_embedding(self, user_id: str, content: str, embedding: list, metadata: dict = None):
        client = _get_supabase()
        if not client:
            return None
        return client.table("embeddings").insert({
            "user_id": user_id,
            "content": content,
            "embedding": embedding,
            "metadata": metadata or {},
        }).execute()

    def log_action(self, user_id: str, action: str, details: dict = None, ip: str = None):
        client = _get_supabase()
        if not client:
            return None
        return client.table("audit_logs").insert({
            "user_id": user_id,
            "action": action,
            "details": details or {},
            "ip_address": ip,
        }).execute()


supabase_service = SupabaseService()
