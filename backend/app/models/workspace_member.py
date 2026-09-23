"""WorkspaceMember model — user membership within a workspace."""

from __future__ import annotations

import enum
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.workspace import Workspace


class WorkspaceRole(str, enum.Enum):
    owner = "owner"
    admin = "admin"
    member = "member"
    viewer = "viewer"


class WorkspaceMember(Base, TimestampMixin):
    __tablename__ = "workspace_members"
    __table_args__ = (UniqueConstraint("workspace_id", "user_id", name="uq_workspace_member"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[WorkspaceRole] = mapped_column(
        SAEnum(WorkspaceRole, native_enum=False, length=20),
        default=WorkspaceRole.member,
        nullable=False,
    )

    # relationships
    workspace: Mapped[Workspace] = relationship("Workspace", back_populates="members")
    user: Mapped[User] = relationship("User", back_populates="memberships")
