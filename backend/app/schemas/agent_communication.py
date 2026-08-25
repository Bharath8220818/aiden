"""
AIDEN Agent Communication Schemas
Typed Pydantic models for all inter-agent communication.
Every agent must communicate through these structured objects.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum
from datetime import datetime
import uuid


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class TaskStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILURE = "failure"
    PARTIAL = "partial"
    NEEDS_APPROVAL = "needs_approval"
    CANCELLED = "cancelled"


class AgentType(str, Enum):
    ORCHESTRATOR = "orchestrator"
    SQL = "sql"
    PIPELINE = "pipeline"
    ARCHITECTURE = "architecture"
    MONITORING = "monitoring"
    DEBUG = "debug"
    EXTRACTION = "extraction"
    SELF_HEALING = "self_healing"
    QUALITY = "quality"
    SECURITY = "security"
    RAG = "rag"


class AgentTask(BaseModel):
    task_id: str = Field(default_factory=lambda: uuid.uuid4().hex[:12])
    project_id: str = ""
    user_id: int = 0
    objective: str = Field(..., description="What the agent should accomplish")
    context: Dict[str, Any] = Field(default_factory=dict)
    allowed_tools: List[str] = Field(default_factory=list)
    risk_level: RiskLevel = RiskLevel.LOW
    deadline: Optional[datetime] = None
    parent_task_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class AgentResult(BaseModel):
    task_id: str
    agent_name: str
    agent_type: AgentType = AgentType.ORCHESTRATOR
    status: TaskStatus = TaskStatus.SUCCESS
    output: Dict[str, Any] = Field(default_factory=dict)
    confidence: float = Field(0.0, ge=0.0, le=1.0)
    evidence: List[str] = Field(default_factory=list)
    tools_used: List[str] = Field(default_factory=list)
    execution_time_ms: float = 0.0
    tokens_used: int = 0
    cost_usd: float = 0.0
    error: Optional[str] = None
    completed_at: datetime = Field(default_factory=datetime.utcnow)


class ToolCall(BaseModel):
    tool_name: str
    action: str
    params: Dict[str, Any] = Field(default_factory=dict)
    read_only: bool = True
    dry_run: bool = False
    timeout_seconds: int = 30
    requested_by: str = ""


class ToolResult(BaseModel):
    success: bool
    output: Any = None
    error: Optional[str] = None
    execution_time_ms: float = 0.0
    tool_name: str = ""
    action: str = ""
    read_only: bool = True
    audit_metadata: Dict[str, Any] = Field(default_factory=dict)


class ExecutionStep(BaseModel):
    step_id: str = Field(default_factory=lambda: f"step_{uuid.uuid4().hex[:6]}")
    agent_name: str
    description: str
    depends_on: List[str] = Field(default_factory=list)
    tools_required: List[str] = Field(default_factory=list)
    risk_level: RiskLevel = RiskLevel.LOW
    status: TaskStatus = TaskStatus.PENDING
    result: Optional[AgentResult] = None


class ExecutionPlan(BaseModel):
    plan_id: str = Field(default_factory=lambda: f"plan_{uuid.uuid4().hex[:8]}")
    objective: str = ""
    steps: List[ExecutionStep] = Field(default_factory=list)
    parallel_groups: List[List[str]] = Field(default_factory=list)
    risk_assessment: RiskLevel = RiskLevel.LOW
    estimated_time_seconds: float = 0.0
    approval_required: bool = False
    status: TaskStatus = TaskStatus.PENDING
    created_at: datetime = Field(default_factory=datetime.utcnow)


class IncidentSeverity(str, Enum):
    CRITICAL = "critical"
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


class Incident(BaseModel):
    id: str = Field(default_factory=lambda: f"AID-{uuid.uuid4().hex[:6].upper()}")
    severity: IncidentSeverity = IncidentSeverity.WARNING
    title: str
    description: str = ""
    affected_components: List[str] = Field(default_factory=list)
    root_cause: Optional[str] = None
    evidence: List[str] = Field(default_factory=list)
    confidence: float = Field(0.0, ge=0.0, le=1.0)
    status: str = "open"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    resolved_at: Optional[datetime] = None
    assigned_agent: Optional[str] = None


class Recommendation(BaseModel):
    type: str
    confidence: float = Field(0.0, ge=0.0, le=1.0)
    rationale: str
    impact: str = ""
    risk: RiskLevel = RiskLevel.LOW
    implementation_steps: List[str] = Field(default_factory=list)


class ApprovalRequest(BaseModel):
    id: str = Field(default_factory=lambda: uuid.uuid4().hex[:8])
    action: str
    risk_level: RiskLevel
    requester: str
    resource: Dict[str, Any] = Field(default_factory=dict)
    approval_state: str = "pending"
    approver: Optional[int] = None
    justification: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None


class PipelinePlan(BaseModel):
    name: str
    description: str = ""
    source: Dict[str, Any] = Field(default_factory=dict)
    destination: Dict[str, Any] = Field(default_factory=dict)
    transforms: List[Dict[str, Any]] = Field(default_factory=list)
    schedule: Optional[str] = None
    monitoring: Dict[str, Any] = Field(default_factory=dict)
    tests: List[Dict[str, Any]] = Field(default_factory=list)
    risks: List[str] = Field(default_factory=list)
    approval_required: bool = False
    estimated_duration_seconds: float = 0.0


class ArchitectureNode(BaseModel):
    id: str
    type: str
    label: str
    config: Dict[str, Any] = Field(default_factory=dict)
    position: Dict[str, float] = Field(default_factory=dict)
    zone: Optional[str] = None
    status: str = "unknown"
    health: Optional[str] = None


class ArchitectureEdge(BaseModel):
    id: str = Field(default_factory=lambda: uuid.uuid4().hex[:8])
    source: str
    target: str
    label: str = ""
    type: str = "data_flow"
    animated: bool = False
    protocol: str = ""
    throughput: str = ""


class ArchitectureGraph(BaseModel):
    nodes: List[ArchitectureNode] = Field(default_factory=list)
    edges: List[ArchitectureEdge] = Field(default_factory=list)
    zones: List[Dict[str, Any]] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    version: str = "1.0"
    name: str = ""
    description: str = ""


class SchemaChange(BaseModel):
    table: str
    column: Optional[str] = None
    change_type: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    impact: str = ""
    affected_pipelines: List[str] = Field(default_factory=list)
    detected_at: datetime = Field(default_factory=datetime.utcnow)


class DeploymentPlan(BaseModel):
    changes: List[Dict[str, Any]] = Field(default_factory=list)
    tests: List[Dict[str, Any]] = Field(default_factory=list)
    rollback_plan: str = ""
    approval_required: bool = True
    environment: str = "production"
    estimated_downtime_seconds: float = 0.0
