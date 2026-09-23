"""WebSocket live-events endpoint (`/api/v1/ws`).

The frontend `AidenWebSocketClient` connects to `VITE_WS_URL` (default
`ws://localhost:8000/ws`) and routes messages by `type`. This endpoint:

- accepts `?token=<JWT>` (the browser WebSocket API cannot send headers) and
  closes with 4401 when the token is missing/invalid/expired;
- streams `connection_established` immediately, then a `heartbeat` every 15s
  and a fleet `pipeline_status` digest every 30s;
- accepts `{"type": "ping"}` pings from the client.

Realtime fan-out (incident detected, healing advanced, approval decided) can
publish onto the same `broadcast()` channel as those producers come online.
"""

from __future__ import annotations

import asyncio
import json

from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.security import decode_access_token
from app.models import Incident, IncidentStatus, Pipeline, PipelineRun, PipelineStatus, RunStatus


class ConnectionManager:
    def __init__(self) -> None:
        self.active: list[WebSocket] = []
        self._lock = asyncio.Lock()

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        async with self._lock:
            self.active.append(ws)

    async def disconnect(self, ws: WebSocket) -> None:
        async with self._lock:
            if ws in self.active:
                self.active.remove(ws)

    async def broadcast(self, message: dict) -> None:
        payload = json.dumps(message, default=str)
        async with self._lock:
            targets = list(self.active)
        for ws in targets:
            try:
                await ws.send_text(payload)
            except Exception:
                await self.disconnect(ws)


manager = ConnectionManager()


async def _authenticate(ws: WebSocket) -> str | None:
    """Resolve the subject from ?token= query param. Returns None on failure."""
    token = ws.query_params.get("token")
    if not token:
        return None
    try:
        payload = decode_access_token(token)
        return payload.get("sub")
    except Exception:
        return None


async def _fleet_digest() -> dict:
    """Small realtime digest of fleet + incident state (no fabricated data)."""
    async with AsyncSessionLocal() as session:
        running = int(
            (
                await session.execute(
                    select(PipelineRun.id).where(PipelineRun.status == RunStatus.running).limit(1000)
                )
            )
            .scalars()
            .all()
            .__len__()
        )
        open_incidents = int(
            (
                await session.execute(
                    select(Incident.id).where(Incident.status != IncidentStatus.resolved).limit(1000)
                )
            )
            .scalars()
            .all()
            .__len__()
        )
        active_pipelines = int(
            (
                await session.execute(
                    select(Pipeline.id).where(Pipeline.status == PipelineStatus.active).limit(1000)
                )
            )
            .scalars()
            .all()
            .__len__()
        )
    return {
        "type": "pipeline_status",
        "data": {
            "running": running,
            "activePipelines": active_pipelines,
            "openIncidents": open_incidents,
            "at": "now",
        },
    }


async def _heartbeat_loop(ws: WebSocket) -> None:
    try:
        while True:
            await asyncio.sleep(15)
            await ws.send_text(json.dumps({"type": "heartbeat", "data": {"ts": "15s"}}))
            await asyncio.sleep(15)
            await ws.send_text(json.dumps(await _fleet_digest()))
    except Exception:
        return


async def ws_endpoint(ws: WebSocket) -> None:
    subject = await _authenticate(ws)
    if subject is None:
        await ws.close(code=4401, reason="Authentication required")
        return

    await manager.connect(ws)
    await ws.send_text(
        json.dumps(
            {
                "type": "connection_established",
                "data": {"subject": subject, "message": "AIDEN realtime channel connected"},
            }
        )
    )
    loop = asyncio.create_task(_heartbeat_loop(ws))
    try:
        while True:
            raw = await ws.receive_text()
            try:
                message = json.loads(raw)
            except json.JSONDecodeError:
                continue
            if message.get("type") == "ping":
                await ws.send_text(json.dumps({"type": "pong", "data": {}}))
    except WebSocketDisconnect:
        pass
    finally:
        loop.cancel()
        await manager.disconnect(ws)
