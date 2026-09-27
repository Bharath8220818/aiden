"""AIDEN A1 Requirement Agent — SFT trainer (Phase 5, step 6/7).

Runs on a GPU machine (Colab / local CUDA), NOT the backend venv:

    pip install -r ml/requirements-ml.txt   # + torch per pytorch.org

    # local dataset (default):
    python ml/training/train_requirement.py

    # or straight from the HF Hub after push_dataset.py:
    python ml/training/train_requirement.py \
        --hf-dataset Bharath-k-s/AIDEN-requirement-dataset

    # quick smoke run (~minutes, proves load->train->save->reload):
    python ml/training/train_requirement.py --smoke

Reads hyperparameters from ml/training/configs/requirement_analysis.json
(single source of truth, matches the frozen contract), renders the chat
samples with the same renderer the eval pipeline uses, trains a LoRA adapter
via TRL SFTTrainer + PEFT, saves it under ml/models/requirement/, and runs
the 5.9 acceptance self-test (adapter reloads, emits valid contract JSON).
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ML_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = ML_DIR.parent
sys.path.insert(0, str(REPO_ROOT))

CONFIG_PATH = ML_DIR / "training" / "configs" / "requirement_analysis.json"
OUTPUT_DIR = ML_DIR / "models" / "requirement"

SYSTEM_PROMPT = (
    "You are the AIDEN Requirement Analysis Agent. Convert data-engineering "
    "requirements into valid JSON matching the A1 contract "
    "(source, destination, schedule, transformations, monitoring, "
    "failure_notification). If required information is missing or contradictory "
    'return {"status": "needs_clarification", ...}; if no pipeline can be '
    'defined return {"status": "invalid", "reason": ...}. Answer with JSON only.'
)


def load_config() -> dict[str, Any]:
    return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))


def load_records(cfg: dict[str, Any], hf_dataset: str | None) -> dict[str, list[dict]]:
    """train/validation records from the Hub or local files (same format)."""
    if hf_dataset:
        from datasets import load_dataset

        ds = load_dataset(hf_dataset)
        return {
            "train": list(ds["train"]),
            "validation": list(ds["validation"]),
            "test": list(ds["test"]) if "test" in ds else [],
        }
    from ml.preprocessing.pipeline import load_jsonl

    data = cfg["data"]
    root = ML_DIR.parent
    return {
        "train": load_jsonl(root / data["train"]),
        "validation": load_jsonl(root / data["val"]),
        "test": load_jsonl(root / data["test"]) if data.get("test") else [],
    }


def to_chat_rows(records: list[dict], *, system_prompt: str) -> list[dict]:
    """Render A1 records into TRL conversational format (spec 5.3)."""
    from ml.training.lora_finetune import render_sample

    rows: list[dict] = []
    for rec in records:
        sample = render_sample(rec)
        rows.append(
            {
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": sample["input"]},
                    {"role": "assistant", "content": sample["output"]},
                ]
            }
        )
    return rows


def train(*, hf_dataset: str | None = None, smoke: bool = False) -> dict[str, Any]:
    import torch
    from datasets import Dataset
    from peft import LoraConfig
    from transformers import AutoModelForCausalLM, AutoTokenizer
    from trl import SFTConfig, SFTTrainer

    cfg = load_config()
    base_model = cfg["base_model"]
    lora_cfg = cfg["lora"]
    train_cfg = cfg["train"]

    records = load_records(cfg, hf_dataset)
    chat_train = to_chat_rows(records["train"], system_prompt=SYSTEM_PROMPT)
    chat_val = to_chat_rows(records["validation"], system_prompt=SYSTEM_PROMPT)
    if smoke:
        chat_train, chat_val = chat_train[:16], chat_val[:4]
        epochs, max_steps = 1, 2
    else:
        epochs, max_steps = train_cfg["epochs"], -1

    print(
        f"[train] base={base_model} train={len(chat_train)} val={len(chat_val)} "
        f"smoke={smoke}"
    )
    tokenizer = AutoTokenizer.from_pretrained(base_model)
    model = AutoModelForCausalLM.from_pretrained(
        base_model,
        torch_dtype=torch.bfloat16 if torch.cuda.is_available() else torch.float32,
        device_map="auto",
        attn_implementation="sdpa",
    )

    peft_config = LoraConfig(
        r=lora_cfg["r"],
        lora_alpha=lora_cfg["alpha"],
        lora_dropout=lora_cfg["dropout"],
        bias=lora_cfg.get("bias", "none"),
        task_type=lora_cfg.get("task_type", "CAUSAL_LM"),
        target_modules=lora_cfg["target_modules"],
    )
    sft_args = SFTConfig(
        output_dir=str(OUTPUT_DIR),
        num_train_epochs=epochs,
        max_steps=max_steps,
        learning_rate=train_cfg["learning_rate"],
        per_device_train_batch_size=train_cfg["batch_size"],
        gradient_accumulation_steps=train_cfg["gradient_accumulation_steps"],
        warmup_ratio=train_cfg.get("warmup_ratio", 0.03),
        lr_scheduler_type=train_cfg.get("lr_scheduler", "cosine"),
        logging_steps=10 if not smoke else 1,
        eval_strategy="steps" if not smoke else "no",
        eval_steps=50,
        save_strategy="no" if smoke else "epoch",
        bf16=torch.cuda.is_available(),
        gradient_checkpointing=train_cfg.get("gradient_checkpointing", True),
        seed=train_cfg.get("seed", 42),
        report_to=[],
    )
    trainer = SFTTrainer(
        model=model,
        args=sft_args,
        train_dataset=Dataset.from_list(chat_train),
        eval_dataset=Dataset.from_list(chat_val) if not smoke else None,
        peft_config=peft_config,
    )
    trainer.train()
    trainer.save_model(str(OUTPUT_DIR))
    tokenizer.save_pretrained(str(OUTPUT_DIR))
    print(f"[train] adapter saved -> {OUTPUT_DIR}")
    return {"base_model": base_model, "output_dir": str(OUTPUT_DIR), "smoke": smoke}


def acceptance_self_test(output_dir: Path) -> dict[str, Any]:
    """5.9 checkpoint, automated: reload adapter, generate, validate JSON."""
    import json as _json
    import re

    import torch
    from peft import PeftModel
    from transformers import AutoModelForCausalLM, AutoTokenizer

    cfg = load_config()
    base_model = cfg["base_model"]
    tokenizer = AutoTokenizer.from_pretrained(base_model)
    model = AutoModelForCausalLM.from_pretrained(
        base_model, torch_dtype="auto", device_map="auto"
    )
    model = PeftModel.from_pretrained(model, str(output_dir))
    model.eval()

    probes = {
        "normal": "Load CSV files into PostgreSQL every day and remove duplicates.",
        "ambiguous": "Move customer data to the warehouse regularly.",
    }
    results: dict[str, Any] = {"probes": {}, "adapter_reloads": True}
    required = {"source", "destination", "schedule"}
    all_ok = True
    for name, text in probes.items():
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": text},
        ]
        prompt = tokenizer.apply_chat_template(
            messages, tokenize=False, add_generation_prompt=True
        )
        inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
        with torch.no_grad():
            out = model.generate(**inputs, max_new_tokens=256, do_sample=False)
        raw = tokenizer.decode(
            out[0][inputs["input_ids"].shape[1] :], skip_special_tokens=True
        )
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        ok = False
        parsed: Any = None
        if match:
            try:
                parsed = _json.loads(match.group(0))
                ok = isinstance(parsed, dict) and (
                    "status" in parsed or required.issubset(parsed)
                )
            except _json.JSONDecodeError:
                ok = False
        results["probes"][name] = {"ok": ok, "output": raw[:300]}
        all_ok = all_ok and ok
    results["accepted"] = all_ok
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    path = ML_DIR / "experiments" / f"acceptance_selftest_{stamp}.json"
    path.write_text(_json.dumps(results, indent=2), encoding="utf-8")
    print(f"[self-test] accepted={all_ok} -> {path}")
    return results


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="train_requirement", description="AIDEN A1 SFT trainer (GPU machine)"
    )
    parser.add_argument(
        "--hf-dataset",
        default=None,
        help="load train/validation from an HF dataset repo instead of local files",
    )
    parser.add_argument(
        "--smoke",
        action="store_true",
        help="tiny run: proves load->train->save->reload end to end in minutes",
    )
    parser.add_argument(
        "--self-test",
        action="store_true",
        help="skip training; run the 5.9 acceptance test on the saved adapter",
    )
    args = parser.parse_args(argv)

    if args.self_test:
        result = acceptance_self_test(OUTPUT_DIR)
        return 0 if result["accepted"] else 1
    info = train(hf_dataset=args.hf_dataset, smoke=args.smoke)
    result = acceptance_self_test(OUTPUT_DIR)
    info["self_test"] = result["accepted"]
    print(json.dumps(info, indent=2, ensure_ascii=False))
    return 0 if result["accepted"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
