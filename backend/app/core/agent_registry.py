import logging
from typing import Dict, Optional, Type, List, Any

logger = logging.getLogger(__name__)


class AgentRegistry:
    """Registry for all AI agents. Agents register themselves here."""

    _agents: Dict[str, Type] = {}
    _instances: Dict[str, Any] = {}

    @classmethod
    def register(cls, agent_cls: Type) -> Type:
        """Register an agent class. Uses its `name` attribute as key."""
        name = getattr(agent_cls, "name", agent_cls.__name__.lower())
        cls._agents[name] = agent_cls
        logger.info(f"Agent registered: {name}")
        return agent_cls

    @classmethod
    def get(cls, name: str) -> Optional[Any]:
        """Get or create an instance of a registered agent."""
        agent_cls = cls._agents.get(name)
        if not agent_cls:
            return None
        if name not in cls._instances:
            cls._instances[name] = agent_cls()
        return cls._instances[name]

    @classmethod
    def list(cls) -> List[str]:
        """List all registered agent names."""
        return list(cls._agents.keys())

    @classmethod
    def unregister(cls, name: str):
        """Remove an agent from the registry."""
        cls._agents.pop(name, None)
        cls._instances.pop(name, None)
