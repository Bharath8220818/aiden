"""
Multimodal Fine-Tuning for AIDEN
Uses LLaVA or Qwen-VL with LoRA on image + text pairs.
"""

import json
import os
import argparse
from pathlib import Path
from PIL import Image
from typing import Dict, List

import torch
from transformers import (
    LlavaNextProcessor,
    LlavaNextForConditionalGeneration,
    TrainingArguments,
    BitsAndBytesConfig,
    AutoProcessor,
    Qwen2VLForConditionalGeneration,
)
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from trl import SFTTrainer
from datasets import Dataset

class MultimodalTrainer:
    """
    Trainer for multimodal (image+text) LoRA fine-tuning.
    Follows the same pattern as AgentTrainer, but handles images.
    """

    def __init__(
        self,
        model_id: str = "llava-hf/llava-v1.6-mistral-7b-hf",
        output_dir: str = "./models/adapters/multimodal",
        max_seq_length: int = 2048,
    ):
        self.model_id = model_id
        self.output_dir = output_dir
        self.max_seq_length = max_seq_length

        self._setup_model()

    def _setup_model(self):
        """Load base model, tokenizer, and apply LoRA."""
        print(f"Loading base model: {self.model_id}")

        # ─── 1. Quantization ──────────────────────────────────────────
        if torch.cuda.is_available():
            bnb_config = BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_use_double_quant=True,
                bnb_4bit_quant_type="nf4",
                bnb_4bit_compute_dtype=torch.bfloat16,
            )
            device_map = "auto"
            use_quantization = True
            print("CUDA available — using 4-bit quantization")
        else:
            bnb_config = None
            device_map = "cpu"
            use_quantization = False
            print("CUDA not available — loading on CPU (this will be slow)")

        # ─── 2. Load model ──────────────────────────────────────────
        if "llava" in self.model_id.lower():
            self.processor = LlavaNextProcessor.from_pretrained(self.model_id)
            if use_quantization:
                self.model = LlavaNextForConditionalGeneration.from_pretrained(
                    self.model_id,
                    quantization_config=bnb_config,
                    device_map=device_map,
                    trust_remote_code=True,
                )
            else:
                self.model = LlavaNextForConditionalGeneration.from_pretrained(
                    self.model_id,
                    device_map=device_map,
                    torch_dtype=torch.float32,
                    trust_remote_code=True,
                )

        elif "qwen" in self.model_id.lower():
            self.processor = AutoProcessor.from_pretrained(self.model_id)
            if use_quantization:
                self.model = Qwen2VLForConditionalGeneration.from_pretrained(
                    self.model_id,
                    quantization_config=bnb_config,
                    device_map=device_map,
                    trust_remote_code=True,
                )
            else:
                self.model = Qwen2VLForConditionalGeneration.from_pretrained(
                    self.model_id,
                    device_map=device_map,
                    torch_dtype=torch.float32,
                    trust_remote_code=True,
                )

        else:
            raise ValueError(f"Unsupported model: {self.model_id}")

        # ─── 3. Prepare for k-bit training ──────────────────────────
        self.model = prepare_model_for_kbit_training(self.model)

        # ─── 4. LoRA configuration ──────────────────────────────────
        lora_config = LoraConfig(
            r=16,
            lora_alpha=32,
            target_modules=["q_proj", "v_proj", "k_proj", "o_proj"],
            lora_dropout=0.05,
            bias="none",
            task_type="CAUSAL_LM",
        )

        self.model = get_peft_model(self.model, lora_config)
        self.model.print_trainable_parameters()

    def load_dataset(self, data_path: str) -> Dataset:
        """Load multimodal dataset (JSONL with image paths + prompt + completion)."""
        data = []
        base_dir = Path(data_path).parent

        with open(data_path, "r") as f:
            for line in f:
                item = json.loads(line)
                image_path = os.path.join(base_dir, item.get("image", ""))
                if not os.path.exists(image_path):
                    print(f"Skipping missing image: {image_path}")
                    continue

                try:
                    image = Image.open(image_path)
                except Exception as e:
                    print(f"Could not open image {image_path}: {e}")
                    continue

                conversation = [
                    {
                        "role": "user",
                        "content": [
                            {"type": "image", "image": image},
                            {"type": "text", "text": item["prompt"]},
                        ],
                    },
                    {
                        "role": "assistant",
                        "content": [
                            {"type": "text", "text": item["completion"]}
                        ],
                    },
                ]

                # Apply chat template
                text = self.processor.apply_chat_template(
                    conversation,
                    tokenize=False,
                    add_generation_prompt=False,
                )

                data.append({"text": text})

        dataset = Dataset.from_list(data)
        print(f"Loaded {len(dataset)} valid samples")
        return dataset

    def train(self, dataset_path: str, epochs: int = 3, batch_size: int = 2):
        """Run training."""
        dataset = self.load_dataset(dataset_path)
        if len(dataset) == 0:
            print("No valid samples found. Please check dataset.")
            return

        dataset = dataset.train_test_split(test_size=0.1, seed=42)

        training_args = TrainingArguments(
            output_dir=self.output_dir,
            num_train_epochs=epochs,
            per_device_train_batch_size=batch_size,
            gradient_accumulation_steps=4,
            warmup_steps=50,
            learning_rate=2e-4,
            logging_steps=10,
            save_steps=500,
            evaluation_strategy="steps",
            eval_steps=500,
            load_best_model_at_end=True,
            metric_for_best_model="eval_loss",
            fp16=torch.cuda.is_available(),
            gradient_checkpointing=True,
            save_total_limit=3,
        )

        trainer = SFTTrainer(
            model=self.model,
            tokenizer=self.processor.tokenizer,
            train_dataset=dataset["train"],
            eval_dataset=dataset["test"],
            args=training_args,
            max_seq_length=self.max_seq_length,
            dataset_text_field="text",
        )

        print("Starting multimodal training...")
        trainer.train()

        # Save adapter
        trainer.save_model(self.output_dir)
        self.processor.save_pretrained(self.output_dir)
        print(f"Model saved to: {self.output_dir}")

def main():
    parser = argparse.ArgumentParser(description="Train multimodal agent")
    parser.add_argument("--data", "-d", required=True, help="JSONL dataset path")
    parser.add_argument("--epochs", "-e", type=int, default=3)
    parser.add_argument("--batch", "-b", type=int, default=2)
    parser.add_argument("--model", "-m", default="llava-hf/llava-v1.6-mistral-7b-hf")
    parser.add_argument("--output", "-o", default="./models/adapters/multimodal")
    args = parser.parse_args()

    trainer = MultimodalTrainer(
        model_id=args.model,
        output_dir=args.output,
    )
    trainer.train(
        dataset_path=args.data,
        epochs=args.epochs,
        batch_size=args.batch,
    )

if __name__ == "__main__":
    main()