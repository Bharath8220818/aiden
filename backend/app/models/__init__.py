"""Domain models — import every module so all mappers register on `Base.metadata`.

Mapper configuration happens lazily on first use, which lets relationship()
references resolve by string name across modules.
"""

from app.models.agent_run import AgentRun, AgentRunStatus
from app.models.agent_stage_run import AgentStageRun, StageStatus
from app.models.approval import Approval, ApprovalStatus, ApprovalType, RiskLevel
from app.models.architecture import Architecture, ArchitectureStatus
from app.models.audit_log import AuditLog
from app.models.base import Base, TimestampMixin, UUIDPrimaryKey
from app.models.connection_registry import ConnectionRegistry
from app.models.incident import Incident, IncidentSeverity, IncidentStatus
from app.models.knowledge import DocKind, KnowledgeChunk, KnowledgeDocument
from app.models.mcp_integration import McpIntegration, McpStatus, McpTransport
from app.models.notification import Notification, NotificationType
from app.models.pipeline import Pipeline, PipelineStatus, PipelineType
from app.models.pipeline_node import NodeKind, PipelineNode
from app.models.pipeline_run import PipelineRun, RunStatus, RunTriggerType
from app.models.project import Project, ProjectStatus
from app.models.requirement import Requirement, RequirementStatus
from app.models.schema_snapshot import SchemaSnapshot
from app.models.task import Task, TaskPriority, TaskStatus
from app.models.user import ROLE_TITLES, User, UserRole, UserStatus
from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceMember, WorkspaceRole

__all__ = [
    "AgentRun",
    "AgentRunStatus",
    "AgentStageRun",
    "StageStatus",
    "Base",
    "TimestampMixin",
    "UUIDPrimaryKey",
    "User",
    "UserRole",
    "UserStatus",
    "ROLE_TITLES",
    "Workspace",
    "WorkspaceMember",
    "WorkspaceRole",
    "Project",
    "ProjectStatus",
    "Requirement",
    "RequirementStatus",
    "Architecture",
    "ArchitectureStatus",
    "Pipeline",
    "PipelineStatus",
    "PipelineType",
    "PipelineRun",
    "RunStatus",
    "RunTriggerType",
    "Incident",
    "IncidentSeverity",
    "IncidentStatus",
    "KnowledgeDocument",
    "KnowledgeChunk",
    "DocKind",
    "McpIntegration",
    "McpTransport",
    "McpStatus",
    "Notification",
    "NotificationType",
    "PipelineNode",
    "NodeKind",
    "Approval",
    "ApprovalStatus",
    "ApprovalType",
    "RiskLevel",
    "AuditLog",
    "ConnectionRegistry",
    "SchemaSnapshot",
    "Task",
    "TaskPriority",
    "TaskStatus",
]
