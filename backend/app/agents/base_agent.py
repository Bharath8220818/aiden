"""
Base AIDEN Agent — Abstract agent class for all AIDEN agents.

Uses conditional imports so the module loads even when ``smolagents``
is not installed (fallback mode returns a descriptive message).
"""

import logging

from app.config import settings

logger = logging.getLogger(__name__)

# ── Conditional smolagents import ───────────────────────────────────────
try:
    from smolagents import ToolCallingAgent, ApiModel

    SMOLAGENTS_AVAILABLE = True
except ImportError:
    ToolCallingAgent = ApiModel = None
    SMOLAGENTS_AVAILABLE = False
    logger.warning(
        "smolagents not installed — agents will run in fallback mode. "
        "Install with: pip install smolagents"
    )


class BaseAIDENAgent:
    """Base class for all AIDEN agents.

    When ``smolagents`` is not installed, ``_create_agent()`` returns
    ``None`` and ``execute()`` returns a descriptive fallback message.
    """

    def __init__(self, name: str, tools: list = None, system_prompt: str = None):
        self.name = name
        self.tools = tools or []
        self.system_prompt = system_prompt or f"You are {name}, an AI agent for data engineering."
        self.agent = self._create_agent()

    def _create_agent(self):
        if not SMOLAGENTS_AVAILABLE:
            return None
        try:
            model = ApiModel(
                model_id=settings.AGENT_MODEL,
                token=settings.HF_TOKEN or None,
            )
        except Exception:
            model = None
        if model is None:
            return None
        return ToolCallingAgent(
            name=self.name,
            model=model,
            tools=self.tools,
            system_prompt=self.system_prompt,
        )

    async def execute(self, task: str) -> str:
        if self.agent is None:
            return (
                f"[{self.name}] Cannot execute — smolagents is not installed. "
                f"Install it with: pip install smolagents"
            )
        try:
            return self.agent.run(task)
        except Exception as e:
            return f"Error: {str(e)}"
