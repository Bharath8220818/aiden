"""PipelineNode model — one node in a pipeline's builder graph.

A Pipeline owns a set of nodes (Extract → Transform → Validate → Load).
`config` holds node-type-specific settings (connection id, SQL, retry,
timeout, schedule) as authored in the Pipeline Builder; `position` preserves
canvas coordinates so the React Flow graph round-trips exactly.
"""

from __future__ import annotations

import enum
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import JSON, Float, ForeignKey, String, Text, Uuid
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.pipeline import Pipeline


class NodeKind(str, enum.Enum):
    source = "source"
    transform = "transform"
    validate = "validate"
    load = "load"
    notification = "notification"


class PipelineNode(Base, TimestampMixin):
    __tablename__ = "pipeline_nodes"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    pipeline_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("pipelines.id", ondelete="CASCADE"), nullable=False, index=True
    )
    node_key: Mapped[str] = mapped_column(String(64), nullable=False)  # stable graph id (React Flow)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    kind: Mapped[NodeKind] = mapped_column(
        SAEnum(NodeKind, native_enum=False, length=20),
        default=NodeKind.transform,
        nullable=False,
    )
    technology: Mapped[str | None] = mapped_column(String(64), nullable=True)  # postgres, kafka, snowflake…
    config: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    position_x: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    position_y: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    order_index: Mapped[int | None] = mapped_column(nullable=True)  # linear order when the graph is a chain
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # relationships
    pipeline: Mapped[Pipeline] = relationship("Pipeline", back_populates="nodes")
