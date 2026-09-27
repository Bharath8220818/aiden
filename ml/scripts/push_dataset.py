"""Upload the AIDEN requirement dataset to the Hugging Face Dataset Hub (4.22-4.23).

Creates a dataset repo shaped exactly as HF's loaders expect:

    Bharath-k-s/AIDEN-requirement-dataset/
        README.md          <- generated dataset card (from dataset_report.json)
        train.jsonl
        validation.jsonl
        test.jsonl

Usage (training machine / Colab, where HF_TOKEN is exported):

    export HF_TOKEN=hf_...
    python ml/scripts/push_dataset.py --dataset requirement \
        --repo Bharath-k-s/AIDEN-requirement-dataset

Preflight (always, also under --dry-run):
  - train/validation/test.jsonl exist and are non-empty
  - counts match ml/datasets/<dir>/dataset_report.json
  - every record parses as JSON with agent/instruction/expected_output
"""

from __future__ import annotations

import argparse
import json
import shutil
import tempfile
from datetime import datetime, timezone
from pathlib import Path

ML_DIR = Path(__file__).resolve().parents[1]

CARD_TEMPLATE = """---
license: mit
task_categories:
- text-generation
language:
- en
tags:
- data-engineering
- synthetic
- aiden
size_categories:
- 1K<n<10K
---

# {title} (v{version})

Structured requirement-analysis examples for the AIDEN Requirement Agent (A1):
natural-language data-engineering requests mapped to normalised pipeline JSON,
including deliberate **needs_clarification** (missing/contradictory info) and
**invalid** (non-actionable) requirements.

Generated {generated_at}. Splits are deterministic (seed 42); the
`{holdout}` categories are held out of training entirely so the test set
measures generalisation to unseen scenario families.

| split | examples |
|---|---|
| train | {train} |
| validation | {validation} |
| test | {test} |

Status mix: {statuses}. Difficulty: {difficulty}.

## Record format

```json
{example}
```

## Usage

```python
from datasets import load_dataset

ds = load_dataset("{repo}")
```
"""


def _meta(rec: dict) -> dict:
    return rec.get("metadata") or rec.get("meta") or {}


def preflight(src: Path, report: dict) -> None:
    problems: list[str] = []
    counts = {
        "train": report["train"],
        "validation": report["validation"],
        "test": report["test"],
    }
    for split, expected in counts.items():
        path = src / f"{split}.jsonl"
        if not path.exists():
            problems.append(f"missing {path.name}")
            continue
        n = 0
        with path.open(encoding="utf-8") as fh:
            for line in fh:
                if not line.strip():
                    continue
                n += 1
                rec = json.loads(line)
                for key in ("agent", "instruction", "expected_output", "input"):
                    if key not in rec:
                        problems.append(f"{path.name}:{n} missing '{key}'")
                        break
        if n != expected:
            problems.append(f"{split}: {n} records, report says {expected}")
    if problems:
        raise SystemExit("[push-dataset] preflight FAILED:\n  " + "\n  ".join(problems))
    print("[push-dataset] preflight OK - counts and records verified")


def build_card(src: Path, report: dict, repo: str) -> str:
    with (src / "train.jsonl").open(encoding="utf-8") as fh:
        example = json.dumps(json.loads(fh.readline()), indent=2)[:1200]
    holdout = ", ".join(report.get("held_out_categories", []) or ["none"])
    statuses = ", ".join(
        f"{k}={v}" for k, v in sorted((report.get("statuses") or {}).items())
    )
    difficulty = ", ".join(
        f"{k}={v}" for k, v in sorted((report.get("difficulty") or {}).items())
    )
    return CARD_TEMPLATE.format(
        title=report.get("dataset", "AIDEN dataset"),
        version=report.get("version", "0.0"),
        generated_at=datetime.now(timezone.utc).date().isoformat(),
        holdout=holdout,
        train=report["train"],
        validation=report["validation"],
        test=report["test"],
        statuses=statuses or "normal only",
        difficulty=difficulty or "n/a",
        example=example,
        repo=repo,
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="push_dataset", description="Upload an AIDEN dataset to the HF Hub"
    )
    parser.add_argument(
        "--dataset", default="requirement", help="dataset dir under ml/datasets/"
    )
    parser.add_argument(
        "--repo",
        default="Bharath-k-s/AIDEN-requirement-dataset",
        help="HF dataset repo id",
    )
    parser.add_argument("--public", action="store_true", help="create a public repo")
    parser.add_argument("--dry-run", action="store_true", help="preflight + card only")
    args = parser.parse_args(argv)

    src = ML_DIR / "datasets" / args.dataset
    report_path = src / "dataset_report.json"
    if not report_path.exists():
        raise SystemExit(
            f"[push-dataset] {report_path} missing - run prepare_datasets.py first"
        )
    report = json.loads(report_path.read_text(encoding="utf-8"))

    preflight(src, report)
    card = build_card(src, report, args.repo)

    if args.dry_run:
        print("[push-dataset] dry-run card preview (first 15 lines):")
        print("\n".join(card.splitlines()[:15]))
        return 0

    try:
        from huggingface_hub import HfApi
    except ImportError:
        raise SystemExit("[push-dataset] pip install huggingface_hub (training venv)")

    with tempfile.TemporaryDirectory() as tmp:
        stage = Path(tmp) / "stage"
        stage.mkdir()
        for split in ("train", "validation", "test"):
            shutil.copy2(src / f"{split}.jsonl", stage / f"{split}.jsonl")
        (stage / "README.md").write_text(card, encoding="utf-8")

        api = HfApi()
        api.create_repo(
            args.repo, repo_type="dataset", private=not args.public, exist_ok=True
        )
        api.upload_folder(
            repo_id=args.repo,
            repo_type="dataset",
            folder_path=str(stage),
            commit_message=f"AIDEN {args.dataset} dataset v{report.get('version')}",
        )
    url = f"https://huggingface.co/datasets/{args.repo}"
    print(f"[push-dataset] uploaded -> {url}")
    print(
        '[push-dataset] verify with: python -c "from datasets import load_dataset; '
        f"print(load_dataset('{args.repo}'))\""
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
