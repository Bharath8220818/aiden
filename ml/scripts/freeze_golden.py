"""Freeze the golden evaluation set (Phase 7 prerequisite).

Copies an agent's current test split to ml/evaluation/golden/<agent>.jsonl
and records a manifest (counts + sha256) so every future baseline /
fine-tuned evaluation is measured against byte-identical examples:

    python ml/scripts/freeze_golden.py --agent requirement_analysis

Refuses to overwrite an existing golden set unless --force is passed.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

ML_DIR = Path(__file__).resolve().parents[1]
GOLDEN_DIR = ML_DIR / "evaluation" / "golden"


def sha256_of(path: Path) -> str:
    h = hashlib.sha256()
    h.update(path.read_bytes())
    return h.hexdigest()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="freeze_golden")
    parser.add_argument("--agent", required=True, help="dataset dir, e.g. requirement")
    parser.add_argument(
        "--split",
        default="test",
        choices=["test", "val"],
        help="which split to freeze (default: test)",
    )
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args(argv)

    src = ML_DIR / "datasets" / args.agent / f"{args.split}.jsonl"
    if not src.exists():
        raise SystemExit(f"[golden] missing source split {src}")

    GOLDEN_DIR.mkdir(parents=True, exist_ok=True)
    dst = GOLDEN_DIR / f"{args.agent}.jsonl"
    manifest_path = GOLDEN_DIR / f"{args.agent}.manifest.json"

    if dst.exists() and not args.force:
        with open(dst, encoding="utf-8") as f:
            n_existing = sum(1 for _ in f)
        raise SystemExit(
            f"[golden] {dst} already exists ({n_existing} examples) - "
            "pass --force only if the contract/baseline ALSO resets"
        )

    dst.write_bytes(src.read_bytes())
    with open(dst, encoding="utf-8") as f:
        n = sum(1 for _ in f)
    manifest = {
        "agent": args.agent,
        "frozen_at": datetime.now(timezone.utc).isoformat(),
        "source_split": f"ml/datasets/{args.agent}/{args.split}.jsonl",
        "source_sha256": sha256_of(src),
        "golden_sha256": sha256_of(dst),
        "n_examples": n,
    }
    manifest_path.write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(f"[golden] frozen {n} examples -> {dst}")
    print(f"[golden] manifest -> {manifest_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
