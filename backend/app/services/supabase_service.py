from supabase import create_client, Client
from app.config import settings
import logging

logger = logging.getLogger(__name__)

class SupabaseService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if hasattr(self, '_initialized'):
            return
        self._initialized = True
        
        self.url = settings.SUPABASE_URL
        self.service_key = settings.SUPABASE_SERVICE_ROLE_KEY
        
        if not self.url or not self.service_key:
            logger.warning("Supabase credentials missing. Service unavailable.")
            self.client = None
        else:
            self.client: Client = create_client(self.url, self.service_key)
            logger.info("Supabase service initialized.")

    def is_available(self) -> bool:
        return self.client is not None

    # ─── AI / Chat Storage ───

    def save_message(self, session_id: int, role: str, content: str, metadata: dict = None):
        if not self.is_available():
            return None
        return self.client.table('messages').insert({
            'session_id': session_id,
            'role': role,
            'content': content,
            'metadata': metadata or {}
        }).execute()

    def save_embedding(self, user_id: str, content: str, embedding: list, metadata: dict = None):
        if not self.is_available():
            return None
        return self.client.table('embeddings').insert({
            'user_id': user_id,
            'content': content,
            'embedding': embedding,
            'metadata': metadata or {}
        }).execute()

    # ─── Audit Logs ───

    def log_action(self, user_id: str, action: str, details: dict = None, ip: str = None):
        if not self.is_available():
            return None
        return self.client.table('audit_logs').insert({
            'user_id': user_id,
            'action': action,
            'details': details or {},
            'ip_address': ip
        }).execute()

supabase_service = SupabaseService()
