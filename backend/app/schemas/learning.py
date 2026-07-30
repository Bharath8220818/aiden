from pydantic import BaseModel
from typing import Optional, List

class Course(BaseModel):
    id: int
    path_id: int
    title: str
    description: Optional[str] = None
    duration: Optional[str] = None
    completed: bool = False
    order: int = 0
    type: str = "article"  # video, article, project, quiz

    class Config:
        from_attributes = True

class LearningPath(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    icon: Optional[str] = None
    level: str = "Beginner"
    progress: float = 0.0
    lessons: int = 0
    completed: int = 0
    courses: List[Course] = []

    class Config:
        from_attributes = True

class ProgressResponse(BaseModel):
    enrolled_tracks: int = 0
    lessons_completed: int = 0
    practice_hours: float = 0.0
    achievements: int = 0
