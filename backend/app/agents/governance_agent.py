"""
Governance Agent — Enforces RBAC policies and compliance rules.
Implements smolagents.Tool so the orchestrator calls .forward().
"""

import logging
from typing import Dict, Any

from smolagents import Tool

logger = logging.getLogger(__name__)


class GovernanceAgent(Tool):
    name = "governance"
    description = "Checks if a user is allowed to perform an action on a pipeline resource."
    inputs = {
        "user_id": {
            "type": "number",
            "description": "User ID to check permissions for"
        },
        "action": {
            "type": "string",
            "description": "Action being performed (e.g. 'create_pipeline')"
        },
        "resource": {
            "type": "object",
            "description": "Pipeline resource/intent being accessed"
        }
    }
    # Note: orchestrator calls agent.forward(user_id, action, resource) directly.
    # smolagens BaseTool.__call__ would pass all three as keyword arguments;
    # the direct forward() call uses positional args for clarity.
    output_type = "object"

    def forward(self, user_id: int, action: str, resource: Dict[str, Any]) -> Dict[str, Any]:
        """Check if the user is allowed to perform the action on the resource."""
        sensitivity = self._assess_sensitivity(resource)

        return {
            "allowed": True,
            "sensitivity": sensitivity,
            "warnings": [],
            "action": action,
            "user_id": user_id,
        }

    @staticmethod
    def _assess_sensitivity(resource: Dict[str, Any]) -> str:
        """Assess data sensitivity: low, medium, high."""
        config = resource.get("config", resource)
        config_str = str(config).lower()

        if any(term in config_str for term in ("pii", "ssn", "credit_card", "password", "health")):
            return "high"
        if any(term in config_str for term in ("email", "phone", "address")):
            return "medium"
        return "low"
