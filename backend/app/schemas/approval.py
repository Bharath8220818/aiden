from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Any, List

class ApprovalRequestCreate(BaseModel):
    pipeline_id: int
    action: str
    details: Optional[Any] = None
    risk_score: str = "medium"

class ApprovalActionCreate(BaseModel):
    action_type: str  # "approve", "reject", "comment"
    comment: Optional[str] = None

class ApprovalActionResponse(BaseModel):
    id: int
    approval_id: int
    action_by: int
    action_type: str
    comment: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ApprovalResponse(BaseModel):
    id: int
    pipeline_id: int
    requested_by: int
    action: str
    details: Optional[Any] = None
    risk_score: str
    status: str
    reviewed_by: Optional[int] = None
    review_comment: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    actions: List[ApprovalActionResponse] = []

    class Config:
        from_attributes = True
