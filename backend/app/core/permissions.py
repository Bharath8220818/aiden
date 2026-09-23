"""Explicit permission catalog + role mappings (Phase 2.4/2.5).

Permissions are explicit strings (never ``if role == "ADMIN"``) grouped by
domain, e.g. ``project.create``. Two role axes grant permissions:

- **System role** (``User.role``): admin / lead / engineer / viewer — the
  platform-level identity from the frontend RBAC contract.
- **Workspace role** (``WorkspaceMember.role``): owner / admin / member /
  viewer — per-workspace membership (Phase 2.3: permissions are
  workspace-aware; the same user can be ENGINEER in one workspace and VIEWER
  in another).

The effective permission set for a workspace context is the union of the
system-role grants and the workspace-role grants.
"""

from __future__ import annotations

from app.models.user import UserRole
from app.models.workspace_member import WorkspaceRole

# --------------------------------------------------------------------------- #
# Permission catalog — grouped by domain (Phase 2.5)
# --------------------------------------------------------------------------- #
WORKSPACE = ("workspace.read", "workspace.update", "workspace.delete", "workspace.create")
PROJECT = ("project.read", "project.create", "project.update", "project.delete")
PIPELINE = (
    "pipeline.read",
    "pipeline.create",
    "pipeline.execute",
    "pipeline.pause",
    "pipeline.deploy",
)
SQL = ("sql.read", "sql.execute", "sql.destructive")
INCIDENT = ("incident.read", "incident.update")
HEALING = ("healing.read", "healing.propose", "healing.execute")
APPROVAL = ("approval.read", "approval.create", "approval.approve")
CONNECTION = (
    "connection.read",
    "connection.create",
    "connection.update",
    "connection.delete",
)
USER = ("user.read", "user.create", "user.update")
# Phase F domains — the frontend RBAC matrix grants these surfaces per role,
# and the backend gates must match exactly (contract-matrix rows).
ARCHITECTURE = ("architecture.read", "architecture.edit")
MONITORING = ("monitoring.read",)
AGENT = ("agent.read", "agent.control")
KNOWLEDGE = ("knowledge.read", "knowledge.write")
TEAM = ("team.manage",)
# Integration-gateway domains (Sprint: tool gateway) — internal tasks +
# notification channels. Viewer reads the bell drawer; engineer+ send/ manage.
TASK = ("task.read", "task.create", "task.update")
NOTIFICATION = ("notification.read", "notification.send")

ALL_PERMISSIONS: frozenset[str] = frozenset(
    WORKSPACE
    + PROJECT
    + PIPELINE
    + SQL
    + INCIDENT
    + HEALING
    + APPROVAL
    + CONNECTION
    + USER
    + ARCHITECTURE
    + MONITORING
    + AGENT
    + KNOWLEDGE
    + TEAM
    + TASK
    + NOTIFICATION
)

# --------------------------------------------------------------------------- #
# Role hierarchy (Phase 2.4) — higher roles inherit all lower grants.
# --------------------------------------------------------------------------- #
_ROLE_RANK: dict[str, int] = {"viewer": 0, "engineer": 1, "lead": 2, "admin": 3}


def role_at_least(role: str, minimum: str) -> bool:
    return _ROLE_RANK.get(role, -1) >= _ROLE_RANK.get(minimum, 99)


# --------------------------------------------------------------------------- #
# System-role grants (Phase 2.5 mapping)
# --------------------------------------------------------------------------- #
SYSTEM_ROLE_PERMISSIONS: dict[UserRole, frozenset[str]] = {
    UserRole.viewer: frozenset(
        {
            "workspace.read",
            "project.read",
            "pipeline.read",
            "incident.read",
            # Cross-domain read gates (Phase F: the frontend grants every
            # signed-in role read access to these surfaces, so the backend
            # catalog must mirror them or every page 403s for viewers).
            "architecture.read",
            "monitoring.read",
            "agent.read",
            "knowledge.read",
            "connection.read",
            "approval.read",
            "sql.read",
            "task.read",
            "notification.read",
        }
    ),
    UserRole.engineer: frozenset(
        {
            # viewer permissions +
            "workspace.read",
            "project.read",
            "pipeline.read",
            "incident.read",
            # engineer additions
            "workspace.create",
            "project.create",
            "project.update",
            "pipeline.create",
            "pipeline.execute",
            "pipeline.pause",
            "sql.read",
            "sql.execute",
            "healing.read",
            "healing.propose",
            "architecture.read",
            "monitoring.read",
            "agent.read",
            "knowledge.read",
            "knowledge.write",
            "connection.read",
            "approval.read",
            "task.read",
            "task.create",
            "task.update",
            "notification.read",
            "notification.send",
        }
    ),
    UserRole.lead: frozenset(
        {
            # engineer permissions +
            "workspace.read",
            "workspace.create",
            "workspace.update",
            "workspace.delete",
            "project.read",
            "project.create",
            "project.update",
            "project.delete",
            "pipeline.read",
            "pipeline.create",
            "pipeline.execute",
            "pipeline.pause",
            "pipeline.deploy",
            "sql.read",
            "sql.execute",
            "sql.destructive",
            "incident.read",
            "incident.update",
            "healing.read",
            "healing.propose",
            "healing.execute",
            "approval.read",
            "approval.create",
            "approval.approve",
            "connection.read",
            "connection.create",
            "connection.update",
            "connection.delete",
            "architecture.read",
            "monitoring.read",
            "agent.read",
            "agent.control",
            "knowledge.read",
            "knowledge.write",
            "team.manage",
            "task.read",
            "task.create",
            "task.update",
            "notification.read",
            "notification.send",
        }
    ),
    UserRole.admin: ALL_PERMISSIONS,
}

# Platform user management is an admin-only capability (Phase 2.9: /users
# administers accounts; open self-registration goes through /auth/register).
SYSTEM_ROLE_PERMISSIONS[UserRole.admin] = SYSTEM_ROLE_PERMISSIONS[UserRole.admin] | frozenset(USER)
for _role in (UserRole.viewer, UserRole.engineer, UserRole.lead):
    SYSTEM_ROLE_PERMISSIONS[_role] = SYSTEM_ROLE_PERMISSIONS[_role] - set(USER)

# --------------------------------------------------------------------------- #
# Workspace-role grants (Phase 2.3 workspace-aware axis)
# --------------------------------------------------------------------------- #
WORKSPACE_ROLE_PERMISSIONS: dict[WorkspaceRole, frozenset[str]] = {
    WorkspaceRole.owner: ALL_PERMISSIONS,
    WorkspaceRole.admin: ALL_PERMISSIONS - {"workspace.delete"},
    WorkspaceRole.member: SYSTEM_ROLE_PERMISSIONS[UserRole.engineer],
    WorkspaceRole.viewer: SYSTEM_ROLE_PERMISSIONS[UserRole.viewer],
}

# Workspace roles considered "at least engineer" — used by sensitive-op flows.
ENGINEER_PLUS_WORKSPACE_ROLES: frozenset[WorkspaceRole] = frozenset(
    {WorkspaceRole.owner, WorkspaceRole.admin, WorkspaceRole.member}
)


def permissions_for_system_role(role: UserRole | str) -> frozenset[str]:
    if isinstance(role, str):
        role = UserRole(role)
    return SYSTEM_ROLE_PERMISSIONS[role]


def permissions_for_workspace_role(role: WorkspaceRole | str) -> frozenset[str]:
    if isinstance(role, str):
        role = WorkspaceRole(role)
    return WORKSPACE_ROLE_PERMISSIONS[role]


def has_permission(granted: set[str] | frozenset[str], permission: str) -> bool:
    return permission in granted
