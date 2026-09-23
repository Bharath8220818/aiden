"""Incident model — detected failures tracked for the self-healing loop."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text, Uuid
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.project import Project


class IncidentSeverity(str, enum.Enum):
    critical = "critical"
    high = "high"
    medium = "medium"
    low = "low"


class IncidentStatus(str, enum.Enum):
    detected = "detected"
    investigating = "investigating"
    healing = "healing"
    resolved = "resolved"


class Incident(Base, TimestampMixin):
    __tablename__ = "incidents"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True
    )
    pipeline_run_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("pipeline_runs.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    severity: Mapped[IncidentSeverity] = mapped_column(
        SAEnum(IncidentSeverity, native_enum=False, length=20),
        default=IncidentSeverity.medium,
        nullable=False,
        index=True,
    )
    status: Mapped[IncidentStatus] = mapped_column(
        SAEnum(IncidentStatus, native_enum=False, length=20),
        default=IncidentStatus.detected,
        nullable=False,
        index=True,
    )
    detection_source: Mapped[str | None] = mapped_column(String(120), nullable=True)
    root_cause: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # RCA payload
    proposed_fix: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    resolution: Mapped[str | None] = mapped_column(Text, nullable=True)
    mttr_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # relationships
    project: Mapped[Project] = relationship("Project", back_populates="incidents")
