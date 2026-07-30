from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class TestCaseSchema(BaseModel):
    id: Optional[int] = None
    input: str
    expected: str
    description: Optional[str] = None

class Problem(BaseModel):
    id: int
    title: str
    difficulty: str
    company: str
    category: str
    description: str
    input_schema: Optional[str] = None
    output_schema: Optional[str] = None
    constraints: Optional[str] = None
    solved: bool = False
    test_cases: List[TestCaseSchema] = []

    class Config:
        from_attributes = True

class ProblemListResponse(BaseModel):
    problems: List[dict] = []
    total: int = 0

class SubmitRequest(BaseModel):
    problem_id: int
    code: str
    language: str = "python"  # sql, python, pyspark

class SubmissionResponse(BaseModel):
    id: int
    problem_id: int
    code: str
    language: str
    status: str
    results: List[dict] = []
    submitted_at: Optional[datetime] = None
    execution_time: Optional[float] = None

    class Config:
        from_attributes = True

class CodeExecutionResponse(BaseModel):
    id: str
    output: str
    error: Optional[str] = None
    execution_time: float = 0.0
    status: str = "success"
