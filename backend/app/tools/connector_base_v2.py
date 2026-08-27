"""
Enhanced Tool Connector Base with Pydantic validation, retries, timeouts, and audit logging.
"""
import logging
import time
import asyncio
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from enum import Enum
from pydantic import BaseModel, Field
from datetime import datetime

logger = logging.getLogger(__name__)


class ToolCategory(str, Enum):
    ORCHESTRATOR = "orchestrator"
    STREAM_PROCESSOR = "stream_processor"
    DATABASE = "database"
    WAREHOUSE = "warehouse"
    TRANSFORMER = "transformer"
    COMPUTE_ENGINE = "compute_engine"
    STORAGE = "storage"
    MONITOR = "monitor"


class ToolStatus(str, Enum):
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    ERROR = "error"
    CONFIGURING = "configuring"


class ConnectorConfig(BaseModel):
    host: str = ""
    port: int = 0
    username: str = ""
    password: str = ""
    timeout_seconds: int = 30
    retry_attempts: int = 3
    retry_delay_seconds: float = 1.0
    max_retry_delay: float = 30.0


class ConnectorResult(BaseModel):
    success: bool
    data: Any = None
    error: Optional[str] = None
    execution_time_ms: float = 0.0
    tool_name: str = ""
    action: str = ""
    read_only: bool = True
    audit_metadata: Dict[str, Any] = Field(default_factory=dict)


class ConnectorHealth(BaseModel):
    status: str
    latency_ms: float = 0.0
    details: Dict[str, Any] = Field(default_factory=dict)


class AuditEntry(BaseModel):
    timestamp: str
    tool_name: str
    action: str
    read_only: bool
    success: bool
    execution_time_ms: float
    error: Optional[str] = None
    params_hash: str = ""


def mask_credentials(data: dict) -> dict:
    masked = dict(data)
    for key in ("password", "token", "secret", "api_key", "credentials"):
        if key in masked and masked[key]:
            masked[key] = masked[key][:4] + "***"
    return masked


def classify_mutation(action: str) -> bool:
    read_only_actions = {"list", "get", "health", "test", "metrics", "logs", "describe", "search"}
    return action.lower().split("_")[0] not in read_only_actions


class BaseConnector(ABC):
    name: str = "base"
    display_name: str = "Base"
    category: ToolCategory = ToolCategory.DATABASE
    icon: str = "📦"
    description: str = ""

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self._config = ConnectorConfig(**(config or {}))
        self._status = ToolStatus.DISCONNECTED
        self._capabilities: List[str] = []
        self._audit_log: List[AuditEntry] = []
        self._logger = logging.getLogger(f"connector.{self.name}")

    @property
    def config(self):
        return self._config

    @property
    def status(self):
        return self._status

    @property
    def capabilities(self):
        return self._capabilities

    async def _retry(self, func, *args, **kwargs):
        last_error = None
        for attempt in range(self._config.retry_attempts):
            try:
                return await asyncio.wait_for(
                    func(*args, **kwargs),
                    timeout=self._config.timeout_seconds,
                )
            except asyncio.TimeoutError:
                last_error = f"Timeout after {self._config.timeout_seconds}s"
                self._logger.warning(f"Timeout on attempt {attempt+1}")
            except Exception as e:
                last_error = str(e)
                self._logger.warning(f"Error on attempt {attempt+1}: {e}")
            if attempt < self._config.retry_attempts - 1:
                delay = min(
                    self._config.retry_delay_seconds * (2 ** attempt),
                    self._config.max_retry_delay,
                )
                await asyncio.sleep(delay)
        raise Exception(last_error or "All retry attempts exhausted")

    def _record_audit(self, action, read_only, success, ms, error=None):
        entry = AuditEntry(
            timestamp=datetime.utcnow().isoformat(),
            tool_name=self.name,
            action=action,
            read_only=read_only,
            success=success,
            execution_time_ms=ms,
            error=error,
        )
        self._audit_log.append(entry)
        if len(self._audit_log) > 1000:
            self._audit_log = self._audit_log[-500:]
        level = logging.INFO if success else logging.WARNING
        self._logger.log(level, f"{self.name}.{action} {'OK' if success else 'FAIL'} {ms:.0f}ms")

    def get_audit_log(self, limit: int = 50) -> List[Dict]:
        return [e.model_dump() for e in self._audit_log[-limit:]]

    @abstractmethod
    async def test(self) -> ConnectorResult: ...

    @abstractmethod
    async def health(self) -> ConnectorHealth: ...

    @abstractmethod
    async def list_resources(self, resource_type: str = "default") -> ConnectorResult: ...

    @abstractmethod
    async def get_resource(self, resource_type: str, resource_id: str) -> ConnectorResult: ...

    @abstractmethod
    async def execute(self, action: str, params: Dict[str, Any], dry_run: bool = False) -> ConnectorResult: ...

    @abstractmethod
    async def get_logs(self, resource_type: str, resource_id: str, limit: int = 50) -> ConnectorResult: ...

    @abstractmethod
    async def get_metrics(self) -> ConnectorResult: ...

    def to_registry_entry(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "display_name": self.display_name,
            "category": self.category.value,
            "icon": self.icon,
            "description": self.description,
            "status": self._status.value,
            "capabilities": self._capabilities,
        }
