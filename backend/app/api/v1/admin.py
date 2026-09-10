"""AIDEN Admin API — system administration (superuser only)."""
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.database import get_db
from app.models.user import User
from app.models.pipeline import Pipeline
from app.models.agent_run import AgentRun
from app.models.incident import Incident

logger = logging.getLogger(__name__)

router = APIRouter()


async def _require_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


@router.get("/stats")
async def system_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    """Platform-wide statistics."""
    from app.models.project import Project
    from app.models.connection import Connection
    from app.models.alert import Alert

    return {
        "users": (await db.execute(select(func.count(User.id)))).scalar() or 0,
        "projects": (await db.execute(select(func.count(Project.id)))).scalar() or 0,
        "pipelines": (await db.execute(select(func.count(Pipeline.id)))).scalar() or 0,
        "connections": (await db.execute(select(func.count(Connection.id)))).scalar() or 0,
        "agent_runs": (await db.execute(select(func.count(AgentRun.id)))).scalar() or 0,
        "incidents": (await db.execute(select(func.count(Incident.id)))).scalar() or 0,
        "alerts": (await db.execute(select(func.count(Alert.id)))).scalar() or 0,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/agents")
async def admin_agents(current_user: User = Depends(_require_admin)):
    """Registry introspection: all agents with tools and permissions."""
    from app.agents.registry import agent_registry
    return {"agents": agent_registry.list_agents()}


@router.get("/events")
async def admin_events(current_user: User = Depends(_require_admin)):
    """Event bus introspection: registered event types and handlers."""
    from app.services.event_bus import EventBus
    return {"registered_events": EventBus.list_events()}


@router.get("/plugins")
async def admin_plugins(current_user: User = Depends(_require_admin)):
    """Registered plugins."""
    from app.plugins.plugin_manager import plugin_manager
    return {"plugins": plugin_manager.list_plugins()}


@router.get("/services")
async def admin_services(current_user: User = Depends(_require_admin)):
    """Health of backing services (Redis, vector store, connectors)."""
    health = {}
    try:
        from app.core.redis_client import RedisClient
        health["redis"] = await RedisClient.health()
    except Exception as e:
        health["redis"] = {"status": "error", "error": str(e)}
    try:
        from app.rag.vector_store import VectorStore
        health["vector_store"] = VectorStore().stats()
    except Exception as e:
        health["vector_store"] = {"status": "error", "error": str(e)}
    try:
        from app.tools import TOOL_REGISTRY
        health["connectors"] = {name: "registered" for name in TOOL_REGISTRY}
    except Exception as e:
        health["connectors"] = {"error": str(e)}
    return health


@router.post("/cache/clear")
async def clear_cache(
    current_user: User = Depends(_require_admin),
):
    """Flush the Redis cache (fallback store clears automatically)."""
    from app.core.redis_client import RedisClient
    client = await RedisClient.get_client()
    if client:
        await client.flushdb()
        return {"status": "flushed", "backend": "redis"}
    RedisClient._memory_store.clear()
    RedisClient._memory_lists.clear()
    return {"status": "flushed", "backend": "memory"}


@router.post("/events/{event_type}/publish")
async def publish_test_event(
    event_type: str,
    payload: dict = {},
    current_user: User = Depends(_require_admin),
):
    """Publish a test event through the bus (validates the full fan-out path)."""
    from app.services.event_bus import EventBus
    await EventBus.publish(event_type, payload)
    return {"status": "published", "event": event_type}
