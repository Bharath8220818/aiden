"""Architecture model — stored blueprint (nodes/edges) + generation metadata."""

from __future__ import annotations

import enum
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import JSON, ForeignKey, String, Text, Uuid
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.project import Project


class ArchitectureStatus(str, enum.Enum):
    draft = "draft"
    validating = "validating"
    validated = "validated"
    generated = "generated"


class Architecture(Base, TimestampMixin):
    __tablename__ = "architectures"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    blueprint: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # {nodes, edges}
    status: Mapped[ArchitectureStatus] = mapped_column(
        SAEnum(ArchitectureStatus, native_enum=False, length=20),
        default=ArchitectureStatus.draft,
        nullable=False,
    )
    generated_from: Mapped[str | None] = mapped_column(Text, nullable=True)  # AI prompt
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # relationships
    project: Mapped[Project] = relationship("Project", back_populates="architectures")
