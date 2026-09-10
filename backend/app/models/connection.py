from sqlalchemy import Column, String, Text, Integer, ForeignKey, JSON, Boolean
from sqlalchemy.orm import relationship

from app.models.base import TimestampMixin
from app.database import Base


class Connection(Base, TimestampMixin):
    """A stored tool connection (PostgreSQL, Airflow, Kafka, etc.) for a project.

    Credentials must be stored encrypted or referenced via a secret manager —
    never commit plaintext secrets. `config` holds non-secret connection params.
    """

    __tablename__ = "connections"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False, index=True)
    tool_type = Column(String(50), nullable=False, index=True)  # postgresql | airflow | kafka | spark | dbt | s3 | ...
    # Optional environment scope (e.g. only valid in production)
    environment_id = Column(Integer, ForeignKey("environments.id"), nullable=True, index=True)
    # Non-secret connection parameters (host, port, database, etc.)
    config = Column(JSON, default=dict, nullable=True)
    # Reference to a secret (e.g. Vault path or encrypted blob key) — never the secret itself
    secret_ref = Column(String(255), nullable=True)
    status = Column(String(50), default="disconnected", nullable=False)  # connected | disconnected | error
    last_health_check = Column(JSON, default=dict, nullable=True)  # {status, latency_ms, checked_at}
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    project = relationship("Project", back_populates="connections")
    environment = relationship("Environment")
    creator = relationship("User")
    schema_histories = relationship("SchemaHistory", back_populates="connection")

    def to_dict(self, include_config: bool = True) -> dict:
        return {
            "id": self.id,
            "project_id": self.project_id,
            "name": self.name,
            "tool_type": self.tool_type,
            "environment_id": self.environment_id,
            "config": self.config or {} if include_config else {},
            "secret_ref": self.secret_ref,
            "status": self.status,
            "last_health_check": self.last_health_check or {},
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
