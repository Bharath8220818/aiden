"""Notification model — persisted user/platform notifications.

Backs the bell drawer with durable rows (the client store currently holds
in-memory seeds); realtime pushes still arrive over the WebSocket bus.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, Uuid
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class NotificationType(str, enum.Enum):
    info = "info"
    success = "success"
    warning = "warning"
    error = "error"


class Notification(Base, TimestampMixin):
    __tablename__ = "notifications"
    __table_args__ = (Index("ix_notifications_user_created", "user_id", "created_at"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )  # null → broadcast to all workspace members
    type: Mapped[NotificationType] = mapped_column(
        SAEnum(NotificationType, native_enum=False, length=10),
        default=NotificationType.info,
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    link: Mapped[str | None] = mapped_column(String(512), nullable=True)  # in-app route
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    @property
    def is_read(self) -> bool:
        return self.read_at is not None

    # relationships
    user: Mapped[User] = relationship("User")
