"""AIDEN Agent Registry — central lookup of all available agents.

Provides singleton access so agents (and their tool bindings) are only
constructed once per process, plus registry metadata for the API layer.
"""
import logging
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)


class AgentRegistry:
    """Name → agent instance registry with lazy construction."""

    _agents: Dict[str, object] = {}
    _loaded = False

    @classmethod
    def _ensure_loaded(cls):
        if cls._loaded:
            return
        cls._loaded = True
        try:
            from app.agents.sql_agent_v2 import SQLAgentV2
            cls._agents["sql"] = SQLAgentV2()
        except Exception as e:
            logger.warning(f"Failed to load sql agent: {e}")
        try:
            from app.agents.pipeline_agent_v2 import PipelineAgentV2
            cls._agents["pipeline"] = PipelineAgentV2()
        except Exception as e:
            logger.warning(f"Failed to load pipeline agent: {e}")
        try:
            from app.agents.monitoring_agent_v2 import MonitoringAgentV2
            cls._agents["monitoring"] = MonitoringAgentV2()
        except Exception as e:
            logger.warning(f"Failed to load monitoring agent: {e}")
        try:
            from app.agents.debug_agent_v2 import DebugAgentV2
            cls._agents["debug"] = DebugAgentV2()
        except Exception as e:
            logger.warning(f"Failed to load debug agent: {e}")
        try:
            from app.agents.architecture_agent_v2 import ArchitectureAgentV2
            cls._agents["architecture"] = ArchitectureAgentV2()
        except Exception as e:
            logger.warning(f"Failed to load architecture agent: {e}")
        try:
            from app.agents.self_healing_agent_v2 import SelfHealingAgentV2
            cls._agents["self_healing"] = SelfHealingAgentV2()
        except Exception as e:
            logger.warning(f"Failed to load self-healing agent: {e}")
        try:
            from app.agents.security_agent import SecurityAgent
            cls._agents["security"] = SecurityAgent()
        except Exception as e:
            logger.warning(f"Failed to load security agent: {e}")
        logger.info(f"Agent registry loaded: {sorted(cls._agents.keys())}")

    @classmethod
    def get(cls, name: str):
        """Return the singleton agent instance by name (or None)."""
        cls._ensure_loaded()
        return cls._agents.get(name)

    @classmethod
    def list_agents(cls) -> List[dict]:
        """Return metadata for all registered agents."""
        cls._ensure_loaded()
        out = []
        for a in cls._agents.values():
            try:
                out.append({
                    "name": a.name,
                    "type": a.agent_type.value if hasattr(a.agent_type, "value") else str(a.agent_type),
                    "description": a.description,
                    "permissions": list(getattr(a, "permissions", [])),
                    "tools": [t["name"] for t in a.get_tool_info()] if hasattr(a, "get_tool_info") else [],
                })
            except Exception as e:
                logger.warning(f"Failed to introspect agent: {e}")
        return out

    @classmethod
    def register(cls, name: str, agent) -> None:
        """Register (or replace) an agent instance."""
        cls._agents[name] = agent


# Singleton instance
agent_registry = AgentRegistry()
