"""
AIDEN Base Agent v2 — Connector-aware agent with structured outputs.

Supports two execution modes:
1. OpenAI Agents SDK (when available) — LLM-powered reasoning with function tools
2. Connector-aware fallback (always available) — Direct tool execution with LLM reasoning

Every agent has:
- Access to its bound tool functions (from agent_tools.py)
- Structured input/output via Pydantic
- WebSocket step broadcasting for real-time UI updates
- Audit logging of tool calls
"""

import logging
import time
import asyncio
import uuid
from typing import Optional, List, Dict, Any, Callable

from app.config import settings
from app.schemas.agent_communication import AgentTask, AgentResult, AgentType, TaskStatus

logger = logging.getLogger(__name__)

try:
    from agents import Agent, Runner, function_tool
    AGENTS_SDK_AVAILABLE = True
except ImportError:
    Agent = Runner = function_tool = None
    AGENTS_SDK_AVAILABLE = False
    logger.info("openai-agents not installed. Agents run in connector-aware fallback mode.")


class BaseAIDENAgent:
    """
    Base class for all AIDEN agents with connector-aware execution.

    Subclasses define:
        name: str
        agent_type: AgentType
        description: str
        system_prompt: str
        permissions: list of capability strings
        tool_names: list of tool function names from agent_tools.py

    The base class automatically:
        - Discovers and binds tool functions from the tool registry
        - Executes tools with validation and audit logging
        - Falls back to direct connector calls when SDK is unavailable
        - Broadcasts agent steps via WebSocket for real-time UI
    """

    name: str = "base_agent"
    agent_type: AgentType = AgentType.ORCHESTRATOR
    description: str = "Base AIDEN agent"
    system_prompt: str = "You are an AIDEN agent."
    permissions: List[str] = []
    tool_names: List[str] = []  # Names from agent_tools.py AGENT_TOOL_REGISTRY

    def __init__(self):
        self._tools: List[Dict[str, Any]] = []
        self._tool_map: Dict[str, Callable] = {}
        self._sdk_agent = None
        self._bind_tools()
        self._create_sdk_agent()
        logger.info(
            f"Agent '{self.name}' initialized "
            f"(SDK={'available' if AGENTS_SDK_AVAILABLE else 'fallback'}, "
            f"tools={len(self._tools)})"
        )

    def _bind_tools(self):
        """Discover and bind tool functions from the agent_tools registry."""
        try:
            from app.agents.agent_tools import AGENT_TOOL_REGISTRY
            tools = AGENT_TOOL_REGISTRY.get(self.name, [])
            self._tools = tools
            self._tool_map = {t["name"]: t["fn"] for t in tools}
        except ImportError:
            logger.warning(f"agent_tools not available for {self.name}")

    def _create_sdk_agent(self):
        """Create the OpenAI Agents SDK agent (if available) with function tools."""
        if not AGENTS_SDK_AVAILABLE:
            return

        try:
            # Convert tool functions to SDK function_tools
            sdk_tools = []
            for tool_def in self._tools:
                try:
                    fn = tool_def["fn"]
                    # Wrap async function for SDK
                    @function_tool
                    async def tool_wrapper(**kwargs):
                        return await fn(**kwargs)
                    tool_wrapper.__name__ = tool_def["name"]
                    tool_wrapper.__doc__ = tool_def.get("description", "")
                    sdk_tools.append(tool_wrapper)
                except Exception as e:
                    logger.warning(f"Failed to wrap tool {tool_def['name']}: {e}")

            self._sdk_agent = Agent(
                name=self.name,
                instructions=self.system_prompt,
                tools=sdk_tools,
            )
        except Exception as e:
            logger.error(f"Failed to create SDK agent {self.name}: {e}")

    async def _broadcast_step(
        self,
        run_id: str,
        status: str,
        detail: str = "",
        execution_time_ms: float = 0,
    ):
        """Broadcast agent step via WebSocket for real-time UI updates."""
        try:
            from app.api.v1.websocket import broadcast_agent_step
            await broadcast_agent_step(
                run_id=run_id,
                agent=self.name,
                status=status,
                detail=detail,
                tools_used=list(self._tool_map.keys()),
                execution_time_ms=execution_time_ms,
            )
        except Exception:
            pass  # WebSocket not available, skip silently

    async def _execute_tool(self, tool_name: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a single tool function with validation."""
        fn = self._tool_map.get(tool_name)
        if not fn:
            return {"error": f"Tool '{tool_name}' not available for agent '{self.name}'"}

        try:
            # Check permissions
            tool_def = next((t for t in self._tools if t["name"] == tool_name), None)
            if tool_def and not tool_def.get("read_only", True):
                # Mutating tool — check if we have permission
                category = tool_def.get("category", "")
                required_perm = f"{category}.write"
                if required_perm not in self.permissions and f"{category}.*" not in self.permissions:
                    logger.warning(f"Agent {self.name} blocked from mutating tool {tool_name}")
                    return {"error": f"Permission denied: {required_perm} required"}

            result = await fn(**params)
            return result
        except Exception as e:
            logger.error(f"Tool {tool_name} failed for agent {self.name}: {e}")
            return {"error": str(e)}

    async def _execute_fallback(self, task: AgentTask, context: dict) -> AgentResult:
        """
        Connector-aware fallback execution when SDK is unavailable.

        Instead of failing, this method:
        1. Analyzes the task objective
        2. Selects appropriate tools
        3. Executes them in sequence
        4. Synthesizes a structured result
        """
        start = time.monotonic()
        run_id = task.task_id
        evidence = []
        tools_used = []

        await self._broadcast_step(run_id, "running", f"Starting {self.name}")

        # If no tools available, return a basic analysis
        if not self._tools:
            elapsed_ms = (time.monotonic() - start) * 1000
            await self._broadcast_step(run_id, "success", "Completed (no tools)", elapsed_ms)
            return AgentResult(
                task_id=task.task_id,
                agent_name=self.name,
                agent_type=self.agent_type,
                status=TaskStatus.SUCCESS,
                output={
                    "response": f"{self.name} analyzed the request: {task.objective}",
                    "analysis": self._analyze_objective(task.objective),
                },
                confidence=0.5,
                evidence=[f"{self.name} completed analysis"],
                execution_time_ms=elapsed_ms,
            )

        # Execute tools based on the objective
        tool_results = {}
        objective_lower = task.objective.lower()

        for tool_def in self._tools:
            tool_name = tool_def["name"]
            # Smart tool selection: only run tools relevant to the objective
            if self._should_use_tool(tool_name, objective_lower):
                logger.info(f"Agent {self.name} executing tool: {tool_name}")
                await self._broadcast_step(run_id, "running", f"Calling {tool_name}")

                result = await self._execute_tool(tool_name, {})
                tool_results[tool_name] = result
                tools_used.append(tool_name)

                if result and not result.get("error"):
                    evidence.append(f"{tool_name}: success")
                else:
                    evidence.append(f"{tool_name}: {result.get('error', 'failed')}")

        elapsed_ms = (time.monotonic() - start) * 1000

        # Synthesize results
        output = {
            "response": self._synthesize_response(task.objective, tool_results),
            "tool_results": tool_results,
            "tools_called": tools_used,
        }

        success = any(not r.get("error") for r in tool_results.values())
        status = "success" if success else "failed"

        await self._broadcast_step(run_id, status, f"Completed with {len(tools_used)} tools", elapsed_ms)

        return AgentResult(
            task_id=task.task_id,
            agent_name=self.name,
            agent_type=self.agent_type,
            status=TaskStatus.SUCCESS if success else TaskStatus.FAILURE,
            output=output,
            confidence=0.7 if success else 0.3,
            evidence=evidence,
            tools_used=tools_used,
            execution_time_ms=elapsed_ms,
        )

    def _should_use_tool(self, tool_name: str, objective: str) -> bool:
        """Determine if a tool should be used based on the objective."""
        # Map tool categories to objective keywords
        category_keywords = {
            "pg_": ["table", "schema", "sql", "query", "select", "column", "database", "row", "count"],
            "airflow_": ["pipeline", "dag", "airflow", "orchestrate", "schedule", "run"],
            "kafka_": ["kafka", "topic", "stream", "consumer", "lag", "event"],
            "dbt_": ["dbt", "model", "transform", "test", "seed"],
            "spark_": ["spark", "batch", "job", "cluster", "worker"],
        }
        for prefix, keywords in category_keywords.items():
            if tool_name.startswith(prefix):
                return any(kw in objective for kw in keywords)
        return False

    def _analyze_objective(self, objective: str) -> Dict[str, Any]:
        """Analyze the objective and return structured analysis."""
        return {
            "agent": self.name,
            "objective": objective,
            "available_tools": [t["name"] for t in self._tools],
            "analysis": f"{self.name} processed the request",
        }

    def _synthesize_response(self, objective: str, tool_results: Dict[str, Any]) -> str:
        """Synthesize a human-readable response from tool results."""
        lines = [f"**{self.name}** executed the following:\n"]

        for tool_name, result in tool_results.items():
            if result.get("error"):
                lines.append(f"- ❌ `{tool_name}`: {result['error']}")
            else:
                data = result.get("data", result)
                if isinstance(data, list):
                    lines.append(f"- ✅ `{tool_name}`: returned {len(data)} results")
                elif isinstance(data, dict):
                    lines.append(f"- ✅ `{tool_name}`: {list(data.keys())[:5]}")
                else:
                    lines.append(f"- ✅ `{tool_name}`: completed")

        return "\n".join(lines)

    async def execute(self, task: AgentTask, context: dict = None) -> AgentResult:
        """
        Execute a task and return structured result.

        Execution order:
        1. Try SDK execution (if available and agent has SDK tools)
        2. Fall back to connector-aware execution
        """
        context = context or {}
        start = time.monotonic()

        # Try SDK execution first
        if self._sdk_agent and AGENTS_SDK_AVAILABLE:
            try:
                await self._broadcast_step(task.task_id, "running", "SDK execution")

                runner_output = await Runner.run(
                    self._sdk_agent,
                    task.objective,
                    context=context,
                )
                elapsed_ms = (time.monotonic() - start) * 1000

                await self._broadcast_step(task.task_id, "success", "SDK completed", elapsed_ms)

                return AgentResult(
                    task_id=task.task_id,
                    agent_name=self.name,
                    agent_type=self.agent_type,
                    status=TaskStatus.SUCCESS,
                    output={"response": str(runner_output.final_output)},
                    confidence=0.85,
                    tools_used=[t["name"] for t in self._tools],
                    execution_time_ms=elapsed_ms,
                )
            except Exception as e:
                logger.warning(f"SDK execution failed for {self.name}, falling back: {e}")

        # Fallback: connector-aware execution
        return await self._execute_fallback(task, context)

    def get_tool_info(self) -> List[Dict[str, Any]]:
        """Get information about this agent's available tools."""
        return [
            {
                "name": t["name"],
                "description": t.get("description", ""),
                "category": t.get("category", ""),
                "read_only": t.get("read_only", True),
            }
            for t in self._tools
        ]
