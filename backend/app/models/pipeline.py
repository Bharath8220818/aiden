"""Pipeline model — deployed data pipeline definition."""

from __future__ import annotations

import enum
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import JSON, ForeignKey, String, Text, Uuid
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.pipeline_node import PipelineNode
    from app.models.pipeline_run import PipelineRun
    from app.models.project import Project


class PipelineType(str, enum.Enum):
    streaming = "streaming"
    micro_batch = "micro_batch"
    batch = "batch"


class PipelineStatus(str, enum.Enum):
    draft = "draft"
    active = "active"
    paused = "paused"
    failed = "failed"
    archived = "archived"


class Pipeline(Base, TimestampMixin):
    __tablename__ = "pipelines"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    pipeline_type: Mapped[PipelineType] = mapped_column(
        SAEnum(PipelineType, native_enum=False, length=20),
        default=PipelineType.batch,
        nullable=False,
    )
    config: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    status: Mapped[PipelineStatus] = mapped_column(
        SAEnum(PipelineStatus, native_enum=False, length=20),
        default=PipelineStatus.draft,
        nullable=False,
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # relationships
    project: Mapped[Project] = relationship("Project", back_populates="pipelines")
    runs: Mapped[list[PipelineRun]] = relationship(
        "PipelineRun", back_populates="pipeline", cascade="all, delete-orphan"
    )
    nodes: Mapped[list[PipelineNode]] = relationship(
        "PipelineNode", back_populates="pipeline", cascade="all, delete-orphan"
    )
