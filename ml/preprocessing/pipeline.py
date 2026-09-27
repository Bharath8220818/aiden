"""Phase 4 — clean & split pipeline (dataset v0.2).

    raw data → clean (dedupe + validate, rejects quarantined) → split
             → train / validation / test (+ cleaned/rejected/report)

Schema validation reuses the frozen contracts in ml/agents.json, so a
dataset can never drift away from the Phase 1 agreements.

Records whose expected_output carries a deliberate `status` field
(`needs_clarification` / `invalid`) are the ambiguity training set: they are
validated against the status contract instead of the field schema, because
their whole point is that source/destination/schedule are unknown.
"""

from __future__ import annotations

import hashlib
import json
import random
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from ml.preprocessing.records import parse_json_object

TRAIN_FRAC, VAL_FRAC = 0.8, 0.1  # test gets the remainder
DEDUPE_SEED = 42

STATUS_VALUES = {"needs_clarification", "invalid"}


def sample_key(record: dict[str, Any]) -> str:
    """Content hash for dedupe (agent + instruction + input [+ image])."""
    basis = json.dumps(
        {
            k: record.get(k)
            for k in ("agent", "instruction", "input", "image")
            if record.get(k) is not None
        },
        sort_keys=True,
        ensure_ascii=False,
    )
    return hashlib.sha256(basis.encode("utf-8")).hexdigest()


def _validate_status_record(expected: dict[str, Any]) -> list[str]:
    """Validate a deliberate needs_clarification / invalid example."""
    status = expected.get("status")
    if status not in STATUS_VALUES:
        return [f"unknown status {status!r}"]
    if status == "needs_clarification":
        missing = expected.get("missing_information")
        conflicts = expected.get("conflicts")
        missing_ok = isinstance(missing, list) and bool(missing)
        conflicts_ok = isinstance(conflicts, list) and bool(conflicts)
        if not missing_ok and not conflicts_ok:
            return ["needs_clarification requires non-empty missing_information"]
        if missing is not None and not isinstance(missing, list):
            return ["missing_information must be a list"]
        if conflicts is not None and not isinstance(conflicts, list):
            return ["conflicts must be a list"]
    elif status == "invalid":
        if not expected.get("reason") or not isinstance(expected.get("reason"), str):
            return ["invalid requires a non-empty reason string"]
    return []


def validate_record(record: dict[str, Any], schema: dict[str, Any] | None) -> list[str]:
    """Return a list of problems (empty = valid)."""
    errors: list[str] = []
    if not record.get("instruction"):
        errors.append("missing instruction")
    if not record.get("input"):
        errors.append("missing input")
    expected = parse_json_object(record.get("expected_output"))
    if expected is None:
        errors.append("expected_output is not a JSON object")
        return errors
    if "status" in expected:
        return errors + _validate_status_record(expected)
    if schema:
        for req in schema.get("required", []):
            if req not in expected:
                errors.append(f"expected_output missing '{req}'")
    return errors


def clean(
    records: list[dict[str, Any]],
    *,
    schema: dict[str, Any] | None = None,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], dict[str, int]]:
    """Dedupe + validate. Returns (clean, rejected, stats).

    Rejected records keep their original order; the rejection reason is
    attached under `rejection` for the quarantine file.
    """
    seen: set[str] = set()
    clean_records: list[dict[str, Any]] = []
    rejected: list[dict[str, Any]] = []
    stats = {"input": len(records), "duplicates": 0, "invalid": 0}

    for record in records:
        key = sample_key(record)
        if key in seen:
            stats["duplicates"] += 1
            rejected.append({**record, "rejection": "duplicate"})
            continue
        seen.add(key)
        problems = validate_record(record, schema)
        if problems:
            stats["invalid"] += 1
            rejected.append({**record, "rejection": "; ".join(problems)})
            continue
        clean_records.append(record)

    stats["clean"] = len(clean_records)
    return clean_records, rejected, stats


def split(
    records: list[dict[str, Any]],
    *,
    seed: int = DEDUPE_SEED,
    holdout_categories: set[str] | None = None,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    """Deterministic 80/10/10 split.

    `holdout_categories` (test-set design, spec 4.17): every record from
    these categories is held out entirely — train never sees them — so test
    measures generalisation to unseen scenario *families*, not rewordings.
    """

    def _cat(r: dict[str, Any]) -> str:
        return (
            (r.get("metadata") or {}).get("category")
            or (r.get("meta") or {}).get("category")
            or ""
        )

    holdout = [
        r for r in records if holdout_categories and _cat(r) in holdout_categories
    ]
    holdout_ids = {id(r) for r in holdout}
    pool = [r for r in records if id(r) not in holdout_ids]

    rng = random.Random(seed)
    rng.shuffle(pool)
    n = len(pool)
    n_train = int(n * TRAIN_FRAC)
    n_val = int(n * VAL_FRAC)
    train = pool[:n_train]
    val = pool[n_train : n_train + n_val]

    # Keep the deterministic order: holdout records follow their raw order.
    return train, val, pool[n_train + n_val :] + holdout


def clean_and_split(
    records: list[dict[str, Any]],
    *,
    schema: dict[str, Any] | None = None,
    seed: int = DEDUPE_SEED,
    holdout_categories: set[str] | None = None,
) -> tuple[
    list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]], dict[str, Any]
]:
    """Convenience wrapper: clean then split. Returns (train, val, test, stats)."""
    clean_records, _rejected, stats = clean(records, schema=schema)
    train, val, test = split(
        clean_records, seed=seed, holdout_categories=holdout_categories
    )
    stats.update(
        {
            "unique": len(clean_records),
            "train": len(train),
            "val": len(val),
            "test": len(test),
        }
    )
    return train, val, test, stats


def write_jsonl(path: Path, records: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as fh:
        for record in records:
            fh.write(json.dumps(record, ensure_ascii=False) + "\n")


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    return records


def build_report(
    *,
    dataset: str,
    version: str,
    raw: list[dict[str, Any]],
    clean_records: list[dict[str, Any]],
    rejected: list[dict[str, Any]],
    train: list[dict[str, Any]],
    val: list[dict[str, Any]],
    test: list[dict[str, Any]],
    holdout_categories: set[str] | None = None,
) -> dict[str, Any]:
    """Dataset report (spec 4.18): counts, categories, difficulty, statuses."""
    meta = lambda r: r.get("metadata") or r.get("meta") or {}
    categories = Counter(meta(r).get("category", "unknown") for r in clean_records)
    difficulty = Counter(meta(r).get("difficulty", "unknown") for r in clean_records)
    statuses = Counter(
        "normal"
        if "status" not in r.get("expected_output", {})
        else r["expected_output"]["status"]
        for r in clean_records
    )
    rejection_reasons = Counter(
        (r.get("rejection") or "unknown").split(";")[0] for r in rejected
    )
    report = {
        "dataset": dataset,
        "version": version,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "splits": {
            "train": "train.jsonl",
            "validation": "validation.jsonl",
            "test": "test.jsonl",
        },
        "total_raw": len(raw),
        "total_cleaned": len(clean_records),
        "train": len(train),
        "validation": len(val),
        "test": len(test),
        "rejected": len(rejected),
        "rejected_reasons": dict(rejection_reasons),
        "categories": dict(sorted(categories.items())),
        "difficulty": dict(sorted(difficulty.items())),
        "statuses": dict(sorted(statuses.items())),
    }
    if holdout_categories:
        report["held_out_categories"] = sorted(holdout_categories)
    return report


def prepare_agent_dir(
    agent_dir: Path,
    *,
    schema: dict[str, Any] | None = None,
    seed: int = DEDUPE_SEED,
    holdout_categories: set[str] | None = None,
    dataset_name: str = "AIDEN agent dataset",
    dataset_version: str = "0.2",
) -> dict[str, Any]:
    """Clean + split one agent directory in place.

    `raw.jsonl` → cleaned / rejected / train / validation / test jsonl +
    dataset_report.json.
    """
    raw_path = agent_dir / "raw.jsonl"
    if not raw_path.exists():
        return {"skipped": 1}
    raw = load_jsonl(raw_path)
    clean_records, rejected, stats = clean(raw, schema=schema)
    train, val, test = split(
        clean_records, seed=seed, holdout_categories=holdout_categories
    )
    stats.update(
        {
            "unique": len(clean_records),
            "train": len(train),
            "val": len(val),
            "test": len(test),
        }
    )
    write_jsonl(agent_dir / "cleaned.jsonl", clean_records)
    write_jsonl(agent_dir / "rejected.jsonl", rejected)
    write_jsonl(agent_dir / "train.jsonl", train)
    write_jsonl(agent_dir / "validation.jsonl", val)
    write_jsonl(agent_dir / "test.jsonl", test)
    report = build_report(
        dataset=dataset_name,
        version=dataset_version,
        raw=raw,
        clean_records=clean_records,
        rejected=rejected,
        train=train,
        val=val,
        test=test,
        holdout_categories=holdout_categories,
    )
    (agent_dir / "dataset_report.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    (agent_dir / "stats.json").write_text(json.dumps(stats, indent=2), encoding="utf-8")
    return stats
