"""Approval model — gated human sign-off for AIDEN autonomous actions."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON, DateTime, ForeignKey, Text, Uuid
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.project import Project


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


class Approval(Base, TimestampMixin):
    __tablename__ = "approvals"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True
    )
    incident_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("incidents.id", ondelete="SET NULL"), nullable=True
    )
    pipeline_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("pipelines.id", ondelete="SET NULL"), nullable=True
    )
    request_type: Mapped[ApprovalType] = mapped_column(
        SAEnum(ApprovalType, native_enum=False, length=30),
        default=ApprovalType.pipeline_change,
        nullable=False,
    )
    status: Mapped[ApprovalStatus] = mapped_column(
        SAEnum(ApprovalStatus, native_enum=False, length=20),
        default=ApprovalStatus.pending,
        nullable=False,
        index=True,
    )
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    risk_level: Mapped[RiskLevel] = mapped_column(
        SAEnum(RiskLevel, native_enum=False, length=20),
        default=RiskLevel.medium,
        nullable=False,
    )
    requested_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    approved_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # For request_type=tool_execution: the pending governed tool call,
    # executed by ToolRegistry.resume() once this approval is granted.
    tool_execution_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, nullable=True)
    # Durable record of the queued call: {tool, params, requested_by, project_id}.
    payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # relationships
    project: Mapped[Project] = relationship("Project", back_populates="approvals")
