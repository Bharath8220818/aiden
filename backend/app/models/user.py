"""User model."""

from __future__ import annotations

import enum
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, String, Uuid
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.workspace_member import WorkspaceMember

ROLE_TITLES: dict[str, str] = {
    "admin": "Platform Admin",
    "lead": "Lead Data Engineer",
    "engineer": "Data Engineer",
    "viewer": "Analytics Consumer",
}


class UserRole(str, enum.Enum):
    admin = "admin"
    lead = "lead"
    engineer = "engineer"
    viewer = "viewer"


class UserStatus(str, enum.Enum):
    online = "online"
    busy = "busy"
    away = "away"
    offline = "offline"


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        SAEnum(UserRole, native_enum=False, length=20),
        default=UserRole.engineer,
        nullable=False,
    )
    status: Mapped[UserStatus] = mapped_column(
        SAEnum(UserStatus, native_enum=False, length=20),
        default=UserStatus.offline,
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # relationships (resolved by name at mapper-configuration time)
    memberships: Mapped[list[WorkspaceMember]] = relationship(
        "WorkspaceMember", back_populates="user", cascade="all, delete-orphan"
    )

    @property
    def role_title(self) -> str:
        return ROLE_TITLES.get(self.role.value, self.role.value)
