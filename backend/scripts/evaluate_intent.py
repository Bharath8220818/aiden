"""
Evaluate the Intent Agent's accuracy against labeled JSONL data.

Measures per-field accuracy (source_type, destination_type, schedule,
transformations, data_quality_rules) plus JSON validity and end-to-end
"fully correct" rate. Run before fine-tuning to get a baseline, then after
to quantify the improvement (see docs/INTENT_AGENT_FINETUNING.md).

Usage:
    # Baseline — deterministic rule-based parser (no model, fast, no network)
    python scripts/evaluate_intent.py --data data/intent_dataset.jsonl --mode rules

    # After fine-tuning — drive the HF pipeline with a LoRA adapter
    python scripts/evaluate_intent.py --data data/intent_test.jsonl --mode llm
    python scripts/evaluate_intent.py --data data/intent_test.jsonl --mode ollama

    # Limit to the first N examples (fast smoke runs)
    python scripts/evaluate_intent.py --data data/intent_dataset.jsonl --mode rules --limit 50
"""

import argparse
import asyncio
import json
import logging
import os
import sys
from collections import Counter
from typing import Any, Dict, List, Optional

# Make ``app`` importable when running as ``scripts/evaluate_intent.py``
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_BACKEND_ROOT = os.path.dirname(_SCRIPT_DIR)
if _BACKEND_ROOT not in sys.path:
    sys.path.insert(0, _BACKEND_ROOT)

logger = logging.getLogger(__name__)

# Fields compared loosely (normalized) and the same compared as sets.
LOOSE_FIELDS = ["source_type", "destination_type", "schedule"]
SET_FIELDS = ["transformations", "data_quality_rules"]


def _norm(value: Any) -> str:
    """Normalize a value for loose comparison (lowercase, stripped)."""
    if value is None:
        return ""
    return str(value).strip().lower()


def _norm_set(value: Any) -> List[str]:
    """Normalize a list field into a sorted list of lowercase strings."""
    if not isinstance(value, list):
        return []
    return sorted({_norm(v) for v in value if _norm(v)})


def _expected_output(entry: Dict[str, Any]) -> Dict[str, Any]:
    """Extract the expected pipeline config from a dataset entry.

    Supports both the project's ``{"instruction", "output"}`` JSONL format
    (output is a JSON *string*) and a flattened ``{"input", ...}`` format.
    """
    raw = entry.get("output")
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return {}
    # Flattened single-line format: the entry itself is the config
    if "source_type" in entry:
        return entry
    return {}


def _eval_field(name: str, got: Any, expected: Any, is_set: bool = False) -> bool:
    if is_set:
        return _norm_set(got) == _norm_set(expected)
    return _norm(got) == _norm(expected)


def evaluate(entries: List[Dict[str, Any]], mode: str, parser: Any) -> Dict[str, Any]:
    """Run the parser over entries and aggregate accuracy metrics."""
    totals = Counter()
    correct = Counter()
    json_valid = 0
    fully_correct = 0
    failed = 0
    samples: List[Dict[str, Any]] = []

    for idx, entry in enumerate(entries):
        prompt = entry.get("instruction") or entry.get("input") or entry.get("prompt", "")
        expected = _expected_output(entry)
        if not prompt or not expected:
            continue

        got: Dict[str, Any] = {}
        try:
            if mode == "rules":
                got = parser._rule_based_parse(prompt)
            else:
                got = asyncio.run(parser.parse(prompt)) or {}
        except Exception as exc:  # noqa: BLE001 — report, don't abort the run
            logger.warning("Example %d failed: %s", idx, exc)
            failed += 1
            continue

        # JSON validity: the HF/Ollama path returns a dict by construction, so
        # validity is always true there; rules mode always returns a dict too.
        if isinstance(got, dict):
            json_valid += 1

        per_field = {}
        all_ok = True
        for field in LOOSE_FIELDS:
            ok = _eval_field(field, got.get(field), expected.get(field))
            totals[field] += 1
            correct[field] += 1 if ok else 0
            per_field[field] = ok
            all_ok = all_ok and ok
        for field in SET_FIELDS:
            ok = _eval_field(field, got.get(field), expected.get(field), is_set=True)
            totals[field] += 1
            correct[field] += 1 if ok else 0
            per_field[field] = ok
            all_ok = all_ok and ok

        if all_ok:
            fully_correct += 1

        if len(samples) < 5:
            samples.append(
                {
                    "prompt": prompt[:70],
                    "expected_source": expected.get("source_type"),
                    "got_source": got.get("source_type"),
                    "fields": per_field,
                }
            )

    n = sum(1 for e in entries if (e.get("instruction") or e.get("input") or e.get("prompt")))
    results: Dict[str, Any] = {
        "mode": mode,
        "examples": n,
        "json_valid": json_valid,
        "json_valid_rate": (json_valid / n) if n else 0.0,
        "fully_correct": fully_correct,
        "fully_correct_rate": (fully_correct / n) if n else 0.0,
        "failed": failed,
        "field_accuracy": {},
        "samples": samples,
    }
    for field in LOOSE_FIELDS + SET_FIELDS:
        t = totals[field]
        results["field_accuracy"][field] = {
            "correct": correct[field],
            "total": t,
            "accuracy": (correct[field] / t) if t else 0.0,
        }
    return results


def print_report(results: Dict[str, Any]) -> None:
    print("\n" + "=" * 60)
    print(f"Intent Agent Evaluation — mode: {results['mode']}")
    print("=" * 60)
    print(f"Examples:          {results['examples']}")
    print(f"JSON validity:     {results['json_valid']}/{results['examples']} "
          f"({results['json_valid_rate'] * 100:.1f}%)")
    print(f"Fully correct:     {results['fully_correct']}/{results['examples']} "
          f"({results['fully_correct_rate'] * 100:.1f}%)")
    print(f"Failed:            {results['failed']}")
    print("-" * 60)
    print(f"{'Field':<22}{'Correct':>10}{'Total':>8}{'Accuracy':>12}")
    for field, stats in results["field_accuracy"].items():
        print(
            f"{field:<22}{stats['correct']:>10}{stats['total']:>8}"
            f"{stats['accuracy'] * 100:>10.1f}%"
        )
    print("-" * 60)
    if results.get("samples"):
        print("Sample checks (first 5):")
        for s in results["samples"]:
            src_ok = "OK" if s["fields"].get("source_type") else "--"
            dst_ok = "OK" if s["fields"].get("destination_type") else "--"
            print(f"  [{src_ok} src {dst_ok} dst] {s['prompt']}  "
                  f"(expected {s['expected_source']} -> got {s['got_source']})")


def load_entries(data_path: str) -> List[Dict[str, Any]]:
    entries: List[Dict[str, Any]] = []
    with open(data_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                entries.append(json.loads(line))
            except json.JSONDecodeError as exc:
                logger.warning("Skipping malformed line: %s", exc)
    return entries


def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Evaluate the Intent Agent accuracy")
    parser.add_argument(
        "--data",
        default="data/intent_dataset.jsonl",
        help="Labeled JSONL dataset (instruction/output format)",
    )
    parser.add_argument(
        "--mode",
        choices=["rules", "llm", "ollama"],
        default="rules",
        help="rules = deterministic fallback (baseline); llm = HF pipeline; ollama = local LLM",
    )
    parser.add_argument("--limit", type=int, default=None, help="Only evaluate the first N examples")
    return parser.parse_args(argv)


def main() -> int:
    # Windows terminals default to cp1252 which cannot print ✓/→; normalize so
    # the report renders everywhere.
    if sys.platform == "win32" and hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")

    logging.basicConfig(level=logging.WARNING, format="%(message)s")
    args = parse_args()

    if not os.path.exists(args.data):
        print(f"Dataset not found: {args.data}")
        return 1

    entries = load_entries(args.data)
    if args.limit:
        entries = entries[: args.limit]
    print(f"Loaded {len(entries)} labeled examples from {args.data}")

    if args.mode == "rules":
        from app.core.intent_parser import IntentParser

        parser = IntentParser()
        results = evaluate(entries, "rules", parser)
    else:
        from app.core.intent_parser import IntentParser

        parser = IntentParser()
        # Disable the sibling path so we measure exactly the requested mode.
        parser._use_ollama = args.mode == "ollama"
        parser._use_llm = args.mode == "llm"
        results = evaluate(entries, args.mode, parser)

    print_report(results)
    return 0


if __name__ == "__main__":
    sys.exit(main())
