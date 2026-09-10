"""AIDEN Event Bus — publish/subscribe for platform events.

Uses Redis pub/sub when available, otherwise an in-process asyncio queue
so a single-instance deployment still gets event-driven behaviour.

Events published here fan out to:
  - WebSocket broadcasts (frontend live updates)
  - Notification router (email / Slack / Teams alerts)
  - Audit log entries
"""
import asyncio
import json
import logging
from collections import defaultdict
from typing import Awaitable, Callable, Dict, List

from app.core.redis_client import RedisClient

logger = logging.getLogger(__name__)

EVENT_CHANNEL = "aiden:events"

# Events that should also surface as in-app notifications
NOTIFIABLE_EVENTS = {
    "incident.created": "error",
    "incident.resolved": "success",
    "pipeline.failed": "error",
    "pipeline.succeeded": "success",
    "approval.requested": "info",
    "deployment.completed": "success",
    "deployment.failed": "error",
}


class EventBus:
    """Async pub/sub event bus with Redis + in-process backends."""

    _handlers: Dict[str, List[Callable[[str, dict], Awaitable[None]]]] = defaultdict(list)
    _subscribed = False

    # ── Publish ─────────────────────────────────────────────────────────

    @classmethod
    async def publish(cls, event_type: str, payload: dict) -> None:
        """Publish an event to all subscribers (Redis + local handlers)."""
        message = json.dumps({"type": event_type, "data": payload}, default=str)

        # 1. Redis fan-out (multi-process deployments)
        try:
            await RedisClient.publish(EVENT_CHANNEL, message)
        except Exception as e:
            logger.debug(f"Redis publish skipped: {e}")

        # 2. Local handlers (single-process, always runs)
        for handler in cls._handlers.get(event_type, []):
            try:
                await handler(event_type, payload)
            except Exception as e:
                logger.error(f"Event handler error for {event_type}: {e}")

        # 3. Auto-broadcast notifiable events to WebSocket clients
        if event_type in NOTIFIABLE_EVENTS:
            try:
                from app.api.v1.websocket import broadcast_notification
                await broadcast_notification(
                    message=json.dumps(payload, default=str)[:500],
                    notif_type=NOTIFIABLE_EVENTS[event_type],
                )
            except Exception:
                pass

    # ── Subscribe ───────────────────────────────────────────────────────

    @classmethod
    def subscribe(cls, event_type: str, handler: Callable[[str, dict], Awaitable[None]]):
        """Register an async handler for an event type."""
        cls._handlers[event_type].append(handler)
        logger.info(f"Event handler registered: {event_type}")

    @classmethod
    async def start_redis_listener(cls):
        """Listen on the Redis channel and re-dispatch to local handlers.

        Run as a background task at app startup in multi-worker deployments.
        """
        if cls._subscribed:
            return
        pubsub = await RedisClient.subscribe(EVENT_CHANNEL)
        if not pubsub:
            logger.info("Event bus: Redis unavailable — local handlers only")
            return
        cls._subscribed = True
        logger.info("Event bus: Redis listener started")

        async def _listen():
            async for message in pubsub.listen():
                if message.get("type") != "message":
                    continue
                try:
                    data = json.loads(message["data"])
                    event_type = data.get("type", "")
                    payload = data.get("data", {})
                    for handler in cls._handlers.get(event_type, []):
                        try:
                            await handler(event_type, payload)
                        except Exception as e:
                            logger.error(f"Event handler error ({event_type}): {e}")
                except (json.JSONDecodeError, KeyError):
                    pass

        asyncio.create_task(_listen())

    @classmethod
    def list_events(cls) -> List[str]:
        """All event types that have at least one registered handler."""
        return sorted(cls._handlers.keys())
