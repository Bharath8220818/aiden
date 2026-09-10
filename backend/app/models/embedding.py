from sqlalchemy import Column, String, Text, Integer, ForeignKey, JSON, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class Embedding(Base):
    """A persisted embedding for RAG retrieval over project knowledge.

    Uses a portable JSON vector column by default so the model works on
    SQLite (dev) and PostgreSQL (prod) alike. On PostgreSQL with the
    pgvector extension installed, migrations may optionally switch the
    column type to vector(384) / vector(1536) for index-backed search —
    the application code reads/writes plain float lists either way.
    """

    __tablename__ = "embeddings"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True, index=True)
    # knowledge type: doc | code | incident | fix | standard | architecture
    source_type = Column(String(50), default="doc", nullable=False, index=True)
    source_ref = Column(String(500), nullable=True)  # path, URL, or record id
    content = Column(Text, nullable=False)
    # List of floats; dimension matches the embedding model (e.g. 384 MiniLM, 1536 OpenAI)
    embedding = Column(JSON, default=list, nullable=True)
    # {chunk_index, doc_title, tags, ...}
    meta = Column(JSON, default=dict, nullable=True)
    content_hash = Column(String(64), nullable=True, index=True)  # for dedup on ingest
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    project = relationship("Project", back_populates="embeddings")

    def to_dict(self, include_embedding: bool = False) -> dict:
        return {
            "id": self.id,
            "project_id": self.project_id,
            "source_type": self.source_type,
            "source_ref": self.source_ref,
            "content": self.content,
            "meta": self.meta or {},
            "content_hash": self.content_hash,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            **({"embedding_dim": len(self.embedding) if self.embedding else 0} if not include_embedding else {"embedding": self.embedding}),
        }
