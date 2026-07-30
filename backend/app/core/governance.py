"""
Governance — RBAC, audit enforcement, and compliance checks.

Provides role-based access control, audit logging helpers, and
compliance validation for pipeline operations.
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User
from app.models.audit import AuditLogEntry

logger = logging.getLogger(__name__)


class GovernanceEngine:
    """Role-based access control and audit enforcement."""

    RBAC_ROLES = {
        "admin": {"create", "read", "update", "delete", "approve", "deploy", "manage_users"},
        "engineer": {"create", "read", "update", "delete", "deploy"},
        "analyst": {"read", "create"},
        "viewer": {"read"},
    }

    def __init__(self, db: AsyncSession):
        self.db = db

    def check_permission(self, user: User, action: str) -> bool:
        """Check if a user has permission for a given action."""
        role = "admin" if user.is_superuser else "engineer"
        allowed = self.RBAC_ROLES.get(role, set())
        return action in allowed

    async def log_action(
        self,
        user_id: int,
        action: str,
        resource_type: str,
        resource_id: Optional[int] = None,
        details: Optional[Dict[str, Any]] = None,

    ):
        """Create an audit log entry."""
        entry = AuditLogEntry(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details or {},
            severity=severity,
        )
        self.db.add(entry)
        await self.db.commit()
        await self.db.refresh(entry)
        return entry


class ComplianceValidator:
    """Validate pipelines against compliance rules."""

    @staticmethod
    async def validate_pipeline_config(config: Dict[str, Any]) -> List[str]:
        """Validate pipeline config against compliance policies. Returns list of warnings."""
        warnings = []
        source = config.get("source_type", "")
        destination = config.get("destination_type", "")

        # PII detection
        if "pii" not in str(config.get("transformations", [])).lower():
            warnings.append("No PII masking transformation detected — consider adding one.")

        # Encryption check
        if "encrypt" not in str(config).lower():
            warnings.append("No encryption step detected for sensitive data.")

        # Audit trail
        if not config.get("schedule"):
            warnings.append("No schedule defined — pipeline will not run automatically.")

        # Cross-border data flow
        cross_border = {"eu", "gdpr", "us", "ccpa"}
        if any(term in str(config).lower() for term in cross_border):
            warnings.append("Cross-border data flow detected — ensure compliance with local regulations.")

        return warnings
