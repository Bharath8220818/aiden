"""Governance endpoints — approvals queue, audit trail, team membership.

The Approvals page, Governance page, and Team page consume these:

    GET    /approvals                      → pending + recent decisions
    POST   /approvals/{id}/approve         → lead+ sign-off (approval.approve)
    POST   /approvals/{id}/reject
    GET    /audit                          → recent audit events
    GET    /team/members                   → workspace roster (current workspace)
    POST   /team/members                   → invite (workspace.update)
    PATCH  /team/members/{user_id}         → change role
    DELETE /team/members/{user_id}         → remove
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Query
from pydantic import Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import (
    AuthContext,
    ensure_workspace_permission,
    get_current_user,
    require_permission,
    user_workspace_ids,
)
from app.core.exceptions import ForbiddenError, NotFoundError, ValidationError
from app.models import (
    Approval,
    ApprovalStatus,
    ApprovalType,
    AuditLog,
    User,
    UserRole,
    WorkspaceMember,
    WorkspaceRole,
)
from app.schemas.common import APIModel
from app.services.overview_service import _utcnow_naive

router = APIRouter(tags=["governance"])


class ApprovalDecisionIn(APIModel):
    note: str | None = Field(default=None, max_length=2000)


class TeamRoleUpdateIn(APIModel):
    role: WorkspaceRole


def _relative(dt: datetime | None) -> str:
    if dt is None:
        return "just now"
    now = _utcnow_naive()
    if dt.tzinfo is not None:
        dt = dt.replace(tzinfo=None)
    seconds = int((now - dt).total_seconds())
    if seconds < 0:
        return "just now"
    if seconds < 60:
        return "just now"
    minutes = seconds // 60
    if minutes < 60:
        return f"{minutes} min ago"
    hours = minutes // 60
    if hours < 24:
        return f"{hours} h ago"
    return f"{hours // 24} d ago"


def _approval_out(a: Approval, actor_name: str | None) -> dict:
    return {
        "id": str(a.id),
        "requestType": a.request_type.value if hasattr(a.request_type, "value") else str(a.request_type),
        "status": a.status.value if hasattr(a.status, "value") else str(a.status),
        "summary": a.summary,
        "riskLevel": a.risk_level.value if hasattr(a.risk_level, "value") else str(a.risk_level),
        "requestedByName": actor_name or "AIDEN",
        "requestedAt": _relative(a.created_at),
        "decidedAt": _relative(a.decided_at) if a.decided_at else None,
        "createdAt": a.created_at.isoformat() if a.created_at else None,
    }


# --------------------------------------------------------------------------- #
# Approvals
# --------------------------------------------------------------------------- #
@router.get("/approvals")
async def list_approvals(
    ctx: AuthContext = Depends(require_permission("approval.read")),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    rows = list(
        (
            await db.execute(
                select(Approval, User.full_name)
                .join(User, Approval.requested_by == User.id, isouter=True)
                .order_by(Approval.created_at.desc())
                .limit(50)
            )
        ).all()
    )
    return [_approval_out(a, name) for a, name in rows]


async def _load_approval(db: AsyncSession, approval_id: str) -> Approval:
    try:
        aid = uuid.UUID(approval_id)
    except ValueError as exc:
        raise NotFoundError("Approval was not found") from exc
    approval = await db.get(Approval, aid)
    if approval is None:
        raise NotFoundError("Approval was not found")
    return approval


@router.post("/approvals/{approval_id}/approve")
async def approve(
    approval_id: str,
    payload: ApprovalDecisionIn | None = None,
    ctx: AuthContext = Depends(require_permission("approval.approve")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    approval = await _load_approval(db, approval_id)
    if approval.status != ApprovalStatus.pending:
        raise ValidationError(f"Approval is already {approval.status.value}")
    approval.status = ApprovalStatus.approved
    approval.approved_by = ctx.user.id
    approval.decided_at = datetime.now(UTC)
    db.add(
        AuditLog(
            project_id=approval.project_id,
            user_id=ctx.user.id,
            action="approval.approve",
            resource_type="approval",
            resource_id=str(approval.id),
            details={"note": (payload.note if payload else None) or "approved via Governance UI"},
        )
    )
    await db.commit()

    # §15: a granted tool_execution approval executes the queued governed call.
    tool_result: dict | None = None
    if approval.request_type == ApprovalType.tool_execution and approval.payload:
        from app.services.tool_registry import registry

        tool_result = await registry.resume(approval, db)

    from app.services.event_bus import broadcast_approval_decision

    await broadcast_approval_decision(approval.summary, "approved")
    return {
        "status": "ok",
        "approvalId": str(approval.id),
        "decision": "approved",
        **({"toolResult": tool_result} if tool_result else {}),
    }


@router.post("/approvals/{approval_id}/reject")
async def reject(
    approval_id: str,
    payload: ApprovalDecisionIn | None = None,
    ctx: AuthContext = Depends(require_permission("approval.approve")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    approval = await _load_approval(db, approval_id)
    if approval.status != ApprovalStatus.pending:
        raise ValidationError(f"Approval is already {approval.status.value}")
    approval.status = ApprovalStatus.rejected
    approval.approved_by = ctx.user.id
    approval.decided_at = datetime.now(UTC)
    db.add(
        AuditLog(
            project_id=approval.project_id,
            user_id=ctx.user.id,
            action="approval.reject",
            resource_type="approval",
            resource_id=str(approval.id),
            details={"note": (payload.note if payload else None) or "rejected via Governance UI"},
        )
    )
    await db.commit()

    from app.services.event_bus import broadcast_approval_decision

    await broadcast_approval_decision(approval.summary, "rejected")
    return {"status": "ok", "approvalId": str(approval.id), "decision": "rejected"}


# --------------------------------------------------------------------------- #
# Audit trail
# --------------------------------------------------------------------------- #
@router.get("/audit")
async def audit_trail(
    limit: int = Query(25, ge=1, le=200),
    ctx: AuthContext = Depends(require_permission("approval.read")),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    rows = list(
        (
            await db.execute(
                select(AuditLog, User.full_name)
                .join(User, AuditLog.user_id == User.id, isouter=True)
                .order_by(AuditLog.created_at.desc())
                .limit(limit)
            )
        ).all()
    )
    out = []
    for entry, actor in rows:
        details = entry.details or {}
        result = details.get("result") or ("OK" if "reject" not in entry.action else "DENIED")
        out.append(
            {
                "id": str(entry.id),
                "actor": actor or "System",
                "action": entry.action,
                "target": entry.resource_id or entry.resource_type,
                "resourceType": entry.resource_type,
                "result": result,
                "time": _relative(entry.created_at),
            }
        )
    return out


# --------------------------------------------------------------------------- #
# Team membership (first workspace the user belongs to, admin sees the first)
# --------------------------------------------------------------------------- #
async def _resolve_team_workspace(db: AsyncSession, user: User) -> uuid.UUID:
    ws_ids = await user_workspace_ids(db, user)
    if not ws_ids:
        raise ForbiddenError("You do not belong to any workspace")
    return ws_ids[0]


@router.get("/team/members")
async def team_members(
    workspace_id: str | None = Query(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    ws_id = uuid.UUID(workspace_id) if workspace_id else await _resolve_team_workspace(db, user)
    await ensure_workspace_permission(db, user, ws_id, "workspace.read")
    rows = list(
        (
            await db.execute(
                select(WorkspaceMember, User)
                .join(User, WorkspaceMember.user_id == User.id, isouter=True)
                .where(WorkspaceMember.workspace_id == ws_id)
            )
        ).all()
    )
    out = []
    for member, m_user in rows:
        out.append(
            {
                "id": str(member.user_id),
                "name": (m_user.full_name if m_user else None) or "Unknown",
                "email": (m_user.email if m_user else None) or member.user_id,
                "role": member.role.value if hasattr(member.role, "value") else str(member.role),
                "title": _title_for(member.role),
                "status": "active" if (m_user is None or m_user.is_active) else "inactive",
            }
        )
    return out


def _title_for(role: WorkspaceRole) -> str:
    return {
        WorkspaceRole.owner: "Workspace Owner",
        WorkspaceRole.admin: "Workspace Admin",
        WorkspaceRole.member: "Member",
        WorkspaceRole.viewer: "Viewer",
    }.get(role, "Member")


async def _member(db: AsyncSession, ws_id: uuid.UUID, user_id: str) -> WorkspaceMember:
    row = (
        (
            await db.execute(
                select(WorkspaceMember).where(
                    WorkspaceMember.workspace_id == ws_id,
                    WorkspaceMember.user_id == uuid.UUID(user_id),
                )
            )
        )
        .scalars()
        .first()
    )
    if row is None:
        raise NotFoundError("Member was not found in this workspace")
    return row


@router.post("/team/members", status_code=201)
async def invite_member(
    payload: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Invite an existing platform user into the current workspace.

    The demo flow invites by email; if the account does not exist yet the
    member is created as an inactive placeholder that flips active on first
    login/registration with that email."""
    ws_id = (
        uuid.UUID(payload["workspaceId"])
        if payload.get("workspaceId")
        else await _resolve_team_workspace(db, user)
    )
    await ensure_workspace_permission(db, user, ws_id, "workspace.update")
    email = str(payload.get("email") or "").strip().lower()
    if not email or "@" not in email:
        raise ValidationError("A valid email address is required")
    role = str(payload.get("role") or "viewer")
    if role not in {r.value for r in WorkspaceRole}:
        raise ValidationError(f"Invalid workspace role: {role}")

    target = (await db.execute(select(User).where(User.email == email))).scalars().first()
    existing_member = (
        (
            await db.execute(
                select(WorkspaceMember).where(
                    WorkspaceMember.workspace_id == ws_id,
                    WorkspaceMember.user_id == (target.id if target else uuid.uuid4()),
                )
            )
        )
        .scalars()
        .first()
    )
    if existing_member is not None:
        raise ValidationError("This person is already a member of the workspace")

    if target is None:
        from app.core.security import hash_password

        target = User(
            email=email,
            full_name=email.split("@")[0].title(),
            password_hash=hash_password(uuid.uuid4().hex),  # unusable random password until first login
            role=UserRole.viewer,
            is_active=False,  # flips active on first real login/registration
        )
        db.add(target)
        await db.flush()
    member = WorkspaceMember(workspace_id=ws_id, user_id=target.id, role=WorkspaceRole(role))
    db.add(member)
    db.add(
        AuditLog(
            workspace_id=ws_id,
            user_id=user.id,
            action="team.invite",
            resource_type="workspace_member",
            resource_id=str(target.id),
            details={"email": email, "role": role},
        )
    )
    await db.commit()
    return {
        "id": str(target.id),
        "name": target.full_name,
        "email": target.email,
        "role": role,
        "title": _title_for(WorkspaceRole(role)),
        "status": "invited",
    }


@router.put("/team/members/{member_user_id}")
@router.patch("/team/members/{member_user_id}")
async def update_member_role(
    member_user_id: str,
    payload: TeamRoleUpdateIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    ws_id = await _resolve_team_workspace(db, user)
    await ensure_workspace_permission(db, user, ws_id, "workspace.update")
    member = await _member(db, ws_id, member_user_id)
    member.role = payload.role
    db.add(
        AuditLog(
            workspace_id=ws_id,
            user_id=user.id,
            action="team.role_change",
            resource_type="workspace_member",
            resource_id=member_user_id,
            details={"role": payload.role.value},
        )
    )
    await db.commit()
    return {
        "id": member_user_id,
        "role": payload.role.value,
        "title": _title_for(payload.role),
        "status": "active",
    }


@router.delete("/team/members/{member_user_id}", status_code=204)
async def remove_member(
    member_user_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    ws_id = await _resolve_team_workspace(db, user)
    await ensure_workspace_permission(db, user, ws_id, "workspace.update")
    if str(user.id) == member_user_id:
        raise ValidationError("You cannot remove yourself from the workspace")
    member = await _member(db, ws_id, member_user_id)
    await db.delete(member)
    db.add(
        AuditLog(
            workspace_id=ws_id,
            user_id=user.id,
            action="team.remove",
            resource_type="workspace_member",
            resource_id=member_user_id,
            details={},
        )
    )
    await db.commit()
    return None
