"""Agent Registry — central registry for all AIDEN agents.

Provides a registry pattern so the orchestrator, CLI, and monitoring
pages can discover available agents without hardcoding imports.

Usage:
    from app.core.agent_registry import AgentRegistry

    # Register agents
    AgentRegistry.register("extraction", ExtractionAgent)

    # Look up an agent class
    agent_cls = AgentRegistry.get("extraction")

    # List all registered agents
    for name in AgentRegistry.list_agents():
        print(name)
"""

from typing import Dict, Optional, Type

from app.agents.base_agent import BaseAIDENAgent


class AgentRegistry:
    """Registry for all available AIDEN agents.

    Provides ``register`` / ``get`` / ``list_agents`` class methods so
    the orchestrator, API, and UI can inspect which agents are installed
    without importing every module eagerly.
    """

    _agents: Dict[str, Type[BaseAIDENAgent]] = {}

    @classmethod
    def register(cls, name: str, agent_class: Type[BaseAIDENAgent]):
        """Register an agent class under *name*.

        Args:
            name: Canonical agent name (e.g. ``"extraction"``).
            agent_class: Subclass of ``BaseAIDENAgent``.
        """
        cls._agents[name] = agent_class

    @classmethod
    def get(cls, name: str) -> Optional[Type[BaseAIDENAgent]]:
        """Look up an agent class by name.

        Returns ``None`` (not ``KeyError``) if the name hasn't been
        registered, so callers can gracefully degrade.
        """
        return cls._agents.get(name)

    @classmethod
    def list_agents(cls) -> list[str]:
        """Return the canonical names of every registered agent."""
        return list(cls._agents.keys())

    @classmethod
    def clear(cls):
        """Clear the registry (useful for tests)."""
        cls._agents.clear()


# ── Register built-in agents ─────────────────────────────────────────────

def _register_builtins():
    """Lazy registration so importing this module doesn't force all agent
    imports until ``register_builtins()`` is called."""
    from app.agents.extraction_agent import ExtractionAgent
    from app.agents.analysis_agent import AnalysisAgent
    from app.agents.pipeline_builder_agent import PipelineBuilderAgent

    AgentRegistry.register("extraction", ExtractionAgent)
    AgentRegistry.register("analysis", AnalysisAgent)
    AgentRegistry.register("builder", PipelineBuilderAgent)


# Auto-register on import
_register_builtins()
