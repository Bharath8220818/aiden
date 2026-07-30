"""
Agent Registry — Central registry for all AI agent Tool instances.

Each agent is a ``smolagents.Tool`` subclass registered via
``AgentRegistry.register()``. Registration creates a single instance
that is reused by the orchestrator.

The ``register()`` method can be used as a decorator:

    @AgentRegistry.register
    class MyAgent(Tool):
        name = "my_agent"
        ...

Or called directly:

    AgentRegistry.register(MyAgent)
"""

import logging
from typing import Dict, Optional, List, Any

logger = logging.getLogger(__name__)


class AgentRegistry:
    """Registry for all AI agent Tool instances. Agents register themselves here."""

    _instances: Dict[str, Any] = {}

    @classmethod
    def register(cls, agent_cls):
        """Register a Tool subclass. Creates and caches a single instance."""
        instance = agent_cls()
        cls._instances[instance.name] = instance
        logger.info("Agent registered: %s", instance.name)
        return agent_cls

    @classmethod
    def get(cls, name: str) -> Optional[Any]:
        """Get a registered agent instance by name."""
        return cls._instances.get(name)

    @classmethod
    def list(cls) -> List[str]:
        """List all registered agent names."""
        return list(cls._instances.keys())

    @classmethod
    def unregister(cls, name: str):
        """Remove an agent from the registry."""
        cls._instances.pop(name, None)


# ── Register all core agents ──────────────────────────────────────────
# Each is a smolagents.Tool subclass. The orchestrator discovers them by
# name ("extraction", "analysis", "pipeline_builder", "governance", "deployment").

from app.agents.extraction_agent import ExtractionAgent
from app.agents.analysis_agent import AnalysisAgent
from app.agents.pipeline_builder_agent import PipelineBuilderAgent
from app.agents.governance_agent import GovernanceAgent
from app.agents.deployment_agent import DeploymentAgent

AgentRegistry.register(ExtractionAgent)
AgentRegistry.register(AnalysisAgent)
AgentRegistry.register(PipelineBuilderAgent)
AgentRegistry.register(GovernanceAgent)
AgentRegistry.register(DeploymentAgent)
