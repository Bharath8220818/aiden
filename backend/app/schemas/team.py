from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class MemberResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    status: str = "offline"
    avatar: Optional[str] = None
    pipelines: int = 0
    joined_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ShareRequest(BaseModel):
    pipeline_id: int
    member_ids: List[int]
    permission: str = "view"  # view, edit, admin

class ShareResponse(BaseModel):
    id: int
    pipeline_id: int
    shared_by: int
    shared_with: List[int] = []
    permission: str
    shared_at: Optional[datetime] = None

class CommentCreate(BaseModel):
    pipeline_id: int
    content: str

class CommentResponse(BaseModel):
    id: int
    pipeline_id: int
    author_id: int
    author_name: Optional[str] = None
    content: str
    created_at: Optional[datetime] = None
    resolved: bool = False

    class Config:
        from_attributes = True

class InviteRequest(BaseModel):
    email: str
    role: str = "member"
