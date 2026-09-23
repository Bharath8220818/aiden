"""Task model — AIDEN's internal team-workflow system (spec §9).

AIDEN owns the task state (TODO → IN_PROGRESS → IN_REVIEW → BLOCKED → DONE);
Slack/Teams/email only *communicate* it. Tasks can be created by humans or by
AI agents (source: "user" | "agent" | "incident") and may reference the
incident/pipeline they came from, so the loop closes inside AIDEN.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, Text, Uuid
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.user import User


class TaskStatus(str, enum.Enum):
    todo = "todo"
    in_progress = "in_progress"
    in_review = "in_review"
    blocked = "blocked"
    done = "done"


class TaskPriority(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class Task(Base, TimestampMixin):
    __tablename__ = "tasks"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    project_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[TaskStatus] = mapped_column(
        SAEnum(TaskStatus, native_enum=False, length=20),
        default=TaskStatus.todo,
        nullable=False,
        index=True,
    )
    priority: Mapped[TaskPriority] = mapped_column(
        SAEnum(TaskPriority, native_enum=False, length=20),
        default=TaskPriority.medium,
        nullable=False,
        index=True,
    )
    assignee_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    source: Mapped[str] = mapped_column(String(20), default="user", nullable=False)
    related_incident_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("incidents.id", ondelete="SET NULL"), nullable=True
    )
    related_pipeline_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("pipelines.id", ondelete="SET NULL"), nullable=True
    )
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # relationships
    project: Mapped[Project] = relationship("Project")
    assignee: Mapped[User] = relationship("User", foreign_keys=[assignee_id])
