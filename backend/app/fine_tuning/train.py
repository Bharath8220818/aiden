"""
Fine-tuning script for AIDEN's intent parser using LoRA.

Trains a small LLM (Llama 3.2 3B / Phi-3 Mini) to convert natural-language
pipeline descriptions into structured JSON pipeline definitions.  Uses 4-bit
QLoRA so it fits in ~6 GB VRAM.

Usage:
    # Train with default settings (Llama 3.2 3B, 3 epochs)
    python -m app.fine_tuning.train

    # Train with a different base model
    python -m app.fine_tuning.train --base-model "microsoft/Phi-3-mini-4k-instruct"

    # Train from your own dataset
    python -m app.fine_tuning.train --dataset-path ./data/my_dataset.jsonl
"""

import argparse
import json
import logging
import os
import sys
from typing import Dict, List, Optional

import torch
from datasets import Dataset
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training, PeftConfig, PeftModel
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    TrainingArguments,
)
from trl import SFTTrainer

logger = logging.getLogger(__name__)

# ── Constants ──────────────────────────────────────────────────────────────

DEFAULT_MODEL = "meta-llama/Llama-3.2-3B-Instruct"
DEFAULT_OUTPUT_DIR = "./models/intent-fine-tuned"
DEFAULT_DATASET = "./data/intent_dataset.jsonl"

# Prompt template that wraps each example
SYSTEM_PROMPT = "You are a data pipeline assistant. Convert the user's request into a structured JSON pipeline definition."


# ── Fine-Tuner ─────────────────────────────────────────────────────────────


class IntentFineTuner:
    """Fine-tune a model for intent parsing using LoRA + 4-bit quantization.

    Attributes:
        base_model_name: HuggingFace model ID or local path.
        output_dir: Where to save the trained adapter.
        dataset_path: Path to JSONL file with ``instruction`` / ``output`` pairs.
    """

    def __init__(
        self,
        base_model_name: str = DEFAULT_MODEL,
        output_dir: str = DEFAULT_OUTPUT_DIR,
        dataset_path: str = DEFAULT_DATASET,
    ):
        self.base_model_name = base_model_name
        self.output_dir = output_dir
        self.dataset_path = dataset_path

        os.makedirs(output_dir, exist_ok=True)

        # ── 4-bit quantization config ────────────────────────────────
        self.bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_compute_dtype=torch.float16,
            bnb_4bit_use_double_quant=True,
            bnb_4bit_quant_type="nf4",
        )

        # ── Load model and tokenizer ─────────────────────────────────
        logger.info("Loading base model: %s", base_model_name)
        self.model = AutoModelForCausalLM.from_pretrained(
            base_model_name,
            quantization_config=self.bnb_config,
            device_map="auto",
            trust_remote_code=True,
        )

        self.tokenizer = AutoTokenizer.from_pretrained(
            base_model_name,
            trust_remote_code=True,
            padding_side="left",
        )

        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token

        # ── Prepare for k-bit training ───────────────────────────────
        self.model = prepare_model_for_kbit_training(self.model)
        self.model.gradient_checkpointing_enable()  # type: ignore[union-attr]
        self.model.config.use_cache = False  # type: ignore[union-attr]

        # ── LoRA configuration ───────────────────────────────────────
        self.lora_config = LoraConfig(
            r=16,  # Rank
            lora_alpha=32,  # Scaling factor
            target_modules=["q_proj", "v_proj", "k_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
            lora_dropout=0.05,
            bias="none",
            task_type="CAUSAL_LM",
        )

        self.model = get_peft_model(self.model, self.lora_config)
        self.model.print_trainable_parameters()

    # ── Dataset Loading ─────────────────────────────────────────────────

    def load_dataset(self) -> Dataset:
        """Load and format the JSONL dataset.

        Each line must be ``{"instruction": "...", "output": "..."}``.
        Returns a HuggingFace ``Dataset`` with a single ``text`` column
        formatted as::

            ### Instruction:
            {instruction}

            ### Response:
            {output}
        """
        if not os.path.exists(self.dataset_path):
            raise FileNotFoundError(
                f"Dataset not found at {self.dataset_path}. "
                "Create one with scripts/generate_synthetic_data.py "
                "or point --dataset-path to your own JSONL file."
            )

        data: List[Dict[str, str]] = []
        with open(self.dataset_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                entry = json.loads(line)
                # Format with system prompt + instruction / response
                text = (
                    f"### System:\n{SYSTEM_PROMPT}\n\n"
                    f"### Instruction:\n{entry['instruction']}\n\n"
                    f"### Response:\n{entry['output']}"
                )
                data.append({"text": text})

        logger.info("Loaded %d examples from %s", len(data), self.dataset_path)
        return Dataset.from_list(data)

    # ── Training Loop ───────────────────────────────────────────────────

    def train(self, epochs: int = 3, batch_size: int = 4):
        """Run the fine-tuning process.

        Args:
            epochs: Number of training epochs.
            batch_size: Per-device batch size (effective = batch_size * gradient_accumulation_steps).

        Returns:
            The trained PEFT model.
        """
        dataset = self.load_dataset()

        # 80/20 train/eval split
        split_dataset = dataset.train_test_split(test_size=0.2, seed=42)
        train_dataset = split_dataset["train"]
        eval_dataset = split_dataset["test"]

        logger.info("Train: %d | Eval: %d", len(train_dataset), len(eval_dataset))

        training_args = TrainingArguments(
            output_dir=self.output_dir,
            num_train_epochs=epochs,
            per_device_train_batch_size=batch_size,
            per_device_eval_batch_size=batch_size,
            gradient_accumulation_steps=4,
            warmup_steps=100,
            learning_rate=2e-4,
            logging_steps=10,
            save_steps=100,
            evaluation_strategy="steps",
            eval_steps=100,
            load_best_model_at_end=True,
            metric_for_best_model="eval_loss",
            greater_is_better=False,
            fp16=torch.cuda.is_available(),
            bf16=not torch.cuda.is_available() and hasattr(torch, "bfloat16"),
            report_to="none",  # Change to "wandb" for experiment tracking
            save_total_limit=2,
            remove_unused_columns=False,
        )

        trainer = SFTTrainer(
            model=self.model,
            tokenizer=self.tokenizer,
            train_dataset=train_dataset,
            eval_dataset=eval_dataset,
            args=training_args,
            max_seq_length=512,
            dataset_text_field="text",
        )

        logger.info("Starting training (%d epochs)...", epochs)
        trainer.train()

        # Save
        trainer.save_model(self.output_dir)
        self.tokenizer.save_pretrained(self.output_dir)

        logger.info("Model saved to %s", self.output_dir)
        return self.model


# ── CLI Entry Point ────────────────────────────────────────────────────────


def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Fine-tune AIDEN intent parser with LoRA")
    parser.add_argument("--base-model", default=DEFAULT_MODEL, help="Base model ID")
    parser.add_argument("--output-dir", default=DEFAULT_OUTPUT_DIR, help="Output directory")
    parser.add_argument("--dataset-path", default=DEFAULT_DATASET, help="Path to JSONL dataset")
    parser.add_argument("--epochs", type=int, default=3, help="Number of epochs")
    parser.add_argument("--batch-size", type=int, default=4, help="Per-device batch size")
    return parser.parse_args(argv)


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    args = parse_args()
    tuner = IntentFineTuner(
        base_model_name=args.base_model,
        output_dir=args.output_dir,
        dataset_path=args.dataset_path,
    )
    tuner.train(epochs=args.epochs, batch_size=args.batch_size)
