from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class ApprovalCreate(BaseModel):
    title: str
    description: Optional[str] = None
    risk: str = "low"
    change: str
    resource_type: str
    resource_name: str


class ApprovalActionCreate(BaseModel):
    action: str  # approve | reject | comment
    comment: Optional[str] = None


class ApprovalActionResponse(BaseModel):
    id: int
    approval_id: int
    action: str
    user_id: int
    user_name: Optional[str]
    comment: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class ApprovalResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    status: str
    risk: str
    created_by: int
    created_by_name: Optional[str]
    change: str
    resource_type: str
    resource_name: str
    reviewed_by: Optional[int]
    reviewed_by_name: Optional[str]
    review_comment: Optional[str]
    reviewed_at: Optional[datetime]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class ApprovalListResponse(BaseModel):
    approvals: List[ApprovalResponse]
    total: int
