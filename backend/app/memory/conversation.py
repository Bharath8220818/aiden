from typing import List, Dict, Any
from datetime import datetime
class ConversationMemory:
    def __init__(self, max_messages=20): self._sessions = {}; self.max_messages = max_messages
    async def add_message(self, session_id, role, content):
        if session_id not in self._sessions: self._sessions[session_id] = []
        self._sessions[session_id].append({"role": role, "content": content, "ts": datetime.utcnow().isoformat()})
        self._sessions[session_id] = self._sessions[session_id][-self.max_messages:]
    async def get_history(self, session_id): return self._sessions.get(session_id, [])
    async def clear(self, session_id): self._sessions.pop(session_id, None)
conversation_memory = ConversationMemory()
