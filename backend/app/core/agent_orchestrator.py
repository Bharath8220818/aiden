from app.agents.extraction_agent import ExtractionAgent
from app.agents.analysis_agent import AnalysisAgent
from app.agents.pipeline_builder_agent import PipelineBuilderAgent
from app.config import settings
import logging

logger = logging.getLogger(__name__)


class AgentOrchestrator:
    """
    Multi-agent orchestrator using smolagents + HuggingFace.
    Coordinates Extraction → Analysis → PipelineBuilder agents.
    """

    def __init__(self):
        self._enabled = False

        # Check if smolagents is available
        try:
            from smolagents import HfApiModel, ManagedAgent

            self._HfApiModel = HfApiModel
            self._ManagedAgent = ManagedAgent
            self._enabled = True
        except ImportError:
            logger.warning("smolagents not installed. Agent orchestration disabled.")
            return

        # Initialize model
        self.model = self._HfApiModel(model_id=settings.AGENT_MODEL, token=settings.HF_TOKEN)

        # Create specialized agents
        self.agents = self._create_agents()

        # Main orchestrator
        self.orchestrator = self._create_orchestrator()

        logger.info("AgentOrchestrator initialized")

    def is_enabled(self) -> bool:
        return self._enabled

    def _create_agents(self):
        extraction = ExtractionAgent()
        analysis = AnalysisAgent()
        builder = PipelineBuilderAgent()

        return {
            "extraction": self._ManagedAgent(extraction.agent, name="ExtractionAgent"),
            "analysis": self._ManagedAgent(analysis.agent, name="AnalysisAgent"),
            "builder": self._ManagedAgent(builder.agent, name="PipelineBuilderAgent"),
        }

    def _create_orchestrator(self):
        from smolagents import CodeAgent

        return CodeAgent(
            model=self.model,
            managed_agents=list(self.agents.values()),
            system_prompt="""
            You are AIDEN Orchestrator. You coordinate specialized agents to build data pipelines.

            For each user request:
            1. Analyze the request
            2. Route to appropriate agents in sequence (Extraction → Analysis → Builder)
            3. Combine results
            4. Return final output

            Return structured results in JSON format.
            """,
            additional_authorized_imports=["json", "logging", "datetime"],
        )

    async def execute(self, task: str, context: dict = None) -> dict:
        """Execute a task through the multi-agent system."""
        if not self.is_enabled():
            return {
                "status": "disabled",
                "message": "Agent orchestration not available. Please install smolagents.",
            }

        logger.info(f"Orchestrator executing: {task}")

        try:
            orchestration_prompt = f"""
            Task: {task}
            Context: {context or {}}

            Execute using available agents. Provide a summary of results.
            """

            result = self.orchestrator.run(orchestration_prompt)

            return {"status": "success", "result": result, "agents_used": list(self.agents.keys())}

        except Exception as e:
            logger.error(f"Orchestration failed: {e}")
            return {"status": "failed", "error": str(e)}
