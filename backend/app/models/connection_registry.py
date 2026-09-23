"""ConnectionRegistry model — user-managed data connections (Phase F).

Stores the connection metadata entered through the Connections page. Secret
material is opaque here (the frontend stores vault references / masked
strings); production deployments swap the `credentials` JSON for a vault
handle without a contract change.
"""

from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Integer, String, func
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class ConnectionCategory(str, enum.Enum):
    warehouse = "warehouse"
    database = "database"
    streaming = "streaming"
    compute = "compute"
    cloud = "cloud"


class ConnectionRegistry(Base):
    __tablename__ = "connection_registry"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    provider_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    category: Mapped[ConnectionCategory] = mapped_column(
        SAEnum(ConnectionCategory, native_enum=False, length=20),
        default=ConnectionCategory.database,
        nullable=False,
    )
    environment: Mapped[str] = mapped_column(String(20), default="production", nullable=False)
    host: Mapped[str] = mapped_column(String(255), nullable=False)
    port: Mapped[int | None] = mapped_column(Integer, nullable=True)
    database: Mapped[str | None] = mapped_column(String(255), nullable=True)
    auth_type: Mapped[str] = mapped_column(String(30), default="user_password", nullable=False)
    credentials: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # opaque / vault refs
    ssl_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
