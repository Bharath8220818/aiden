from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.database import get_db
from app.models.user import User
from app.api.v1.deps import get_current_user
from app.schemas.team import MemberResponse, ShareRequest, ShareResponse, CommentCreate, CommentResponse, InviteRequest

router = APIRouter()

MOCK_MEMBERS = [
    {"id": 1, "name": "Sarah Chen", "email": "sarah@aiden.local", "role": "Data Engineer", "status": "online", "pipelines": 24},
    {"id": 2, "name": "Marcus Johnson", "email": "marcus@aiden.local", "role": "ML Engineer", "status": "online", "pipelines": 18},
    {"id": 3, "name": "Elena Rodriguez", "email": "elena@aiden.local", "role": "Data Analyst", "status": "away", "pipelines": 12},
    {"id": 4, "name": "Alex Kim", "email": "alex@aiden.local", "role": "Data Engineer", "status": "offline", "pipelines": 8},
    {"id": 5, "name": "Priya Patel", "email": "priya@aiden.local", "role": "DevOps", "status": "online", "pipelines": 15},
]

@router.get("/members", response_model=List[MemberResponse])
async def list_members(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all team members."""
    return MOCK_MEMBERS

@router.get("/members/{member_id}", response_model=MemberResponse)
async def get_member(
    member_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single team member."""
    for m in MOCK_MEMBERS:
        if m["id"] == member_id:
            return m
    raise HTTPException(status_code=404, detail="Member not found")

@router.post("/invite")
async def invite_member(
    request: InviteRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Invite a new team member."""
    return {"message": f"Invitation sent to {request.email}", "email": request.email, "role": request.role}

@router.post("/share", response_model=ShareResponse)
async def share_pipeline(
    request: ShareRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Share a pipeline with team members."""
    from datetime import datetime
    return {
        "id": 1,
        "pipeline_id": request.pipeline_id,
        "shared_by": current_user.id,
        "shared_with": request.member_ids,
        "permission": request.permission,
        "shared_at": datetime.utcnow(),
    }

@router.get("/pipelines/{pipeline_id}/comments", response_model=List[CommentResponse])
async def get_comments(
    pipeline_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get comments for a pipeline."""
    return []

@router.post("/comments", response_model=CommentResponse)
async def add_comment(
    request: CommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a comment to a pipeline."""
    from datetime import datetime
    return {
        "id": 1,
        "pipeline_id": request.pipeline_id,
        "author_id": current_user.id,
        "author_name": current_user.full_name,
        "content": request.content,
        "created_at": datetime.utcnow(),
        "resolved": False,
    }
