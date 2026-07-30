from sqlalchemy import Column, Integer, String, Text, JSON, DateTime, Enum, ForeignKey, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import enum

class ApprovalStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"

class ApprovalRisk(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class ApprovalRequest(Base):
    __tablename__ = "approvals"

    id = Column(Integer, primary_key=True, index=True)
    pipeline_id = Column(Integer, ForeignKey("pipelines.id"), nullable=False)
    requested_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String(100), nullable=False)  # e.g., "schema_change", "deploy", "delete"
    details = Column(JSON, default=dict)  # diagnosis, proposed fix, etc.
    risk_score = Column(Enum(ApprovalRisk), default=ApprovalRisk.MEDIUM)
    status = Column(Enum(ApprovalStatus), default=ApprovalStatus.PENDING)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    review_comment = Column(Text, nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    pipeline = relationship("Pipeline", backref="approvals")
    requester = relationship("User", foreign_keys=[requested_by], backref="approval_requests")
    reviewer = relationship("User", foreign_keys=[reviewed_by], backref="approval_reviews")
    actions = relationship("ApprovalAction", backref="approval", cascade="all, delete-orphan")

class ApprovalAction(Base):
    __tablename__ = "approval_actions"

    id = Column(Integer, primary_key=True, index=True)
    approval_id = Column(Integer, ForeignKey("approvals.id"), nullable=False)
    action_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    action_type = Column(String(50), nullable=False)  # "approve", "reject", "comment"
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
