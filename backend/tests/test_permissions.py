"""Permission + resource-level authorization tests (Phase 2.5/2.7/2.8).

Implements the Phase 2 GATE matrix end-to-end against the API:

    anonymous → protected API        → 401
    viewer     → read project        → 200
    viewer     → deploy pipeline     → 403
    engineer   → deploy production   → approval required
    admin      → administrative op   → 200
"""

from __future__ import annotations

import uuid

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token
from app.models import (
    Approval,
    ApprovalStatus,
    Pipeline,
    PipelineType,
    User,
    UserRole,
    WorkspaceRole,
)
from tests.helpers import seed_user, seed_workspace_with_member


def _auth(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(str(user.id))}"}


async def _seed_pipeline(
    db: AsyncSession, member_role: WorkspaceRole, *, member_system_role: UserRole = UserRole.engineer
):
    """Member + outsider + workspace + project + pipeline. Returns everything."""
    member = await seed_user(db, role=member_system_role)
    outsider = await seed_user(db, role=UserRole.engineer)
    ws, project = await seed_workspace_with_member(db, member, member_role=member_role, with_project=True)
    pipeline = Pipeline(
        project_id=project.id,
        name=f"pipe-{uuid.uuid4().hex[:6]}",
        pipeline_type=PipelineType.batch,
    )
    db.add(pipeline)
    await db.commit()
    return member, outsider, ws, project, pipeline


# --------------------------------------------------------------------------- #
# Unit-level: permission catalog
# --------------------------------------------------------------------------- #
async def test_permission_catalog_shape() -> None:
    from app.core.permissions import (
        ALL_PERMISSIONS,
        SYSTEM_ROLE_PERMISSIONS,
        WORKSPACE_ROLE_PERMISSIONS,
    )

    # Hierarchy: viewer ⊂ engineer ⊂ lead ⊂ admin
    v = SYSTEM_ROLE_PERMISSIONS[UserRole.viewer]
    e = SYSTEM_ROLE_PERMISSIONS[UserRole.engineer]
    lead = SYSTEM_ROLE_PERMISSIONS[UserRole.lead]
    a = SYSTEM_ROLE_PERMISSIONS[UserRole.admin]
    assert v < e < lead < a

    # Sensitive permissions live only where the spec puts them.
    assert "pipeline.deploy" not in e
    assert "pipeline.deploy" in lead
    assert "approval.approve" in lead
    assert "sql.destructive" not in e
    assert "sql.destructive" in lead
    assert a == ALL_PERMISSIONS

    # Workspace axis mirrors the tiers.
    assert WORKSPACE_ROLE_PERMISSIONS[WorkspaceRole.owner] == ALL_PERMISSIONS
    assert "workspace.delete" not in WORKSPACE_ROLE_PERMISSIONS[WorkspaceRole.admin]
    assert WORKSPACE_ROLE_PERMISSIONS[WorkspaceRole.member] == e


# --------------------------------------------------------------------------- #
# GATE: anonymous → 401
# --------------------------------------------------------------------------- #
async def test_gate_anonymous_gets_401(client: httpx.AsyncClient) -> None:
    resp = await client.get("/api/v1/pipelines")
    assert resp.status_code == 401


# --------------------------------------------------------------------------- #
# GATE: viewer → read project → 200
# --------------------------------------------------------------------------- #
async def test_gate_viewer_can_read_project(client: httpx.AsyncClient, db_session: AsyncSession) -> None:
    viewer, _, ws, project, _ = await _seed_pipeline(
        db_session, WorkspaceRole.viewer, member_system_role=UserRole.viewer
    )
    resp = await client.get(f"/api/v1/projects/{project.id}", headers=_auth(viewer))
    assert resp.status_code == 200
    assert resp.json()["id"] == str(project.id)


# --------------------------------------------------------------------------- #
# GATE: viewer → deploy pipeline → 403
# --------------------------------------------------------------------------- #
async def test_gate_viewer_cannot_deploy(client: httpx.AsyncClient, db_session: AsyncSession) -> None:
    viewer, _, _, _, pipeline = await _seed_pipeline(
        db_session, WorkspaceRole.viewer, member_system_role=UserRole.viewer
    )
    resp = await client.post(f"/api/v1/pipelines/{pipeline.id}/deploy", headers=_auth(viewer))
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "FORBIDDEN"


async def test_viewer_cannot_create_project(client: httpx.AsyncClient, db_session: AsyncSession) -> None:
    viewer, _, ws, _, _ = await _seed_pipeline(
        db_session, WorkspaceRole.viewer, member_system_role=UserRole.viewer
    )
    resp = await client.post(
        "/api/v1/projects",
        json={"workspace_id": str(ws.id), "name": "Viewer Project"},
        headers=_auth(viewer),
    )
    assert resp.status_code == 403


# --------------------------------------------------------------------------- #
# GATE: engineer → deploy production → approval required
# --------------------------------------------------------------------------- #
async def test_gate_engineer_deploy_requires_approval(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    engineer, _, _, _, pipeline = await _seed_pipeline(db_session, WorkspaceRole.member)
    resp = await client.post(f"/api/v1/pipelines/{pipeline.id}/deploy", headers=_auth(engineer))
    assert resp.status_code == 409
    body = resp.json()
    assert body["error"]["code"] == "APPROVAL_REQUIRED"
    assert body["status"] == "approval_required"
    assert body["approval_id"]

    # The approval is persisted and pending.
    approval = await db_session.get(Approval, uuid.UUID(body["approval_id"]))
    assert approval is not None
    assert approval.status == ApprovalStatus.pending
    assert approval.risk_level.value == "high"


async def test_engineer_deploy_deduplicates_pending_approval(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    engineer, _, _, _, pipeline = await _seed_pipeline(db_session, WorkspaceRole.member)
    first = await client.post(f"/api/v1/pipelines/{pipeline.id}/deploy", headers=_auth(engineer))
    assert first.status_code == 409
    second = await client.post(f"/api/v1/pipelines/{pipeline.id}/deploy", headers=_auth(engineer))
    assert second.status_code == 409
    assert second.json()["error"]["code"] == "APPROVAL_REQUIRED"


# --------------------------------------------------------------------------- #
# GATE: admin → allowed administrative operation → 200
# --------------------------------------------------------------------------- #
async def test_gate_admin_can_list_users_and_read_any_workspace(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    admin = await seed_user(db_session, role=UserRole.admin)
    member, _, ws, _, _ = await _seed_pipeline(db_session, WorkspaceRole.member)

    listing = await client.get("/api/v1/users", headers=_auth(admin))
    assert listing.status_code == 200
    assert listing.json()["total"] >= 2

    detail = await client.get(f"/api/v1/workspaces/{ws.id}", headers=_auth(admin))
    assert detail.status_code == 200


async def test_engineer_cannot_administer_users(client: httpx.AsyncClient, db_session: AsyncSession) -> None:
    engineer = await seed_user(db_session, role=UserRole.engineer)
    resp = await client.get("/api/v1/users", headers=_auth(engineer))
    assert resp.status_code == 403


# --------------------------------------------------------------------------- #
# Resource-level authorization (Phase 2.7)
# --------------------------------------------------------------------------- #
async def test_outside_engineer_cannot_read_project(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    """An engineer who is NOT a member of the workspace gets 403 on its project."""
    _, outsider, _, project, _ = await _seed_pipeline(db_session, WorkspaceRole.member)
    resp = await client.get(f"/api/v1/projects/{project.id}", headers=_auth(outsider))
    assert resp.status_code == 403


async def test_outside_engineer_cannot_run_pipeline(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    _, outsider, _, _, pipeline = await _seed_pipeline(db_session, WorkspaceRole.member)
    resp = await client.post(f"/api/v1/pipelines/{pipeline.id}/run", headers=_auth(outsider))
    assert resp.status_code == 403


async def test_nonmember_cannot_read_workspace(client: httpx.AsyncClient, db_session: AsyncSession) -> None:
    member, outsider, ws, _, _ = await _seed_pipeline(db_session, WorkspaceRole.member)
    resp = await client.get(f"/api/v1/workspaces/{ws.id}", headers=_auth(outsider))
    assert resp.status_code == 403


async def test_member_sees_only_own_workspaces_in_listing(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    member, _, ws, _, _ = await _seed_pipeline(db_session, WorkspaceRole.member)
    other = await seed_user(db_session, role=UserRole.engineer)
    await seed_workspace_with_member(db_session, other, member_role=WorkspaceRole.member)

    resp = await client.get("/api/v1/workspaces", headers=_auth(member))
    assert resp.status_code == 200
    names = [w["id"] for w in resp.json()["items"]]
    assert str(ws.id) in names
    assert len(names) == 1  # only the workspace they belong to


async def test_admin_bypasses_workspace_membership_scoping(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    admin = await seed_user(db_session, role=UserRole.admin)
    member, _, ws, project, _ = await _seed_pipeline(db_session, WorkspaceRole.member)

    listing = await client.get("/api/v1/workspaces", headers=_auth(admin))
    assert listing.status_code == 200
    assert str(ws.id) in [w["id"] for w in listing.json()["items"]]

    projects = await client.get("/api/v1/projects", headers=_auth(admin))
    assert projects.status_code == 200
    assert str(project.id) in [p["id"] for p in projects.json()["items"]]


# --------------------------------------------------------------------------- #
# 404 semantics: missing resources are 404 regardless of permissions
# --------------------------------------------------------------------------- #
async def test_missing_resources_return_404(client: httpx.AsyncClient, db_session: AsyncSession) -> None:
    engineer = await seed_user(db_session, role=UserRole.engineer)
    headers = _auth(engineer)
    missing = uuid.uuid4()

    for path in (
        f"/api/v1/projects/{missing}",
        f"/api/v1/workspaces/{missing}",
        f"/api/v1/pipelines/{missing}",
    ):
        resp = await client.get(str(path), headers=headers)
        assert resp.status_code == 404, path
        assert resp.json()["error"]["code"] == "NOT_FOUND"
