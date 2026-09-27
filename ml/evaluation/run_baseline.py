"""Phase 5 — baseline before fine-tuning.

    Base model → AIDEN test dataset → per-agent metric report

Usage (from repo root, backend venv):

    python ml/evaluation/run_baseline.py --agent requirement_analysis --limit 20
    python ml/evaluation/run_baseline.py --all
    python ml/evaluation/run_baseline.py --all --use-model   # needs Ollama up

Engines:
- `heuristic` (default, no deps): echoes the most-frequent gold values from
  the training split — the honest "what would a trivial system score" floor.
- `model` (--use-model): routes through the backend registry serving ref via
  ai_client (Ollama). Falls back to heuristic when Ollama is down.

Reports land in ml/experiments/<agent>_<engine>_<ts>.json (gitignored).
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
import time
from collections import Counter
from pathlib import Path
from typing import Any

ML_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = ML_DIR.parent
sys.path.insert(0, str(ML_DIR.parent))  # repo root → `import ml.*`
sys.path.insert(0, str(REPO_ROOT / "backend"))  # backend → `import app.*`

from ml.evaluation.metrics import aggregate, score_sample, timed
from ml.preprocessing.pipeline import load_jsonl
from ml.preprocessing.records import AGENT_DIRS, parse_json_object

EXPERIMENTS_DIR = ML_DIR / "experiments"


# --------------------------------------------------------------------------- #
# Engines
# --------------------------------------------------------------------------- #
def _majority_baseline(
    train: list[dict[str, Any]], sample: dict[str, Any]
) -> dict[str, Any] | None:
    """Trivial learned baseline: per-field majority value from the train split.
    Honest floor — any fine-tuned model must beat this to matter."""
    fields: dict[str, Counter] = {}
    for rec in train:
        out = parse_json_object(rec.get("expected_output")) or {}
        for key, value in out.items():
            if isinstance(value, (str, int, float, bool)):
                fields.setdefault(key, Counter())[str(value).lower()] += 1
    if not fields:
        return None
    return {key: counter.most_common(1)[0][0] for key, counter in fields.items()}


def make_heuristic_predictor(train: list[dict[str, Any]]):
    def predict(sample: dict[str, Any]) -> dict[str, Any] | None:
        return _majority_baseline(train, sample)

    return predict


def make_model_predictor(agent_id: str, tag: str | None):
    """Ollama-backed predictor via the backend registry serving ref."""
    from app.services import ai_client

    from ml.sync_guard import backend_registry

    registry = backend_registry()
    if registry is None:
        raise RuntimeError("backend registry unavailable — cannot resolve serving ref")
    ref = tag or registry.resolve_model_ref(agent_id)

    async def predict(sample: dict[str, Any]) -> dict[str, Any] | None:

        try:
            return await ai_client.chat_json(str(sample.get("input", "")), model=ref)
        except ai_client.AIServiceError:
            return None

    def run(sample: dict[str, Any]) -> dict[str, Any] | None:
        return asyncio.run(predict(sample))

    return run


# --------------------------------------------------------------------------- #
# Runner
# --------------------------------------------------------------------------- #
def run_agent(
    agent_id: str,
    *,
    engine: str = "heuristic",
    limit: int | None = None,
    split: str = "test",
    tag: str | None = None,
) -> dict[str, Any]:
    agent_dir = ML_DIR / "datasets" / AGENT_DIRS[agent_id]
    test_path = agent_dir / f"{split}.jsonl"
    if not test_path.exists():
        return {
            "agent": agent_id,
            "skipped": f"{test_path.name} missing — run prepare_datasets.py first",
        }

    train = (
        load_jsonl(agent_dir / "train.jsonl")
        if (agent_dir / "train.jsonl").exists()
        else []
    )
    samples = load_jsonl(test_path)
    if limit:
        samples = samples[:limit]

    if engine == "model":
        predict = make_model_predictor(agent_id, tag)
        engine_label = f"model:{tag or 'registry'}"
    else:
        predict = make_heuristic_predictor(train)
        engine_label = "heuristic-majority"

    runs: list[dict[str, Any]] = []
    latencies: list[float] = []
    for i, sample in enumerate(samples):
        pred, latency_ms = timed(lambda s=sample: predict(s))
        latencies.append(latency_ms)
        metrics = score_sample(agent_id, sample, pred)
        runs.append(
            {"index": i, "metrics": metrics, "latency_ms": round(latency_ms, 1)}
        )

    report = {
        "agent": agent_id,
        "engine": engine_label,
        "split": split,
        "n_samples": len(samples),
        "metrics": aggregate(runs),
        "latency_ms_avg": round(sum(latencies) / len(latencies), 1)
        if latencies
        else 0.0,
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    return report


def save_report(report: dict[str, Any]) -> Path:
    EXPERIMENTS_DIR.mkdir(parents=True, exist_ok=True)
    stamp = time.strftime("%Y%m%d_%H%M%S")
    path = (
        EXPERIMENTS_DIR
        / f"{report['agent']}_{report['engine'].replace(':', '-')}_{stamp}.json"
    )
    path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    return path


ALL_AGENTS = list(AGENT_DIRS)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="run_baseline", description="AIDEN Phase 5 baseline evaluation"
    )
    parser.add_argument("--agent", choices=sorted(ALL_AGENTS))
    parser.add_argument("--all", action="store_true")
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--split", choices=["train", "val", "test"], default="test")
    parser.add_argument("--engine", choices=["heuristic", "model"], default="heuristic")
    parser.add_argument("--tag", default=None, help="override serving model tag")
    args = parser.parse_args(argv)

    agents = ALL_AGENTS if args.all else [args.agent]
    if not agents:
        parser.error("specify --agent or --all")

    failures = 0
    for agent_id in agents:
        report = run_agent(
            agent_id,
            engine=args.engine,
            limit=args.limit,
            split=args.split,
            tag=args.tag,
        )
        if "skipped" in report:
            print(f"[baseline] {agent_id}: SKIPPED — {report['skipped']}")
            failures += 1
            continue
        path = save_report(report)
        metrics = ", ".join(f"{k}={v:.2f}" for k, v in report["metrics"].items())
        print(
            f"[baseline] {agent_id} ({report['engine']}, n={report['n_samples']}): {metrics}"
        )
        print(f"           latency_avg={report['latency_ms_avg']}ms  report -> {path}")
    return 1 if failures and not args.all else 0


if __name__ == "__main__":
    sys.exit(main())
