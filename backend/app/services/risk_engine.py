"""AIDEN Risk Engine — scores the danger of an action before execution.

Combines:
  - an intrinsic action score (read=1 .. delete_data=10)
  - an environment multiplier (dev=1, staging=2, production=3)
  - a role clearance factor (viewer cannot approve anything)

The result drives whether human approval is required (see security/approval.py).
"""
from enum import Enum


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


# Intrinsic risk per action (1 = harmless read, 10 = destructive)
ACTION_RISK = {
    "read_schema": 1,
    "list_tables": 1,
    "describe_table": 1,
    "get_logs": 1,
    "get_status": 1,
    "health_check": 1,
    "run_select": 2,
    "execute_readonly_sql": 2,
    "run_test": 2,
    "restart_task": 5,
    "clear_cache": 5,
    "pause_dag": 5,
    "trigger_dag": 6,
    "modify_dag": 8,
    "create_topic": 6,
    "delete_topic": 9,
    "run_model": 6,
    "alter_table": 9,
    "drop_table": 10,
    "delete_data": 10,
    "deploy_production": 9,
    "rollback_deployment": 7,
}

ENVIRONMENT_FACTOR = {
    "dev": 1,
    "development": 1,
    "test": 1,
    "qa": 1,
    "staging": 2,
    "stage": 2,
    "prod": 3,
    "production": 3,
}

# Roles that can approve each risk level (RBAC hook)
APPROVAL_MATRIX = {
    RiskLevel.LOW: {"viewer", "engineer", "admin", "owner"},
    RiskLevel.MEDIUM: {"engineer", "admin", "owner"},
    RiskLevel.HIGH: {"admin", "owner"},
    RiskLevel.CRITICAL: {"owner"},
}


class RiskEngine:
    """Stateless risk scorer."""

    @classmethod
    def base_score(cls, action: str) -> int:
        return ACTION_RISK.get(action.lower().strip(), 5)

    @classmethod
    def evaluate(cls, action: str, environment: str = "dev", user_role: str = "engineer") -> RiskLevel:
        """Score an action in an environment and return the risk level."""
        base = cls.base_score(action)
        env_factor = ENVIRONMENT_FACTOR.get((environment or "dev").lower().strip(), 2)
        score = base * env_factor
        return cls.score_to_level(score)

    @classmethod
    def score_to_level(cls, score: int) -> RiskLevel:
        if score <= 3:
            return RiskLevel.LOW
        if score <= 9:
            return RiskLevel.MEDIUM
        if score <= 18:
            return RiskLevel.HIGH
        return RiskLevel.CRITICAL

    @classmethod
    def requires_approval(cls, risk: RiskLevel) -> bool:
        return risk in (RiskLevel.MEDIUM, RiskLevel.HIGH, RiskLevel.CRITICAL)

    @classmethod
    def can_approve(cls, risk: RiskLevel, user_role: str) -> bool:
        """Check whether a role is allowed to approve this risk level."""
        return user_role.lower() in APPROVAL_MATRIX.get(risk, set())

    @classmethod
    def assess_tool_call(cls, tool: str, action: str, environment: str = "dev") -> dict:
        """Full assessment dict for a tool invocation (used by Tool Gateway)."""
        risk = cls.evaluate(action, environment)
        return {
            "tool": tool,
            "action": action,
            "environment": environment,
            "base_score": cls.base_score(action),
            "risk": risk.value,
            "approval_required": cls.requires_approval(risk),
        }
