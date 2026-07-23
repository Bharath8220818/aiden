from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func
from app.database import Base
import enum


class ApprovalStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class RiskLevel(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class Approval(Base):
    """Schema-change or pipeline-deployment approvals.

    Each approval records who requested a change, what was changed, and
    who reviewed it.  Status transitions: pending → approved | rejected.
    """

    __tablename__ = "approvals"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(Enum(ApprovalStatus), default=ApprovalStatus.PENDING, index=True)
    risk = Column(Enum(RiskLevel), default=RiskLevel.LOW)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    created_by_name = Column(String(100), nullable=True)
    change = Column(Text, nullable=False)
    resource_type = Column(String(100), nullable=False)
    resource_name = Column(String(255), nullable=False)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_by_name = Column(String(100), nullable=True)
    review_comment = Column(Text, nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class ApprovalAction(Base):
    """Audit trail for every action taken on an approval."""

    __tablename__ = "approval_actions"

    id = Column(Integer, primary_key=True, index=True)
    approval_id = Column(Integer, ForeignKey("approvals.id"), nullable=False, index=True)
    action = Column(String(20), nullable=False)  # approve | reject | comment
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    user_name = Column(String(100), nullable=True)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
