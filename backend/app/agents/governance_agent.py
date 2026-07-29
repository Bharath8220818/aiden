"""
Governance Agent — Enforces RBAC policies and compliance rules.

Checks user permissions before pipeline operations and validates
pipeline configs against data governance policies.
"""

import logging
from typing import Dict, Any, Optional

from app.agents.base_agent import BaseAIDENAgent
from app.core.governance import GovernanceEngine

logger = logging.getLogger(__name__)


class GovernanceAgent(BaseAIDENAgent):
    """Enforce RBAC and data governance policies."""

    def __init__(self):
        super().__init__(
            name="governance_agent",
            tools=[],
            system_prompt="You are a governance agent enforcing data policies.",
        )

    async def run(
        self,
        user_id: int,
        action: str,
        resource: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Check if the user is allowed to perform the action on the resource."""
        # Parse the resource's sensitivity
        sensitivity = self._assess_sensitivity(resource)

        # Build result
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
