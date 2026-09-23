"""Workspace model."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.workspace_member import WorkspaceMember


class Workspace(Base, TimestampMixin):
    __tablename__ = "workspaces"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(120), unique=True, index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # relationships
    members: Mapped[list[WorkspaceMember]] = relationship(
        "WorkspaceMember", back_populates="workspace", cascade="all, delete-orphan"
    )
    projects: Mapped[list[Project]] = relationship(
        "Project", back_populates="workspace", cascade="all, delete-orphan"
    )
