from pydantic import BaseModel
from typing import Optional, List, Any, Dict

class ComponentDefinition(BaseModel):
    id: Optional[str] = None
    name: str
    type: str = "source"  # source, streaming, processing, storage, analytics, monitoring, security
    category: Optional[str] = None  # databases, streaming, processing, storage, cloud, orchestration, monitoring, ai, security, containers, quality
    cloud_provider: Optional[str] = "aws"  # aws, azure, gcp
    service: Optional[str] = None
    icon: Optional[str] = None
    status: Optional[str] = "healthy"  # healthy, warning, error, critical, disconnected, unknown, monitoring
    metrics: Optional[Dict[str, str]] = None
    config: dict = {}

class ConnectionDefinition(BaseModel):
    id: Optional[str] = None
    source: Optional[str] = None  # ReactFlow source node id
    target: Optional[str] = None  # ReactFlow target node id
    from_id: Optional[str] = None  # legacy alias
    to_id: Optional[str] = None  # legacy alias
    label: Optional[str] = None
    edgeType: Optional[str] = "dataflow"  # dataflow, control, api, event, monitoring, security
    data_flow: Optional[str] = "stream"  # legacy: stream, batch, api
    protocol: Optional[str] = "http"  # legacy: http, kafka, grpc

class ArchitectureGenerateRequest(BaseModel):
    prompt: str
    cloud_provider: Optional[str] = "aws"

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
