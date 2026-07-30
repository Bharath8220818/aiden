from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.database import get_db
from app.models.user import User
from app.api.v1.deps import get_current_user
from app.schemas.learning import LearningPath, Course, ProgressResponse

router = APIRouter()

MOCK_PATHS = [
    {"id": 1, "title": "Data Engineering Fundamentals", "icon": "database", "level": "Beginner", "progress": 65, "lessons": 24, "completed": 16, "description": "Master the basics of data engineering."},
    {"id": 2, "title": "Advanced Analytics & SQL", "icon": "bar-chart", "level": "Intermediate", "progress": 40, "lessons": 32, "completed": 13, "description": "Deep dive into advanced SQL and analytics."},
    {"id": 3, "title": "Big Data with PySpark", "icon": "zap", "level": "Advanced", "progress": 25, "lessons": 28, "completed": 7, "description": "Process massive datasets with PySpark."},
    {"id": 4, "title": "Cloud Architecture Design", "icon": "cloud", "level": "Advanced", "progress": 10, "lessons": 20, "completed": 2, "description": "Design scalable cloud data architectures."},
    {"id": 5, "title": "Real-Time Streaming", "icon": "trending-up", "level": "Expert", "progress": 0, "lessons": 18, "completed": 0, "description": "Build real-time data streaming pipelines."},
    {"id": 6, "title": "Data Governance & Quality", "icon": "shield", "level": "Intermediate", "progress": 5, "lessons": 15, "completed": 1, "description": "Implement data governance and quality frameworks."},
]

@router.get("/paths", response_model=List[LearningPath])
async def list_paths(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all learning paths."""
    return MOCK_PATHS

@router.get("/paths/{path_id}", response_model=LearningPath)
async def get_path(
    path_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single learning path by ID."""
    for p in MOCK_PATHS:
        if p["id"] == path_id:
            return p
    raise HTTPException(status_code=404, detail="Learning path not found")

@router.get("/paths/{path_id}/courses", response_model=List[Course])
async def get_courses(
    path_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get courses for a learning path."""
    return [
        {"id": 1, "path_id": path_id, "title": "Introduction", "duration": "30 min", "completed": True, "order": 1, "type": "video"},
        {"id": 2, "path_id": path_id, "title": "Core Concepts", "duration": "45 min", "completed": True, "order": 2, "type": "article"},
        {"id": 3, "path_id": path_id, "title": "Hands-On Project", "duration": "60 min", "completed": False, "order": 3, "type": "project"},
    ]

@router.get("/progress", response_model=ProgressResponse)
async def get_progress(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get overall learning progress."""
    return {
        "enrolled_tracks": 6,
        "lessons_completed": 39,
        "practice_hours": 47.5,
        "achievements": 12,
    }
