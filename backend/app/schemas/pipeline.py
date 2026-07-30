from pydantic import BaseModel, Field, field_validator
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

    @field_validator("tests", mode="before")
    @classmethod
    def coerce_tests(cls, v):
        """Coerce empty string or None to empty list for Pydantic v2 strict mode."""
        if v is None or v == "":
            return []
        return v

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


class RagSearchResult(BaseModel):
    query: str
    parsed: Dict[str, Any]
    score: float
    pipeline_id: Optional[int] = None


class RagSearchResponse(BaseModel):
    results: List[RagSearchResult]
    total: int


class SampleDataResponse(BaseModel):
    table_name: str
    data: List[Dict[str, Any]]
    total_rows: int


class TestConnectionRequest(BaseModel):
    """Request schema for the ``/test-connection`` endpoint.

    Users provide a connection string and the endpoint validates that the
    database is reachable by attempting a live connect + ``list_tables()``.
    """
    connection_string: str = Field(
        ...,
        description="Database connection string. Examples:\n"
        "- ``postgresql://user:pass@host:5432/db``\n"
        "- ``sqlite:///./data.db``\n"
        "- ``bigquery://my-project.my_dataset``",
        min_length=3,
    )
    db_type: Optional[str] = Field(
        None,
        description="Optional hint. If omitted, auto-detected from the "
        "connection string prefix.",
    )


class TestConnectionResponse(BaseModel):
    """Response from the ``/test-connection`` endpoint."""
    success: bool
    db_type: str
    tables: List[str] = []
    error: Optional[str] = None
