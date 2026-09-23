"""Permission + risk policy for external-system adapters (spec §12, §15).

Single source of truth for which RBAC permission each adapter-backed
capability requires and what risk tier it carries. The Tool Registry builds
its ToolSpecs from these policies (and a regression test asserts the two
stay in sync), so the policy cannot drift between the registry, the
governance API and the `/workspace/tools` catalog.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class AdapterPolicy:
    """Declarative permission/risk policy for one governed capability."""

    name: str
    permission: str
    risk: str  # low | medium | high | critical


# Adapter-backed capabilities. Communication tools carry MEDIUM risk
# (external side effects, permission-gated — spec §15 tier table); read-only
# introspection is LOW; anything mutating an external system beyond messaging
# is registered HIGH/CRITICAL in the registry.
POLICIES: dict[str, AdapterPolicy] = {
    "db.introspect": AdapterPolicy("db.introspect", "connection.read", "low"),
    "db.query": AdapterPolicy("db.query", "sql.execute", "medium"),
    "notify.email": AdapterPolicy("notify.email", "notification.send", "medium"),
    "notify.chat": AdapterPolicy("notify.chat", "notification.send", "medium"),
    "team.create_task": AdapterPolicy("team.create_task", "task.create", "low"),
    "team.jira_create_issue": AdapterPolicy(
        "team.jira_create_issue", "task.create", "medium"
    ),
    "pipeline.trigger": AdapterPolicy("pipeline.trigger", "pipeline.execute", "high"),
}


def policy_for(tool: str) -> AdapterPolicy | None:
    return POLICIES.get(tool)
