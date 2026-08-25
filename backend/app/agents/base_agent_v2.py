"""
AIDEN Base Agent — Uses OpenAI Agents SDK for structured outputs,
function tools, handoffs, guardrails, and tracing.

Falls back gracefully if openai-agents is not installed.
"""
import logging
import time
from typing import Optional, List, Type, Any

from app.config import settings
from app.schemas.agent_communication import AgentTask, AgentResult, AgentType, TaskStatus

logger = logging.getLogger(__name__)

try:
    from agents import Agent, Runner, function_tool
    AGENTS_SDK_AVAILABLE = True
except ImportError:
    Agent = Runner = function_tool = None
    AGENTS_SDK_AVAILABLE = False
    logger.warning("openai-agents not installed. Agents run in fallback mode.")


class BaseAIDENAgent:
    """
    Base class for all AIDEN agents.

    Subclasses define:
        name: str
        agent_type: AgentType
        description: str
        system_prompt: str
        tools: list of @function_tool decorated functions
        permissions: list of capability strings
    """

    name: str = "base_agent"
    agent_type: AgentType = AgentType.ORCHESTRATOR
    description: str = "Base AIDEN agent"
    system_prompt: str = "You are an AIDEN agent."
    tools: list = []
    permissions: List[str] = []

    def __init__(self):
        self._agent = self._create_agent()
        logger.info(f"Agent '{self.name}' initialized (SDK={'available' if AGENTS_SDK_AVAILABLE else 'fallback'})")

    def _create_agent(self):
        if not AGENTS_SDK_AVAILABLE:
            return None
        try:
            return Agent(
                name=self.name,
                instructions=self.system_prompt,
                tools=self.tools,
            )
        except Exception as e:
            logger.error(f"Failed to create agent {self.name}: {e}")
            return None

    async def execute(self, task: AgentTask, context: dict = None) -> AgentResult:
        """Execute a task and return structured result."""
        start = time.monotonic()

        if self._agent is None:
            return AgentResult(
                task_id=task.task_id,
                agent_name=self.name,
                agent_type=self.agent_type,
                status=TaskStatus.FAILURE,
                output={"error": "Agent not initialized (SDK not available)"},
                confidence=0.0,
            )

        try:
            runner_output = await Runner.run(
                self._agent,
                task.objective,
                context=context or {},
            )
            elapsed_ms = (time.monotonic() - start) * 1000

            return AgentResult(
                task_id=task.task_id,
                agent_name=self.name,
                agent_type=self.agent_type,
                status=TaskStatus.SUCCESS,
                output={"response": str(runner_output.final_output)},
                confidence=0.85,
                tools_used=[t.name if hasattr(t, "name") else str(t) for t in self.tools],
                execution_time_ms=elapsed_ms,
            )
        except Exception as e:
            elapsed_ms = (time.monotonic() - start) * 1000
            logger.error(f"Agent {self.name} failed: {e}")
            return AgentResult(
                task_id=task.task_id,
                agent_name=self.name,
                agent_type=self.agent_type,
                status=TaskStatus.FAILURE,
                output={"error": str(e)},
                confidence=0.0,
                execution_time_ms=elapsed_ms,
                error=str(e),
            )
