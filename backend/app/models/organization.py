from sqlalchemy import Column, String, Text, Integer, ForeignKey
from sqlalchemy.orm import relationship

from app.models.base import TimestampMixin
from app.database import Base


class Organization(Base, TimestampMixin):
    """Top-level tenant. Owns projects and users belong to one organization."""

    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    plan = Column(String(50), default="free", nullable=False)  # free | pro | enterprise

    projects = relationship("Project", back_populates="organization")
    members = relationship("User", back_populates="organization")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "slug": self.slug,
            "description": self.description,
            "plan": self.plan,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
