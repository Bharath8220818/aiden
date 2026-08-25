"""
Conversation Memory v2 — Redis-backed with in-memory fallback.

Stores short-term conversation history per session:
- Key: session_id
- Value: list of messages (role, content, timestamp, metadata)
- TTL: 24 hours (configurable)
- Max messages: 50 per session (configurable)

When Redis is unavailable, falls back to in-memory dict (non-persistent).
"""

import json
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta

from app.config import settings

logger = logging.getLogger(__name__)


class ConversationMemory:
    """
    Session-based conversation memory backed by Redis.

    Each session stores a rolling window of messages for context continuity
    within a conversation. Messages older than TTL are automatically evicted.
    """

    def __init__(
        self,
        max_messages: int = 50,
        ttl_hours: int = 24,
        key_prefix: str = "aiden:conv:",
    ):
        self._max_messages = max_messages
        self._ttl_hours = ttl_hours
        self._key_prefix = key_prefix
        self._redis = None
        self._fallback: Dict[str, List[Dict]] = {}
        self._connect()

    def _connect(self):
        """Connect to Redis with graceful fallback."""
        try:
            import redis.asyncio as aioredis
            self._redis = aioredis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_connect_timeout=3,
            )
            logger.info(f"ConversationMemory: Connected to Redis ({settings.REDIS_URL})")
        except ImportError:
            logger.warning("ConversationMemory: redis not installed, using in-memory fallback")
        except Exception as e:
            logger.warning(f"ConversationMemory: Redis unavailable ({e}), using in-memory fallback")

    def _key(self, session_id: str) -> str:
        return f"{self._key_prefix}{session_id}"

    async def add_message(
        self,
        session_id: str,
        role: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Add a message to the conversation history."""
        message = {
            "role": role,
            "content": content,
            "timestamp": datetime.utcnow().isoformat(),
            "metadata": metadata or {},
        }

        if self._redis:
            try:
                key = self._key(session_id)
                pipe = self._redis.pipeline()
                pipe.rpush(key, json.dumps(message))
                pipe.ltrim(key, -self._max_messages, -1)
                pipe.expire(key, self._ttl_hours * 3600)
                await pipe.execute()
                return
            except Exception as e:
                logger.warning(f"ConversationMemory: Redis write failed ({e}), using fallback")

        # In-memory fallback
        if session_id not in self._fallback:
            self._fallback[session_id] = []
        self._fallback[session_id].append(message)
        self._fallback[session_id] = self._fallback[session_id][-self._max_messages:]

    async def get_history(
        self,
        session_id: str,
        limit: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """Get conversation history for a session."""
        if self._redis:
            try:
                key = self._key(session_id)
                count = limit or self._max_messages
                messages = await self._redis.lrange(key, -count, -1)
                return [json.loads(m) for m in messages]
            except Exception as e:
                logger.warning(f"ConversationMemory: Redis read failed ({e}), using fallback")

        # In-memory fallback
        messages = self._fallback.get(session_id, [])
        if limit:
            return messages[-limit:]
        return messages

    async def get_last_message(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get the most recent message in a session."""
        history = await self.get_history(session_id, limit=1)
        return history[0] if history else None

    async def get_context_window(
        self,
        session_id: str,
        max_tokens_estimate: int = 4000,
    ) -> str:
        """
        Get conversation history formatted as a context string for LLM prompts.
        Estimates token count (rough: 1 token ≈ 4 chars) and truncates.
        """
        history = await self.get_history(session_id)
        if not history:
            return ""

        lines = []
        char_count = 0
        max_chars = max_tokens_estimate * 4

        for msg in reversed(history):
            line = f"{msg['role'].upper()}: {msg['content']}"
            if char_count + len(line) > max_chars:
                break
            lines.insert(0, line)
            char_count += len(line)

        return "\n".join(lines)

    async def clear(self, session_id: str) -> None:
        """Clear conversation history for a session."""
        if self._redis:
            try:
                await self._redis.delete(self._key(session_id))
                return
            except Exception:
                pass
        self._fallback.pop(session_id, None)

    async def get_session_ids(self) -> List[str]:
        """Get all active session IDs."""
        if self._redis:
            try:
                keys = await self._redis.keys(f"{self._key_prefix}*")
                return [k.replace(self._key_prefix, "") for k in keys]
            except Exception:
                pass
        return list(self._fallback.keys())

    async def get_stats(self) -> Dict[str, Any]:
        """Get memory statistics."""
        backend = "redis" if self._redis else "in-memory"
        session_count = len(await self.get_session_ids())
        total_messages = 0

        if backend == "in-memory":
            total_messages = sum(len(msgs) for msgs in self._fallback.values())
        elif self._redis:
            try:
                for sid in await self.get_session_ids():
                    total_messages += await self._redis.llen(self._key(sid))
            except Exception:
                pass

        return {
            "backend": backend,
            "sessions": session_count,
            "total_messages": total_messages,
            "max_messages_per_session": self._max_messages,
            "ttl_hours": self._ttl_hours,
        }

    async def health(self) -> Dict[str, Any]:
        """Health check for the conversation memory."""
        if self._redis:
            try:
                await self._redis.ping()
                return {"status": "healthy", "backend": "redis"}
            except Exception as e:
                return {"status": "degraded", "backend": "redis", "error": str(e)}
        return {"status": "healthy", "backend": "in-memory"}


# Singleton
conversation_memory = ConversationMemory()
