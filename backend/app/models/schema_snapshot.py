"""SchemaSnapshot model — profiler output persisted for drift detection.

One row per (pipeline, table) profiling pass: the captured schema (columns,
types, nullability), row count, and a deterministic schema_hash. The drift
service compares the latest snapshot against the previous one and creates an
incident when the hash changes (schema drift).
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.pipeline import Pipeline


class SchemaSnapshot(Base, TimestampMixin):
    __tablename__ = "schema_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    pipeline_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("pipelines.id", ondelete="CASCADE"), nullable=False, index=True
    )
    table_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    columns: Mapped[list | None] = mapped_column(JSON, nullable=True)
    row_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    schema_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    columns_changed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    change_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    captured_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=None, nullable=False
    )

    # relationships
    pipeline: Mapped[Pipeline] = relationship("Pipeline")
