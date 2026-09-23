"""Notification service — multi-channel dispatch (spec §5/§6/§10).

The service is a thin orchestrator: each channel is an adapter under
`app/integrations/mcp/` (Outlook/SMTP, Slack, Teams), so vendor specifics
live in one place. Channels degrade independently; a missing channel never
fails the underlying operation. Incidents, approvals and task assignments
call `dispatch()`; the message format follows the incident-email template
from the integration spec (§6).
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.integrations.mcp.outlook.adapter import OutlookAdapter
from app.integrations.mcp.slack.adapter import SlackAdapter
from app.integrations.mcp.teams.adapter import TeamsAdapter
from app.models import Notification, NotificationType
from app.services.event_bus import broadcast_platform_event

logger = get_logger("aiden.notifications")


class NotificationService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ------------------------------------------------------------------ #
    # Public API
    # ------------------------------------------------------------------ #
    async def dispatch(
        self,
        *,
        workspace_id: Any,
        title: str,
        message: str,
        link: str | None = None,
        user_ids: list | None = None,
        severity: str = "info",
        channels: tuple[str, ...] = ("internal",),
    ) -> dict[str, Any]:
        """Fan a notification out over the requested channels.

        Returns per-channel results {channel: "sent" | "skipped: <reason>" |
        "failed: <error>"} — honest delivery reporting for the audit trail.
        """
        results: dict[str, Any] = {}
        if "internal" in channels:
            results["internal"] = await self._internal(
                user_ids=user_ids, title=title, message=message, link=link, severity=severity
            )
        if "email" in channels:
            adapter = OutlookAdapter(recipients=await self._emails_for(user_ids))
            results["email"] = await adapter.send(subject=title, body=message, link=link)
        if "slack" in channels:
            results["slack"] = await SlackAdapter().post(
                title=title, message=message, link=link, severity=severity
            )
        if "teams" in channels:
            results["teams"] = await TeamsAdapter().post(
                title=title, message=message, link=link, severity=severity
            )
        return results

    async def dispatch_incident(
        self,
        *,
        workspace_id: Any,
        incident_title: str,
        pipeline: str,
        severity: str,
        cause: str,
        fix: str | None,
        link: str = "/incidents",
    ) -> dict[str, Any]:
        """Spec §6 incident email — subject/body/AIDEN-action template."""
        subject = f"[AIDEN] Pipeline Failure — {pipeline}"
        body = (
            f"Incident: {incident_title}\n"
            f"Pipeline: {pipeline}\n"
            f"Severity: {severity.upper()}\n\n"
            f"Cause:\n{cause}\n\n"
            f"Suggested Fix:\n{fix or 'Under investigation.'}\n\n"
            f"AIDEN Action: Fix prepared — approval required before deploy.\n"
            f"Review: {link}"
        )
        return await self.dispatch(
            workspace_id=workspace_id,
            title=subject,
            message=body,
            link=link,
            severity=severity,
            channels=("internal", "email", "slack", "teams"),
        )

    # ------------------------------------------------------------------ #
    # Channels
    # ------------------------------------------------------------------ #
    async def _internal(
        self, *, user_ids, title: str, message: str, link: str | None, severity: str
    ) -> str:
        type_map = {
            "info": NotificationType.info,
            "success": NotificationType.success,
            "warning": NotificationType.warning,
            "critical": NotificationType.error,
            "high": NotificationType.error,
            "medium": NotificationType.warning,
            "low": NotificationType.info,
        }
        rows = [
            Notification(
                user_id=uid,
                type=type_map.get(severity, NotificationType.info),
                title=title[:255],
                message=message,
                link=link,
            )
            for uid in (user_ids or [None])
        ]
        self.db.add_all(rows)
        await self.db.commit()
        await broadcast_platform_event(
            type="info" if severity in {"info", "low"} else "incident",
            title=title[:120],
            message=message[:200],
            link=link,
        )
        return f"stored:{len(rows)}"

    async def _emails_for(self, user_ids: list | None) -> list[str]:
        """Resolve recipient emails; user_ids=None → every workspace user."""
        from app.models import User

        stmt = select(User.email).where(User.is_active.is_(True))
        if user_ids:
            stmt = stmt.where(User.id.in_(user_ids))
        rows = (await self.db.execute(stmt)).all()
        return [r[0] for r in rows]
