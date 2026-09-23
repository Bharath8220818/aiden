"""AgentRun model — persisted orchestrator workflow executions.

Each row is one orchestrated workflow run: `stages` holds the ordered list of
stage descriptors (the 11-stage loop), `outputs` the per-stage results, and
`status` the run lifecycle. Stage events stream to the WebSocket bus while the
run executes, so the frontend SwarmFeed/timeline renders progress live.
"""

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
    from app.models.agent_stage_run import AgentStageRun
    from app.models.user import User


class AgentRunStatus(str, enum.Enum):
    running = "running"
    success = "success"
    failed = "failed"
    canceled = "canceled"


class AgentRun(Base, TimestampMixin):
    __tablename__ = "agent_runs"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    workflow: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    status: Mapped[AgentRunStatus] = mapped_column(
        SAEnum(AgentRunStatus, native_enum=False, length=20),
        default=AgentRunStatus.running,
        nullable=False,
        index=True,
    )
    prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    current_stage: Mapped[str | None] = mapped_column(String(64), nullable=True)
    stage_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    stages: Mapped[list | None] = mapped_column(JSON, nullable=True)  # ordered stage descriptors
    outputs: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # stage_id → output payload
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    # Project context (spec §4): every orchestrated request belongs to a
    # project so RAG retrieval and stage execution can scope their inputs.
    project_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # relationships
    creator: Mapped[User] = relationship("User")
    stage_runs: Mapped[list[AgentStageRun]] = relationship(
        "AgentStageRun",
        back_populates="run",
        cascade="all, delete-orphan",
        order_by="AgentStageRun.stage_no",
    )
