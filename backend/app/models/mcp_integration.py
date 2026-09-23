"""McpIntegration model — external MCP servers registered with AIDEN.

Persists what the in-memory registry currently derives (transport, endpoint,
auth mode, allowed agents, per-tool stats). The registry list remains the
fallback when no rows exist, matching the connection bootstrap pattern.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, String, func
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class McpTransport(str, enum.Enum):
    http = "http"
    sse = "sse"
    stdio = "stdio"


class McpStatus(str, enum.Enum):
    connected = "connected"
    disconnected = "disconnected"
    degraded = "degraded"


class McpIntegration(Base, TimestampMixin):
    __tablename__ = "mcp_integrations"

    id: Mapped[uuid.UUID] = mapped_column(
        String(64), primary_key=True
    )  # stable registry id ("mcp-kafka")
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    transport: Mapped[McpTransport] = mapped_column(
        SAEnum(McpTransport, native_enum=False, length=10),
        default=McpTransport.http,
        nullable=False,
    )
    endpoint: Mapped[str] = mapped_column(String(512), nullable=False)
    auth_mode: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[McpStatus] = mapped_column(
        SAEnum(McpStatus, native_enum=False, length=20),
        default=McpStatus.disconnected,
        nullable=False,
        index=True,
    )
    purpose: Mapped[str | None] = mapped_column(String(512), nullable=True)
    tools_allowed_for: Mapped[list | None] = mapped_column(JSON, nullable=True)  # agent roles
    tools: Mapped[list | None] = mapped_column(JSON, nullable=True)  # [{name, description, scopes…}]
    last_sync_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=True
    )
