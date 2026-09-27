"""Phase 6+ — LoRA / QLoRA fine-tuning for one AIDEN agent.

Usage (training venv, NOT the backend venv):

    python ml/training/lora_finetune.py --agent requirement_analysis \
        --base Qwen/Qwen3-8B --epochs 3 --qlora

What it does:
1. loads the agent's train/val JSONL from ml/datasets/<dir>/,
2. renders chat-format samples (instruction + input → expected_output JSON),
3. attaches a LoRA adapter (hyper-params from the agent contract) and runs
   SFT via trl,
4. saves the adapter to ml/adapters/<agent>/ and marks it trained via
   ml/training/adapter_registry.py.

Heavy deps (torch/peft/trl) are imported lazily so the backend and CI never
need them; `--dry-run` validates data + config without loading a model.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

ML_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = ML_DIR.parent
sys.path.insert(0, str(ML_DIR.parent))

from ml.preprocessing.pipeline import load_jsonl
from ml.preprocessing.records import AGENT_DIRS
from ml.training.adapter_registry import AdapterRegistry


def load_contract(agent_id: str) -> dict[str, Any]:
    with (ML_DIR / "agents.json").open("r", encoding="utf-8") as fh:
        contracts = json.load(fh)
    for agent in contracts["agents"]:
        if agent["backend_agent"] == agent_id:
            return agent
    raise KeyError(f"no contract for agent {agent_id}")


def render_sample(record: dict[str, Any]) -> dict[str, str]:
    """Chat-format training sample: one instruction turn, JSON answer."""
    payload = {
        k: v for k, v in record.items() if k not in {"agent", "instruction", "metadata"}
    }
    answer = json.dumps(record.get("expected_output"), ensure_ascii=False)
    extra = {k: v for k, v in payload.items() if k not in {"input", "expected_output"}}
    user = str(record.get("input", ""))
    if extra:
        user = f"{user}\n\nContext: {json.dumps(extra, ensure_ascii=False)}"
    return {
        "instruction": str(record.get("instruction", "")),
        "input": user,
        "output": answer,
    }


def build_dataset(agent_id: str, split: str = "train") -> list[dict[str, str]]:
    agent_dir = ML_DIR / "datasets" / AGENT_DIRS[agent_id]
    path = agent_dir / f"{split}.jsonl"
    if not path.exists() and split == "val":
        path = agent_dir / "validation.jsonl"  # HF-conventional name (dataset v0.2)
    if not path.exists():
        raise FileNotFoundError(
            f"{path} missing — run ml/scripts/prepare_datasets.py first"
        )
    return [render_sample(rec) for rec in load_jsonl(path)]


def train(
    agent_id: str,
    *,
    base_model: str,
    epochs: int,
    qlora: bool,
    learning_rate: float,
    batch_size: int,
    output_dir: Path | None = None,
) -> Path:
    """Real SFT run. Requires torch/peft/trl in the active venv."""
    try:
        import torch
        from datasets import Dataset
        from peft import LoraConfig
        from transformers import AutoModelForCausalLM, AutoTokenizer
        from trl import SFTConfig, SFTTrainer
    except ImportError as exc:  # pragma: no cover - requires training venv
        raise RuntimeError(
            "Training deps missing. Create a separate venv and run: "
            "pip install -r ml/requirements-ml.txt (plus a torch wheel for your platform)."
        ) from exc

    contract = load_contract(agent_id)
    adapter_name = contract["adapter"]
    registry = AdapterRegistry()
    spec = registry.get(adapter_name)

    rows = build_dataset(agent_id)
    train_ds = Dataset.from_list(rows)

    quant_config = None
    if qlora:
        from transformers import BitsAndBytesConfig

        quant_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.bfloat16,
        )

    tokenizer = AutoTokenizer.from_pretrained(base_model)
    model = AutoModelForCausalLM.from_pretrained(
        base_model,
        quantization_config=quant_config,
        device_map="auto",
    )

    lora = LoraConfig(
        r=spec["rank"],
        lora_alpha=spec["alpha"],
        lora_dropout=spec.get("dropout", 0.05),
        target_modules=list(spec["target_modules"]),
        task_type="CAUSAL_LM",
    )

    out = output_dir or (ML_DIR / "adapters" / agent_id)
    config = SFTConfig(
        output_dir=str(out),
        num_train_epochs=epochs,
        per_device_train_batch_size=batch_size,
        learning_rate=learning_rate,
        logging_steps=10,
        save_strategy="epoch",
        report_to=[],
    )
    trainer = SFTTrainer(
        model=model,
        args=config,
        peft_config=lora,
        train_dataset=train_ds,
        processing_class=tokenizer,
    )
    trainer.train()
    trainer.save_model(str(out))
    registry.mark_trained(
        adapter_name, str(out), base_model=base_model, epochs=epochs, qlora=qlora
    )
    return out


def dry_run(
    agent_id: str, *, base_model: str, epochs: int, qlora: bool
) -> dict[str, Any]:
    """Validate everything except the actual model load (no GPU needed)."""
    contract = load_contract(agent_id)
    rows = build_dataset(agent_id)
    registry = AdapterRegistry()
    spec = registry.get(contract["adapter"])
    return {
        "agent": agent_id,
        "adapter": spec["name"],
        "base_model": base_model,
        "rank": spec["rank"],
        "alpha": spec["alpha"],
        "target_modules": list(spec["target_modules"]),
        "qlora": qlora,
        "epochs": epochs,
        "n_train_samples": len(rows),
        "sample": rows[0] if rows else None,
        "status": "dry-run OK — config + data valid (no model loaded)",
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="lora_finetune", description="Fine-tune one AIDEN agent (LoRA/QLoRA)"
    )
    parser.add_argument(
        "--agent", required=True, help="backend agent id, e.g. requirement_analysis"
    )
    parser.add_argument(
        "--base",
        default=None,
        help="HF base model id (default from contract's backend base)",
    )
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument("--lr", type=float, default=2e-4)
    parser.add_argument("--batch-size", type=int, default=2)
    parser.add_argument(
        "--qlora", action="store_true", help="4-bit QLoRA (CUDA required)"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="validate data + config without loading a model",
    )
    args = parser.parse_args(argv)

    from ml.sync_guard import backend_registry

    registry = backend_registry()
    base_model = args.base
    if base_model is None and registry is not None:
        base_model = registry.BASE_MODELS[
            next(
                a["base_model"]
                for a in json.loads(
                    (ML_DIR / "agents.json").read_text(encoding="utf-8")
                )["agents"]
                if a["backend_agent"] == args.agent
            )
        ].hf_id
    base_model = base_model or "Qwen/Qwen3-8B"

    if args.dry_run:
        info = dry_run(
            args.agent, base_model=base_model, epochs=args.epochs, qlora=args.qlora
        )
        print(json.dumps(info, indent=2, ensure_ascii=False))
        return 0
    out = train(
        args.agent,
        base_model=base_model,
        epochs=args.epochs,
        qlora=args.qlora,
        learning_rate=args.lr,
        batch_size=args.batch_size,
    )
    print(f"[lora] adapter saved -> {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
