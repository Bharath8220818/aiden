"""PipelineRun model — an execution of a pipeline."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, Text, Uuid
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.pipeline import Pipeline


class RunStatus(str, enum.Enum):
    queued = "queued"
    running = "running"
    success = "success"
    failed = "failed"
    canceled = "canceled"


class RunTriggerType(str, enum.Enum):
    schedule = "schedule"
    manual = "manual"
    retry = "retry"
    backfill = "backfill"
    event = "event"


class PipelineRun(Base, TimestampMixin):
    __tablename__ = "pipeline_runs"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    pipeline_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("pipelines.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[RunStatus] = mapped_column(
        SAEnum(RunStatus, native_enum=False, length=20),
        default=RunStatus.queued,
        nullable=False,
        index=True,
    )
    trigger_type: Mapped[RunTriggerType] = mapped_column(
        SAEnum(RunTriggerType, native_enum=False, length=20),
        default=RunTriggerType.manual,
        nullable=False,
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    rows_processed: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cost: Mapped[float | None] = mapped_column(Float, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    logs: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # relationships
    pipeline: Mapped[Pipeline] = relationship("Pipeline", back_populates="runs")
