"""Approval schemas."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime

from pydantic import Field

from app.schemas.common import APIModel, ListResponse


class ApprovalType(str, enum.Enum):
    healing_deploy = "healing_deploy"
    pipeline_change = "pipeline_change"
    agent_grant = "agent_grant"
    incident_resolution = "incident_resolution"
    tool_execution = "tool_execution"


class ApprovalStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class RiskLevel(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"


class ApprovalCreate(APIModel):
    project_id: uuid.UUID | None = None
    incident_id: uuid.UUID | None = None
    pipeline_id: uuid.UUID | None = None
    request_type: ApprovalType = ApprovalType.pipeline_change
    summary: str = Field(min_length=1, max_length=4000)
    risk_level: RiskLevel = RiskLevel.medium
    requested_by: uuid.UUID | None = None


class ApprovalDecision(APIModel):
    approved: bool
    reason: str | None = None


class ApprovalOut(APIModel):
    id: uuid.UUID
    project_id: uuid.UUID | None = None
    incident_id: uuid.UUID | None = None
    pipeline_id: uuid.UUID | None = None
    request_type: ApprovalType
    status: ApprovalStatus
    summary: str
    risk_level: RiskLevel
    requested_by: uuid.UUID | None = None
    approved_by: uuid.UUID | None = None
    decided_at: datetime | None = None
    created_at: datetime


class ApprovalListOut(ListResponse[ApprovalOut]):
    pass
