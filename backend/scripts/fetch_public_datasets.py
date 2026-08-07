"""
Fetch public datasets for AIDEN agent fine-tuning (Phase 2 of the training
pipeline).  Downloads a public Hugging Face dataset and converts it to the
repo's instruction JSONL format:

    {"instruction": "<natural language request>", "output": "<expected output>"}

SQL/text-to-SQL datasets (sql-create-context, spider) feed the SQL and
Pipeline-Builder agents (text -> SQL / code), NOT the Intent Agent (whose
dataset is text -> pipeline JSON in data/intent_dataset*.jsonl).  Keep the two
domains separate — do not mix SQL rows into the intent dataset.

Usage:
    # SQL generation (text -> SQL) — default dataset
    python scripts/fetch_public_datasets.py --limit 500

    # Spider (text-to-SQL over multi-db schemas)
    python scripts/fetch_public_datasets.py --dataset spider --limit 200

    # Deterministic sample + custom output
    python scripts/fetch_public_datasets.py --limit 300 --seed 7 \
        --output data/public/sql_generation.jsonl

    # List supported datasets without downloading
    python scripts/fetch_public_datasets.py --list

The full dataset is downloaded once (cached by the ``datasets`` library in
~/.cache/huggingface), then a deterministic ``--limit`` sample is written.
Run it offline-safe: any download/parse failure prints a clear message and
exits non-zero without touching existing files.
"""

import argparse
import json
import os
import random
import sys
from typing import Any, Dict, List

SUPPORTED = {
    "sql-create-context": {
        "hf_id": "b-mc2/sql-create-context",
        "desc": "78K text -> SQL examples (question/context/answer)",
        "uses_context": True,
    },
    "spider": {
        "hf_id": "spider",
        "desc": "10K text-to-SQL across 200+ DB schemas (may require HF auth)",
        "uses_context": False,
    },
}


def _to_instruction_row(row: Dict[str, Any], dataset: str) -> Dict[str, Any]:
    """Convert one raw dataset row into the repo's {instruction, output} format."""
    question = (row.get("question") or "").strip()
    if dataset == "sql-create-context":
        context = (row.get("context") or "").strip()
        instruction = f"Write a SQL query that answers the following question:\n{question}"
        if context:
            instruction += f"\n\nSchema context:\n{context}"
        answer = (row.get("answer") or "").strip()
    else:  # spider
        db_id = (row.get("db_id") or "").strip()
        instruction = f"Write a SQL query for the '{db_id}' database that answers:\n{question}"
        answer = (row.get("query") or "").strip()

    return {"instruction": instruction, "output": answer}


def fetch(
    dataset: str,
    limit: int = 500,
    seed: int = 42,
    output: str = "",
) -> List[Dict[str, Any]]:
    """Download ``dataset``, sample ``limit`` rows, return instruction rows."""
    meta = SUPPORTED[dataset]
    output = output or f"data/public/{dataset.replace('/', '_')}.jsonl"

    try:
        from datasets import load_dataset  # imported lazily (heavy first call)
    except ImportError:
        print("The 'datasets' library is not installed. Run: pip install datasets")
        return []

    print(f"Downloading {meta['hf_id']} ...")
    try:
        ds = load_dataset(meta["hf_id"], split="train")
    except Exception as exc:
        print(f"Download failed: {exc}")
        if "spider" in dataset:
            print("Hint: spider requires accepting its terms on the Hub and HF_TOKEN.")
        return []

    total = len(ds)
    if total == 0:
        print("Dataset is empty.")
        return []

    # Deterministic sample without shuffling the cached dataset
    rng = random.Random(seed)
    sample_limit = min(max(limit, 0), total)
    indices = rng.sample(range(total), sample_limit)

    rows: List[Dict[str, Any]] = []
    for i, idx in enumerate(indices, start=1):
        row = ds[idx]
        try:
            rows.append(_to_instruction_row(row, dataset))
        except Exception as exc:
            print(f"Skipping row {idx}: {exc}")
        if i % 100 == 0:
            print(f"  ... {i}/{sample_limit} rows converted")

    os.makedirs(os.path.dirname(output) or ".", exist_ok=True)
    with open(output, "w", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")

    print(f"Saved {len(rows)} examples ({total} available) -> {output}")
    return rows


def parse_args(argv=None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument(
        "--dataset", "-d", default="sql-create-context",
        choices=sorted(SUPPORTED), help="Public dataset to fetch",
    )
    parser.add_argument("--limit", "-n", type=int, default=500, help="Max examples to sample")
    parser.add_argument("--seed", type=int, default=42, help="Sampling seed (deterministic)")
    parser.add_argument("--output", "-o", default="", help="Output JSONL path")
    parser.add_argument("--list", action="store_true", help="List supported datasets and exit")
    return parser.parse_args(argv)


def main(argv=None) -> int:
    if sys.platform == "win32" and hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")

    args = parse_args(argv)

    if args.list:
        for name, meta in SUPPORTED.items():
            print(f"{name:20s} {meta['desc']}  ({meta['hf_id']})")
        return 0

    rows = fetch(args.dataset, args.limit, args.seed, args.output)
    return 0 if rows else 1


if __name__ == "__main__":
    sys.exit(main())
