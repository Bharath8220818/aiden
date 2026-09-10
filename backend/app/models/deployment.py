from sqlalchemy import Column, String, Text, Integer, ForeignKey, JSON, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class Deployment(Base):
    """A deployment of a pipeline (or architecture change) to an environment.

    Deployments always go through the approval workflow when risky, and
    support rollback via `rollback_to_id` pointing at a previous good
    deployment of the same pipeline.
    """

    __tablename__ = "deployments"

    id = Column(Integer, primary_key=True, index=True)
    pipeline_id = Column(Integer, ForeignKey("pipelines.id"), nullable=False, index=True)
    environment_id = Column(Integer, ForeignKey("environments.id"), nullable=True, index=True)
    environment_name = Column(String(100), nullable=True)  # denormalized for quick display

    version = Column(String(100), nullable=False)
    # pending | deploying | deployed | failed | rolled_back
    status = Column(String(50), default="pending", nullable=False, index=True)
    strategy = Column(String(50), default="rolling", nullable=True)  # rolling | blue_green | canary
    # Git info for traceability
    commit_sha = Column(String(64), nullable=True)
    commit_message = Column(Text, nullable=True)
    # Structured deployment log (steps, timestamps, outputs)
    logs = Column(JSON, default=list, nullable=True)
    # Reference to a previous deployment of the same pipeline to roll back to
    rollback_to_id = Column(Integer, ForeignKey("deployments.id"), nullable=True)
    deployed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    deployed_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    pipeline = relationship("Pipeline")
    environment = relationship("Environment")
    deployer = relationship("User", foreign_keys=[deployed_by])

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "pipeline_id": self.pipeline_id,
            "environment_id": self.environment_id,
            "environment_name": self.environment_name,
            "version": self.version,
            "status": self.status,
            "strategy": self.strategy,
            "commit_sha": self.commit_sha,
            "commit_message": self.commit_message,
            "logs": self.logs or [],
            "rollback_to_id": self.rollback_to_id,
            "deployed_by": self.deployed_by,
            "deployed_at": self.deployed_at.isoformat() if self.deployed_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
