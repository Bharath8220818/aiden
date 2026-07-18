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
    config: Optional[Dict[str, Any]] = None

class PipelineResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    status: str
    schedule: Optional[str]
    source_type: str
    destination_type: str
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    last_run_at: Optional[datetime]
    code: Optional[str]
    
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
