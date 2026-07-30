"""
Agents package — Specialized AI agents for pipeline orchestration.

Core agents (extraction, analysis, pipeline_builder, governance, deployment)
are ``smolagents.Tool`` subclasses with a synchronous ``forward()`` method.

Other agents (monitoring, optimisation, streaming, documentation, self_healing)
extend ``BaseAIDENAgent`` for backward compatibility.
"""

# Core Tool-based agents (used by the orchestrator)
from app.agents.extraction_agent import ExtractionAgent
from app.agents.analysis_agent import AnalysisAgent
from app.agents.pipeline_builder_agent import PipelineBuilderAgent
from app.agents.governance_agent import GovernanceAgent
from app.agents.deployment_agent import DeploymentAgent

# Legacy agents (still use BaseAIDENAgent)
from app.agents.base_agent import BaseAIDENAgent
from app.agents.documentation_agent import DocumentationAgent
from app.agents.monitoring_agent import MonitoringAgent
from app.agents.optimisation_agent import OptimisationAgent
from app.agents.self_healing_agent import SelfHealingAgent
from app.agents.streaming_agent import StreamingAgent

__all__ = [
    "ExtractionAgent",
    "AnalysisAgent",
    "PipelineBuilderAgent",
    "GovernanceAgent",
    "DeploymentAgent",
    "BaseAIDENAgent",
    "DocumentationAgent",
    "MonitoringAgent",
    "OptimisationAgent",
    "SelfHealingAgent",
    "StreamingAgent",
]
