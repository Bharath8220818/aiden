"""Model-layer tests — registry integrity, routing, service facade, endpoints,
and the dataset/eval pipeline."""

from __future__ import annotations

import json

import httpx
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token
from app.models import User, UserRole
from tests.helpers import seed_user


def _auth(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(str(user.id))}"}


# --------------------------------------------------------------------------- #
# Registry integrity — the 11/4/8 architecture invariant
# --------------------------------------------------------------------------- #
def test_registry_counts() -> None:
    from app.ai.models.registry import AGENTS, BASE_MODELS, LORA_ADAPTERS

    assert len(AGENTS) == 11
    assert len(BASE_MODELS) == 4
    assert len(LORA_ADAPTERS) == 9  # 8 LLM LoRAs + vision (audio stays pretrained)


def test_every_agent_resolves_to_a_known_base() -> None:
    from app.ai.models.registry import AGENTS, BASE_MODELS, base_model_for_agent

    for agent_id, spec in AGENTS.items():
        assert spec.base_model_id in BASE_MODELS, agent_id
        assert base_model_for_agent(agent_id).id == spec.base_model_id


def test_audio_agent_has_no_adapter() -> None:
    from app.ai.models.registry import AGENTS, adapter_for_agent

    assert AGENTS["audio_requirement"].fine_tune is False
    assert adapter_for_agent("audio_requirement") is None


def test_resolve_model_ref_reflects_training_state() -> None:
    import dataclasses

    from app.ai.models import registry

    # Untrained adapter → plain base tag.
    assert registry.resolve_model_ref("requirement_analysis") == "qwen3:8b"
    # Trained adapter → base+adapter ref (frozen spec swapped via replace()).
    original = registry.LORA_ADAPTERS["requirement_adapter"]
    registry.LORA_ADAPTERS["requirement_adapter"] = dataclasses.replace(original, trained=True)
    try:
        assert registry.resolve_model_ref("requirement_analysis") == "qwen3:8b+requirement_adapter"
    finally:
        registry.LORA_ADAPTERS["requirement_adapter"] = original


def test_route_table_shape() -> None:
    from app.ai.models.registry import route_table

    rows = route_table()
    assert len(rows) == 11
    nos = [r["no"] for r in rows]
    assert nos == sorted(nos) and nos[0] == 1 and nos[-1] == 11
    for row in rows:
        assert {"agent", "base_model", "serving_tag", "adapter", "fallback_model"} <= set(row)


def test_unknown_agent_raises() -> None:
    from app.ai.models.registry import base_model_for_agent

    with pytest.raises(KeyError):
        base_model_for_agent("does_not_exist")


# --------------------------------------------------------------------------- #
# Router — multimodal classification + pre-agent chains
# --------------------------------------------------------------------------- #
def test_classify_text() -> None:
    from app.ai.models.router import AgentInputKind, classify_input_kind

    assert classify_input_kind({"text": {"rawText": "daily ETL"}}) == AgentInputKind.TEXT


def test_classify_audio_and_image() -> None:
    from app.ai.models.router import AgentInputKind, classify_input_kind

    assert classify_input_kind({"audio": {"transcript": "nightly load"}}) == AgentInputKind.AUDIO
    assert classify_input_kind({"image": {"url": "diagram.png"}}) == AgentInputKind.IMAGE


def test_route_audio_goes_through_whisper_then_requirement() -> None:
    from app.ai.models.router import route

    decision = route({"audio": {"transcript": "Create a pipeline from MySQL to Snowflake nightly"}})
    assert decision.agent_id == "requirement_analysis"
    assert decision.input_kind == "audio"
    assert decision.pre_agents[0]["agent"] == "audio_requirement"
    assert decision.pre_agents[0]["base_model_id"] == "base_d_audio"
    assert decision.pre_agents[0]["fine_tune"] is False


def test_route_image_goes_through_vision_then_requirement() -> None:
    from app.ai.models.router import route

    decision = route({"diagram": {"description": "PG -> Kafka -> Spark -> Snowflake"}})
    assert decision.agent_id == "requirement_analysis"
    assert decision.input_kind == "image"
    assert decision.pre_agents[0]["agent"] == "vision_requirement"
    assert decision.pre_agents[0]["base_model_id"] == "base_c_vision"


def test_route_explicit_agent() -> None:
    from app.ai.models.router import route

    decision = route({"text": "write a DAG"}, agent_id="pipeline_code")
    assert decision.agent_id == "pipeline_code"
    assert decision.base_model_id == "base_b_coder"
    assert decision.adapter == "pipeline_code_adapter"


def test_route_unknown_agent_raises() -> None:
    from app.ai.models.router import route

    with pytest.raises(KeyError):
        route({"text": "hi"}, agent_id="nope")


# --------------------------------------------------------------------------- #
# Service facade
# --------------------------------------------------------------------------- #
def test_model_service_roster_and_bases() -> None:
    from app.services import model_service

    roster = model_service.roster()
    assert len(roster) == 11
    assert {b["role"] for b in model_service.bases()} == {"general", "coder", "vision", "audio"}


async def test_model_service_agent_run_requires_model() -> None:
    from app.services import model_service

    # No Ollama in tests → AIServiceUnavailable (a subclass of AIServiceError).
    from app.services.ai_client import AIServiceError

    with pytest.raises(AIServiceError):
        await model_service.agent_run("requirement_analysis", {"text": "build a daily ETL"})


def test_model_service_unknown_agent() -> None:
    from app.services import model_service

    with pytest.raises(model_service.UnknownAgentError):
        model_service.resolve_route({"text": "hi"}, agent_id="ghost")


# --------------------------------------------------------------------------- #
# API endpoints
# --------------------------------------------------------------------------- #
async def test_registry_endpoint(client: httpx.AsyncClient, db_session: AsyncSession) -> None:
    lead = await seed_user(db_session, role=UserRole.lead)
    resp = await client.get("/api/v1/agents/model/registry", headers=_auth(lead))
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["bases"]) == 4
    assert len(body["routes"]) == 11
    assert len(body["adapters"]) == 9


async def test_registry_endpoint_requires_auth(client: httpx.AsyncClient, db_session: AsyncSession) -> None:
    resp = await client.get("/api/v1/agents/model/registry")
    assert resp.status_code == 401


async def test_run_endpoint_requires_agent_control(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    viewer = await seed_user(db_session, role=UserRole.viewer)  # has agent.read only
    resp = await client.post(
        "/api/v1/agents/model/run",
        json={"agent_id": "requirement_analysis", "text": "hi"},
        headers=_auth(viewer),
    )
    assert resp.status_code == 403


async def test_route_endpoint_audio(client: httpx.AsyncClient, db_session: AsyncSession) -> None:
    lead = await seed_user(db_session, role=UserRole.lead)
    resp = await client.get(
        "/api/v1/agents/model/route",
        params={"payload": "ignored", "input_kind": "audio"},
        headers=_auth(lead),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["agent_id"] == "requirement_analysis"
    assert body["input_kind"] == "audio"
    assert body["pre_agents"][0]["serving_model_ref"] == "whisper-large-v3"


async def test_route_endpoint_unknown_agent_404(client: httpx.AsyncClient, db_session: AsyncSession) -> None:
    lead = await seed_user(db_session, role=UserRole.lead)
    resp = await client.get(
        "/api/v1/agents/model/route",
        params={"payload": "hi", "agent_id": "ghost"},
        headers=_auth(lead),
    )
    assert resp.status_code == 404


async def test_run_endpoint_degrades_without_ollama(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    lead = await seed_user(db_session, role=UserRole.lead)
    resp = await client.post(
        "/api/v1/agents/model/run",
        json={"agent_id": "requirement_analysis", "text": "Daily orders ETL"},
        headers=_auth(lead),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["source"] == "heuristic"
    assert body["route"]["agent_id"] == "requirement_analysis"


# --------------------------------------------------------------------------- #
# Datasets — schema, builder, JSONL round-trip
# --------------------------------------------------------------------------- #
def test_record_requires_agent_fields() -> None:
    from app.ai.datasets.schema import DatasetRecord

    with pytest.raises(ValueError):
        DatasetRecord(agent="self_healing", instruction="i", input="x", output={})
    rec = DatasetRecord(
        agent="self_healing",
        instruction="i",
        input="x",
        output={"patch_summary": "cast"},
        failure="f",
        logs="l",
        root_cause="r",
        patch="p",
        test_result="passed",
    )
    assert rec.to_dict()["test_result"] == "passed"


def test_record_unknown_agent_rejected() -> None:
    from app.ai.datasets.schema import DatasetRecord

    with pytest.raises(ValueError):
        DatasetRecord(agent="nope", instruction="i", input="x", output={})


def test_seed_dataset_covers_all_agents() -> None:
    from app.ai.datasets.builder import generate_seed_dataset
    from app.ai.datasets.schema import AGENT_SAMPLE_TARGETS

    records = generate_seed_dataset(per_agent=3)
    assert len(records) == 3 * len(AGENT_SAMPLE_TARGETS)
    assert {r.agent for r in records} == set(AGENT_SAMPLE_TARGETS)
    for rec in records:
        assert rec.to_dict()["output"]  # non-empty structured output


def test_jsonl_round_trip(tmp_path, monkeypatch) -> None:
    from app.ai.datasets import builder

    monkeypatch.setattr(builder, "DATA_DIR", tmp_path)
    for agent_id, recs in builder.build_all(per_agent=2).items():
        path = builder.write_jsonl(recs, f"{agent_id}_train.jsonl", meta={"agent": agent_id})
        assert path.exists()
        meta, rows = builder.load_jsonl(f"{agent_id}_train.jsonl")
        assert meta and meta["agent"] == agent_id
        assert len(rows) == len(recs)
        assert json.dumps(rows[0])  # valid JSON lines


# --------------------------------------------------------------------------- #
# Eval harness — scoring rules + CLI
# --------------------------------------------------------------------------- #
def test_rule_check_exact_and_fuzzy() -> None:
    from scripts.eval_models import _rule_check

    req = {"output": {"source": "postgresql", "destination": "snowflake"}}
    assert _rule_check("requirement_analysis", req, {"source": "PostgreSQL", "destination": "snowflake"})
    assert not _rule_check("requirement_analysis", req, {"source": "s3", "destination": "snowflake"})

    val = {"output": {"valid": False}}
    assert _rule_check("validation", val, {"valid": False})
    assert not _rule_check("validation", val, {"valid": True})


def test_rule_check_self_healing() -> None:
    from scripts.eval_models import _rule_check

    sample = {"root_cause": "source column customer_id changed from INTEGER to STRING", "output": {}}
    pred = {"root_cause": "customer_id changed from integer to string", "patch": "- cast\n+ cast"}
    assert _rule_check("self_healing", sample, pred)
    assert not _rule_check("self_healing", sample, {"root_cause": "unrelated failure mode", "patch": "x"})
    assert not _rule_check("self_healing", sample, {"root_cause": "", "patch": ""})


def test_baseline_eval_end_to_end(tmp_path, monkeypatch) -> None:
    """Full harness path: scaffold → load → score → report, no model needed."""
    import scripts.eval_models as em

    monkeypatch.setattr(em, "DATA_DIR", tmp_path)
    monkeypatch.setattr(em, "RUNS_DIR", tmp_path / "runs")

    rc = em.main(["scaffold", "--per-agent", "2"])
    assert rc == 0

    rc = em.main(["validate", "--agent", "requirement_analysis"])
    assert rc == 0

    rc = em.main(["baseline", "--agent", "requirement_analysis"])
    assert rc == 0
    reports = list((tmp_path / "runs").glob("requirement_analysis_baseline_*.json"))
    assert reports, "baseline run report should be written"
    report = json.loads(reports[0].read_text(encoding="utf-8"))
    assert report["engine"] == "heuristic"
    assert 0.0 <= report["accuracy"] <= 1.0
    assert report["n_samples"] == 2


def test_compare_verdicts(capsys) -> None:
    import tempfile
    from pathlib import Path

    import scripts.eval_models as em

    with tempfile.TemporaryDirectory() as td:
        before, after = Path(td) / "b.json", Path(td) / "a.json"
        before.write_text(
            json.dumps({"agent": "requirement_analysis", "engine": "heuristic", "accuracy": 0.60})
        )
        after.write_text(
            json.dumps({"agent": "requirement_analysis", "engine": "model:qwen3:8b", "accuracy": 0.82})
        )
        assert em.main(["compare", "--before", str(before), "--after", str(after)]) == 0
        out = capsys.readouterr().out
        assert "+22.0 pp" in out and "adopt the adapter" in out
