import json
import logging
from typing import Dict, Any, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


class SelfHealingEngine:
    """Detect failures, diagnose root causes, propose fixes, and handle approvals."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def diagnose_and_heal(
        self,
        pipeline_id: int,
        execution_id: int,
        error_log: str,
    ) -> Dict[str, Any]:
        """Diagnose a pipeline failure and determine the appropriate fix action."""
        from app.models.approval import ApprovalRequest, ApprovalStatus, ApprovalRisk

        # 1. Diagnose
        diagnosis = self._diagnose(error_log)
        logger.info(f"Diagnosis for pipeline {pipeline_id}: {diagnosis.get('error_type')}")

        # 2. Assess risk
        risk = self._assess_risk(diagnosis)
        logger.info(f"Risk assessment: {risk}")

        # 3. Generate fix
        fix = self._generate_fix(diagnosis)
        logger.info(f"Fix proposed: {fix.get('description', 'N/A')}")

        # 4. Handle based on risk
        if risk == "low":
            return {
                "action": "auto_apply",
                "fix": fix,
                "diagnosis": diagnosis,
                "risk": risk,
                "message": "Low-risk fix auto-applied",
            }

        elif risk == "medium":
            approval = ApprovalRequest(
                pipeline_id=pipeline_id,
                requested_by=1,
                action="schema_change",
                details={"diagnosis": diagnosis, "fix": fix},
                risk_score=ApprovalRisk.MEDIUM,
                status=ApprovalStatus.PENDING,
            )
            self.db.add(approval)
            await self.db.commit()
            await self.db.refresh(approval)

            return {
                "action": "wait_for_approval",
                "approval_id": approval.id,
                "fix": fix,
                "diagnosis": diagnosis,
                "risk": risk,
                "message": f"Approval #{approval.id} created for medium-risk fix",
            }

        else:  # high risk
            return {
                "action": "escalate",
                "diagnosis": diagnosis,
                "risk": risk,
                "message": "High-risk change requires manual intervention. Escalated.",
            }

    def _diagnose(self, error_log: str) -> Dict[str, Any]:
        """Diagnose the root cause of a pipeline failure."""
        error_lower = error_log.lower()

        if ("column" in error_lower and ("not found" in error_lower or "does not exist" in error_lower)) \
                or "undefined_column" in error_lower:
            return {
                "error_type": "schema_drift",
                "root_cause": "A column referenced in the pipeline no longer exists in the source schema.",
                "affected_component": "extract",
                "severity": "medium",
            }
        elif "null" in error_lower or "not null" in error_lower:
            return {
                "error_type": "data_quality",
                "root_cause": "NULL value encountered in a NOT NULL column.",
                "affected_component": "transform",
                "severity": "low",
            }
        elif "timeout" in error_lower or "timed out" in error_lower:
            return {
                "error_type": "timeout",
                "root_cause": "Operation exceeded the configured timeout.",
                "affected_component": "load",
                "severity": "low",
            }
        elif "connection" in error_lower or "connect" in error_lower:
            return {
                "error_type": "dependency",
                "root_cause": "Failed to connect to the source or destination system.",
                "affected_component": "extract",
                "severity": "medium",
            }
        else:
            return {
                "error_type": "code_error",
                "root_cause": "An unexpected error occurred during pipeline execution.",
                "affected_component": "unknown",
                "severity": "high",
            }

    def _assess_risk(self, diagnosis: Dict[str, Any]) -> str:
        """Assess the risk level of a proposed fix."""
        severity = diagnosis.get("severity", "high")
        error_type = diagnosis.get("error_type", "")

        if error_type == "schema_drift":
            return "medium"
        elif error_type in ("data_quality", "timeout"):
            return "low"
        elif error_type == "dependency":
            return "medium"
        elif severity == "high":
            return "high"
        return "medium"

    def _generate_fix(self, diagnosis: Dict[str, Any]) -> Dict[str, Any]:
        """Generate a fix proposal based on the diagnosis."""
        error_type = diagnosis.get("error_type", "")

        if error_type == "schema_drift":
            return {
                "description": "Update column reference to match the new schema.",
                "code": "-- Rename column to match new schema\nALTER TABLE source_table RENAME COLUMN old_name TO new_name;",
                "estimated_time_minutes": 5,
                "requires_approval": True,
            }
        elif error_type == "data_quality":
            return {
                "description": "Add COALESCE or default value to handle NULLs.",
                "code": "SELECT COALESCE(column_name, 'default_value') AS column_name FROM source_table;",
                "estimated_time_minutes": 2,
                "requires_approval": False,
            }
        elif error_type == "timeout":
            return {
                "description": "Increase the query timeout or optimize the operation.",
                "code": '-- Increase statement timeout\nSET statement_timeout = 300000;  -- 5 minutes',
                "estimated_time_minutes": 1,
                "requires_approval": False,
            }
        elif error_type == "dependency":
            return {
                "description": "Check connection credentials and network access.",
                "code": "# Verify connection\nimport psycopg2\nconn = psycopg2.connect(host='...', port=5432, dbname='...')",
                "estimated_time_minutes": 10,
                "requires_approval": True,
            }
        else:
            return {
                "description": "Review the error log and fix the code.",
                "code": "# Please review the error and fix accordingly\n# Error: " + diagnosis.get("root_cause", ""),
                "estimated_time_minutes": 30,
                "requires_approval": True,
            }
