"""
Multimodal Service — Image + Text understanding using LLaVA / Qwen-VL
Extends the HuggingFaceService pattern for vision-language models.
"""

import base64
import logging
from io import BytesIO
from typing import Optional, Dict, Any
from pathlib import Path
from PIL import Image

from transformers import (
    LlavaNextProcessor,
    LlavaNextForConditionalGeneration,
    BitsAndBytesConfig,
    AutoProcessor,
    Qwen2VLForConditionalGeneration,
)
from peft import PeftModel
import torch

from app.config import settings

logger = logging.getLogger(__name__)

class MultimodalService:
    """
    Singleton service for multimodal inference.
    Supports LLaVA (default) and Qwen-VL (optional).
    Loads fine-tuned adapters if present.
    """

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if hasattr(self, '_initialized'):
            return
        self._initialized = True

        self.model = None
        self.processor = None
        self.model_type = None
        self._loaded = False

        if settings.MULTIMODAL_ENABLED:
            self._load_model()

    def _load_model(self):
        """Load the multimodal model with 4-bit quantization."""
        try:
            logger.info("Loading multimodal model...")

            model_id = settings.MULTIMODAL_MODEL or "llava-hf/llava-v1.6-mistral-7b-hf"

            # 4-bit quantization config
            bnb_config = BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_compute_dtype=torch.float16,
                bnb_4bit_use_double_quant=True,
            )

            # Detect model type
            if "llava" in model_id.lower():
                self.model_type = "llava"
                self.processor = LlavaNextProcessor.from_pretrained(model_id)
                self.model = LlavaNextForConditionalGeneration.from_pretrained(
                    model_id,
                    quantization_config=bnb_config,
                    device_map="auto",
                    trust_remote_code=True,
                )
            elif "qwen" in model_id.lower():
                self.model_type = "qwen"
                self.processor = AutoProcessor.from_pretrained(model_id)
                self.model = Qwen2VLForConditionalGeneration.from_pretrained(
                    model_id,
                    quantization_config=bnb_config,
                    device_map="auto",
                    trust_remote_code=True,
                )
            else:
                raise ValueError(f"Unsupported multimodal model: {model_id}")

            # Load fine-tuned adapter if exists
            adapter_path = settings.MULTIMODAL_ADAPTER_PATH
            if adapter_path and Path(adapter_path).exists():
                logger.info(f"Loading LoRA adapter from: {adapter_path}")
                self.model = PeftModel.from_pretrained(self.model, adapter_path)
                self.model = self.model.merge_and_unload()

            self._loaded = True
            logger.info(f"✅ Multimodal model loaded: {model_id}")

        except Exception as e:
            logger.error(f"Failed to load multimodal model: {e}")
            self._loaded = False

    def is_available(self) -> bool:
        return self._loaded

    async def analyze_diagram(
        self,
        image_data: str,
        prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 512,
    ) -> Dict[str, Any]:
        """
        Analyze a pipeline diagram from a base64 image.

        Args:
            image_data: Base64-encoded image (data:image/png;base64,...)
            prompt: User's question (default: "Describe this data pipeline diagram.")
            temperature: Sampling temperature
            max_tokens: Max tokens to generate

        Returns:
            Dict with 'success', 'analysis', 'model', 'prompt', 'tokens'
        """
        if not self.is_available():
            return {"success": False, "error": "Multimodal service unavailable"}

        try:
            # Decode image
            if image_data.startswith("data:image"):
                image_data = image_data.split(",")[1]
            image_bytes = base64.b64decode(image_data)
            image = Image.open(BytesIO(image_bytes))

            if not prompt:
                prompt = "Describe this data pipeline diagram in detail."

            # Prepare conversation
            if self.model_type == "llava":
                conversation = [
                    {
                        "role": "user",
                        "content": [
                            {"type": "image", "image": image},
                            {"type": "text", "text": prompt},
                        ],
                    }
                ]
                inputs = self.processor.apply_chat_template(
                    conversation,
                    tokenize=True,
                    return_tensors="pt",
                    add_generation_prompt=True,
                )
            elif self.model_type == "qwen":
                # Qwen-VL uses a different format
                messages = [
                    {
                        "role": "user",
                        "content": [
                            {"type": "image", "image": image},
                            {"type": "text", "text": prompt},
                        ],
                    }
                ]
                text = self.processor.apply_chat_template(
                    messages, tokenize=False, add_generation_prompt=True
                )
                inputs = self.processor(
                    text=[text],
                    images=[image],
                    padding=True,
                    return_tensors="pt",
                )
            else:
                return {"success": False, "error": f"Unsupported model type: {self.model_type}"}

            # Move to GPU
            inputs = {k: v.to(self.model.device) for k, v in inputs.items()}

            # Generate
            with torch.no_grad():
                outputs = self.model.generate(
                    **inputs,
                    max_new_tokens=max_tokens,
                    temperature=temperature,
                    do_sample=True,
                    pad_token_id=self.processor.tokenizer.eos_token_id,
                )

            response = self.processor.decode(outputs[0], skip_special_tokens=True)

            # Extract assistant response (model-specific)
            if "assistant" in response:
                response = response.split("assistant")[-1].strip()

            return {
                "success": True,
                "analysis": response,
                "model": settings.MULTIMODAL_MODEL,
                "prompt": prompt,
                "tokens": len(response.split()),
            }

        except Exception as e:
            logger.error(f"Analysis failed: {e}")
            return {"success": False, "error": str(e)}


# Singleton
multimodal_service = MultimodalService()