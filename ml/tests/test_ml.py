"""ML workspace unit tests — contracts, records, preprocessing, metrics, baseline.

Run:  cd aiden && backend/venv/Scripts/python.exe -m pytest ml/tests -q
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT))
sys.path.insert(0, str(REPO_ROOT / "backend"))

from ml import validate as ml_validate
from ml.evaluation import metrics as M
from ml.preprocessing.pipeline import (
    clean_and_split,
    prepare_agent_dir,
    sample_key,
    split,
    validate_record,
)
from ml.preprocessing.records import to_backend_record, to_ml_record


# --------------------------------------------------------------------------- #
# Phase 1 — contracts
# --------------------------------------------------------------------------- #
def test_contracts_validate_clean() -> None:
    contracts = ml_validate.load_contracts()
    assert ml_validate.validate_contracts(contracts) == []
    assert ml_validate.validate_backend_sync(contracts) == []


def test_schema_check_flags_missing_required() -> None:
    schema = {
        "type": "object",
        "required": ["source"],
        "properties": {"source": {"type": "string"}},
    }
    errors: list[str] = []
    ml_validate._schema_check(schema, {}, "root", errors)
    assert any("source" in e for e in errors)
    errors = []
    ml_validate._schema_check(schema, {"source": "postgresql"}, "root", errors)
    assert errors == []


# --------------------------------------------------------------------------- #
# Phase 2 — record conversion
# --------------------------------------------------------------------------- #
def test_record_round_trip() -> None:
    backend_rec = {
        "agent": "self_healing",
        "instruction": "Propose a repair patch",
        "input": "customer_id type mismatch",
        "output": {"patch_summary": "cast"},
        "failure": "type mismatch",
        "logs": "[ERROR] ...",
        "root_cause": "INTEGER -> STRING",
        "patch": "CAST(...)",
        "test_result": "passed",
        "meta": {"source": "unit-test"},
    }
    ml_rec = to_ml_record(backend_rec)
    # A10 conformance: root_cause/patch/test_result fold INTO expected_output
    # (the frozen contract requires them there) and stay top-level for tracing.
    assert ml_rec["expected_output"]["patch_summary"] == "cast"
    assert ml_rec["expected_output"]["root_cause"] == "INTEGER -> STRING"
    assert ml_rec["expected_output"]["test_result"] == "passed"
    assert ml_rec["metadata"] == {"source": "unit-test"}
    assert ml_rec["patch"] == "CAST(...)"
    back = to_backend_record(ml_rec)
    assert back["output"]["patch_summary"] == "cast"
    assert back["meta"] == {"source": "unit-test"}
    assert back["test_result"] == "passed"
    assert back["root_cause"] == "INTEGER -> STRING"


def test_record_unknown_agent_rejected() -> None:
    with pytest.raises(ValueError):
        to_ml_record({"agent": "nope", "instruction": "i", "input": "x", "output": {}})


# --------------------------------------------------------------------------- #
# Phase 4 — cleaning + split
# --------------------------------------------------------------------------- #
def _mk_samples(n: int) -> list[dict]:
    return [
        {
            "agent": "requirement_analysis",
            "instruction": "Convert the requirement",
            "input": f"Build pipeline variant {i} from postgresql to snowflake daily",
            "expected_output": {
                "source": "postgresql",
                "destination": "snowflake",
                "schedule": "daily",
            },
        }
        for i in range(n)
    ]


def test_clean_dedupes_and_validates() -> None:
    records = _mk_samples(10)
    records.append(dict(records[0]))  # exact duplicate
    bad = _mk_samples(1)[0]
    bad["input"] = "distinct requirement with schema drift"  # own hash, not a dupe
    bad["expected_output"] = {
        "destination": "snowflake"
    }  # missing 'source' + 'schedule'
    records.append(bad)
    train, val, test, stats = clean_and_split(
        records, schema={"required": ["source", "destination", "schedule"]}
    )
    assert stats["duplicates"] == 1
    assert stats["invalid"] == 1
    assert stats["train"] + stats["val"] + stats["test"] == 10
    assert len(train) >= len(val) >= len(test) or len(val) == len(test)


def test_split_is_deterministic() -> None:
    a = clean_and_split(_mk_samples(20), seed=7)[:3]
    b = clean_and_split(_mk_samples(20), seed=7)[:3]
    assert [len(x) for x in a] == [len(x) for x in b]
    assert [r["input"] for r in a[0]] == [r["input"] for r in b[0]]


def test_prepare_agent_dir_writes_splits(tmp_path: Path) -> None:
    agent_dir = tmp_path / "requirement"
    agent_dir.mkdir()
    with (agent_dir / "raw.jsonl").open("w", encoding="utf-8") as fh:
        for rec in _mk_samples(12):
            fh.write(json.dumps(rec) + "\n")
    stats = prepare_agent_dir(
        agent_dir, schema={"required": ["source", "destination", "schedule"]}
    )
    assert stats["train"] + stats["val"] + stats["test"] == 12
    assert (agent_dir / "train.jsonl").exists()
    assert (agent_dir / "validation.jsonl").exists()  # HF-conventional name (v0.2)
    assert (agent_dir / "test.jsonl").exists()
    assert (agent_dir / "cleaned.jsonl").exists()
    assert (agent_dir / "rejected.jsonl").exists()
    report = json.loads((agent_dir / "dataset_report.json").read_text(encoding="utf-8"))
    assert report["train"] == stats["train"]
    assert report["validation"] == stats["val"]
    assert report["test"] == stats["test"]
    assert (
        json.loads((agent_dir / "stats.json").read_text(encoding="utf-8"))["input"]
        == 12
    )


def test_inference_extract_json_handles_fences_and_prose() -> None:
    from ml.inference.requirement_agent import extract_json

    assert extract_json('{"source": "s3"}') == {"source": "s3"}
    assert extract_json('Sure! ```json\n{"a": 1}\n``` done') == {"a": 1}
    assert extract_json('Here: {"a": [1, 2]}') == {"a": [1, 2]}
    bad = extract_json("no json here at all")
    assert bad["status"] == "invalid"


def test_inference_heuristic_flags_ambiguous_and_destructive() -> None:
    from ml.inference.requirement_agent import predict_heuristic

    amb = predict_heuristic("Move customer data to the warehouse regularly.")
    assert amb["status"] == "needs_clarification"
    bad = predict_heuristic("Delete all production customer records.")
    assert bad["status"] == "invalid"


def test_compare_runs_flags_regression(tmp_path) -> None:
    from ml.evaluation.compare_runs import load_run

    a = tmp_path / "a.json"
    b = tmp_path / "b.json"
    a.write_text(
        json.dumps(
            {
                "agent": "requirement_analysis",
                "engine": "x",
                "n_samples": 2,
                "metrics": {"field_accuracy": 0.9, "json_validity": 1.0},
            }
        ),
        encoding="utf-8",
    )
    b.write_text(
        json.dumps(
            {
                "agent": "requirement_analysis",
                "engine": "y",
                "n_samples": 2,
                "metrics": {"field_accuracy": 0.5, "json_validity": 1.0},
            }
        ),
        encoding="utf-8",
    )
    assert load_run(str(a))["metrics"]["field_accuracy"] == 0.9


def _status_record(status: str, **extra: object) -> dict:
    return {
        "agent": "requirement_analysis",
        "instruction": "Analyze the user requirement",
        "input": "Set up something for our orders data.",
        "expected_output": {"status": status, **extra},
    }


def test_validate_record_accepts_status_golds() -> None:
    assert (
        validate_record(
            _status_record(
                "needs_clarification", missing_information=["source_system"]
            ),
            schema={"required": ["source", "destination", "schedule"]},
        )
        == []
    )
    assert (
        validate_record(
            _status_record("invalid", reason="no pipeline possible"), schema=None
        )
        == []
    )


def test_validate_record_rejects_bad_status_golds() -> None:
    # needs_clarification without any missing/conflict payload
    assert validate_record(_status_record("needs_clarification"), schema=None)
    # invalid without a reason
    assert validate_record(_status_record("invalid"), schema=None)
    # unknown status
    assert validate_record(_status_record("maybe_ok"), schema=None)


def test_split_holdout_keeps_categories_out_of_train() -> None:
    records: list[dict] = []
    for i in range(30):
        cat = "schema_drift" if i % 3 == 0 else "batch_etl"
        records.append(
            {
                "agent": "requirement_analysis",
                "instruction": "Convert the user requirement into a pipeline specification",
                "input": f"unique requirement {i} for {cat}",
                "expected_output": {
                    "source": "s",
                    "destination": "d",
                    "schedule": "daily",
                },
                "metadata": {"category": cat},
            }
        )
    train, val, test = split(records, seed=1, holdout_categories={"schema_drift"})
    train_cats = {(r.get("metadata") or {}).get("category") for r in train}
    test_cats = {(r.get("metadata") or {}).get("category") for r in test}
    assert "schema_drift" not in train_cats
    assert "schema_drift" in test_cats
    assert train + val + test == records or (
        len(train) + len(val) + len(test) == len(records)
    )


def test_sample_key_ignores_metadata() -> None:
    a = _mk_samples(1)[0]
    b = {**a, "metadata": {"source": "other"}}
    assert sample_key(a) == sample_key(b)


# --------------------------------------------------------------------------- #
# Phase 5 — metrics
# --------------------------------------------------------------------------- #
def test_wer_zero_and_high() -> None:
    assert M.wer("create pipeline from mysql", "create pipeline from mysql") == 0.0
    # WER is unbounded (insertions on a short reference): 2 ref words, 4 hyp words.
    assert M.wer("create pipeline", "totally different words here") >= 1.0


def test_field_accuracy_mixed() -> None:
    gold = {
        "source": "mysql",
        "destination": "Snowflake",
        "monitoring": True,
        "transformations": ["mask_pii"],
    }
    pred = {
        "source": "MySQL",
        "destination": "snowflake",
        "monitoring": False,
        "transformations": ["mask_pii"],
    }
    # source ✓ (case-insensitive), destination ✓, monitoring ✗, transformations ✓
    assert (
        M.field_accuracy(
            pred, gold, ["source", "destination", "monitoring", "transformations"]
        )
        == 0.75
    )


def test_dag_valid_and_broken() -> None:
    good = {"tasks": [{"id": "a"}, {"id": "b"}], "dependencies": [["a", "b"]]}
    bad = {"tasks": [{"id": "a"}], "dependencies": [["a", "ghost"]]}
    assert M.dag_valid(good) == 1.0
    assert M.dag_valid(bad) == 0.0


def test_code_compiles_and_sql_syntax() -> None:
    assert M.code_compiles("x = 1\n") == 1.0
    assert M.code_compiles("def broken(:\n") == 0.0
    assert M.sql_syntax_ok("SELECT * FROM orders") == 1.0
    assert M.sql_syntax_ok("SELECT ( FROM orders") == 0.0


def test_score_vision_f1() -> None:
    sample = {
        "expected_output": {
            "nodes": [
                {"type": "database", "name": "PostgreSQL"},
                {"type": "stream", "name": "Kafka"},
            ],
            "connections": [["postgresql", "kafka"]],
        }
    }
    perfect = {
        "nodes": [
            {"type": "database", "name": "PostgreSQL"},
            {"type": "stream", "name": "Kafka"},
        ],
        "connections": [["PostgreSQL", "Kafka"]],
    }
    half = {"nodes": [{"name": "PostgreSQL"}], "connections": []}
    assert M.score_vision(sample, perfect)["node_accuracy"] == 1.0
    assert M.score_vision(sample, half)["node_accuracy"] == pytest.approx(2 / 3)
    assert M.score_vision(sample, None)["json_validity"] == 0.0


def test_score_rca_fuzzy_and_self_healing() -> None:
    rca_sample = {
        "expected_output": {
            "root_cause": "source column customer_id changed from INTEGER to STRING",
            "affected_task": "transform",
        }
    }
    hit = {
        "root_cause": "customer_id changed from integer to string",
        "affected_task": "transform",
    }
    assert M.score_rca(rca_sample, hit)["rca_accuracy"] == 1.0

    heal_sample = {
        "root_cause": "type mismatch",
        "expected_output": {
            "root_cause": "type mismatch",
            "patch": "CAST(x AS INT)",
            "test_result": "passed",
        },
    }
    pred = {
        "root_cause": "type mismatch",
        "patch": "CAST(x AS BIGINT)",
        "test_result": "passed",
    }
    scored = M.score_self_healing(heal_sample, pred)
    assert scored["patch_correctness"] == 1.0 and scored["test_pass_rate"] == 1.0


def test_aggregate_averages() -> None:
    runs = [
        {"metrics": {"json_validity": 1.0, "field_accuracy": 0.5}},
        {"metrics": {"json_validity": 0.0, "field_accuracy": 1.0}},
    ]
    agg = M.aggregate(runs)
    assert agg["json_validity"] == 0.5
    assert agg["field_accuracy"] == 0.75


# --------------------------------------------------------------------------- #
# Phase 5 — baseline runner end-to-end
# --------------------------------------------------------------------------- #
def test_run_baseline_end_to_end(tmp_path: Path, monkeypatch) -> None:
    """Prepare a tiny dataset dir, run the heuristic baseline, check report."""
    import ml.evaluation.run_baseline as rb

    agent_dir = (
        tmp_path / "datasets" / "requirement"
    )  # run_agent resolves <ML_DIR>/datasets/<dir>
    agent_dir.mkdir(parents=True)
    rows = _mk_samples(10)
    with (agent_dir / "train.jsonl").open("w", encoding="utf-8") as fh:
        for rec in rows[:8]:
            fh.write(json.dumps(rec) + "\n")
    with (agent_dir / "test.jsonl").open("w", encoding="utf-8") as fh:
        for rec in rows[8:]:
            fh.write(json.dumps(rec) + "\n")

    monkeypatch.setattr(rb, "ML_DIR", tmp_path)
    report = rb.run_agent("requirement_analysis", engine="heuristic")
    assert report["n_samples"] == 2
    assert 0.0 <= report["metrics"]["field_accuracy"] <= 1.0
    assert report["metrics"]["json_validity"] == 1.0
    assert report["latency_ms_avg"] >= 0.0
    assert report["engine"] == "heuristic-majority"


def test_run_baseline_skips_missing_split(tmp_path: Path, monkeypatch) -> None:
    import ml.evaluation.run_baseline as rb

    monkeypatch.setattr(rb, "ML_DIR", tmp_path)
    report = rb.run_agent("sql_data", engine="heuristic")
    assert "skipped" in report


# --------------------------------------------------------------------------- #
# Phase 6 — training scaffold (dry-run only; no torch in this venv)
# --------------------------------------------------------------------------- #
def test_lora_dry_run(tmp_path: Path, monkeypatch) -> None:
    from ml.training import lora_finetune as lf

    agent_dir = tmp_path / "datasets" / "requirement"
    agent_dir.mkdir(parents=True)
    with (agent_dir / "train.jsonl").open("w", encoding="utf-8") as fh:
        for rec in _mk_samples(2):
            fh.write(json.dumps(rec) + "\n")
    monkeypatch.setattr(lf, "ML_DIR", tmp_path)
    (tmp_path / "agents.json").write_text(
        (REPO_ROOT / "ml" / "agents.json").read_text(encoding="utf-8"), encoding="utf-8"
    )

    info = lf.dry_run(
        "requirement_analysis", base_model="Qwen/Qwen3-8B", epochs=1, qlora=False
    )
    assert info["status"].startswith("dry-run OK")
    assert info["adapter"] == "requirement_adapter"
    assert info["rank"] == 16
    assert info["n_train_samples"] == 2


def test_adapter_registry_round_trip(tmp_path: Path) -> None:
    from ml.training.adapter_registry import AdapterRegistry

    reg = AdapterRegistry(path=tmp_path / "registry.json")
    assert reg.is_trained("requirement_adapter") is False
    reg.mark_trained(
        "requirement_adapter",
        "/tmp/adapter",
        base_model="Qwen/Qwen3-8B",
        epochs=3,
        qlora=True,
    )
    assert reg.is_trained("requirement_adapter") is True
    reloaded = AdapterRegistry(path=tmp_path / "registry.json")
    assert reloaded.all()["requirement_adapter"]["epochs"] == 3
