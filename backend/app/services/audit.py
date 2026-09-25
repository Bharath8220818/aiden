"""Audit trail helper (Phase A §8 observability).

One function, no commit: endpoints ``db.add(audit_row(...))`` right next to
their own write so the audit row lands in the SAME transaction as the action
it records. Kept deliberately boring — every important action should be able
to afford one line of auditing.
"""

from __future__ import annotations

import typing

from app.models.audit_log import AuditLog


def audit_row(
    *,
    action: str,
    resource_type: str,
    resource_id: str | None = None,
    workspace_id: typing.Any = None,
    project_id: typing.Any = None,
    user_id: typing.Any = None,
    details: dict | None = None,
) -> AuditLog:
    """Build an AuditLog row; the caller adds and commits it with its write."""
    return AuditLog(
        workspace_id=workspace_id,
        project_id=project_id,
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details or {},
    )
