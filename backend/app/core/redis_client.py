"""AIDEN Redis client — async Redis wrapper with graceful fallback.

When Redis is unreachable (local dev without docker), every method
transparently falls back to an in-process dict so the app keeps working.
"""
import json
import logging
import time
from typing import Optional

from app.config import settings

logger = logging.getLogger(__name__)

try:
    import redis.asyncio as aioredis
    REDIS_AVAILABLE = True
except ImportError:
    aioredis = None
    REDIS_AVAILABLE = False


class RedisClient:
    """Async Redis wrapper with connection pooling and in-memory fallback."""

    _client = None
    _memory_store: dict = {}
    _memory_expiry: dict = {}
    _memory_lists: dict = {}

    @classmethod
    async def get_client(cls):
        """Return the shared Redis connection, or None when unavailable."""
        if not REDIS_AVAILABLE:
            return None
        if cls._client is None:
            try:
                cls._client = aioredis.from_url(
                    settings.REDIS_URL,
                    encoding="utf-8",
                    decode_responses=True,
                    socket_connect_timeout=2,
                    socket_timeout=2,
                )
                await cls._client.ping()
                logger.info(f"Redis connected: {settings.REDIS_URL}")
            except Exception as e:
                logger.warning(f"Redis unavailable ({e}) — using in-memory fallback")
                cls._client = None
                return None
        return cls._client

    # ── Key/value ────────────────────────────────────────────────────────

    @classmethod
    async def set_key(cls, key: str, value, ex: Optional[int] = None) -> bool:
        client = await cls.get_client()
        if not isinstance(value, str):
            value = json.dumps(value, default=str)
        if client:
            await client.set(key, value, ex=ex)
            return True
        cls._memory_store[key] = value
        if ex:
            cls._memory_expiry[key] = time.time() + ex
        return True

    @classmethod
    async def get_key(cls, key: str):
        client = await cls.get_client()
        if client:
            raw = await client.get(key)
            if raw is None:
                return None
            try:
                return json.loads(raw)
            except (json.JSONDecodeError, TypeError):
                return raw
        if key in cls._memory_expiry and cls._memory_expiry[key] < time.time():
            cls._memory_store.pop(key, None)
            cls._memory_expiry.pop(key, None)
            return None
        raw = cls._memory_store.get(key)
        if raw is None:
            return None
        try:
            return json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            return raw

    @classmethod
    async def delete_key(cls, key: str) -> bool:
        client = await cls.get_client()
        if client:
            await client.delete(key)
            return True
        cls._memory_store.pop(key, None)
        cls._memory_expiry.pop(key, None)
        return True

    # ── Lists (used by conversation memory) ─────────────────────────────

    @classmethod
    async def rpush(cls, key: str, value) -> int:
        client = await cls.get_client()
        if not isinstance(value, str):
            value = json.dumps(value, default=str)
        if client:
            return await client.rpush(key, value)
        cls._memory_lists.setdefault(key, []).append(value)
        return len(cls._memory_lists[key])

    @classmethod
    async def lrange(cls, key: str, start: int = 0, stop: int = -1) -> list:
        client = await cls.get_client()
        raw_list = None
        if client:
            raw_list = await client.lrange(key, start, stop)
        else:
            full = cls._memory_lists.get(key, [])
            raw_list = full[start:] if stop == -1 else full[start:stop + 1]
        out = []
        for raw in raw_list or []:
            try:
                out.append(json.loads(raw))
            except (json.JSONDecodeError, TypeError):
                out.append(raw)
        return out

    @classmethod
    async def ltrim(cls, key: str, start: int, stop: int) -> bool:
        client = await cls.get_client()
        if client:
            await client.ltrim(key, start, stop)
            return True
        if key in cls._memory_lists:
            full = cls._memory_lists[key]
            cls._memory_lists[key] = full[start:stop + 1] if stop != -1 else full[start:]
        return True

    # ── Pub/sub ─────────────────────────────────────────────────────────

    @classmethod
    async def publish(cls, channel: str, message) -> int:
        """Publish a message. Returns subscriber count (0 in fallback)."""
        client = await cls.get_client()
        if not isinstance(message, str):
            message = json.dumps(message, default=str)
        if client:
            return await client.publish(channel, message)
        return 0

    @classmethod
    async def subscribe(cls, channel: str):
        """Return a pubsub object, or None when Redis is unavailable."""
        client = await cls.get_client()
        if not client:
            return None
        pubsub = client.pubsub()
        await pubsub.subscribe(channel)
        return pubsub

    @classmethod
    async def health(cls) -> dict:
        client = await cls.get_client()
        if client:
            try:
                latency_ms = 0.0
                import time as _t
                t0 = _t.monotonic()
                await client.ping()
                latency_ms = (_t.monotonic() - t0) * 1000
                return {"status": "healthy", "backend": "redis", "latency_ms": round(latency_ms, 2)}
            except Exception as e:
                return {"status": "error", "backend": "redis", "error": str(e)}
        return {"status": "fallback", "backend": "memory"}
