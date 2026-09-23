"""Domain event broadcasting — bridges service-layer state changes to the
WebSocket connection manager (`app/api/v1/ws.py`).

Events follow the frontend `LiveEvent` shape (`type`, `title`, `message`,
`link`, `ts`) so `services/liveEvents.ts` routes them to the toast rail
without modification. Broadcasting is best-effort: a socket failure never
fails the underlying operation.
"""

from __future__ import annotations

from datetime import UTC, datetime

from app.api.v1.ws import manager
from app.core.logging import get_logger

logger = get_logger("aiden.events")


async def broadcast_platform_event(
    *,
    type: str,
    title: str,
    message: str,
    link: str | None = None,
) -> None:
    """Push a LiveEvent to all connected clients. Never raises."""
    payload = {
        "type": "platform-event",
        "data": {
            "id": f"evt-{datetime.now(UTC).timestamp():.0f}",
            "type": type,
            "title": title,
            "message": message,
            "link": link,
            "ts": datetime.now(UTC).isoformat(),
        },
    }
    try:
        await manager.broadcast(payload)
    except Exception:  # noqa: BLE001 — realtime is best-effort
        logger.warning("Failed to broadcast platform event: %s", title, exc_info=True)


async def broadcast_incident_detected(incident_title: str, pipeline: str, incident_id: str) -> None:
    await broadcast_platform_event(
        type="incident",
        title="Incident detected",
        message=f"{pipeline} failed — {incident_title[:120]}",
        link="/incidents",
    )


async def broadcast_healing_advanced(incident_title: str, stage_label: str, incident_id: str) -> None:
    await broadcast_platform_event(
        type="healing",
        title="Self-healing update",
        message=f"{incident_title[:80]} — {stage_label}",
        link="/self-healing",
    )


async def broadcast_incident_resolved(incident_title: str, mttr_minutes: int | None) -> None:
    await broadcast_platform_event(
        type="success",
        title="Incident resolved",
        message=f"{incident_title[:100]} closed (MTTR {mttr_minutes or '—'} min).",
        link="/self-healing",
    )


async def broadcast_approval_decision(approval_summary: str, decision: str) -> None:
    await broadcast_platform_event(
        type="info" if decision == "approved" else "incident",
        title="Approval decision",
        message=f"{approval_summary[:100]} — {decision}.",
        link="/approvals",
    )


async def broadcast_pipeline_run(pipeline_name: str, status: str, run_id: str) -> None:
    await broadcast_platform_event(
        type="pipeline",
        title="Pipeline run " + status,
        message=f"{pipeline_name} run {run_id[:8]} {status}.",
        link="/pipelines/manage",
    )
