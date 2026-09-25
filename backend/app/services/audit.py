"""Audit trail service (Phase A §8 observability).

One service, one method: lifecycle endpoints write exactly one audit row in
the same transaction as the action they record — the endpoint owns the
``await db.commit()``, the service only adds the row.
"""

from __future__ import annotations

import typing

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog

Action = typing.Literal["auth.login", "project.create", "pipeline.create", "pipeline.run"]


class AuditService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    def record(
        self,
        *,
        action: Action,
        resource_type: str,
        resource_id: str | None = None,
        workspace_id: typing.Any = None,
        project_id: typing.Any = None,
        user_id: typing.Any = None,
        details: dict | None = None,
    ) -> None:
        """Add one audit row to the session; the caller commits with its write."""
        self.db.add(
            AuditLog(
                workspace_id=workspace_id,
                project_id=project_id,
                user_id=user_id,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                details=details or {},
            )
        )
