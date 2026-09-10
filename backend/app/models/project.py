from sqlalchemy import Column, String, Text, Integer, ForeignKey
from sqlalchemy.orm import relationship

from app.models.base import TimestampMixin
from app.database import Base


class Project(Base, TimestampMixin):
    """A data engineering project. Owns environments, pipelines, connections, incidents."""

    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True, index=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)

    organization = relationship("Organization", back_populates="projects")
    creator = relationship("User", foreign_keys=[created_by])
    environments = relationship("Environment", back_populates="project")
    connections = relationship("Connection", back_populates="project")
    incidents = relationship("Incident", back_populates="project")
    agent_runs = relationship("AgentRun", back_populates="project")
    schema_histories = relationship("SchemaHistory", back_populates="project")
    quality_results = relationship("DataQualityResult", back_populates="project")
    embeddings = relationship("Embedding", back_populates="project")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "slug": self.slug,
            "description": self.description,
            "organization_id": self.organization_id,
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
