"""
Tests for AgentOrchestrator.run() — sequential multi-agent pipeline.

Uses extensive mocking so no external services (HuggingFace, database,
WebSocket connections) are required.  Tests verify the orchestrator's
resilience: each agent can fail independently and the orchestrator
gracefully degrades instead of crashing.

Patching strategy
-----------------
The ``run()`` method uses function-local imports:

    async def run(self, ...):
        from app.core.intent_parser import IntentParser   # local
        from app.core.agent_registry import AgentRegistry  # local

Python binds these as *local variables* in the function's scope. The
correct ``patch()`` targets are therefore the *source* modules, not
``app.core.agent_orchestrator`` (which has no such attributes at the
module level).  All patches in this file follow that rule.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.core.agent_orchestrator import AgentOrchestrator


# ── Fixtures ──────────────────────────────────────────────────────────────


@pytest.fixture
def orchestrator():
    """Provide a fresh AgentOrchestrator for each test."""
    return AgentOrchestrator()


@pytest.fixture
def mock_intent():
    """Standard parsed intent returned by IntentParser."""
    return {
        "name": "Test Pipeline",
        "source_type": "postgres",
        "source_config": {"table": "sales"},
        "destination_type": "snowflake",
        "destination_config": {"schema": "analytics"},
        "schedule": "0 6 * * *",
        "transformations": ["clean", "aggregate"],
        "data_quality_rules": ["no_null_values"],
        "attachments": [],
    }


@pytest.fixture
def mock_schema():
    """Schema returned by ExtractionAgent.run()."""
    return {
        "tables": ["sales"],
        "columns": {"sales": ["id", "amount", "date", "region"]},
        "total_columns": 4,
        "source_type": "postgres",
    }


@pytest.fixture
def mock_quality():
    """Quality report returned by AnalysisAgent.run()."""
    return {
        "tables_analysed": 1,
        "total_columns": 4,
        "issues": [{
            "table": "sales",
            "potential_issues": ["nullable columns"],
            "recommended_actions": ["validate NOT NULL constraints"],
        }],
        "suggestions": [
            "Run NOT NULL validation on key columns",
            "Check for duplicate rows",
        ],
        "overall_quality": "needs_review",
    }


@pytest.fixture
def mock_code():
    """Generated code returned by PipelineBuilderAgent.run()."""
    return {
        "dag_code": "from airflow import DAG\n# ... dag code ...",
        "dbt_code": "-- dbt model\nSELECT * FROM source",
        "tests": ["test_no_null_values", "test_no_duplicates"],
        "summary": "Generated DAG (45 bytes) + dbt model + 2 quality tests",
    }


@pytest.fixture
def mock_pipeline():
    """Pipeline dict returned by create_pipeline()."""
    return {
        "id": 1,
        "name": "Test Pipeline",
        "status": "draft",
        "source_type": "postgres",
        "destination_type": "snowflake",
        "schedule": "0 6 * * *",
    }


# ── Mock factories ───────────────────────────────────────────────────────


def _make_mock_parser(return_intent):
    """Return a MagicMock that looks like the IntentParser class."""
    MockParser = MagicMock()
    parser_instance = MagicMock()
    parser_instance.parse = AsyncMock(return_value=return_intent)
    MockParser.return_value = parser_instance
    return MockParser


def _make_mock_builder(return_pipeline):
    """Return a MagicMock that looks like the PipelineBuilder class."""
    MockBuilder = MagicMock()
    builder_instance = MagicMock()
    builder_instance.create_pipeline = AsyncMock(return_value=return_pipeline)
    MockBuilder.return_value = builder_instance
    return MockBuilder


def _make_mock_registry(mock_schema, mock_quality, mock_code,
                        extraction_agent=None, analysis_agent=None,
                        builder_agent=None):
    """Return a MagicMock that looks like the AgentRegistry class.

    ``registry.get(name)`` returns a callable that when called returns a
    mock agent instance with ``run()`` returning the corresponding fixture.
    If an explicit agent mock is passed (for failure tests), it is used
    instead.
    """
    Registry = MagicMock()

    extract_cls = MagicMock()
    extract_agent = extraction_agent or MagicMock()
    if not extraction_agent:
        extract_agent.run = AsyncMock(return_value=mock_schema)
    extract_cls.return_value = extract_agent

    analyse_cls = MagicMock()
    analyse_agent = analysis_agent or MagicMock()
    if not analysis_agent:
        analyse_agent.run = AsyncMock(return_value=mock_quality)
    analyse_cls.return_value = analyse_agent

    build_cls = MagicMock()
    build_agent = builder_agent or MagicMock()
    if not builder_agent:
        build_agent.run = AsyncMock(return_value=mock_code)
    build_cls.return_value = build_agent

    def _get(name):
        return {
            "extraction": extract_cls,
            "analysis": analyse_cls,
            "builder": build_cls,
        }.get(name)

    Registry.get.side_effect = _get
    return Registry


def _make_mock_rag():
    """Return a MagicMock that looks like the rag_memory singleton."""
    rag = MagicMock()
    rag.search_similar.return_value = []
    rag.store_pipeline.return_value = True
    return rag


def _make_mock_manager():
    """Return a MagicMock that looks like the WebSocket manager singleton."""
    mgr = MagicMock()
    mgr.broadcast = AsyncMock()
    return mgr


# ── Patch helpers (correct source-module targets) ────────────────────────
#
# The ``run()`` method uses function-local imports:
#   from app.core.intent_parser import IntentParser
#   from app.core.pipeline_builder import PipelineBuilder
#   from app.core.agent_registry import AgentRegistry
#   from app.core.rag_memory import rag_memory
#   from app.api.v1.websocket import manager
#
# Each of these reads from ``sys.modules["source_module"].attribute_name``.
# The correct patch() targets are therefore the **source** modules, not
# ``app.core.agent_orchestrator``.
#
# For classes:  patch("app.core.intent_parser.IntentParser")
# For singletons: patch("app.core.rag_memory.rag_memory")


# ══════════════════════════════════════════════════════════════════════════
# Tests
# ══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_run_success_all_agents(
    orchestrator, mock_intent, mock_schema, mock_quality, mock_code, mock_pipeline
):
    """All agents succeed — verify complete return structure."""
    with patch("app.core.intent_parser.IntentParser",
               _make_mock_parser(mock_intent)), \
         patch("app.core.pipeline_builder.PipelineBuilder",
               _make_mock_builder(mock_pipeline)), \
         patch("app.core.agent_registry.AgentRegistry",
               _make_mock_registry(mock_schema, mock_quality, mock_code)), \
         patch("app.core.rag_memory.rag_memory",
               _make_mock_rag()), \
         patch("app.api.v1.websocket.manager",
               _make_mock_manager()):
        result = await orchestrator.run(
            prompt="Build a daily sales ETL from postgres to snowflake",
            user_id=1,
        )

    # ── Top-level keys ──────────────────────────────────────────────
    assert set(result.keys()) == {
        "status", "pipeline", "intent", "schema",
        "quality_report", "code", "agents_used",
    }, f"Expected 7 keys, got {set(result.keys())}"
    assert result["status"] == "success"

    # ── Pipeline ────────────────────────────────────────────────────
    assert result["pipeline"]["id"] == 1
    assert result["pipeline"]["name"] == "Test Pipeline"
    assert result["pipeline"]["source_type"] == "postgres"
    assert result["pipeline"]["destination_type"] == "snowflake"

    # ── Intent ──────────────────────────────────────────────────────
    assert result["intent"]["source_type"] == "postgres"
    assert result["intent"]["destination_type"] == "snowflake"

    # ── Schema ──────────────────────────────────────────────────────
    assert result["schema"]["tables"] == ["sales"]
    assert result["schema"]["total_columns"] == 4

    # ── Quality report ──────────────────────────────────────────────
    assert result["quality_report"]["overall_quality"] == "needs_review"

    # ── Code ────────────────────────────────────────────────────────
    assert result["code"]["summary"] == mock_code["summary"]

    # ── Agents ──────────────────────────────────────────────────────
    assert result["agents_used"] == ["extraction", "analysis", "builder"]


@pytest.mark.asyncio
async def test_run_extraction_returns_error(
    orchestrator, mock_intent, mock_quality, mock_code, mock_pipeline
):
    """Extraction agent returns an error dict — orchestrator persists it."""
    mock_schema_fail = {"tables": [], "columns": {}, "error": "Connection refused"}

    extract_agent = MagicMock()
    extract_agent.run = AsyncMock(return_value=mock_schema_fail)

    with patch("app.core.intent_parser.IntentParser",
               _make_mock_parser(mock_intent)), \
         patch("app.core.pipeline_builder.PipelineBuilder",
               _make_mock_builder(mock_pipeline)), \
         patch("app.core.agent_registry.AgentRegistry",
               _make_mock_registry(mock_schema_fail, mock_quality, mock_code,
                                   extraction_agent=extract_agent)), \
         patch("app.core.rag_memory.rag_memory",
               _make_mock_rag()), \
         patch("app.api.v1.websocket.manager",
               _make_mock_manager()):
        result = await orchestrator.run(prompt="Build a pipeline", user_id=1)

    assert result["status"] == "success"
    assert result["schema"]["error"] == "Connection refused"
    assert result["schema"]["tables"] == []
    assert result["code"]["summary"] == mock_code["summary"]


@pytest.mark.asyncio
async def test_run_extraction_raises_exception(
    orchestrator, mock_intent, mock_quality, mock_code, mock_pipeline
):
    """Extraction agent raises RuntimeError — orchestrator gracefully degrades."""
    extract_agent = MagicMock()
    extract_agent.run = AsyncMock(side_effect=RuntimeError("DB down"))

    with patch("app.core.intent_parser.IntentParser",
               _make_mock_parser(mock_intent)), \
         patch("app.core.pipeline_builder.PipelineBuilder",
               _make_mock_builder(mock_pipeline)), \
         patch("app.core.agent_registry.AgentRegistry",
               _make_mock_registry({}, mock_quality, mock_code,
                                   extraction_agent=extract_agent)), \
         patch("app.core.rag_memory.rag_memory",
               _make_mock_rag()), \
         patch("app.api.v1.websocket.manager",
               _make_mock_manager()):
        result = await orchestrator.run(prompt="Build a pipeline", user_id=1)

    assert result["status"] == "success"
    assert "DB down" in result["schema"]["error"]


@pytest.mark.asyncio
async def test_run_analysis_returns_error(
    orchestrator, mock_intent, mock_schema, mock_code, mock_pipeline
):
    """Analysis agent returns an error dict — orchestrator persists it."""
    mock_quality_fail = {
        "issues": [], "suggestions": [], "overall_quality": "unknown",
        "error": "Quality profiling failed",
    }

    analyse_agent = MagicMock()
    analyse_agent.run = AsyncMock(return_value=mock_quality_fail)

    with patch("app.core.intent_parser.IntentParser",
               _make_mock_parser(mock_intent)), \
         patch("app.core.pipeline_builder.PipelineBuilder",
               _make_mock_builder(mock_pipeline)), \
         patch("app.core.agent_registry.AgentRegistry",
               _make_mock_registry(mock_schema, mock_quality_fail, mock_code,
                                   analysis_agent=analyse_agent)), \
         patch("app.core.rag_memory.rag_memory",
               _make_mock_rag()), \
         patch("app.api.v1.websocket.manager",
               _make_mock_manager()):
        result = await orchestrator.run(prompt="Build a pipeline", user_id=1)

    assert result["status"] == "success"
    assert result["quality_report"]["overall_quality"] == "unknown"
    assert "error" in result["quality_report"]


@pytest.mark.asyncio
async def test_run_analysis_raises_exception(
    orchestrator, mock_intent, mock_schema, mock_code, mock_pipeline
):
    """Analysis agent raises ValueError — orchestrator gracefully degrades."""
    analyse_agent = MagicMock()
    analyse_agent.run = AsyncMock(side_effect=ValueError("Bad data"))

    with patch("app.core.intent_parser.IntentParser",
               _make_mock_parser(mock_intent)), \
         patch("app.core.pipeline_builder.PipelineBuilder",
               _make_mock_builder(mock_pipeline)), \
         patch("app.core.agent_registry.AgentRegistry",
               _make_mock_registry(mock_schema, {}, mock_code,
                                   analysis_agent=analyse_agent)), \
         patch("app.core.rag_memory.rag_memory",
               _make_mock_rag()), \
         patch("app.api.v1.websocket.manager",
               _make_mock_manager()):
        result = await orchestrator.run(prompt="Build a pipeline", user_id=1)

    assert result["status"] == "success"
    assert result["quality_report"]["error"] == "Bad data"
    assert result["quality_report"]["overall_quality"] == "unknown"


@pytest.mark.asyncio
async def test_run_builder_returns_error(
    orchestrator, mock_intent, mock_schema, mock_quality, mock_pipeline
):
    """Builder agent returns an error dict — orchestrator persists it."""
    mock_code_fail = {
        "dag_code": "", "dbt_code": "", "tests": [],
        "summary": "Generation failed", "error": "Template not found",
    }

    build_agent = MagicMock()
    build_agent.run = AsyncMock(return_value=mock_code_fail)

    with patch("app.core.intent_parser.IntentParser",
               _make_mock_parser(mock_intent)), \
         patch("app.core.pipeline_builder.PipelineBuilder",
               _make_mock_builder(mock_pipeline)), \
         patch("app.core.agent_registry.AgentRegistry",
               _make_mock_registry(mock_schema, mock_quality, mock_code_fail,
                                   builder_agent=build_agent)), \
         patch("app.core.rag_memory.rag_memory",
               _make_mock_rag()), \
         patch("app.api.v1.websocket.manager",
               _make_mock_manager()):
        result = await orchestrator.run(prompt="Build a pipeline", user_id=1)

    assert result["status"] == "success"
    assert result["code"]["error"] == "Template not found"


@pytest.mark.asyncio
async def test_run_builder_raises_exception(
    orchestrator, mock_intent, mock_schema, mock_quality, mock_pipeline
):
    """Builder agent raises KeyError — orchestrator gracefully degrades."""
    build_agent = MagicMock()
    build_agent.run = AsyncMock(side_effect=KeyError("missing_key"))

    with patch("app.core.intent_parser.IntentParser",
               _make_mock_parser(mock_intent)), \
         patch("app.core.pipeline_builder.PipelineBuilder",
               _make_mock_builder(mock_pipeline)), \
         patch("app.core.agent_registry.AgentRegistry",
               _make_mock_registry(mock_schema, mock_quality, {},
                                   builder_agent=build_agent)), \
         patch("app.core.rag_memory.rag_memory",
               _make_mock_rag()), \
         patch("app.api.v1.websocket.manager",
               _make_mock_manager()):
        result = await orchestrator.run(prompt="Build a pipeline", user_id=1)

    assert result["status"] == "success"
    assert "error" in result["code"]


@pytest.mark.asyncio
async def test_run_no_agents_registered(
    orchestrator, mock_intent, mock_pipeline
):
    """AgentRegistry.get returns None for all — orchestrator degrades."""
    mock_rag = _make_mock_rag()
    mock_manager = _make_mock_manager()
    mock_builder = _make_mock_builder(mock_pipeline)
    mock_parser = _make_mock_parser(mock_intent)

    Registry = MagicMock()
    Registry.get.return_value = None  # no agents registered

    with patch("app.core.intent_parser.IntentParser", mock_parser), \
         patch("app.core.pipeline_builder.PipelineBuilder", mock_builder), \
         patch("app.core.agent_registry.AgentRegistry", Registry), \
         patch("app.core.rag_memory.rag_memory", mock_rag), \
         patch("app.api.v1.websocket.manager", mock_manager):
        result = await orchestrator.run(prompt="Build from x to y", user_id=1)

    assert result["status"] == "success"
    assert "No extraction agent registered" in result["schema"]["error"]
    assert result["quality_report"]["overall_quality"] == "unknown"
    assert "No builder agent registered" in result["code"]["summary"]
    assert result["agents_used"] == ["extraction", "analysis", "builder"]


@pytest.mark.asyncio
async def test_run_rag_empty(
    orchestrator, mock_intent, mock_schema, mock_quality, mock_code, mock_pipeline
):
    """RAG returns no results — orchestrator proceeds without examples."""
    mock_rag = _make_mock_rag()
    mock_rag.search_similar.return_value = []  # empty

    with patch("app.core.intent_parser.IntentParser",
               _make_mock_parser(mock_intent)), \
         patch("app.core.pipeline_builder.PipelineBuilder",
               _make_mock_builder(mock_pipeline)), \
         patch("app.core.agent_registry.AgentRegistry",
               _make_mock_registry(mock_schema, mock_quality, mock_code)), \
         patch("app.core.rag_memory.rag_memory", mock_rag), \
         patch("app.api.v1.websocket.manager",
               _make_mock_manager()):
        result = await orchestrator.run(prompt="Build a pipeline", user_id=1)

    assert result["status"] == "success"
    assert "examples" not in result["intent"]


@pytest.mark.asyncio
async def test_run_rag_with_examples(
    orchestrator, mock_intent, mock_schema, mock_quality, mock_code, mock_pipeline
):
    """RAG returns examples — they are attached to the intent."""
    rag_examples = [{
        "query": "previous pipeline",
        "parsed": {"source_type": "mysql", "destination_type": "bigquery"},
        "score": 0.92,
        "pipeline_id": 5,
    }]

    mock_rag = _make_mock_rag()
    mock_rag.search_similar.return_value = rag_examples

    with patch("app.core.intent_parser.IntentParser",
               _make_mock_parser(mock_intent)), \
         patch("app.core.pipeline_builder.PipelineBuilder",
               _make_mock_builder(mock_pipeline)), \
         patch("app.core.agent_registry.AgentRegistry",
               _make_mock_registry(mock_schema, mock_quality, mock_code)), \
         patch("app.core.rag_memory.rag_memory", mock_rag), \
         patch("app.api.v1.websocket.manager",
               _make_mock_manager()):
        result = await orchestrator.run(prompt="Build a pipeline", user_id=1)

    assert result["status"] == "success"
    assert "examples" in result["intent"]
    assert len(result["intent"]["examples"]) == 1
    assert result["intent"]["examples"][0]["query"] == "previous pipeline"


@pytest.mark.asyncio
async def test_run_rag_search_raises(
    orchestrator, mock_intent, mock_schema, mock_quality, mock_code, mock_pipeline
):
    """RAG search raises RuntimeError — orchestrator continues."""
    mock_rag = _make_mock_rag()
    mock_rag.search_similar.side_effect = RuntimeError("Qdrant down")

    with patch("app.core.intent_parser.IntentParser",
               _make_mock_parser(mock_intent)), \
         patch("app.core.pipeline_builder.PipelineBuilder",
               _make_mock_builder(mock_pipeline)), \
         patch("app.core.agent_registry.AgentRegistry",
               _make_mock_registry(mock_schema, mock_quality, mock_code)), \
         patch("app.core.rag_memory.rag_memory", mock_rag), \
         patch("app.api.v1.websocket.manager",
               _make_mock_manager()):
        result = await orchestrator.run(prompt="Build a pipeline", user_id=1)

    assert result["status"] == "success"
    assert "examples" not in result["intent"]  # search failed, no examples


@pytest.mark.asyncio
async def test_run_pipeline_creation_raises(
    orchestrator, mock_intent, mock_schema, mock_quality, mock_code
):
    """create_pipeline() raises — orchestrator returns result with error."""
    mock_builder_cls = MagicMock()
    mock_builder = MagicMock()
    mock_builder.create_pipeline = AsyncMock(
        side_effect=RuntimeError("DB write failed")
    )
    mock_builder_cls.return_value = mock_builder

    with patch("app.core.intent_parser.IntentParser",
               _make_mock_parser(mock_intent)), \
         patch("app.core.pipeline_builder.PipelineBuilder",
               mock_builder_cls), \
         patch("app.core.agent_registry.AgentRegistry",
               _make_mock_registry(mock_schema, mock_quality, mock_code)), \
         patch("app.core.rag_memory.rag_memory",
               _make_mock_rag()), \
         patch("app.api.v1.websocket.manager",
               _make_mock_manager()):
        result = await orchestrator.run(prompt="Build a pipeline", user_id=1)

    assert result["status"] == "success"
    assert result["pipeline"]["id"] is None
    assert "error" in result["pipeline"]


@pytest.mark.asyncio
async def test_run_with_pre_parsed_intent(
    orchestrator, mock_intent, mock_schema, mock_quality, mock_code, mock_pipeline
):
    """Pre-parsed intent skips IntentParser.parse() entirely."""
    mock_rag = _make_mock_rag()
    mock_manager = _make_mock_manager()

    with patch("app.core.intent_parser.IntentParser") as MockParser, \
         patch("app.core.pipeline_builder.PipelineBuilder",
               _make_mock_builder(mock_pipeline)), \
         patch("app.core.agent_registry.AgentRegistry",
               _make_mock_registry(mock_schema, mock_quality, mock_code)), \
         patch("app.core.rag_memory.rag_memory", mock_rag), \
         patch("app.api.v1.websocket.manager", mock_manager):
        result = await orchestrator.run(
            prompt="Anything here", user_id=1, intent=mock_intent,
        )

    # parser should NOT have been called since intent was pre-parsed
    MockParser.return_value.parse.assert_not_called()

    assert result["status"] == "success"
    assert result["intent"]["name"] == "Test Pipeline"
    assert result["agents_used"] == ["extraction", "analysis", "builder"]
    assert result["code"]["summary"] == mock_code["summary"]


@pytest.mark.asyncio
async def test_run_websocket_events_emitted(
    orchestrator, mock_intent, mock_schema, mock_quality, mock_code, mock_pipeline
):
    """broadcast() is called with agent_step events for each agent."""
    mock_rag = _make_mock_rag()
    mock_manager = _make_mock_manager()

    with patch("app.core.intent_parser.IntentParser",
               _make_mock_parser(mock_intent)), \
         patch("app.core.pipeline_builder.PipelineBuilder",
               _make_mock_builder(mock_pipeline)), \
         patch("app.core.agent_registry.AgentRegistry",
               _make_mock_registry(mock_schema, mock_quality, mock_code)), \
         patch("app.core.rag_memory.rag_memory", mock_rag), \
         patch("app.api.v1.websocket.manager", mock_manager):
        result = await orchestrator.run(prompt="Build a pipeline", user_id=42)

    # At minimum: intent_parser(running+success) = 2, then 2 per agent
    # (running + success) = 6 — total >= 8
    assert mock_manager.broadcast.call_count >= 6

    call_args = [call[0][0] for call in mock_manager.broadcast.call_args_list]
    agent_steps = [c for c in call_args if c.get("type") == "agent_step"]

    agent_names = {s.get("agent") for s in agent_steps}
    assert "intent_parser" in agent_names
    assert "extraction" in agent_names
    assert "analysis" in agent_names
    assert "pipeline_builder" in agent_names

    # user_id propagated
    for step in agent_steps:
        assert step.get("user_id") == 42
