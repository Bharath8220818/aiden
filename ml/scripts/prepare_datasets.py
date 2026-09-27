"""Phase 3/4 — dataset preparation CLI (from repo root, backend venv):

    python ml/scripts/prepare_datasets.py --source backend-scaffold
    python ml/scripts/prepare_datasets.py --source backend-scaffold --per-agent 20
    python ml/scripts/prepare_datasets.py --report        # show split stats

Pulls the backend's deterministic scaffold records (backend/app/ai/datasets),
converts them to the ml record format, writes `raw.jsonl` per agent dir, then
runs the Phase 4 cleaning pipeline (dedupe → validate → 80/10/10 split).

Later, annotation runs replace `raw.jsonl` (same format) and this script is
re-run to re-split — the split is deterministic under the fixed seed.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ML_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = ML_DIR.parent
sys.path.insert(0, str(ML_DIR.parent))
sys.path.insert(0, str(REPO_ROOT / "backend"))

from ml.preprocessing.pipeline import prepare_agent_dir
from ml.preprocessing.records import AGENT_DIRS, to_ml_record


def _contracts() -> dict[str, dict]:
    """agent_id → output_schema (for cleaning validation)."""
    data = json.loads((ML_DIR / "agents.json").read_text(encoding="utf-8"))
    return {a["backend_agent"]: a.get("output_schema") for a in data["agents"]}


def load_backend_records(per_agent: int | None = None) -> list[dict]:
    """Backend scaffold records (optionally scaled up per agent)."""
    from app.ai.datasets.builder import (
        build_for_agent,
        generate_seed_dataset,
    )

    if per_agent is None:
        records = generate_seed_dataset(per_agent=5)
    else:
        records = []
        for agent_id in AGENT_DIRS:
            records.extend(build_for_agent(agent_id, per_agent))
    grouped: dict[str, list[dict]] = {a: [] for a in AGENT_DIRS}
    for rec in records:
        data = rec.to_dict() if hasattr(rec, "to_dict") else rec
        grouped[data["agent"]].append(data)
    return [r for recs in grouped.values() for r in recs]


def prepare(
    source: str = "backend-scaffold",
    per_agent: int | None = None,
    *,
    only: list[str] | None = None,
    force: bool = False,
) -> int:
    if source != "backend-scaffold":
        print(f"[prepare] unknown source {source!r} — only 'backend-scaffold' today")
        return 1

    contracts = _contracts()
    records = load_backend_records(per_agent)
    by_agent: dict[str, list[dict]] = {a: [] for a in AGENT_DIRS}
    for rec in records:
        by_agent[rec["agent"]].append(rec)

    selected = {a for a in by_agent if only is None or AGENT_DIRS[a] in only}

    failures = 0
    for agent_id, recs in by_agent.items():
        if agent_id not in selected:
            continue
        agent_dir = ML_DIR / "datasets" / AGENT_DIRS[agent_id]
        agent_dir.mkdir(parents=True, exist_ok=True)
        raw_path = agent_dir / "raw.jsonl"
        if (
            raw_path.exists()
            and not force
            and sum(1 for _ in raw_path.open(encoding="utf-8")) > len(recs)
        ):
            print(
                f"[prepare] {agent_id}: raw.jsonl has MORE records than the "
                f"scaffold would write ({sum(1 for _ in raw_path.open(encoding='utf-8'))} vs "
                f"{len(recs)}) — refusing to clobber. Re-run the real generator or "
                "pass --force."
            )
            failures += 1
            continue
        with raw_path.open("w", encoding="utf-8") as fh:
            for rec in recs:
                fh.write(json.dumps(to_ml_record(rec), ensure_ascii=False) + "\n")
        stats = prepare_agent_dir(agent_dir, schema=contracts.get(agent_id))
        if "skipped" in stats:
            print(f"[prepare] {agent_id}: SKIPPED")
            failures += 1
            continue
        print(
            f"[prepare] {agent_id}: raw={stats['input']} "
            f"dupes={stats['duplicates']} invalid={stats['invalid']} "
            f"-> train={stats['train']} val={stats['val']} test={stats['test']}"
        )
    return 1 if failures else 0


def report() -> int:
    for dir_name in AGENT_DIRS.values():
        report_path = ML_DIR / "datasets" / dir_name / "dataset_report.json"
        stats_path = ML_DIR / "datasets" / dir_name / "stats.json"
        if report_path.exists():
            rep = json.loads(report_path.read_text(encoding="utf-8"))
            print(
                f"[report] {dir_name}: v{rep.get('version')} "
                f"raw={rep.get('total_raw')} clean={rep.get('total_cleaned')} "
                f"rej={rep.get('rejected')} -> "
                f"train={rep.get('train')} val={rep.get('validation')} test={rep.get('test')}"
            )
            continue
        if not stats_path.exists():
            print(f"[report] {dir_name}: no stats — run prepare first")
            continue
        stats = json.loads(stats_path.read_text(encoding="utf-8"))
        print(f"[report] {dir_name}: {json.dumps(stats)}")
    return 0


def split_only(
    *,
    only: list[str] | None = None,
    holdout: list[str] | None = None,
    dataset_name: str = "AIDEN agent dataset",
    dataset_version: str = "0.2",
) -> int:
    """Re-run clean+split on existing raw.jsonl without regenerating it.

    This is the normal path after the real generator (or annotation) has
    produced raw.jsonl — the scaffold source never touches the data.
    """
    contracts = _contracts()
    holdout_categories = set(holdout or [])
    failures = 0
    for agent_id, dir_name in AGENT_DIRS.items():
        if only is not None and dir_name not in only:
            continue
        agent_dir = ML_DIR / "datasets" / dir_name
        if not (agent_dir / "raw.jsonl").exists():
            print(f"[split] {dir_name}: no raw.jsonl — skipped")
            failures += 1
            continue
        stats = prepare_agent_dir(
            agent_dir,
            schema=contracts.get(agent_id),
            holdout_categories=holdout_categories or None,
            dataset_name=dataset_name,
            dataset_version=dataset_version,
        )
        print(
            f"[split] {dir_name}: raw={stats['input']} dupes={stats['duplicates']} "
            f"invalid={stats['invalid']} -> train={stats['train']} "
            f"val={stats['val']} test={stats['test']}"
        )
    return 1 if failures else 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="prepare_datasets", description="AIDEN dataset preparation (Phases 3–4)"
    )
    parser.add_argument("--source", default="backend-scaffold")
    parser.add_argument(
        "--per-agent",
        type=int,
        default=None,
        help="scale scaffold samples per agent (default: seed 5)",
    )
    parser.add_argument(
        "--report", action="store_true", help="show existing split stats"
    )
    parser.add_argument(
        "--only",
        action="append",
        help="restrict to one dataset dir (repeatable), e.g. --only requirement",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="allow overwriting raw.jsonl even when it has more records than the scaffold",
    )
    parser.add_argument(
        "--split-only",
        action="store_true",
        help="clean+split existing raw.jsonl (never regenerates data)",
    )
    parser.add_argument(
        "--holdout",
        default=None,
        help="comma-separated categories held out of train entirely (test-set design)",
    )
    parser.add_argument("--dataset-name", default="AIDEN agent dataset")
    parser.add_argument("--dataset-version", default="0.2")
    args = parser.parse_args(argv)
    if args.report:
        return report()
    if args.split_only:
        return split_only(
            only=args.only,
            holdout=args.holdout.split(",") if args.holdout else None,
            dataset_name=args.dataset_name,
            dataset_version=args.dataset_version,
        )
    return prepare(args.source, args.per_agent, only=args.only, force=args.force)


if __name__ == "__main__":
    sys.exit(main())
