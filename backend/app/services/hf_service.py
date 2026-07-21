"""HuggingFace service with graceful fallback when dependencies are unavailable."""

import logging
import os
from typing import Optional

from app.config import settings

logger = logging.getLogger(__name__)

try:
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig, pipeline
    HF_AVAILABLE = True
except ImportError:
    torch = None
    AutoModelForCausalLM = AutoTokenizer = BitsAndBytesConfig = pipeline = None
    HF_AVAILABLE = False
    logger.warning("HuggingFace dependencies not installed — running in fallback mode")


class HuggingFaceService:
    """
    Centralized HuggingFace service for model loading and inference.
    Supports 4-bit quantization for memory efficiency.
    Singleton pattern — one instance shared across the app.

    Gracefully degrades when transformers/torch are not installed.
    """

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if hasattr(self, "_initialized"):
            return
        self._initialized = True

        self.models = {}
        self.tokenizers = {}
        self.pipelines = {}
        self._available = HF_AVAILABLE

        # Ensure cache directory exists
        os.makedirs(settings.HF_CACHE_DIR, exist_ok=True)

        if HF_AVAILABLE:
            self.quant_config = BitsAndBytesConfig(
                load_in_4bit=settings.USE_4BIT_QUANTIZATION,
                bnb_4bit_compute_dtype=torch.float16,
                bnb_4bit_use_double_quant=True,
            )
            logger.info("HuggingFaceService initialized (HF available)")
        else:
            self.quant_config = None
            logger.info("HuggingFaceService initialized (HF unavailable, using fallback)")

    def is_available(self) -> bool:
        return self._available

    def load_model(self, model_name: str, use_quantization: bool = True):
        """Load a model from Hugging Face Hub with caching."""
        if not self._available:
            raise RuntimeError("HuggingFace dependencies are not available")

        if model_name in self.models:
            return self.models[model_name], self.tokenizers[model_name]

        logger.info(f"Loading model: {model_name}")

        try:
            model_kwargs = {
                "device_map": "auto",
                "trust_remote_code": True,
                "cache_dir": settings.HF_CACHE_DIR,
            }

            if use_quantization and settings.USE_4BIT_QUANTIZATION and torch.cuda.is_available():
                model_kwargs["quantization_config"] = self.quant_config

            model = AutoModelForCausalLM.from_pretrained(model_name, **model_kwargs)

            tokenizer = AutoTokenizer.from_pretrained(
                model_name,
                trust_remote_code=True,
                padding_side="left",
                cache_dir=settings.HF_CACHE_DIR,
            )

            if tokenizer.pad_token is None:
                tokenizer.pad_token = tokenizer.eos_token

            self.models[model_name] = model
            self.tokenizers[model_name] = tokenizer
            logger.info(f"Model {model_name} loaded successfully")
            return model, tokenizer

        except Exception as e:
            logger.error(f"Failed to load model {model_name}: {e}")
            self._available = False
            raise

    def create_pipeline(self, task: str, model_name: str, **kwargs):
        """Create a Hugging Face pipeline with caching."""
        if not self._available:
            return None

        key = f"{task}_{model_name}"
        if key in self.pipelines:
            return self.pipelines[key]

        try:
            model, tokenizer = self.load_model(model_name)
            pipe = pipeline(task, model=model, tokenizer=tokenizer, device_map="auto", **kwargs)
            self.pipelines[key] = pipe
            return pipe
        except Exception as e:
            logger.error(f"Failed to create pipeline: {e}")
            return None

    def generate(self, prompt: str, model_name: Optional[str] = None, **kwargs) -> Optional[str]:
        """Generate text using a model."""
        if not self._available:
            logger.info("HF unavailable — skipping generation")
            return None

        model_name = model_name or settings.INTENT_MODEL

        try:
            pipe = self.create_pipeline(
                "text-generation",
                model_name,
                max_new_tokens=kwargs.get("max_new_tokens", 512),
                temperature=kwargs.get("temperature", 0.1),
                do_sample=True,
            )

            if pipe is None:
                return None

            result = pipe(prompt)
            return result[0]["generated_text"]

        except Exception as e:
            logger.error(f"Generation failed: {e}")
            return None


# Singleton
hf_service = HuggingFaceService()
