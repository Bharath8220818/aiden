"""
Agents package — Specialized AI agents for pipeline orchestration.

Each agent extends BaseAIDENAgent and implements a ``run()`` method
that performs a specific task (extraction, analysis, deployment, etc.).
"""

from app.agents.analysis_agent import AnalysisAgent
from app.agents.base_agent import BaseAIDENAgent
from app.agents.deployment_agent import DeploymentAgent
from app.agents.documentation_agent import DocumentationAgent
from app.agents.extraction_agent import ExtractionAgent
from app.agents.governance_agent import GovernanceAgent
from app.agents.monitoring_agent import MonitoringAgent
from app.agents.optimisation_agent import OptimisationAgent
from app.agents.pipeline_builder_agent import PipelineBuilderAgent
from app.agents.self_healing_agent import SelfHealingAgent
from app.agents.streaming_agent import StreamingAgent

__all__ = [
    "AnalysisAgent",
    "BaseAIDENAgent",
    "DeploymentAgent",
    "DocumentationAgent",
    "ExtractionAgent",
    "GovernanceAgent",
    "MonitoringAgent",
    "OptimisationAgent",
    "PipelineBuilderAgent",
    "SelfHealingAgent",
    "StreamingAgent",
]
