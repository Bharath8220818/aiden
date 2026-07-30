from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from app.database import get_db
from app.models.user import User
from app.api.v1.deps import get_current_user
from app.schemas.coding import Problem, SubmitRequest, SubmissionResponse, CodeExecutionResponse

router = APIRouter()

MOCK_PROBLEMS = [
    {"id": 1, "title": "High-Engagement Video Filtering", "difficulty": "Medium", "company": "Google", "category": "PySpark", "description": "Filter videos with >1M views and release_year >= 2019, sorted by duration.", "solved": False},
    {"id": 2, "title": "Customer Churn Analysis", "difficulty": "Hard", "company": "Amazon", "category": "SQL", "description": "Identify customers at risk of churning based on usage patterns.", "solved": False},
    {"id": 3, "title": "Sales Data Aggregation", "difficulty": "Easy", "company": "Meta", "category": "SQL", "description": "Aggregate daily sales by region and product category.", "solved": False},
    {"id": 4, "title": "Real-Time Fraud Detection", "difficulty": "Hard", "company": "Stripe", "category": "PySpark", "description": "Build a real-time fraud detection query on streaming transaction data.", "solved": False},
    {"id": 5, "title": "Clickstream Sessionization", "difficulty": "Medium", "company": "Snowflake", "category": "SQL", "description": "Sessionize clickstream data with 30-minute inactivity timeout.", "solved": False},
]

@router.get("/problems", response_model=List[Problem])
async def list_problems(
    difficulty: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    company: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List coding problems with optional filters."""
    problems = MOCK_PROBLEMS
    if difficulty:
        problems = [p for p in problems if p["difficulty"].lower() == difficulty.lower()]
    if category:
        problems = [p for p in problems if p["category"].lower() == category.lower()]
    if company:
        problems = [p for p in problems if p["company"].lower() == company.lower()]
    return problems

@router.get("/problems/{problem_id}", response_model=Problem)
async def get_problem(
    problem_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single problem by ID."""
    for p in MOCK_PROBLEMS:
        if p["id"] == problem_id:
            return p
    raise HTTPException(status_code=404, detail="Problem not found")

@router.post("/submit", response_model=SubmissionResponse)
async def submit_solution(
    request: SubmitRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submit a solution for evaluation."""
    from datetime import datetime
    return {
        "id": 1,
        "problem_id": request.problem_id,
        "code": request.code,
        "language": request.language,
        "status": "passing",
        "results": [{"test_case_id": 1, "passed": True, "actual": "expected_output"}],
        "submitted_at": datetime.utcnow(),
        "execution_time": 1.25,
    }

@router.post("/run", response_model=CodeExecutionResponse)
async def run_code(
    request: SubmitRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Run code and return output."""
    return {
        "id": "exec_1",
        "output": "Query returned 42 rows\nExecution time: 0.32s",
        "execution_time": 0.32,
        "status": "success",
    }
