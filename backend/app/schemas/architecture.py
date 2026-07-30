from pydantic import BaseModel
from typing import Optional, List, Any

class ComponentDefinition(BaseModel):
    id: Optional[str] = None
    name: str
    type: str = "source"  # source, streaming, processing, storage, analytics
    cloud_provider: str = "aws"  # aws, azure, gcp
    service: Optional[str] = None
    config: dict = {}

class ConnectionDefinition(BaseModel):
    from_id: str
    to_id: str
    data_flow: str = "stream"  # stream, batch, api
    protocol: str = "http"  # http, kafka, grpc

class ArchitectureGenerateRequest(BaseModel):
    prompt: str
    cloud_provider: Optional[str] = "azure"

class ArchitectureResponse(BaseModel):
    id: Optional[str] = None
    title: Optional[str] = None
    components: List[ComponentDefinition] = []
    connections: List[ConnectionDefinition] = []
    design_principles: List[str] = []
    medallion_layers: Optional[Any] = None
    estimated_cost: Optional[str] = None
    explanation: Optional[str] = None
    terraform_code: Optional[str] = None
