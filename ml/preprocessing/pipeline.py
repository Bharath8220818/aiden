"""Phase 4 — clean & split pipeline.

    raw data → dedupe → bad-sample removal → JSON/schema validation
             → 80/10/10 train/val/test split (deterministic, no leakage)

Schema validation reuses the frozen contracts in ml/agents.json, so a
dataset can never drift away from the Phase 1 agreements.
"""

from __future__ import annotations

import hashlib
import json
import random
from pathlib import Path
from typing import Any

from ml.preprocessing.records import parse_json_object

TRAIN_FRAC, VAL_FRAC = 0.8, 0.1  # test gets the remainder
DEDUPE_SEED = 42


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
    if schema:
        for req in schema.get("required", []):
            if req not in expected:
                errors.append(f"expected_output missing '{req}'")
    return errors


def clean_and_split(
    records: list[dict[str, Any]],
    *,
    schema: dict[str, Any] | None = None,
    seed: int = DEDUPE_SEED,
) -> tuple[
    list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]], dict[str, int]
]:
    """Dedupe + validate + split. Returns (train, val, test, stats).

    The split is deterministic under `seed` and shuffles BEFORE splitting so
    near-duplicate themes can't cluster into one bucket (no leakage).
    """
    seen: set[str] = set()
    unique: list[dict[str, Any]] = []
    stats = {"input": len(records), "duplicates": 0, "invalid": 0}

    for record in records:
        key = sample_key(record)
        if key in seen:
            stats["duplicates"] += 1
            continue
        seen.add(key)
        if validate_record(record, schema):
            stats["invalid"] += 1
            continue
        unique.append(record)

    rng = random.Random(seed)
    shuffled = unique[:]
    rng.shuffle(shuffled)

    n = len(shuffled)
    n_train = int(n * TRAIN_FRAC)
    n_val = int(n * VAL_FRAC)
    train = shuffled[:n_train]
    val = shuffled[n_train : n_train + n_val]
    test = shuffled[n_train + n_val :]
    stats.update(
        {"unique": len(unique), "train": len(train), "val": len(val), "test": len(test)}
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


def prepare_agent_dir(
    agent_dir: Path,
    *,
    schema: dict[str, Any] | None = None,
    seed: int = DEDUPE_SEED,
) -> dict[str, int]:
    """Clean + split one agent directory in place:
    `raw.jsonl` → `train.jsonl` / `val.jsonl` / `test.jsonl` (+ stats.json)."""
    raw_path = agent_dir / "raw.jsonl"
    if not raw_path.exists():
        return {"skipped": 1}
    records = load_jsonl(raw_path)
    train, val, test, stats = clean_and_split(records, schema=schema, seed=seed)
    write_jsonl(agent_dir / "train.jsonl", train)
    write_jsonl(agent_dir / "val.jsonl", val)
    write_jsonl(agent_dir / "test.jsonl", test)
    (agent_dir / "stats.json").write_text(json.dumps(stats, indent=2), encoding="utf-8")
    return stats
