"""KnowledgeDocument / KnowledgeChunk models — the RAG memory corpus.

Documents are logical sources (contracts, runbooks, postmortems, incident
fixes); chunks are the embedded pieces actually stored in the vector DB.
The DB rows carry authoritative metadata + retrieval counters; Qdrant holds
the vectors and points back at `chunk.id` via its payload (`point_id_for`).
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Index, Integer, String, Text, Uuid
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class DocKind(str, enum.Enum):
    data_contract = "data_contract"
    schema_doc = "schema_doc"
    runbook = "runbook"
    postmortem = "postmortem"
    incident_fix = "incident_fix"
    metric_definition = "metric_definition"
    lineage_snapshot = "lineage_snapshot"
    incident_pattern = "incident_pattern"


class KnowledgeDocument(Base, TimestampMixin):
    __tablename__ = "knowledge_documents"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True
    )
    source_key: Mapped[str] = mapped_column(
        String(128), nullable=False, unique=True
    )  # stable external id ("doc-orders-contract", "incident-fix-<uuid>")
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    kind: Mapped[DocKind] = mapped_column(
        SAEnum(DocKind, native_enum=False, length=32),
        default=DocKind.runbook,
        nullable=False,
        index=True,
    )
    origin: Mapped[str | None] = mapped_column(String(64), nullable=True)  # ODCS Registry, Confluence…
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    tags: Mapped[list | None] = mapped_column(JSON, nullable=True)
    embedding_model: Mapped[str | None] = mapped_column(String(64), nullable=True)
    chunk_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    retrieval_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_retrieved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ingested_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # relationships
    chunks: Mapped[list[KnowledgeChunk]] = relationship(
        "KnowledgeChunk", back_populates="document", cascade="all, delete-orphan"
    )


class KnowledgeChunk(Base, TimestampMixin):
    __tablename__ = "knowledge_chunks"
    __table_args__ = (
        Index("ix_knowledge_chunks_doc_index", "document_id", "chunk_index", unique=True),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    document_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("knowledge_documents.id", ondelete="CASCADE"), nullable=False, index=True
    )
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    token_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    vector_id: Mapped[str | None] = mapped_column(String(64), nullable=True)  # Qdrant point uuid
    embedding_model: Mapped[str | None] = mapped_column(String(64), nullable=True)
    metadata_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # relationships
    document: Mapped[KnowledgeDocument] = relationship("KnowledgeDocument", back_populates="chunks")
