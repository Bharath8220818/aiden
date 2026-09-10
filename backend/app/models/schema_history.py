from sqlalchemy import Column, String, Text, Integer, ForeignKey, JSON, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class SchemaHistory(Base):
    """A snapshot of a connection's schema at a point in time.

    Used for drift detection: comparing the current schema against the
    last recorded snapshot reveals added/removed/renamed columns and tables.
    """

    __tablename__ = "schema_history"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True, index=True)
    connection_id = Column(Integer, ForeignKey("connections.id"), nullable=False, index=True)
    database_name = Column(String(255), nullable=True)
    table_name = Column(String(255), nullable=False, index=True)
    # [{name, type, nullable, primary_key, default}, ...]
    columns = Column(JSON, default=list, nullable=True)
    # JSON snapshot of the full schema diff vs the previous snapshot
    schema_diff = Column(JSON, default=dict, nullable=True)
    # semantic_version | timestamp based; free-form checksum of the schema
    version = Column(String(100), nullable=True)
    # detected automatically (drift check) or captured manually
    source = Column(String(50), default="manual", nullable=True)  # manual | drift_check | pipeline
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    project = relationship("Project", back_populates="schema_histories")
    connection = relationship("Connection", back_populates="schema_histories")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "project_id": self.project_id,
            "connection_id": self.connection_id,
            "database_name": self.database_name,
            "table_name": self.table_name,
            "columns": self.columns or [],
            "schema_diff": self.schema_diff or {},
            "version": self.version,
            "source": self.source,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
