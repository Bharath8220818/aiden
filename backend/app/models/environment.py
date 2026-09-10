from sqlalchemy import Column, String, Text, Boolean, Integer, ForeignKey, JSON
from sqlalchemy.orm import relationship

from app.models.base import TimestampMixin
from app.database import Base


class Environment(Base, TimestampMixin):
    """Deployment environment for a project (dev, staging, production)."""

    __tablename__ = "environments"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False, index=True)  # dev | staging | production | custom
    description = Column(Text, nullable=True)
    # Ordering for UI display: dev=0, staging=1, production=2
    rank = Column(Integer, default=0, nullable=False)
    is_default = Column(Boolean, default=False, nullable=False)
    # Environment-scoped configuration (never store secrets in plaintext here)
    config = Column(JSON, default=dict, nullable=True)

    project = relationship("Project", back_populates="environments")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "project_id": self.project_id,
            "name": self.name,
            "description": self.description,
            "rank": self.rank,
            "is_default": self.is_default,
            "config": self.config or {},
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
