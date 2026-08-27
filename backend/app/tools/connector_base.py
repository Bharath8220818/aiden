"""
Tool Connector Base Interface

Every connected tool implements this interface. The Tool Gateway
uses these methods to interact with external data-engineering tools
in a uniform way.
"""

import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from enum import Enum

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
    SECURITY = "security"
    QUALITY = "quality"


class ToolStatus(str, Enum):
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    ERROR = "error"
    CONFIGURING = "configuring"


class ToolConnector(ABC):
    """Base class for all tool connectors.

    Each connector wraps a specific external tool (Airflow, Kafka, etc.)
    and exposes a uniform interface for the Tool Gateway.
    """

    # Subclasses must set these
    name: str = "unknown"
    display_name: str = "Unknown Tool"
    category: ToolCategory = ToolCategory.DATABASE
    icon: str = "📦"
    description: str = ""

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self._status = ToolStatus.DISCONNECTED
        self._capabilities: List[str] = []

    @property
    def status(self) -> ToolStatus:
        return self._status

    @abstractmethod
    async def test(self) -> Dict[str, Any]:
        """Test connection to the tool. Returns {"connected": bool, "message": str, ...}."""
        ...

    @abstractmethod
    async def health(self) -> Dict[str, Any]:
        """Get health status. Returns {"status": "healthy"|"degraded"|"error", "details": ...}."""
        ...

    @abstractmethod
    async def list(self, resource_type: str = "default") -> List[Dict[str, Any]]:
        """List available resources (DAGs, topics, tables, etc.)."""
        ...

    @abstractmethod
    async def get(self, resource_type: str, resource_id: str) -> Dict[str, Any]:
        """Get details of a specific resource."""
        ...

    @abstractmethod
    async def execute(self, action: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Execute an action on the tool (trigger DAG, run query, etc.)."""
        ...

    @abstractmethod
    async def logs(self, resource_type: str, resource_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get logs for a resource."""
        ...

    @abstractmethod
    async def metrics(self) -> Dict[str, Any]:
        """Get current metrics from the tool."""
        ...

    def capabilities(self) -> List[str]:
        """Return list of capability strings for the AI orchestrator."""
        return self._capabilities

    def to_registry_entry(self) -> Dict[str, Any]:
        """Serialize for the tool capability registry."""
        return {
            "name": self.name,
            "display_name": self.display_name,
            "category": self.category.value,
            "icon": self.icon,
            "description": self.description,
            "status": self._status.value,
            "capabilities": self._capabilities,
        }
