"""
Centralized HuggingFace service for AIDEN.

Handles:
- Model loading with 4-bit quantization for memory efficiency
- Model caching to avoid re-downloading
- Pipeline creation for text generation and other tasks
- Embedding generation for RAG via sentence-transformers
- Fine-tuned (PEFT/LoRA) model support

Usage:
    from app.services.hf_service import hf_service

    # Get embeddings for RAG
    vectors = hf_service.get_embeddings("some text")

    # Create a text-generation pipeline
    pipe = hf_service.create_pipeline("text-generation", "meta-llama/Llama-3.2-3B-Instruct")
    result = pipe("Build a pipeline", max_new_tokens=100)
"""

import logging
import os
from typing import Any, Dict, List, Optional, Tuple, Union

try:
    import torch
    from peft import PeftConfig, PeftModel
    from sentence_transformers import SentenceTransformer
    from transformers import (
        AutoModelForCausalLM,
        AutoTokenizer,
        BitsAndBytesConfig,
        pipeline,
    )
except ImportError as exc:
    torch = None
    PeftConfig = PeftModel = SentenceTransformer = None
    AutoModelForCausalLM = AutoTokenizer = BitsAndBytesConfig = pipeline = None
    HF_IMPORT_ERROR = exc
else:
    HF_IMPORT_ERROR = None

from app.config import settings

logger = logging.getLogger(__name__)


class HuggingFaceService:
    """
    Singleton service that manages HuggingFace model lifecycle.
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

        self.models: Dict[str, Any] = {}
        self.tokenizers: Dict[str, Any] = {}
        self.pipelines: Dict[str, Any] = {}
        self.embeddings_model = None
        self._available = HF_IMPORT_ERROR is None

        # Ensure cache directory exists
        os.makedirs(settings.HF_CACHE_DIR, exist_ok=True)

        self.quant_config = None
        if HF_IMPORT_ERROR is not None:
            logger.warning("HuggingFace dependencies are unavailable: %s", HF_IMPORT_ERROR)
        else:
            # 4-bit quantization config for memory-efficient inference
            quantization_enabled = settings.USE_4BIT_QUANTIZATION and torch.cuda.is_available()
            self.quant_config = BitsAndBytesConfig(
                load_in_4bit=quantization_enabled,
                bnb_4bit_compute_dtype=torch.float16,
                bnb_4bit_use_double_quant=True,
            )

        logger.info("HuggingFaceService initialized (cache: %s)", settings.HF_CACHE_DIR)

    # ── Public API ──

    def is_available(self) -> bool:
        """Return whether the service considers itself available."""
        return self._available

    def load_model(
        self, model_name: str, use_quantization: bool = True
    ) -> Tuple[Any, Any]:
        """
        Load a model and tokenizer from HuggingFace Hub or local cache.

        Args:
            model_name: Model identifier (e.g. "meta-llama/Llama-3.2-3B-Instruct")
            use_quantization: Apply 4-bit quantization (ignored for tiny models).

        Returns:
            (model, tokenizer)
        """
        # Return cached if available
        if not self.is_available():
            raise RuntimeError("HuggingFace dependencies are not available")

        # Return cached if available
        if model_name in self.models:
            logger.info("Model %s served from cache", model_name)
            return self.models[model_name], self.tokenizers[model_name]

        logger.info("Loading model: %s", model_name)

        try:
            # Local PEFT / LoRA fine-tuned model
            if model_name.startswith("./models/"):
                config = PeftConfig.from_pretrained(model_name)
                base_model = AutoModelForCausalLM.from_pretrained(
                    config.base_model_name_or_path,
                    device_map="auto",
                    trust_remote_code=True,
                    cache_dir=settings.HF_CACHE_DIR,
                )
                model = PeftModel.from_pretrained(base_model, model_name)
            else:
                model_kwargs: Dict[str, Any] = {
                    "device_map": "auto",
                    "trust_remote_code": True,
                    "cache_dir": settings.HF_CACHE_DIR,
                }
                if use_quantization and settings.USE_4BIT_QUANTIZATION and torch.cuda.is_available():
                    model_kwargs["quantization_config"] = self.quant_config

                model = AutoModelForCausalLM.from_pretrained(
                    model_name, **model_kwargs
                )

            tokenizer = AutoTokenizer.from_pretrained(
                model_name,
                trust_remote_code=True,
                padding_side="left",
                cache_dir=settings.HF_CACHE_DIR,
            )

            if tokenizer.pad_token is None:
                tokenizer.pad_token = tokenizer.eos_token

            # Cache
            self.models[model_name] = model
            self.tokenizers[model_name] = tokenizer

            logger.info("Model %s loaded successfully", model_name)
            return model, tokenizer

        except Exception as exc:
            logger.error("Failed to load model %s: %s", model_name, exc)
            self._available = False
            raise

    def create_pipeline(self, task: str, model_name: str, **kwargs) -> Optional[Any]:
        """
        Create (and cache) a HuggingFace ``pipeline``.

        Args:
            task: Pipeline type (e.g. "text-generation", "text2text-generation").
            model_name: The model to use.
            **kwargs: Extra arguments forwarded to ``pipeline()``.

        Returns:
            A HuggingFace pipeline object.
        """
        key = f"{task}_{model_name}"
        if key in self.pipelines:
            logger.info("Pipeline %s served from cache", key)
            return self.pipelines[key]

        try:
            model, tokenizer = self.load_model(model_name)

            pipe = pipeline(
                task,
                model=model,
                tokenizer=tokenizer,
                device_map="auto",
                **kwargs,
            )

            self.pipelines[key] = pipe
            self._available = True
            return pipe
        except Exception as exc:
            logger.error("Failed to create pipeline %s: %s", key, exc)
            self._available = False
            return None

    def generate(
        self,
        prompt: str,
        model_name: Optional[str] = None,
        max_new_tokens: int = 512,
        temperature: float = 0.1,
        **kwargs,
    ) -> Optional[str]:
        """Generate text with graceful fallback on model or runtime failures."""
        selected_model = model_name or settings.INTENT_MODEL
        pipe = self.create_pipeline(
            "text-generation",
            selected_model,
            max_new_tokens=max_new_tokens,
            temperature=temperature,
            do_sample=temperature > 0,
            **kwargs,
        )
        if pipe is None:
            return None

        try:
            result = pipe(prompt)
            if not result:
                return None
            return result[0].get("generated_text")
        except Exception as exc:
            logger.error("Generation failed for %s: %s", selected_model, exc)
            self._available = False
            return None

    def get_embeddings(self, texts: Union[str, List[str]]) -> Optional[List[List[float]]]:
        """
        Generate normalized embedding vectors via sentence-transformers.

        Args:
            texts: One or more text strings.

        Returns:
            List of embedding vectors (as plain Python lists).
        """
        try:
            if self.embeddings_model is None:
                self.embeddings_model = SentenceTransformer(
                    settings.EMBEDDING_MODEL,
                    cache_folder=settings.HF_CACHE_DIR,
                )

            if isinstance(texts, str):
                texts = [texts]

            embeddings = self.embeddings_model.encode(
                texts,
                convert_to_tensor=True,
                normalize_embeddings=True,
            )

            return embeddings.tolist()
        except Exception as exc:
            logger.error("Embedding generation failed: %s", exc)
            return None


# Singleton instance
hf_service = HuggingFaceService()
