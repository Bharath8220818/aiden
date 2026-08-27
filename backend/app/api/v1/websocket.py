from fastapi import WebSocket, WebSocketDisconnect
import json
import asyncio
from typing import Dict, Set, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manage WebSocket connections for real-time updates."""

    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        """Accept WebSocket connection."""
        await websocket.accept()
        if client_id not in self.active_connections:
            self.active_connections[client_id] = set()
        self.active_connections[client_id].add(websocket)
        logger.info(f"Client {client_id} connected ({len(self.active_connections[client_id])} connections)")

    def disconnect(self, websocket: WebSocket, client_id: str):
        """Remove WebSocket connection."""
        if client_id in self.active_connections:
            self.active_connections[client_id].discard(websocket)
            if not self.active_connections[client_id]:
                del self.active_connections[client_id]
        logger.info(f"Client {client_id} disconnected")

    async def send_message(self, message: dict, client_id: str):
        """Send message to specific client."""
        if client_id in self.active_connections:
            dead = set()
            for connection in self.active_connections[client_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Failed to send message to {client_id}: {e}")
                    dead.add(connection)
            self.active_connections[client_id] -= dead

    async def broadcast(self, message: dict):
        """Broadcast message to all connected clients."""
        for client_id in list(self.active_connections.keys()):
            await self.send_message(message, client_id)

    @property
    def total_connections(self) -> int:
        return sum(len(conns) for conns in self.active_connections.values())

    @property
    def client_ids(self) -> list:
        return list(self.active_connections.keys())


manager = ConnectionManager()


# ── Broadcast helpers (called from orchestrator and agents) ──────────────

async def broadcast_agent_step(
    run_id: str,
    agent: str,
    status: str,
    detail: str = "",
    tools_used: list = None,
    execution_time_ms: float = 0,
    objective: str = "",
):
    """Broadcast an agent step event to all connected clients."""
    await manager.broadcast({
        "type": "agent_step",
        "run_id": run_id,
        "timestamp": datetime.utcnow().isoformat(),
        "data": {
            "agent": agent,
            "status": status,
            "detail": detail,
            "tools_used": tools_used or [],
            "execution_time_ms": execution_time_ms,
            "objective": objective,
        },
    })


async def broadcast_execution_update(
    run_id: str,
    objective: str = "",
    status: str = "running",
    intent: dict = None,
    agents_used: list = None,
    tools_used: list = None,
    confidence: float = 0,
    execution_time_ms: float = 0,
):
    """Broadcast an execution update event."""
    await manager.broadcast({
        "type": "execution_update",
        "run_id": run_id,
        "timestamp": datetime.utcnow().isoformat(),
        "data": {
            "objective": objective,
            "status": status,
            "intent": intent,
            "agents_used": agents_used or [],
            "tools_used": tools_used or [],
            "confidence": confidence,
            "execution_time_ms": execution_time_ms,
            "created_at": datetime.utcnow().isoformat(),
        },
    })


async def broadcast_connector_health(tool_name: str, status: str, latency_ms: float = 0):
    """Broadcast connector health change."""
    await manager.broadcast({
        "type": "connector_health",
        "timestamp": datetime.utcnow().isoformat(),
        "data": {
            "tool_name": tool_name,
            "status": status,
            "latency_ms": latency_ms,
        },
    })


async def broadcast_notification(message: str, notif_type: str = "info"):
    """Broadcast a system notification."""
    await manager.broadcast({
        "type": "notification",
        "timestamp": datetime.utcnow().isoformat(),
        "data": {
            "type": notif_type,
            "message": message,
        },
    })


# ── Connector health polling ───────────────────────────────────────────

async def start_connector_health_poller(interval_seconds: int = 60):
    """Background task that polls connector health and broadcasts changes."""
    while True:
        try:
            from app.tools import TOOL_REGISTRY
            for name, connector in TOOL_REGISTRY.items():
                try:
                    health = await connector.health()
                    await broadcast_connector_health(
                        tool_name=name,
                        status=health.status if hasattr(health, 'status') else health.get('status', 'unknown'),
                        latency_ms=health.latency_ms if hasattr(health, 'latency_ms') else health.get('latency_ms', 0),
                    )
                except Exception as e:
                    await broadcast_connector_health(tool_name=name, status="error", latency_ms=0)
        except Exception as e:
            logger.error(f"Connector health poller error: {e}")
        await asyncio.sleep(interval_seconds)


# ── WebSocket endpoint ─────────────────────────────────────────────────

async def websocket_endpoint(websocket: WebSocket, client_id: str = "default"):
    """WebSocket endpoint for real-time agent activity and system updates."""
    await manager.connect(websocket, client_id)

    try:
        await websocket.send_json({
            "type": "connection",
            "status": "connected",
            "client_id": client_id,
            "message": "Connected to AIDEN WebSocket",
            "total_clients": manager.total_connections,
        })

        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)

                if message.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})

                elif message.get("type") == "execute":
                    # Client requests orchestrator execution via WebSocket
                    objective = message.get("data", {}).get("objective", "")
                    project_id = message.get("data", {}).get("project_id", "default")
                    if objective:
                        # Run execution in background so WebSocket stays responsive
                        asyncio.create_task(_handle_ws_execution(
                            websocket, objective, project_id
                        ))

            except json.JSONDecodeError:
                pass

    except WebSocketDisconnect:
        manager.disconnect(websocket, client_id)


async def _handle_ws_execution(websocket: WebSocket, objective: str, project_id: str):
    """Handle an execution request received via WebSocket."""
    import uuid
    run_id = f"run_{uuid.uuid4().hex[:8]}"

    try:
        from app.core.aiden_orchestrator import aiden_orchestrator

        # Broadcast execution started
        await broadcast_execution_update(
            run_id=run_id,
            objective=objective,
            status="running",
        )

        # Execute through orchestrator
        result = await aiden_orchestrator.execute(
            objective=objective,
            context={"project_id": project_id, "source": "websocket"},
        )

        # Broadcast final result
        await broadcast_execution_update(
            run_id=run_id,
            objective=objective,
            status=result.get("status", "success"),
            intent=result.get("intent"),
            agents_used=result.get("agents_used", []),
            tools_used=result.get("tools_used", []),
            confidence=result.get("confidence", 0),
            execution_time_ms=result.get("execution_time_ms", 0),
        )

    except Exception as e:
        logger.error(f"WebSocket execution failed: {e}")
        await broadcast_execution_update(
            run_id=run_id,
            objective=objective,
            status="failure",
        )
