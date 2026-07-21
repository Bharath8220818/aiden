from smolagents import ToolCallingAgent
from app.config import settings


class BaseAIDENAgent:
    """Base class for all AIDEN agents."""

    def __init__(self, name: str, tools: list = None, system_prompt: str = None):
        self.name = name
        self.tools = tools or []
        self.system_prompt = system_prompt or f"You are {name}, an AI agent for data engineering."
        self.agent = self._create_agent()

    def _create_agent(self):
        return ToolCallingAgent(
            name=self.name,
            model=settings.AGENT_MODEL,
            tools=self.tools,
            system_prompt=self.system_prompt,
        )

    async def execute(self, task: str) -> str:
        try:
            return self.agent.run(task)
        except Exception as e:
            return f"Error: {str(e)}"
