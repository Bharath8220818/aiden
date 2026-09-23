"""Requirement model — multimodal intent + Open Data Contract (ODCS)."""

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


class RequirementStatus(str, enum.Enum):
    draft = "draft"
    analyzing = "analyzing"
    validated = "validated"
    rejected = "rejected"
    approved = "approved"


class Requirement(Base, TimestampMixin):
    __tablename__ = "requirements"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    intent_analysis: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    data_contract: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    status: Mapped[RequirementStatus] = mapped_column(
        SAEnum(RequirementStatus, native_enum=False, length=20),
        default=RequirementStatus.draft,
        nullable=False,
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # relationships
    project: Mapped[Project] = relationship("Project", back_populates="requirements")
