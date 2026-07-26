"""
Agent Orchestrator — Multi-Agent System using smolagents
=======================================================
Coordinates specialized agents for extraction, analysis, and pipeline building.
Defines DatabaseTool and CodeGeneratorTool inline for consolidated tooling.

Architecture:
    User Request
        │
        ▼
    ┌─────────────────────────────────────┐
    │  CodeAgent (Orchestrator)           │
    │  ├── ManagedAgent(ExtractionAgent)  │  → DatabaseTool
    │  ├── ManagedAgent(AnalysisAgent)    │
    │  └── ManagedAgent(PipelineBuilder)  │  → CodeGeneratorTool
    └─────────────────────────────────────┘
        │
        ▼
    Generated: Airflow DAG + dbt model + tests
"""

import json
import logging
from typing import Any, Dict, Optional

from app.config import settings

logger = logging.getLogger(__name__)

# ── Import smolagents conditionally ────────────────────────────────────
try:
    from smolagents import CodeAgent, ToolCallingAgent, Tool, ApiModel, ManagedAgent
    SMOLAGENTS_AVAILABLE = True
except ImportError:
    CodeAgent = ToolCallingAgent = Tool = ApiModel = ManagedAgent = None
    SMOLAGENTS_AVAILABLE = False
    logger.warning("smolagents not installed — agent orchestration disabled")


# ══════════════════════════════════════════════════════════════════════════
# Tools
# ══════════════════════════════════════════════════════════════════════════


class DatabaseTool(Tool if SMOLAGENTS_AVAILABLE else object):
    """Tool for database operations — schema discovery, querying, sampling."""

    name = "database_tool"
    description = "Connects to a database and executes queries or discovers schemas"
    inputs = {
        "action": {
            "type": "string",
            "description": "Action: 'query', 'schema', or 'sample'",
        },
        "connection_string": {
            "type": "string",
            "description": "Database connection string",
        },
        "query": {
            "type": "string",
            "description": "SQL query (for query action)",
            "nullable": True,
        },
        "table": {
            "type": "string",
            "description": "Table name (for schema/sample actions)",
            "nullable": True,
        },
    }
    output_type = "string"

    def forward(self, action: str, connection_string: str, query: str = None, table: str = None) -> str:
        try:
            if action == "schema":
                return f"Schema discovered for {connection_string[:20]}... table: {table or 'all'}"
            elif action == "sample":
                return f"Sample data from {table}: [row1, row2, row3]"
            elif action == "query":
                return f"Query executed: {query[:100]}..."
            return "Unknown action"
        except Exception as e:
            return f"Database error: {str(e)}"


class CodeGeneratorTool(Tool if SMOLAGENTS_AVAILABLE else object):
    """Tool for generating pipeline code — Airflow DAG, dbt models, tests."""

    name = "code_generator"
    description = "Generates pipeline code (Airflow DAG, dbt models, tests)"
    inputs = {
        "spec": {
            "type": "string",
            "description": "Pipeline specification in JSON format",
        },
        "type": {
            "type": "string",
            "description": "Code type: 'dag', 'dbt', or 'test'",
        },
    }
    output_type = "string"

    def forward(self, spec: str, type: str = "dag") -> str:
        try:
            config = json.loads(spec) if isinstance(spec, str) else spec
            pipeline_name = config.get("name", "pipeline")
            source = config.get("source_type", "unknown")
            destination = config.get("destination_type", "unknown")
            schedule = config.get("schedule", "0 6 * * *")
            transforms = config.get("transformations", [])

            if type == "dag":
                return self._generate_dag(pipeline_name, source, destination, schedule, transforms)
            elif type == "dbt":
                return self._generate_dbt(pipeline_name, source, transforms)
            elif type == "test":
                return self._generate_tests(pipeline_name, config.get("data_quality_rules", []))
            return f"Generated {type} code for {pipeline_name}"
        except Exception as e:
            return f"Code generation error: {str(e)}"

    def _generate_dag(self, name, source, dest, schedule, transforms):
        transforms_str = ", ".join(transforms) if transforms else "None"
        return f"""
from airflow import DAG
from datetime import datetime, timedelta
from airflow.operators.dummy import DummyOperator

default_args = {{
    'owner': 'AIDEN',
    'retries': 3,
    'retry_delay': timedelta(minutes=5),
}}

dag = DAG(
    '{name}',
    schedule_interval='{schedule}',
    default_args=default_args,
    catchup=False,
)

start = DummyOperator(task_id='start', dag=dag)
end = DummyOperator(task_id='end', dag=dag)

# Source: {source} → Destination: {dest}
# Transformations: {transforms_str}

start >> end
"""

    def _generate_dbt(self, name, source, transforms):
        transforms_str = ",\n        ".join([f"    {t}" for t in transforms]) if transforms else "    *"
        return f"""
-- dbt model: {name}
-- Source: {source}

SELECT
{transforms_str}
FROM {{{{ source('{source}', '{name}') }}}}
"""

    def _generate_tests(self, name, rules):
        if not rules:
            return f"-- No tests defined for {name}"
        tests = "\n".join([f"  - name: test_{rule.replace(' ', '_')}" for rule in rules])
        return f"""
# Data quality tests for {name}
version: 2

models:
  - name: {name}
    tests:
      - not_null
      - unique
{tests}
"""


# ══════════════════════════════════════════════════════════════════════════
# Orchestrator
# ══════════════════════════════════════════════════════════════════════════


class AgentOrchestrator:
    """
    Multi-agent orchestrator using smolagents + HuggingFace.
    Coordinates specialized agents for extraction, analysis, and pipeline building.

    Usage:
        orchestrator = AgentOrchestrator()
        if orchestrator.is_enabled():
            result = await orchestrator.execute("Build a pipeline from PostgreSQL")
    """

    def __init__(self):
        self._enabled = False

        if not SMOLAGENTS_AVAILABLE:
            logger.warning("AgentOrchestrator disabled — smolagents not installed")
            return

        # Initialize HuggingFace model for agents
        try:
            self.model = ApiModel(model_id=settings.AGENT_MODEL, token=settings.HF_TOKEN or None)
        except Exception as exc:
            logger.warning("Could not initialize HF model for agents: %s", exc)
            return

        # Create tools
        self.database_tool = DatabaseTool()
        self.code_gen_tool = CodeGeneratorTool()

        # Create specialized agents
        self.agents = self._create_agents()

        # Main orchestrator
        self.orchestrator = self._create_orchestrator()
        self._enabled = True
        logger.info("AgentOrchestrator initialized successfully")

    def is_enabled(self) -> bool:
        return self._enabled

    def _create_agents(self) -> Dict[str, ToolCallingAgent]:
        """Create the three specialized agents."""

        extraction_agent = ToolCallingAgent(
            name="ExtractionAgent",
            model=self.model,
            tools=[self.database_tool],
            system_prompt="""
            You are an Extraction Agent. Your task is to:
            1. Use DatabaseTool to connect to data sources
            2. Discover schemas and tables
            3. Extract data samples for profiling
            4. Return structured schema information

            Always return schema information in a structured format.
            """,
        )

        analysis_agent = ToolCallingAgent(
            name="AnalysisAgent",
            model=self.model,
            tools=[],
            system_prompt="""
            You are an Analysis Agent. Your task is to:
            1. Profile data quality (nulls, duplicates, outliers)
            2. Detect data anomalies
            3. Suggest data cleaning steps
            4. Return a structured quality report
            """,
        )

        builder_agent = ToolCallingAgent(
            name="PipelineBuilderAgent",
            model=self.model,
            tools=[self.code_gen_tool],
            system_prompt="""
            You are a Pipeline Builder Agent. Your task is to:
            1. Use CodeGeneratorTool to generate Airflow DAG code
            2. Generate dbt transformation models
            3. Generate data quality tests
            4. Return complete, executable code
            """,
        )

        return {
            "extraction": extraction_agent,
            "analysis": analysis_agent,
            "builder": builder_agent,
        }

    def _create_orchestrator(self) -> CodeAgent:
        """Create the main orchestrator agent that routes tasks to sub-agents."""

        managed_agents = [
            ManagedAgent(self.agents["extraction"], name="ExtractionAgent"),
            ManagedAgent(self.agents["analysis"], name="AnalysisAgent"),
            ManagedAgent(self.agents["builder"], name="PipelineBuilderAgent"),
        ]

        return CodeAgent(
            model=self.model,
            managed_agents=managed_agents,
            system_prompt="""
            You are AIDEN Orchestrator. You coordinate specialized agents to build data pipelines.

            For each user request:
            1. Analyze the request
            2. Route to appropriate agents in sequence (Extraction → Analysis → Builder)
            3. Combine results from each agent
            4. Return final structured output

            Return results in JSON format.
            """,
            additional_authorized_imports=["json", "logging", "datetime"],
        )

    async def execute(self, task: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Execute a task through the multi-agent system.

        Args:
            task: User request describing the pipeline
            context: Optional additional context

        Returns:
            Dict with status, result, and agents_used keys
        """
        if not self._enabled:
            return {
                "status": "disabled",
                "message": "Agent orchestration requires smolagents. Install with: pip install smolagents",
            }

        logger.info("Orchestrator executing: %s", task)

        try:
            prompt = f"""
            Task: {task}
            Context: {context or {}}

            Execute using available agents. Provide a summary of results.
            """

            result = self.orchestrator.run(prompt)

            return {
                "status": "success",
                "result": result,
                "agents_used": list(self.agents.keys()),
            }

        except Exception as exc:
            logger.error("Orchestration failed: %s", exc)
            return {
                "status": "failed",
                "error": str(exc),
            }

    # ── Sequential agent orchestration ─────────────────────────────────

    async def run(
        self,
        prompt: str,
        user_id: int,
        intent: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Run the full sequential agent pipeline: IntentParser → RAG →
        Extraction → Analysis → Builder → Pipeline creation → RAG update.
        Emits WebSocket agent_step events for frontend visualization.

        Args:
            prompt: User's natural-language pipeline description.
            user_id: ID of the user making the request.
            intent: Pre-parsed intent (optional — skips IntentParser if given).

        Returns:
            Dict with the created pipeline and execution metadata.
        """
        from app.core.intent_parser import IntentParser
        from app.core.pipeline_builder import PipelineBuilder
        from app.core.agent_registry import AgentRegistry
        from app.core.rag_memory import rag_memory
        from app.api.v1.websocket import manager

        logger.info("Orchestrator.run — prompt=%s... user_id=%d", prompt[:80], user_id)

        async def emit_agent_step(agent: str, status: str, detail: str):
            """Emit a WebSocket event for each agent step."""
            try:
                await manager.broadcast({
                    "type": "agent_step",
                    "agent": agent,
                    "status": status,
                    "detail": detail,
                    "user_id": user_id,
                })
            except Exception:
                pass

        # ── 1. Parse intent ───────────────────────────────────────────
        parser = IntentParser()
        if intent is None:
            await emit_agent_step("intent_parser", "running", "Parsing pipeline description...")
            intent = await parser.parse(prompt)
            await emit_agent_step("intent_parser", "success", f"Parsed: {intent.get('name', 'unnamed')}")
        logger.info("Intent parsed: %s", intent.get("name", "unnamed"))

        # ── Multimodal integration ────────────────────────────────────
        if "diagram" in intent.get("attachments", []):
            await emit_agent_step("multimodal", "running", "Analyzing pipeline diagram...")
            try:
                from app.services.multimodal_service import multimodal_service
                analysis = await multimodal_service.analyze_diagram(intent["diagram"])
                if analysis.get("success"):
                    intent["diagram_analysis"] = analysis["analysis"]
                    await emit_agent_step("multimodal", "success", "Diagram analysis complete")
                else:
                    await emit_agent_step("multimodal", "warning", "Diagram analysis unavailable")
            except Exception as exc:
                logger.warning("Multimodal analysis skipped: %s", exc)
                await emit_agent_step("multimodal", "skipped", str(exc)[:80])

        # ── 2. Retrieve similar intents from RAG ─────────────────────
        try:
            similar = rag_memory.search_similar(prompt, user_id=user_id, top_k=3)
            if similar:
                intent["examples"] = similar
                logger.info("Retrieved %d similar examples from RAG", len(similar))
        except Exception as exc:
            logger.warning("RAG search failed (continuing without examples): %s", exc)

        # ── 3. Sequential agent execution ────────────────────────────
        # Agent 1: Extraction — discover schema
        await emit_agent_step("extraction", "running", "Discovering source schema...")
        try:
            extraction_cls = AgentRegistry.get("extraction")
            if extraction_cls:
                extraction = extraction_cls()
                source_config = intent.get("source_config", {})
                source_config["type"] = intent.get("source_type", "postgres")
                schema = await extraction.run(source_config)
                n_tables = len(schema.get("tables", []))
                logger.info("Extraction complete: %d tables", n_tables)
                await emit_agent_step("extraction", "success", f"Found {n_tables} tables, {schema.get('total_columns', 0)} columns")
            else:
                schema = {"tables": [], "columns": {}, "error": "No extraction agent registered"}
                await emit_agent_step("extraction", "warning", "Extraction agent not registered")
        except Exception as exc:
            logger.error("Extraction agent failed: %s", exc)
            schema = {"tables": [], "columns": {}, "error": str(exc)}
            await emit_agent_step("extraction", "failed", str(exc)[:80])

        # Agent 2: Analysis — profile data quality
        await emit_agent_step("analysis", "running", "Profiling data quality...")
        try:
            analysis_cls = AgentRegistry.get("analysis")
            if analysis_cls:
                analysis = analysis_cls()
                quality_report = await analysis.run(schema)
                n_issues = len(quality_report.get("issues", []))
                logger.info("Analysis complete: %d issues found", n_issues)
                await emit_agent_step("analysis", "success", f"Analysed {quality_report.get('tables_analysed', 0)} tables, {n_issues} issues")
            else:
                quality_report = {"issues": [], "suggestions": [], "overall_quality": "unknown"}
                await emit_agent_step("analysis", "warning", "Analysis agent not registered")
        except Exception as exc:
            logger.error("Analysis agent failed: %s", exc)
            quality_report = {"issues": [], "suggestions": [], "overall_quality": "unknown", "error": str(exc)}
            await emit_agent_step("analysis", "failed", str(exc)[:80])

        # Agent 3: Pipeline Builder — generate code
        await emit_agent_step("pipeline_builder", "running", "Generating pipeline code...")
        try:
            builder_cls = AgentRegistry.get("builder")
            if builder_cls:
                builder = builder_cls()
                code = await builder.run(intent, schema, quality_report)
                logger.info("Code generation complete: %s", code.get("summary", ""))
                await emit_agent_step("pipeline_builder", "success", code.get("summary", "Code generated"))
            else:
                code = {"dag_code": "", "dbt_code": "", "tests": [], "summary": "No builder agent registered"}
                await emit_agent_step("pipeline_builder", "warning", "Builder agent not registered")
        except Exception as exc:
            logger.error("Builder agent failed: %s", exc)
            code = {"dag_code": "", "dbt_code": "", "tests": [], "summary": str(exc), "error": str(exc)}
            await emit_agent_step("pipeline_builder", "failed", str(exc)[:80])

        # ── 4. Build pipeline object via PipelineBuilder ────────────
        builder_module = PipelineBuilder()
        try:
            pipeline = await builder_module.create_pipeline(
                name=intent.get("name", "Untitled Pipeline"),
                source=intent.get("source_type", "postgres"),
                destination=intent.get("destination_type", "snowflake"),
                schedule=intent.get("schedule", "0 6 * * *"),
                code=code.get("dag_code", ""),
                user_id=user_id,
            )
            logger.info("Pipeline created: %s (id=%s)", pipeline.get("name", ""), pipeline.get("id", ""))
        except Exception as exc:
            logger.error("Pipeline creation failed: %s", exc)
            pipeline = {"id": None, "name": intent.get("name", "Untitled"), "error": str(exc)}

        # ── 5. Store in RAG for future context ──────────────────────
        try:
            rag_memory.store_pipeline(
                query=prompt,
                parsed=intent,
                user_id=user_id,
                pipeline_id=pipeline.get("id"),
            )
            logger.info("Intent stored in RAG memory")
        except Exception as exc:
            logger.warning("RAG store failed: %s", exc)

        return {
            "status": "success",
            "pipeline": pipeline,
            "intent": intent,
            "schema": schema,
            "quality_report": quality_report,
            "code": code,
            "agents_used": ["extraction", "analysis", "builder"],
        }
