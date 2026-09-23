"""Notifications endpoints — durable bell drawer + outbound channel dispatch.

GET     /notifications            → my notifications (newest first)
POST    /notifications/{id}/read  → mark one as read
POST    /notifications/read-all   → mark all as read
POST    /notifications/send       → dispatch a message over channels
                                    (engineer+; email/Slack/Teams are the
                                    integration-gateway surface, spec §5/§10)
GET     /notifications/channels   → channel configuration status
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.core.dependencies import AuthContext, require_permission
from app.models import Notification
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["notifications"])

_VALID_CHANNELS = {"internal", "email", "slack", "teams"}


class SendRequest(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    message: str = Field(min_length=1)
    link: str | None = None
    severity: str = Field("info", pattern="^(info|low|medium|high|critical)$")
    channels: list[str] = Field(default=["internal"])

    @field_validator("channels")
    @classmethod
    def _validate_channels(cls, value: list[str]) -> list[str]:
        unknown = set(value) - _VALID_CHANNELS
        if unknown:
            raise ValueError(f"unknown channels: {', '.join(sorted(unknown))}")
        return value


@router.get("")
async def my_notifications(
    limit: int = Query(50, ge=1, le=200),
    ctx: AuthContext = Depends(require_permission("notification.read")),
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    stmt = (
        select(Notification)
        .where((Notification.user_id == ctx.user.id) | (Notification.user_id.is_(None)))
        .order_by(Notification.created_at.desc())
        .limit(limit)
    )
    rows = list((await db.execute(stmt)).scalars().all())
    return [
        {
            "id": str(n.id),
            "type": n.type.value if hasattr(n.type, "value") else n.type,
            "title": n.title,
            "message": n.message,
            "link": n.link,
            "read": n.is_read,
            "ts": n.created_at.isoformat() if n.created_at else None,
        }
        for n in rows
    ]


@router.post("/{notification_id}/read")
async def mark_read(
    notification_id: str,
    ctx: AuthContext = Depends(require_permission("notification.read")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    from datetime import UTC, datetime

    stmt = (
        update(Notification)
        .where(Notification.id == notification_id, Notification.user_id == ctx.user.id)
        .values(read_at=datetime.now(UTC))
    )
    await db.execute(stmt)
    await db.commit()
    return {"ok": True}


@router.post("/read-all")
async def mark_all_read(
    ctx: AuthContext = Depends(require_permission("notification.read")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    from datetime import UTC, datetime

    stmt = (
        update(Notification)
        .where(Notification.user_id == ctx.user.id)
        .values(read_at=datetime.now(UTC))
    )
    await db.execute(stmt)
    await db.commit()
    return {"ok": True}


@router.post("/send")
async def send_notification(
    payload: SendRequest,
    ctx: AuthContext = Depends(require_permission("notification.send")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Dispatch over the requested channels; per-channel results returned."""
    results = await NotificationService(db).dispatch(
        workspace_id=None,
        title=payload.title,
        message=payload.message,
        link=payload.link,
        severity=payload.severity,
        channels=tuple(payload.channels),
    )
    return {"dispatched": results}


@router.get("/channels")
async def channel_status(
    ctx: AuthContext = Depends(require_permission("notification.read")),
) -> dict[str, Any]:
    settings = get_settings()
    return {
        "internal": {"enabled": True, "mode": "durable + websocket"},
        "email": {
            "enabled": bool(settings.SMTP_HOST and settings.SMTP_FROM),
            "mode": "smtp",
            "host": settings.SMTP_HOST,
        },
        "slack": {"enabled": bool(settings.SLACK_WEBHOOK_URL), "mode": "incoming-webhook"},
        "teams": {"enabled": bool(settings.TEAMS_WEBHOOK_URL), "mode": "power-automate-webhook"},
    }
