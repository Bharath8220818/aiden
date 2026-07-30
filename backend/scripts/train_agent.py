"""
Complete training script for AIDEN agents using LoRA.

Supports: Intent Parser, Self-Healing, Monitoring, Extraction, Pipeline Builder
Each agent type has a different system prompt, output format, and output directory.

Usage:
    # Train intent parser (default)
    python scripts/train_agent.py --agent intent --data data/intent_dataset.jsonl --epochs 3

    # Train all agents
    for agent in intent self_healing monitoring extraction pipeline_builder; do
        python scripts/train_agent.py --agent $agent --data data/${agent}_dataset.jsonl --epochs 3
    done
"""

import argparse
import json
import logging
import os
import sys
from typing import Dict, List, Optional

import torch
from datasets import Dataset
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    TrainingArguments,
)
from trl import SFTTrainer

logger = logging.getLogger(__name__)

# ── Agent Configurations ────────────────────────────────────────────────

AGENT_CONFIGS = {
    "intent": {
        "output_dir": "./models/intent-parser",
        "description": "Natural language → pipeline config (JSON)",
        "system_prompt": "You are a data pipeline assistant. Convert the user's request into a structured JSON pipeline definition.",
        "dataset_format": "instruction_output",  # {"instruction": "...", "output": "..."}
    },
    "self_healing": {
        "output_dir": "./models/self-healing",
        "description": "Failure detection and auto-repair",
        "system_prompt": "You are a self-healing agent for data pipelines. Given an error, diagnose the root cause and propose a fix.",
        "dataset_format": "instruction_output",
    },
    "monitoring": {
        "output_dir": "./models/monitoring",
        "description": "Pipeline health monitoring and alerts",
        "system_prompt": "You are a monitoring agent. Analyze pipeline health metrics and generate alerts or recommendations.",
        "dataset_format": "instruction_output",
    },
    "extraction": {
        "output_dir": "./models/extraction",
        "description": "Schema discovery and data extraction",
        "system_prompt": "You are an extraction agent. Given a source description, return the schema and extraction config.",
        "dataset_format": "instruction_output",
    },
    "pipeline_builder": {
        "output_dir": "./models/pipeline-builder",
        "description": "Pipeline code generation (Airflow DAGs, dbt models)",
        "system_prompt": "You are a pipeline builder agent. Generate executable pipeline code (Airflow DAG, dbt models) from a config.",
        "dataset_format": "instruction_output",
    },
}

DEFAULT_MODEL = "meta-llama/Llama-3.2-3B-Instruct"


class AgentTrainer:
    """
    Unified trainer for AIDEN agents using LoRA + 4-bit QLoRA.

    Supports all 5 agent types with configurable system prompts,
    output directories, and dataset formats.
    """

    def __init__(
        self,
        agent_type: str = "intent",
        model_name: str = DEFAULT_MODEL,
        output_dir: Optional[str] = None,
        max_seq_length: int = 2048,
        use_4bit: Optional[bool] = None,
    ):
        self.agent_type = agent_type
        self.agent_config = AGENT_CONFIGS[agent_type]
        self.model_name = model_name
        self.output_dir = output_dir or self.agent_config["output_dir"]
        self.max_seq_length = max_seq_length

        os.makedirs(self.output_dir, exist_ok=True)

        self._setup_model(use_4bit)
        logger.info(
            "AgentTrainer initialized: %s -> %s",
            self.agent_type,
            self.output_dir,
        )

    def _setup_model(self, use_4bit: Optional[bool] = None):
        """Load model with optional 4-bit quantization and configure LoRA."""

        # ── 1. Quantization config (4-bit for memory efficiency) ──────────
        if use_4bit is None:
            use_4bit = torch.cuda.is_available()  # default: 4-bit on GPU, FP32 on CPU
        bnb_config = None
        if use_4bit:
            bnb_config = BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_use_double_quant=True,
                bnb_4bit_quant_type="nf4",
                bnb_4bit_compute_dtype=torch.bfloat16,
            )
        elif use_4bit and not torch.cuda.is_available():
            logger.warning("CUDA not available — disabling 4-bit quantization (CPU mode)")
            use_4bit = False

        # ── 2. Load model ────────────────────────────────────────────────
        logger.info("Loading base model: %s", self.model_name)
        load_kwargs = {
            "device_map": "auto",
            "trust_remote_code": True,
        }
        if bnb_config:
            load_kwargs["quantization_config"] = bnb_config

        self.model = AutoModelForCausalLM.from_pretrained(
            self.model_name,
            **load_kwargs,
        )

        # ── 3. Load tokenizer ────────────────────────────────────────────
        self.tokenizer = AutoTokenizer.from_pretrained(
            self.model_name,
            trust_remote_code=True,
            padding_side="left",
        )

        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token

        # ── 4. Prepare for k-bit training ────────────────────────────────
        if use_4bit:
            self.model = prepare_model_for_kbit_training(self.model)

        self.model.gradient_checkpointing_enable()
        self.model.config.use_cache = False

        # ── 5. LoRA configuration ────────────────────────────────────────
        lora_config = LoraConfig(
            r=16,
            lora_alpha=32,
            target_modules=[
                "q_proj",
                "v_proj",
                "k_proj",
                "o_proj",
                "gate_proj",
                "up_proj",
                "down_proj",
            ],
            lora_dropout=0.05,
            bias="none",
            task_type="CAUSAL_LM",
        )

        self.model = get_peft_model(self.model, lora_config)
        self.model.print_trainable_parameters()

    # ── Dataset Loading ───────────────────────────────────────────────────

    def load_dataset(self, data_path: str) -> Dataset:
        """Load and format dataset from JSONL.

        Expects each line as ``{"instruction": "...", "output": "..."}``.
        Formats into::

            ### System:
            {system_prompt}

            ### Instruction:
            {instruction}

            ### Response:
            {output}
        """
        if not os.path.exists(data_path):
            raise FileNotFoundError(
                f"Dataset not found: {data_path}. "
                "Generate one with: python scripts/generate_synthetic_data.py "
                "--agent {agent_type} --count 200 --output data/{agent_type}_dataset.jsonl"
            )

        system_prompt = self.agent_config["system_prompt"]
        data: List[Dict[str, str]] = []

        with open(data_path, "r", encoding="utf-8") as f:
            for line_no, line in enumerate(f, 1):
                line = line.strip()
                if not line:
                    continue
                try:
                    entry = json.loads(line)
                except json.JSONDecodeError as exc:
                    logger.warning("Skipping line %d: %s", line_no, exc)
                    continue

                # Support both instruction+output prompt+completion formats
                prompt = entry.get("instruction") or entry.get("prompt", "")
                completion = entry.get("output") or entry.get("completion", "")

                if not prompt or not completion:
                    logger.warning(
                        "Skipping line %d: missing instruction or output", line_no
                    )
                    continue

                text = (
                    f"### System:\n{system_prompt}\n\n"
                    f"### Instruction:\n{prompt}\n\n"
                    f"### Response:\n{completion}"
                )
                data.append({"text": text})

        if not data:
            raise ValueError(f"No valid examples found in {data_path}")

        dataset = Dataset.from_list(data)
        logger.info("Loaded %d examples from %s", len(dataset), data_path)
        return dataset

    # ── Training Loop ─────────────────────────────────────────────────────

    def train(
        self,
        dataset_path: str,
        epochs: int = 3,
        batch_size: int = 4,
        learning_rate: float = 2e-4,
    ):
        """Run the fine-tuning process.

        Args:
            dataset_path: Path to JSONL dataset.
            epochs: Number of training epochs.
            batch_size: Per-device batch size.
            learning_rate: Peak learning rate.

        Returns:
            The trained PEFT model.
        """
        # Load dataset
        dataset = self.load_dataset(dataset_path)

        # Split into train/validation (80/20)
        split_dataset = dataset.train_test_split(test_size=0.1, seed=42)
        train_dataset = split_dataset["train"]
        eval_dataset = split_dataset["test"]

        logger.info("Train samples: %d | Validation samples: %d", len(train_dataset), len(eval_dataset))

        use_fp16 = torch.cuda.is_available() and torch.cuda.get_device_capability()[0] >= 7
        use_bf16 = torch.cuda.is_available() and torch.cuda.get_device_capability() >= (8, 0)

        training_args = TrainingArguments(
            output_dir=self.output_dir,
            num_train_epochs=epochs,
            per_device_train_batch_size=batch_size,
            per_device_eval_batch_size=batch_size,
            gradient_accumulation_steps=4,
            warmup_steps=100,
            learning_rate=learning_rate,
            logging_steps=10,
            save_steps=100,
            evaluation_strategy="steps",
            eval_steps=100,
            load_best_model_at_end=True,
            metric_for_best_model="eval_loss",
            greater_is_better=False,
            fp16=use_fp16,
            bf16=use_bf16,
            gradient_checkpointing=True,
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
            max_seq_length=self.max_seq_length,
            dataset_text_field="text",
        )

        logger.info("Starting training (%d epochs)...", epochs)
        trainer.train()

        # Save final model
        trainer.save_model(self.output_dir)
        self.tokenizer.save_pretrained(self.output_dir)

        logger.info("Model saved to: %s", self.output_dir)
        return self.model


def main():
    parser = argparse.ArgumentParser(description="Train AIDEN agents using LoRA")
    parser.add_argument(
        "--agent", "-a",
        required=True,
        choices=list(AGENT_CONFIGS.keys()),
        help="Agent type to train",
    )
    parser.add_argument(
        "--data", "-d",
        required=True,
        help="Path to training data (JSONL)",
    )
    parser.add_argument(
        "--epochs", "-e",
        type=int,
        default=3,
        help="Number of training epochs",
    )
    parser.add_argument(
        "--batch", "-b",
        type=int,
        default=4,
        help="Batch size",
    )
    parser.add_argument(
        "--lr",
        type=float,
        default=2e-4,
        help="Learning rate",
    )
    parser.add_argument(
        "--output", "-o",
        default="./models",
        help="Parent output directory (default: ./models; writes to: <output>/<agent-type>)",
    )
    parser.add_argument(
        "--model",
        default=DEFAULT_MODEL,
        help="Base model ID (default: %s)" % DEFAULT_MODEL,
    )
    parser.add_argument(
        "--no-4bit",
        action="store_true",
        help="Disable 4-bit quantization (use if running on CPU)",
    )

    args = parse_args()

    # Map agent type to output subdirectory (matches agent_loader.py paths)
    agent_map = {
        "intent": "intent-parser",
        "self_healing": "self-healing",
        "monitoring": "monitoring",
        "extraction": "extraction",
        "pipeline_builder": "pipeline-builder",
    }
    output_dir = os.path.join(args.output, agent_map[args.agent])

    print(f"Training:          {args.agent} agent")
    print(f"   Description:       {AGENT_CONFIGS[args.agent]['description']}")
    print(f"Data:              {args.data}")
    print(f"Output:            {output_dir}")
    print(f"Model:             {args.model}")
    print(f"Epochs:            {args.epochs}")
    print(f"Batch:             {args.batch}")
    print(f"Learning Rate:     {args.lr}")
    print(f"4-bit Quant:       {'No' if args.no_4bit else 'Yes'}")
    print("-" * 50)

    trainer = AgentTrainer(
        agent_type=args.agent,
        model_name=args.model,
        output_dir=output_dir,
        use_4bit=not args.no_4bit,
    )

    trainer.train(
        dataset_path=args.data,
        epochs=args.epochs,
        batch_size=args.batch,
        learning_rate=args.lr,
    )

    print(f"\n✅ {args.agent} agent training complete!")
    print(f"   Model saved to: {trainer.output_dir}")


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%H:%M:%S",
    )
    main()
