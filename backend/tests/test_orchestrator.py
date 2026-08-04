"""
Tests for AgentOrchestrator.run() — sequential multi-agent pipeline.

Uses extensive mocking so no external services (HuggingFace, database,
WebSocket connections) are required. Tests verify the orchestrator's
resilience: each agent can fail independently and the orchestrator
gracefully degrades instead of crashing.

Patch strategy
--------------
The current ``run()`` implementation imports its collaborators at the
**module level** of ``app.core.agent_orchestrator``:

    from app.core.intent_parser import IntentParser
    from app.core.pipeline_builder import PipelineBuilder
    from app.core.agent_registry import AgentRegistry
    from app.core.rag_memory import rag_memory

so the correct patch targets are the attributes *on the module*:
``app.core.agent_orchestrator.IntentParser``, etc. The orchestrator must
also be constructed *inside* the patch context because ``__init__``
instantiates ``IntentParser()`` / ``PipelineBuilder()`` and assigns the
``AgentRegistry`` class to ``self.registry``.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.core.agent_orchestrator import AgentOrchestrator

AGENT_NAMES = ["extraction", "analysis", "pipeline_builder", "governance", "deployment"]


# ── Fixtures ──────────────────────────────────────────────────────────────


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
    """Schema returned by the extraction agent's forward()."""
    return {
        "tables": ["sales"],
        "columns": {"sales": ["id", "amount", "date", "region"]},
        "total_columns": 4,
        "source_type": "postgres",
    }


@pytest.fixture
def mock_quality():
    """Quality report returned by the analysis agent's forward()."""
    return {
        "tables_analysed": 1,
        "total_columns": 4,
        "issues": [{
            "table": "sales",
            "potential_issues": ["nullable columns"],
            "recommended_actions": ["validate NOT NULL constraints"],
        }],
        "overall_quality": "needs_review",
    }


@pytest.fixture
def mock_code():
    """Generated code returned by the builder agent's forward()."""
    return {
        "dag": "from airflow import DAG\n# ... dag code ...",
        "dbt": "-- dbt model\nSELECT * FROM source",
        "tests": ["test_no_null_values", "test_no_duplicates"],
    }


@pytest.fixture
def mock_pipeline():
    """Pipeline object returned by builder.create_pipeline()."""
    return {
        "id": 1,
        "name": "Test Pipeline",
        "status": "draft",
        "source_type": "postgres",
        "destination_type": "snowflake",
        "schedule": "0 6 * * *",
    }


# ── Mock factories ───────────────────────────────────────────────────────


def _mock_parser_cls(return_intent):
    """Mock for the IntentParser class (patch target: module attribute)."""
    parser_cls = MagicMock()
    parser_instance = MagicMock()
    parser_instance.parse = AsyncMock(return_value=return_intent)
    parser_cls.return_value = parser_instance
    return parser_cls


def _mock_builder_cls(return_pipeline=None, create_side_effect=None):
    """Mock for the PipelineBuilder class."""
    builder_cls = MagicMock()
    builder_instance = MagicMock()
    builder_instance.generate_all.return_value = {
        "dag": "dag code", "dbt": "dbt code", "tests": [], "config": {},
    }
    if create_side_effect is not None:
        builder_instance.create_pipeline = AsyncMock(side_effect=create_side_effect)
    else:
        builder_instance.create_pipeline = AsyncMock(return_value=return_pipeline)
    builder_cls.return_value = builder_instance
    return builder_cls


def _mock_registry_cls(agent_map=None, get_return=None):
    """Mock for the AgentRegistry class. ``registry.get(name)`` returns an
    agent object with a synchronous ``forward()`` method."""
    registry_cls = MagicMock()
    if get_return is not None:
        registry_cls.get.return_value = get_return
    elif agent_map is not None:
        registry_cls.get.side_effect = lambda name: agent_map.get(name)
    else:
        registry_cls.get.return_value = None
    return registry_cls


def _make_agent(forward_return=None, forward_side_effect=None):
    agent = MagicMock()
    if forward_side_effect is not None:
        agent.forward.side_effect = forward_side_effect
    else:
        agent.forward.return_value = forward_return
    return agent


def _mock_rag():
    """Mock for the rag_memory singleton."""
    rag = MagicMock()
    rag.search.return_value = []
    rag.format_context.return_value = ""
    rag.add.return_value = True
    return rag


def _make_success_agents(mock_schema, mock_quality, mock_code):
    """Five healthy agents — governance allows, deployment no-ops."""
    return {
        "extraction": _make_agent(forward_return=mock_schema),
        "analysis": _make_agent(forward_return=mock_quality),
        "pipeline_builder": _make_agent(forward_return=mock_code),
        "governance": _make_agent(forward_return={"allowed": True}),
        "deployment": _make_agent(forward_return=None),
    }


async def _run_orchestrator(parser_cls, builder_cls, registry_cls, rag_mock, **kwargs):
    """Construct an AgentOrchestrator inside the patch context and run it."""
    with patch("app.core.agent_orchestrator.IntentParser", parser_cls), \
         patch("app.core.agent_orchestrator.PipelineBuilder", builder_cls), \
         patch("app.core.agent_orchestrator.AgentRegistry", registry_cls), \
         patch("app.core.agent_orchestrator.rag_memory", rag_mock):
        orch = AgentOrchestrator()
        return await orch.run(db=AsyncMock(), **kwargs)


# ══════════════════════════════════════════════════════════════════════════
# Tests
# ══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_run_success_all_agents(
    mock_intent, mock_schema, mock_quality, mock_code, mock_pipeline
):
    """All agents succeed — verify complete return structure."""
    result = await _run_orchestrator(
        parser_cls=_mock_parser_cls(mock_intent),
        builder_cls=_mock_builder_cls(mock_pipeline),
        registry_cls=_mock_registry_cls(_make_success_agents(mock_schema, mock_quality, mock_code)),
        rag_mock=_mock_rag(),
        prompt="Build a daily sales ETL from postgres to snowflake",
        user_id=1,
    )

    assert result["success"] is True
    assert set(result.keys()) == {
        "pipeline", "intent", "schema", "quality_report", "code", "agents_used", "success",
    }
    assert result["pipeline"]["id"] == 1
    assert result["pipeline"]["name"] == "Test Pipeline"
    assert result["intent"]["source_type"] == "postgres"
    assert result["schema"]["tables"] == ["sales"]
    assert result["quality_report"]["overall_quality"] == "needs_review"
    assert result["code"]["dag"]
    assert result["agents_used"] == AGENT_NAMES


@pytest.mark.asyncio
async def test_run_extraction_raises_exception(
    mock_intent, mock_quality, mock_code, mock_pipeline
):
    """Extraction agent raises RuntimeError — orchestrator gracefully degrades."""
    agents = _make_success_agents({"error": "down"}, mock_quality, mock_code)
    agents["extraction"] = _make_agent(forward_side_effect=RuntimeError("DB down"))

    result = await _run_orchestrator(
        parser_cls=_mock_parser_cls(mock_intent),
        builder_cls=_mock_builder_cls(mock_pipeline),
        registry_cls=_mock_registry_cls(agents),
        rag_mock=_mock_rag(),
        prompt="Build a pipeline",
        user_id=1,
    )

    assert result["success"] is True
    # schema fell back to the intent's source_config
    assert result["schema"] == mock_intent["source_config"]
    assert result["agents_used"] == AGENT_NAMES


@pytest.mark.asyncio
async def test_run_analysis_raises_exception(
    mock_intent, mock_schema, mock_code, mock_pipeline
):
    """Analysis agent raises ValueError — orchestrator gracefully degrades."""
    agents = _make_success_agents(mock_schema, {}, mock_code)
    agents["analysis"] = _make_agent(forward_side_effect=ValueError("Bad data"))

    result = await _run_orchestrator(
        parser_cls=_mock_parser_cls(mock_intent),
        builder_cls=_mock_builder_cls(mock_pipeline),
        registry_cls=_mock_registry_cls(agents),
        rag_mock=_mock_rag(),
        prompt="Build a pipeline",
        user_id=1,
    )

    assert result["success"] is True
    assert result["quality_report"]["quality_score"] == 0.85
    assert result["agents_used"] == AGENT_NAMES


@pytest.mark.asyncio
async def test_run_builder_raises_exception(
    mock_intent, mock_schema, mock_quality, mock_pipeline
):
    """Builder agent raises KeyError — orchestrator gracefully degrades."""
    agents = _make_success_agents(mock_schema, mock_quality, {})
    agents["pipeline_builder"] = _make_agent(forward_side_effect=KeyError("missing_key"))

    result = await _run_orchestrator(
        parser_cls=_mock_parser_cls(mock_intent),
        builder_cls=_mock_builder_cls(mock_pipeline),
        registry_cls=_mock_registry_cls(agents),
        rag_mock=_mock_rag(),
        prompt="Build a pipeline",
        user_id=1,
    )

    assert result["success"] is True
    assert result["code"]["dag"]  # fell back to builder.generate_all()
    assert result["agents_used"] == AGENT_NAMES


@pytest.mark.asyncio
async def test_run_governance_denies(
    mock_intent, mock_schema, mock_quality, mock_code, mock_pipeline
):
    """Governance denies the request — PermissionError propagates."""
    agents = _make_success_agents(mock_schema, mock_quality, mock_code)
    agents["governance"] = _make_agent(forward_return={"allowed": False})

    with pytest.raises(PermissionError):
        await _run_orchestrator(
            parser_cls=_mock_parser_cls(mock_intent),
            builder_cls=_mock_builder_cls(mock_pipeline),
            registry_cls=_mock_registry_cls(agents),
            rag_mock=_mock_rag(),
            prompt="Build a pipeline",
            user_id=1,
        )


@pytest.mark.asyncio
async def test_run_no_agents_registered(mock_intent, mock_pipeline):
    """No agents registered — orchestrator still creates the pipeline."""
    result = await _run_orchestrator(
        parser_cls=_mock_parser_cls(mock_intent),
        builder_cls=_mock_builder_cls(mock_pipeline),
        registry_cls=_mock_registry_cls(get_return=None),
        rag_mock=_mock_rag(),
        prompt="Build from x to y",
        user_id=1,
    )

    assert result["success"] is True
    assert result["agents_used"] == []
    assert result["pipeline"]["id"] == 1


@pytest.mark.asyncio
async def test_run_rag_with_examples(
    mock_intent, mock_schema, mock_quality, mock_code, mock_pipeline
):
    """RAG returns examples — they are attached to the intent."""
    rag_examples = [{
        "query": "previous pipeline",
        "intent": {"source_type": "mysql", "destination_type": "bigquery"},
        "score": 0.92,
        "pipeline_id": 5,
    }]
    rag = _mock_rag()
    rag.search.return_value = rag_examples
    rag.format_context.return_value = "Example 1: previous pipeline"

    result = await _run_orchestrator(
        parser_cls=_mock_parser_cls(mock_intent),
        builder_cls=_mock_builder_cls(mock_pipeline),
        registry_cls=_mock_registry_cls(_make_success_agents(mock_schema, mock_quality, mock_code)),
        rag_mock=rag,
        prompt="Build a pipeline",
        user_id=1,
    )

    assert result["success"] is True
    assert "examples" in result["intent"]
    assert "previous pipeline" in result["intent"]["examples"]


@pytest.mark.asyncio
async def test_run_rag_search_raises(
    mock_intent, mock_schema, mock_quality, mock_code, mock_pipeline
):
    """RAG search raises RuntimeError — orchestrator continues."""
    rag = _mock_rag()
    rag.search.side_effect = RuntimeError("Qdrant down")

    result = await _run_orchestrator(
        parser_cls=_mock_parser_cls(mock_intent),
        builder_cls=_mock_builder_cls(mock_pipeline),
        registry_cls=_mock_registry_cls(_make_success_agents(mock_schema, mock_quality, mock_code)),
        rag_mock=rag,
        prompt="Build a pipeline",
        user_id=1,
    )

    assert result["success"] is True
    assert "examples" not in result["intent"]


@pytest.mark.asyncio
async def test_run_pipeline_creation_raises(
    mock_intent, mock_schema, mock_quality, mock_code
):
    """create_pipeline() raises — orchestrator propagates the failure."""
    with pytest.raises(RuntimeError):
        await _run_orchestrator(
            parser_cls=_mock_parser_cls(mock_intent),
            builder_cls=_mock_builder_cls(create_side_effect=RuntimeError("DB write failed")),
            registry_cls=_mock_registry_cls(_make_success_agents(mock_schema, mock_quality, mock_code)),
            rag_mock=_mock_rag(),
            prompt="Build a pipeline",
            user_id=1,
        )


@pytest.mark.asyncio
async def test_run_with_pre_parsed_intent(
    mock_intent, mock_schema, mock_quality, mock_code, mock_pipeline
):
    """Pre-parsed intent skips IntentParser.parse() entirely."""
    parser_cls = MagicMock()
    parser_instance = MagicMock()
    parser_instance.parse = AsyncMock()
    parser_cls.return_value = parser_instance

    result = await _run_orchestrator(
        parser_cls=parser_cls,
        builder_cls=_mock_builder_cls(mock_pipeline),
        registry_cls=_mock_registry_cls(_make_success_agents(mock_schema, mock_quality, mock_code)),
        rag_mock=_mock_rag(),
        prompt="Anything here",
        user_id=1,
        pre_parsed_intent=mock_intent,
    )

    parser_instance.parse.assert_not_called()
    assert result["success"] is True
    assert result["intent"]["name"] == "Test Pipeline"
    assert result["agents_used"] == AGENT_NAMES
