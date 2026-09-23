"""AgentStageRun model — per-stage persistence for orchestrator runs.

Each row is one stage of an `AgentRun`: its status, the input/output payloads,
and the error when the stage fails. The orchestrator writes a row per stage
(`pending` → `running` → `done`/`failed`), so the frontend timeline can render
Stage 1 ✓ / Stage 2 ⚠ from real rows instead of a single JSON blob, and runs
can be inspected or resumed stage-by-stage.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, DateTime, ForeignKey, Index, Integer, String, Text, Uuid
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.agent_run import AgentRun


class StageStatus(str, enum.Enum):
    pending = "pending"
    running = "running"
    done = "done"
    failed = "failed"
    skipped = "skipped"


class AgentStageRun(Base, TimestampMixin):
    __tablename__ = "agent_stage_runs"
    __table_args__ = (Index("ix_agent_stage_runs_run_no", "run_id", "stage_no", unique=True),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    run_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("agent_runs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    stage_no: Mapped[int] = mapped_column(Integer, nullable=False)
    stage_id: Mapped[str] = mapped_column(String(64), nullable=False)
    label: Mapped[str | None] = mapped_column(String(255), nullable=True)
    agent: Mapped[str | None] = mapped_column(String(64), nullable=True)
    status: Mapped[StageStatus] = mapped_column(
        SAEnum(StageStatus, native_enum=False, length=20),
        default=StageStatus.pending,
        nullable=False,
        index=True,
    )
    input: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    output: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # relationships
    run: Mapped[AgentRun] = relationship("AgentRun", back_populates="stage_runs")
