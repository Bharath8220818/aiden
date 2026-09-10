"""AIDEN Security Agent — permission checks, action auditing, anomaly detection.

The agent does NOT execute actions itself; it evaluates whether an action
should proceed, raises security alerts when blocked, and records audit entries.
"""
import logging
import time
from typing import Optional

from app.schemas.agent_communication import AgentTask, AgentResult, AgentType, TaskStatus
from app.agents.base_agent_v2 import BaseAIDENAgent
from app.security.agent_permissions import AGENT_PERMISSIONS

logger = logging.getLogger(__name__)


class SecurityAgent(BaseAIDENAgent):
    """Audits actions before execution and detects permission violations."""

    name = "security_agent"
    agent_type = AgentType.SECURITY
    description = "Audits actions, enforces permissions, and detects anomalies"
    system_prompt = (
        "You are the AIDEN Security Agent. You audit data engineering actions before "
        "execution: verify the actor has permission for the action on the resource, detect "
        "anomalous patterns (off-hours access, mass deletes, production changes without "
        "approval), and block anything that violates policy. Respond with allow/deny plus "
        "a reason and severity. Never allow destructive production actions without approval."
    )
    permissions = ["security.audit", "security.read"]
    tool_names = []

    # ── Core checks ─────────────────────────────────────────────────────

    def audit_action(
        self,
        user_role: str,
        action: str,
        resource: str,
        environment: str = "dev",
    ) -> dict:
        """Evaluate whether a role may perform an action on a resource.

        Returns {allowed, reason, risk, approval_required}.
        """
        from app.services.risk_engine import RiskEngine, RiskLevel

        risk = RiskEngine.evaluate(action, environment)
        allowed_by_role = RiskEngine.can_approve(risk, user_role or "viewer")

        # Mutating actions in production always need approval regardless of role
        approval_required = RiskEngine.requires_approval(risk)
        if environment in ("prod", "production") and approval_required:
            allowed = allowed_by_role
        else:
            allowed = allowed_by_role or risk == RiskLevel.LOW

        result = {
            "allowed": allowed,
            "reason": (
                "permitted" if allowed
                else f"role '{user_role}' may not perform '{action}' (risk {risk.value}) in {environment}"
            ),
            "risk": risk.value,
            "approval_required": approval_required and environment in ("prod", "production"),
        }

        if not allowed:
            self._raise_alert("unauthorized_action", user_role, action, resource, result)
        return result

    def check_agent_permission(self, agent_name: str, capability: str) -> bool:
        """Check an agent's permission matrix entry (e.g. 'database.query.read')."""
        perms = AGENT_PERMISSIONS.get(agent_name, [])
        if capability in perms or f"{capability.rsplit('.', 1)[0]}.*" in perms:
            return True
        return any(p.endswith(".*") and capability.startswith(p[:-1]) for p in perms)

    # ── Anomaly heuristics ──────────────────────────────────────────────

    def detect_anomalies(self, action: str, params: dict, context: dict) -> list:
        """Flag suspicious patterns. Returns a list of anomaly descriptions."""
        anomalies = []
        lower_action = (action or "").lower()

        if any(kw in lower_action for kw in ("delete", "drop", "truncate")):
            anomalies.append("destructive action detected")

        where = str(params.get("where", "") or params.get("sql", "")).lower()
        if "where" not in where and any(kw in lower_action for kw in ("delete", "update")):
            anomalies.append("mass change without WHERE clause")

        hour = time.localtime().tm_hour
        if hour < 6 and environment_in(context, ("prod", "production")):
            anomalies.append("production change outside business hours")

        return anomalies

    # ── Alerts ──────────────────────────────────────────────────────────

    def _raise_alert(self, kind: str, user_role: str, action: str, resource: str, result: dict):
        """Record a security alert (async fire-and-forget)."""
        import asyncio
        try:
            asyncio.get_event_loop().create_task(self._emit_alert(kind, user_role, action, resource, result))
        except RuntimeError:
            pass  # no running loop (tests) — alert skipped

    async def _emit_alert(self, kind: str, user_role: str, action: str, resource: str, result: dict):
        try:
            from app.services.event_bus import EventBus
            await EventBus.publish("security.alert", {
                "kind": kind,
                "user_role": user_role,
                "action": action,
                "resource": resource,
                "risk": result.get("risk"),
                "reason": result.get("reason"),
            })
        except Exception as e:
            logger.debug(f"Security alert publish failed: {e}")

    # ── Agent interface ─────────────────────────────────────────────────

    async def _execute_fallback(self, task: AgentTask, context: dict) -> AgentResult:
        start = time.monotonic()
        audit = self.audit_action(
            user_role=context.get("user_role", "engineer"),
            action=context.get("action", task.objective[:50]),
            resource=context.get("resource", "unknown"),
            environment=context.get("environment", "dev"),
        )
        anomalies = self.detect_anomalies(context.get("action", ""), context.get("params", {}), context)
        return AgentResult(
            task_id=task.task_id,
            agent_name=self.name,
            agent_type=self.agent_type,
            status=TaskStatus.SUCCESS,
            output={"response": audit["reason"], "audit": audit, "anomalies": anomalies},
            confidence=0.9,
            evidence=[f"risk={audit['risk']}", f"allowed={audit['allowed']}"],
            execution_time_ms=(time.monotonic() - start) * 1000,
        )


def environment_in(context: dict, names) -> bool:
    return str(context.get("environment", "")).lower() in names
