from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


class PipelineCreate(BaseModel):
    name: str
    description: Optional[str] = None
    source_type: str
    destination_type: str
    schedule: Optional[str] = None
    config: Dict[str, Any] = {}


class PipelineUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    schedule: Optional[str] = None
    source_type: Optional[str] = None
    destination_type: Optional[str] = None
    status: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class PipelineResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    status: str
    schedule: Optional[str]
    source_type: str
    destination_type: str
    created_by: Optional[int]
    user_id: Optional[int]
    is_active: bool
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    last_run_at: Optional[datetime]
    code: Optional[str]
    dbt_code: Optional[str]
    tests: Optional[List[Any]] = None

    class Config:
        from_attributes = True


class PipelineExecutionResponse(BaseModel):
    id: int
    pipeline_id: int
    user_id: int
    status: str
    triggered_by: Optional[str] = None
    started_at: Optional[datetime]
    completed_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    error_message: Optional[str] = None
    logs: Optional[List[str]] = None
    records_processed: Optional[int] = None

    class Config:
        from_attributes = True


class PromptRequest(BaseModel):
    prompt: str


class IntentResponse(BaseModel):
    name: str
    source_type: str
    source_config: Dict[str, Any]
    destination_type: str
    destination_config: Dict[str, Any]
    transformations: List[str]
    schedule: str
    data_quality_rules: List[str]


class DatabaseConnection(BaseModel):
    host: str
    port: int
    database: str
    user: str
    password: str


class SampleDataResponse(BaseModel):
    table_name: str
    data: List[Dict[str, Any]]
    total_rows: int
