"""AIDEN MCP Server — Stage 4.3.

Model-Context-Protocol-style tool server over the existing v2 connector
registry. Agents discover tools via /api/v1/mcp/tools and execute them via
/api/v1/mcp/execute, which enforces RBAC + risk-based approval through the
risk engine before any connector call.

Tools are declared over connector *capabilities* so every connector's full
action surface is exposed without hand-writing each one.
"""
import logging
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from app.tools import TOOL_REGISTRY
from app.services.risk_engine import RiskEngine

logger = logging.getLogger(__name__)


class ToolDefinition(BaseModel):
    name: str = Field(..., description="Fully-qualified tool name, e.g. postgresql.query")
    connector: str = Field(..., description="Connector this tool is served by")
    action: str = Field(..., description="Connector action to invoke")
    description: str = ""
    parameters: Dict[str, Any] = Field(default_factory=dict)
    risk_level: str = "low"
    agents: List[str] = Field(default_factory=list)


class MCPExecuteRequest(BaseModel):
    tool_name: str
    params: Dict[str, Any] = Field(default_factory=dict)
    agent: Optional[str] = None
    dry_run: bool = False


class MCPServer:
    """Registry of MCP tool definitions backed by v2 connectors."""

    def __init__(self) -> None:
        self.tools: Dict[str, ToolDefinition] = {}

    # ── Registration ──────────────────────────────────────────────
    def register_connector_tools(
        self,
        connector_name: str,
        display_name: str,
        capabilities: List[str],
        agents: Optional[List[str]] = None,
    ) -> int:
        """Register one MCP tool per connector capability. Returns count."""
        agents = agents or []
        count = 0
        for action in capabilities:
            name = f"{connector_name}.{action}"
            base = RiskEngine.base_score(action)
            self.tools[name] = ToolDefinition(
                name=name,
                connector=connector_name,
                action=action,
                description=f"{action} via the {display_name} connector",
                parameters={
                    "type": "object",
                    "properties": {
                        "params": {"type": "object", "description": "Action parameters"},
                        "dry_run": {"type": "boolean", "description": "Validate without executing"},
                    },
                },
                risk_level=RiskEngine.evaluate(action, environment="dev").value,
                agents=agents,
            )
            count += 1
        return count

    def discover_tools(self, agent_type: Optional[str] = None) -> List[ToolDefinition]:
        tools = list(self.tools.values())
        if agent_type:
            tools = [t for t in tools if agent_type in t.agents]
        return tools

    def get_tool(self, name: str) -> Optional[ToolDefinition]:
        return self.tools.get(name)

    # ── Execution with permission + risk enforcement ─────────────
    async def execute_tool(
        self,
        tool_name: str,
        params: Dict[str, Any],
        user_role: str = "engineer",
        agent: Optional[str] = None,
        dry_run: bool = False,
        environment: str = "production",
    ) -> Dict[str, Any]:
        tool = self.tools.get(tool_name)
        if not tool:
            return {"success": False, "error": f"Tool not found: {tool_name}"}

        # 1. Risk evaluation (intrinsic action score × environment factor)
        risk = RiskEngine.evaluate(tool.action, environment=environment, user_role=user_role)

        # 2. Approval gate — role must be cleared for this risk level
        approval_required = RiskEngine.requires_approval(risk) and not RiskEngine.can_approve(
            risk, user_role
        )
        if approval_required and not dry_run:
            return {
                "success": False,
                "error": "approval_required",
                "detail": (
                    f"{tool_name} is {risk.value}-risk in {environment}; role "
                    f"'{user_role}' cannot execute it unattended. Request approval "
                    f"via /api/v1/approvals first."
                ),
                "risk_level": risk.value,
                "approval_required": True,
            }

        # 3. Execute through the v2 connector
        connector = TOOL_REGISTRY.get(tool.connector)
        if connector is None:
            return {"success": False, "error": f"Connector unavailable: {tool.connector}"}

        try:
            result = await connector.execute(tool.action, params, dry_run=dry_run)
        except Exception as e:
            logger.warning(f"MCP execution failed for {tool_name}: {e}")
            return {"success": False, "error": str(e), "tool": tool_name}

        return {
            "success": result.success,
            "data": result.data,
            "error": result.error,
            "tool": tool_name,
            "execution_time_ms": result.execution_time_ms,
            "dry_run": dry_run,
            "risk_level": risk.value,
            "approval_required": False,
        }


# ─── Singleton built from the connector registry ─────────────────────
mcp_server = MCPServer()

# Per-connector default agent bindings
_CONNECTOR_AGENTS = {
    "postgresql": ["sql_agent", "pipeline_agent", "debug_agent"],
    "airflow": ["pipeline_agent", "monitoring_agent", "debug_agent"],
    "kafka": ["monitoring_agent", "pipeline_agent"],
    "spark": ["pipeline_agent"],
    "dbt": ["pipeline_agent", "sql_agent"],
    "s3": ["pipeline_agent"],
}


def build_mcp_registry() -> int:
    """(Re)build MCP tools from every connector in TOOL_REGISTRY."""
    mcp_server.tools.clear()
    total = 0
    for entry in TOOL_REGISTRY.values():
        info = entry.to_registry_entry()
        total += mcp_server.register_connector_tools(
            connector_name=info["name"],
            display_name=info.get("display_name", info["name"]),
            capabilities=info.get("capabilities", []),
            agents=_CONNECTOR_AGENTS.get(info["name"], []),
        )
    logger.info(f"MCP registry built: {total} tools from {len(TOOL_REGISTRY)} connectors")
    return total
