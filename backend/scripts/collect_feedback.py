"""
Collect user feedback on intent parsing into a re-training dataset.

Every time a user corrects the intent agent's output, append the correction
to ``data/feedback_dataset.jsonl``. Periodically merge it with the base
dataset and re-train (Phase 8 of the fine-tuning workflow):

    python scripts/collect_feedback.py add --input "Build a daily sales ETL from PostgreSQL to Snowflake" \\
        --original '{"source_type": "postgresql"}' \
        --output '{"source_type": "postgres"}'  # the corrected JSON

    # Merge base + feedback for re-training
    python scripts/collect_feedback.py merge --base data/intent_dataset.jsonl \\
        --feedback data/feedback_dataset.jsonl --out data/intent_dataset_v2.jsonl
"""

import argparse
import json
import logging
import os
import sys
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

DEFAULT_FEEDBACK_PATH = "data/feedback_dataset.jsonl"


def add_entry(
    user_input: str,
    model_output: str,
    user_correction: str,
    feedback_path: str = DEFAULT_FEEDBACK_PATH,
) -> None:
    """Append a feedback entry to the JSONL feedback dataset."""
    entry: Dict[str, Any] = {
        "instruction": "Extract the pipeline requirements from the user request.",
        "input": user_input,
        "output": user_correction,
        "original_output": model_output,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    os.makedirs(os.path.dirname(feedback_path) or ".", exist_ok=True)
    with open(feedback_path, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")

    print(f"✅ Feedback appended to {feedback_path}")


def merge_datasets(
    base_path: str,
    feedback_path: str = DEFAULT_FEEDBACK_PATH,
    out_path: str = "data/intent_dataset_v2.jsonl",
) -> int:
    """Combine base + feedback datasets (feedback wins on duplicate inputs)."""
    if not os.path.exists(base_path):
        print(f"❌ Base dataset not found: {base_path}")
        return 1

    merged: Dict[str, Dict[str, Any]] = {}

    for path in (base_path, feedback_path):
        if not os.path.exists(path):
            print(f"⚠️  Skipping missing dataset: {path}")
            continue
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    entry = json.loads(line)
                except json.JSONDecodeError:
                    continue
                # Dedupe key: the natural-language prompt (input). Using
                # ``instruction`` first would collapse every feedback entry to
                # one key — they all share the fixed instruction string.
                key = entry.get("input") or entry.get("instruction") or json.dumps(entry, sort_keys=True)
                merged[key] = entry  # later files (feedback) overwrite base

    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        for entry in merged.values():
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")

    print(f"💾 Merged {len(merged)} unique examples -> {out_path}")
    return 0


def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Collect intent-agent feedback for re-training")
    sub = parser.add_subparsers(dest="command", required=True)

    add_p = sub.add_parser("add", help="Append a corrected example to the feedback dataset")
    add_p.add_argument("--input", required=True, help="The original natural-language request")
    add_p.add_argument("--output", required=True, help="The user's corrected structured output (JSON string)")
    add_p.add_argument("--original", default="", help="The model's original (wrong) output, for diffing")
    add_p.add_argument("--feedback", default=DEFAULT_FEEDBACK_PATH, help="Feedback dataset path")

    merge_p = sub.add_parser("merge", help="Merge base + feedback datasets for re-training")
    merge_p.add_argument("--base", required=True, help="Base dataset (e.g. data/intent_dataset.jsonl)")
    merge_p.add_argument("--feedback", default=DEFAULT_FEEDBACK_PATH, help="Feedback dataset path")
    merge_p.add_argument("--out", default="data/intent_dataset_v2.jsonl", help="Merged output path")

    return parser.parse_args(argv)


def main(argv: Optional[List[str]] = None) -> int:
    # Windows terminals default to cp1252 which cannot print ✅/❌/💾.
    if sys.platform == "win32" and hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")

    logging.basicConfig(level=logging.INFO)
    args = parse_args(argv)

    if args.command == "add":
        # Validate the correction is parseable JSON
        try:
            json.loads(args.output)
        except json.JSONDecodeError as exc:
            print(f"❌ --output is not valid JSON: {exc}")
            return 1
        add_entry(args.input, args.original, args.output, args.feedback)
        return 0

    if args.command == "merge":
        return merge_datasets(args.base, args.feedback, args.out)

    return 1


if __name__ == "__main__":
    sys.exit(main())
