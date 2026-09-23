"""Project model."""

from __future__ import annotations

import enum
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.approval import Approval
    from app.models.architecture import Architecture
    from app.models.incident import Incident
    from app.models.pipeline import Pipeline
    from app.models.requirement import Requirement
    from app.models.workspace import Workspace


class ProjectStatus(str, enum.Enum):
    draft = "draft"
    active = "active"
    archived = "archived"


class Project(Base, TimestampMixin):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[ProjectStatus] = mapped_column(
        SAEnum(ProjectStatus, native_enum=False, length=20),
        default=ProjectStatus.active,
        nullable=False,
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # relationships
    workspace: Mapped[Workspace] = relationship("Workspace", back_populates="projects")
    requirements: Mapped[list[Requirement]] = relationship(
        "Requirement", back_populates="project", cascade="all, delete-orphan"
    )
    architectures: Mapped[list[Architecture]] = relationship(
        "Architecture", back_populates="project", cascade="all, delete-orphan"
    )
    pipelines: Mapped[list[Pipeline]] = relationship(
        "Pipeline", back_populates="project", cascade="all, delete-orphan"
    )
    incidents: Mapped[list[Incident]] = relationship(
        "Incident", back_populates="project", cascade="all, delete-orphan"
    )
    approvals: Mapped[list[Approval]] = relationship(
        "Approval", back_populates="project", cascade="all, delete-orphan"
    )
