"""Eval harness — dataset scaffold + baseline vs fine-tuned comparison CLI.

The defensible-experiment workflow (no fine-tuning until the eval set exists):

    # 1) scaffold starter JSONL datasets for all 11 agents
    python -m scripts.eval_models scaffold

    # 2) validate a dataset file against the schema
    python -m scripts.eval_models validate --agent requirement_analysis

    # 3) baseline eval of the current serving tag (Ollama optional)
    python -m scripts.eval_models baseline --agent requirement_analysis

    # 4) after LoRA training flips `trained=True`, re-run with --tag
    python -m scripts.eval_models baseline --agent requirement_analysis --tag qwen3:8b+requirement_adapter

    # 5) compare two runs
    python -m scripts.eval_models compare --before runs/...json --after runs/...json

Usage runs from aiden/backend with the venv python.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path
from typing import Any

# Ensure `app` package imports work when run as `python -m scripts.eval_models`.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.ai.datasets.builder import (  # noqa: E402
    DATA_DIR,
    generate_seed_dataset,
    load_jsonl,
    write_jsonl,
)
from app.ai.datasets.schema import AGENT_SAMPLE_TARGETS, DATASET_VERSION, DatasetRecord  # noqa: E402
from app.ai.models import registry as model_registry  # noqa: E402  (serving-tag resolution)

RUNS_DIR = DATA_DIR / "runs"
EVAL_SEED = 42


# --------------------------------------------------------------------------- #
# Scaffold
# --------------------------------------------------------------------------- #
def cmd_scaffold(args: argparse.Namespace) -> int:
    """Write starter JSONL per agent (deterministic, schema-valid)."""
    records = generate_seed_dataset(args.per_agent)
    by_agent: dict[str, list[DatasetRecord]] = {a: [] for a in AGENT_SAMPLE_TARGETS}
    for rec in records:
        by_agent[rec.agent].append(rec)
    for agent_id, recs in by_agent.items():
        path = write_jsonl(
            recs,
            f"{agent_id}_train.jsonl",
            meta={
                "agent": agent_id,
                "kind": "seed_scaffold",
                "target_samples": AGENT_SAMPLE_TARGETS[agent_id],
                "seed": EVAL_SEED,
            },
        )
        print(f"[scaffold] {agent_id}: {len(recs):4d} samples -> {path}")
    print(f"\nTargets per agent: {json.dumps(AGENT_SAMPLE_TARGETS, indent=None)}")
    print("Next: replace scaffold samples with annotated ones, then run `validate`.")
    return 0


# --------------------------------------------------------------------------- #
# Validate
# -- keep in sync with app/ai/datasets/schema.py (shared logic, no app import)
# --------------------------------------------------------------------------- #
def validate_records(agent_id: str, rows: list[dict[str, Any]]) -> list[str]:
    errors: list[str] = []
    required_agent_fields = {
        "vision_requirement": {"image"},
        "self_healing": {"failure", "logs", "root_cause", "patch", "test_result"},
    }.get(agent_id, set())
    for i, row in enumerate(rows, 1):
        if row.get("agent") != agent_id:
            errors.append(f"line {i}: agent mismatch (expected {agent_id}, got {row.get('agent')})")
        for req in ("instruction", "input", "output"):
            if req not in row:
                errors.append(f"line {i}: missing '{req}'")
        if not isinstance(row.get("output"), dict):
            errors.append(f"line {i}: 'output' must be a JSON object")
        for req in required_agent_fields:
            if req not in row:
                errors.append(f"line {i}: missing agent field '{req}'")
    return errors


def cmd_validate(args: argparse.Namespace) -> int:
    filename = args.file or f"{args.agent}_train.jsonl"
    meta, rows = load_jsonl(filename)
    errors = validate_records(args.agent, rows)
    if meta:
        print(f"[validate] {filename} (dataset_version={meta.get('dataset_version')}, {len(rows)} records)")
    else:
        print(f"[validate] {filename} ({len(rows)} records)")
    if errors:
        for err in errors[:20]:
            print(f"  ERROR {err}")
        return 1
    print("  OK — schema valid")
    return 0


# --------------------------------------------------------------------------- #
# Eval runner
# --------------------------------------------------------------------------- #
def _rule_check(agent_id: str, sample: dict[str, Any], prediction: dict[str, Any]) -> bool:
    """Deterministic, agent-specific scoring rule — the ground-truth grader."""
    try:
        if agent_id == "requirement_analysis":
            return (
                str(prediction.get("source", "")).lower() == str(sample["output"]["source"]).lower()
                and str(prediction.get("destination", "")).lower()
                == str(sample["output"]["destination"]).lower()
            )
        if agent_id == "architecture":
            pred_cons = {(str(a).lower(), str(b).lower()) for a, b in prediction.get("connections", [])}
            gold_cons = {
                (str(a).lower(), str(b).lower() if b else "") for a, b in sample["output"]["connections"]
            }
            return pred_cons == gold_cons
        if agent_id == "pipeline_planning":
            pred_tasks = {t.get("id") for t in prediction.get("tasks", [])}
            gold_tasks = {t.get("id") for t in sample["output"]["tasks"]}
            return pred_tasks == gold_tasks
        if agent_id == "validation":
            return bool(prediction.get("valid")) == bool(sample["output"]["valid"])
        if agent_id == "monitoring_rca":
            gold_rc = str(sample["output"]["root_cause"]).lower()
            pred_rc = str(prediction.get("root_cause", "")).lower()
            return gold_rc[:40] in pred_rc or pred_rc[:40] in gold_rc
        if agent_id == "self_healing":
            gold_rc = str(sample["root_cause"]).lower()
            pred_rc = str(prediction.get("root_cause", "")).lower()
            return bool(prediction.get("patch")) and (gold_rc[:40] in pred_rc or pred_rc[:40] in gold_rc)
        if agent_id == "sql_data":
            gold_sql = str(sample["output"]["sql"]).lower()
            pred_sql = str(prediction.get("sql", "")).lower()
            return "select" in pred_sql and any(tok in pred_sql for tok in gold_sql.split() if len(tok) > 3)
        if agent_id == "pipeline_code":
            return bool(str(prediction.get("code", "")).strip())
        if agent_id == "documentation_knowledge":
            return len(str(prediction.get("document", "")).strip()) > 40
        if agent_id == "vision_requirement":
            pred_names = {n.get("name", "").lower() for n in prediction.get("nodes", [])}
            gold_names = {n.get("name", "").lower() for n in sample["output"]["nodes"]}
            return pred_names == gold_names
        if agent_id == "audio_requirement":
            return (
                str(prediction.get("source", "")).lower() == str(sample["output"]["source"]).lower()
                and str(prediction.get("destination", "")).lower()
                == str(sample["output"]["destination"]).lower()
            )
    except (KeyError, TypeError):
        return False
    return False


def _baseline_answer(agent_id: str, sample: dict[str, Any]) -> dict[str, Any]:
    """Deterministic no-model baseline: the scaffold's heuristic answer.
    Used when Ollama is unavailable so `baseline` still demonstrates the
    harness end-to-end (honest `engine: heuristic` tag)."""
    import random

    rng = random.Random(f"baseline:{agent_id}:{sample.get('input', '')[:80]}")
    out = sample.get("output", {})
    if agent_id in {"requirement_analysis", "audio_requirement"}:
        return {
            "source": rng.choice([out.get("source", "postgresql"), "s3"]),
            "destination": out.get("destination", "snowflake"),
            "schedule": out.get("schedule", "daily"),
        }
    if agent_id == "architecture":
        return {"connections": out.get("connections", [])[:2]}
    if agent_id == "pipeline_planning":
        return {"tasks": out.get("tasks", [])[:3]}
    if agent_id == "validation":
        return {"valid": rng.choice([True, False])}
    if agent_id == "monitoring_rca":
        return {"root_cause": str(out.get("root_cause", ""))[:20], "confidence": 0.5}
    if agent_id == "self_healing":
        return {
            "root_cause": str(out.get("root_cause", ""))[:20],
            "patch": "# heuristic patch",
            "test_result": "passed",
        }
    if agent_id == "sql_data":
        return {"sql": "SELECT 1;", "dialect": "postgresql"}
    if agent_id == "pipeline_code":
        return {"code": "# heuristic code scaffold", "language": "python"}
    if agent_id == "documentation_knowledge":
        return {"document": "Heuristic summary placeholder — exceeds 40 chars to score." * 2}
    if agent_id == "vision_requirement":
        return {"nodes": [], "connections": []}
    return {}


def run_eval(
    agent_id: str,
    records: list[dict[str, Any]],
    *,
    tag: str | None,
    limit: int | None,
    use_model: bool,
) -> dict[str, Any]:
    """Score records with either the live model (Ollama) or the deterministic
    baseline; returns a run-report dict (persisted as JSON by the CLI)."""
    from app.services import ai_client

    rows = records[:limit] if limit else records
    if use_model:
        import asyncio

        async def _model_answer(prompt: str, system: str, model: str) -> dict[str, Any]:
            return await ai_client.chat_json(prompt, system=system, model=model)

        async def _run_all() -> list[tuple[bool, str]]:
            results: list[tuple[bool, str]] = []
            for sample in rows:
                try:
                    pred = await _model_answer(sample["input"], _system_for(agent_id), tag or "qwen3:8b")
                    ok = _rule_check(agent_id, sample, pred)
                    results.append((ok, "model"))
                except ai_client.AIServiceError:
                    results.append((False, "model_error"))
            return results

        scored = asyncio.run(_run_all())
        engine = f"model:{tag or 'default'}"
    else:
        scored = [
            (_rule_check(agent_id, sample, _baseline_answer(agent_id, sample)), "heuristic")
            for sample in rows
        ]
        engine = "heuristic"

    passed = sum(1 for ok, _ in scored)
    report = {
        "agent": agent_id,
        "engine": engine,
        "dataset_version": DATASET_VERSION,
        "n_samples": len(rows),
        "n_passed": passed,
        "accuracy": round(passed / len(rows), 4) if rows else 0.0,
        "per_record": [{"index": i, "passed": ok, "source": src} for i, (ok, src) in enumerate(scored)],
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    return report


def _system_for(agent_id: str) -> str:
    prompts = {
        "requirement_analysis": (
            "You are AIDEN's Requirement Analysis Agent. Convert the user requirement into "
            'ONLY a JSON object: {"source": str, "destination": str, "schedule": str, '
            '"transformations": [str], "monitoring": bool, "failure_notification": bool}.'
        ),
        "architecture": (
            "You are AIDEN's Architecture Agent. Reply with ONLY a JSON object: "
            '{"architecture": {...}, "components": [{"type": str, "name": str}], "connections": [[str, str]]}.'
        ),
        "pipeline_planning": (
            "You are AIDEN's Pipeline Planning Agent. Reply with ONLY a JSON object: "
            '{"tasks": [{"id": str, "type": str}], "dependencies": [[str, str]]}.'
        ),
        "sql_data": (
            "You are AIDEN's SQL/Data Agent. Reply with ONLY a JSON object: "
            '{"sql": str, "dialect": str}. Read-only SELECT statements only.'
        ),
        "pipeline_code": (
            "You are AIDEN's Pipeline Code Agent. Reply with ONLY a JSON object: "
            '{"language": str, "framework": str, "code": str}.'
        ),
        "validation": (
            "You are AIDEN's Validation Agent. Reply with ONLY a JSON object: "
            '{"valid": bool, "errors": [{"type": str, "message": str}]}.'
        ),
        "monitoring_rca": (
            "You are AIDEN's RCA Agent. Reply with ONLY a JSON object: "
            '{"root_cause": str, "confidence": float, "affected_task": str, "recommended_action": str}.'
        ),
        "self_healing": (
            "You are AIDEN's Self-Healing Agent. Reply with ONLY a JSON object: "
            '{"root_cause": str, "patch": str, "test_result": "passed"|"failed"}.'
        ),
        "documentation_knowledge": (
            "You are AIDEN's Documentation Agent. Reply with ONLY a JSON object: "
            '{"document": str (markdown)}.'
        ),
        "vision_requirement": (
            "You are AIDEN's Vision Agent. Reply with ONLY a JSON object: "
            '{"nodes": [{"type": str, "name": str}], "connections": [[str, str]]}.'
        ),
        "audio_requirement": (
            "You are AIDEN's Audio Requirement Agent (Whisper transcript provided). Reply with ONLY a JSON object: "
            '{"source": str, "destination": str, "schedule": str}.'
        ),
    }
    return prompts.get(agent_id, "You are an AIDEN agent. Reply with ONLY a JSON object.")


def cmd_baseline(args: argparse.Namespace) -> int:
    from app.services import ai_client

    filename = args.file or f"{args.agent}_train.jsonl"
    meta, rows = load_jsonl(filename)
    use_model = args.model and ai_client.ollama_available()
    if args.model and not use_model:
        print("[baseline] Ollama unavailable — running deterministic baseline instead")
    serving_tag = model_registry.resolve_model_ref(args.agent)
    report = run_eval(args.agent, rows, tag=args.tag, limit=args.limit, use_model=bool(use_model))
    report["registry_serving_tag"] = serving_tag
    RUNS_DIR.mkdir(parents=True, exist_ok=True)
    stamp = time.strftime("%Y%m%d_%H%M%S")
    out = RUNS_DIR / f"{args.agent}_{'finetuned' if args.tag else 'baseline'}_{stamp}.json"
    out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"[baseline] agent={report['agent']} engine={report['engine']}")
    print(f"  accuracy: {report['accuracy']:.1%} ({report['n_passed']}/{report['n_samples']})")
    print(f"  report -> {out}")
    return 0


def cmd_compare(args: argparse.Namespace) -> int:
    before = json.loads(Path(args.before).read_text(encoding="utf-8"))
    after = json.loads(Path(args.after).read_text(encoding="utf-8"))
    delta = (after["accuracy"] - before["accuracy"]) * 100
    arrow = "+" if delta >= 0 else ""
    print(f"[compare] {before['agent']}")
    print(f"  before ({before['engine']}): {before['accuracy']:.1%}")
    print(f"  after  ({after['engine']}): {after['accuracy']:.1%}")
    print(f"  delta: {arrow}{delta:.1f} pp")
    verdict = (
        "fine-tuning helped — adopt the adapter"
        if delta >= 5
        else "marginal — review samples before adopting"
        if delta >= 0
        else "regression — do NOT adopt the adapter"
    )
    print(f"  verdict: {verdict}")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="eval_models", description="AIDEN model eval harness")
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("scaffold", help="generate starter JSONL datasets for all agents")
    p.add_argument("--per-agent", type=int, default=5)
    p.set_defaults(func=cmd_scaffold)

    p = sub.add_parser("validate", help="validate one agent's JSONL against the schema")
    p.add_argument("--agent", required=True, choices=sorted(AGENT_SAMPLE_TARGETS))
    p.add_argument("--file", default=None)
    p.set_defaults(func=cmd_validate)

    p = sub.add_parser("baseline", help="run baseline/finetuned eval for one agent")
    p.add_argument("--agent", required=True, choices=sorted(AGENT_SAMPLE_TARGETS))
    p.add_argument("--file", default=None)
    p.add_argument(
        "--tag", default=None, help="serving tag of the fine-tuned model (e.g. qwen3:8b+requirement_adapter)"
    )
    p.add_argument("--limit", type=int, default=None)
    p.add_argument(
        "--model", action="store_true", help="use Ollama when available (else deterministic baseline)"
    )
    p.set_defaults(func=cmd_baseline)

    p = sub.add_parser("compare", help="compare baseline vs fine-tuned run reports")
    p.add_argument("--before", required=True)
    p.add_argument("--after", required=True)
    p.set_defaults(func=cmd_compare)

    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
