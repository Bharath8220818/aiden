"""ml↔backend contract sync guard (roadmap Phase 1).

If this test fails, someone renamed/added an agent, adapter, or base model in
one place only — fix the drift (agents.json AND registry.py) before merging.
"""

from __future__ import annotations

import json
from pathlib import Path

from app.ai.models import registry

ML_DIR = Path(__file__).resolve().parents[2] / "ml"


def _contracts() -> dict:
    return json.loads((ML_DIR / "agents.json").read_text(encoding="utf-8"))


def test_agents_json_exists_and_versioned() -> None:
    contracts = _contracts()
    assert contracts.get("version") == "1.0"
    assert len(contracts["agents"]) == 11


def test_contract_ids_are_contiguous_a1_to_a11() -> None:
    contracts = _contracts()
    ids = [a["id"] for a in contracts["agents"]]
    assert ids == [f"A{i}" for i in range(1, 12)]


def test_contracts_match_backend_registry() -> None:
    contracts = _contracts()
    for agent in contracts["agents"]:
        spec = registry.AGENTS[agent["backend_agent"]]
        assert spec.base_model_id == agent["base_model"], agent["id"]
        assert spec.adapter == agent["adapter"], agent["id"]


def test_registry_agents_all_covered_by_contracts() -> None:
    contracts = _contracts()
    covered = {a["backend_agent"] for a in contracts["agents"]}
    assert covered == set(registry.AGENTS)


def test_audio_contract_has_no_adapter() -> None:
    contracts = _contracts()
    a3 = next(a for a in contracts["agents"] if a["id"] == "A3")
    assert a3["adapter"] is None
    assert registry.AGENTS["audio_requirement"].adapter is None


def test_output_schemas_require_core_fields() -> None:
    contracts = _contracts()
    by_backend = {a["backend_agent"]: a for a in contracts["agents"]}
    assert "source" in by_backend["requirement_analysis"]["output_schema"]["required"]
    assert "nodes" in by_backend["vision_requirement"]["output_schema"]["required"]
    assert "tasks" in by_backend["pipeline_planning"]["output_schema"]["required"]
    assert "root_cause" in by_backend["monitoring_rca"]["output_schema"]["required"]
    assert "patch" in by_backend["self_healing"]["output_schema"]["required"]
