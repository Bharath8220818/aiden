"""Project-scoped WebSocket connection helpers.

The existing ``app.api.v1.websocket.ConnectionManager`` manages per-client
connections for the frontend. This module adds a *project-scoped* view on
top of it so services can broadcast events to everyone watching a project
without needing to know individual client ids.
"""
import logging
from typing import Optional

logger = logging.getLogger(__name__)


async def broadcast_to_project(project_id: str, message: dict) -> int:
    """Broadcast a message tagged with a project id to all connected clients.

    The frontend filters by the ``project_id`` field inside the payload, so
    broadcasting globally but tagging is sufficient and keeps the connection
    manager simple (single channel per client).
    """
    try:
        from app.api.v1.websocket import manager
        payload = {"project_id": project_id, **message}
        await manager.broadcast(payload)
        return manager.total_connections
    except Exception as e:  # WebSocket layer not initialised (e.g. tests)
        logger.debug(f"broadcast_to_project skipped: {e}")
        return 0
