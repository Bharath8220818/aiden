"""
Hugging Face Service — Real LLM Integration
============================================
Handles model loading, 4-bit quantization, pipelines, embeddings, and
fine-tuned model support via PEFT. Singleton pattern with graceful
fallback when dependencies are unavailable.

Architecture:
    ┌──────────────────────┐
    │  HuggingFaceService  │  (Singleton)
    │  ┌────────────────┐  │
    │  │ model cache     │  │  AutoModelForCausalLM instances
    │  │ pipeline cache  │  │  text-generation, etc.
    │  │ embedding model │  │  SentenceTransformer for RAG
    │  └────────────────┘  │
    └──────────────────────┘
"""

import logging
import os
from typing import Any, Dict, List, Optional, Tuple, Union

from app.config import settings

logger = logging.getLogger(__name__)

# ── Deferred heavy imports (loaded on first use, not at import time) ──────
# This avoids importing torch/transformers at module load, saving ~200-500 MB RAM
# on startup — critical for Render free tier (512 MiB).
torch = None
SentenceTransformer = None
AutoModelForCausalLM = AutoTokenizer = BitsAndBytesConfig = hf_pipeline = None
PeftModel = PeftConfig = None
HF_AVAILABLE = False
PEFT_AVAILABLE = False
_HF_IMPORTS_LOADED = False


def _load_hf_imports():
    """Lazily import torch, transformers, and related libraries."""
    global torch, SentenceTransformer, AutoModelForCausalLM, AutoTokenizer
    global BitsAndBytesConfig, hf_pipeline, PeftModel, PeftConfig
    global HF_AVAILABLE, PEFT_AVAILABLE, _HF_IMPORTS_LOADED
    if _HF_IMPORTS_LOADED:
        return
    _HF_IMPORTS_LOADED = True

    try:
        import torch as _torch
        from sentence_transformers import SentenceTransformer as ST
        from transformers import (
            AutoModelForCausalLM as AF,
            AutoTokenizer as AT,
            BitsAndBytesConfig as BQ,
            pipeline as hp,
        )
        torch = _torch
        SentenceTransformer = ST
        AutoModelForCausalLM = AF
        AutoTokenizer = AT
        BitsAndBytesConfig = BQ
        hf_pipeline = hp
        HF_AVAILABLE = True
        logger.info("HuggingFace dependencies loaded successfully")
    except ImportError as exc:
        HF_AVAILABLE = False
        logger.warning(f"HuggingFace dependencies not fully installed: {exc}")

    try:
        from peft import PeftModel as PM, PeftConfig as PC
        PeftModel = PM
        PeftConfig = PC
        PEFT_AVAILABLE = True
    except ImportError:
        PEFT_AVAILABLE = False


class HuggingFaceService:
    """
    Centralized HuggingFace service with:
    - 4-bit quantization for memory efficiency
    - Model caching to avoid re-downloading
    - Pipeline creation for various tasks
    - Embedding generation for RAG via sentence-transformers
    - Fine-tuned (PEFT/LoRA) model support
    - Graceful fallback when models fail

    Usage:
        from app.services.hf_service import hf_service

        # Get embeddings for RAG
        vectors = hf_service.get_embeddings("some text")

        # Create a text-generation pipeline
        pipe = hf_service.create_pipeline("text-generation", "meta-llama/Llama-3.2-3B-Instruct")
        result = pipe("Build a pipeline", max_new_tokens=100)
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
        self.embeddings_model: Optional[SentenceTransformer] = None
        self._available = False

        # Ensure cache directory exists
        os.makedirs(settings.HF_CACHE_DIR, exist_ok=True)

        # ── Load heavy imports lazily (torch, transformers, sentence_transformers) ──
        _load_hf_imports()

        if not HF_AVAILABLE:
            logger.warning(
                "HuggingFace dependencies not fully installed. "
                "The service will run in fallback mode."
            )
            return

        # 4-bit quantization config
        try:
            self.quant_config = BitsAndBytesConfig(
                load_in_4bit=settings.USE_4BIT_QUANTIZATION,
                bnb_4bit_compute_dtype=torch.float16,
                bnb_4bit_use_double_quant=True,
            )
            # Sanity check: verify HF Hub is reachable (non-blocking)
            # Avoid downloading a full model — just check imports + cache dir
            try:
                # Quick import check
                from transformers import AutoModel
                self._available = True
                logger.info("HuggingFace environment verified (imports OK)")
            except Exception as sanity_err:
                logger.warning("HF Hub sanity check failed: %s", sanity_err)
                self._available = False
        except Exception as exc:
            logger.warning("Could not initialize quantization config: %s", exc)
            self._available = False

    # ── Status ─────────────────────────────────────────────────────────

    def is_available(self) -> bool:
        """Check if HuggingFace models can be loaded."""
        return self._available

    # ── Model Loading ─────────────────────────────────────────────────

    def load_model(
        self,
        model_name: str,
        use_quantization: bool = True,
    ) -> Tuple[Any, Any]:
        """
        Load a model from Hugging Face Hub or local cache.

        Args:
            model_name: Model identifier (e.g. "meta-llama/Llama-3.2-3B-Instruct")
            use_quantization: Whether to use 4-bit quantization

        Returns:
            Tuple of (model, tokenizer)

        Raises:
            RuntimeError: If HF dependencies are not available
        """
        if not self._available:
            raise RuntimeError("HuggingFace dependencies are not available")

        if model_name in self.models:
            logger.info("Model %s loaded from cache", model_name)
            return self.models[model_name], self.tokenizers[model_name]

        logger.info("Loading model: %s", model_name)

        try:
            # Check if this is a local fine-tuned model
            is_peft = model_name.startswith("./models/") or (
                os.path.isdir(model_name) and os.path.exists(os.path.join(model_name, "adapter_config.json"))
            )
            if is_peft:
                if not PEFT_AVAILABLE:
                    raise RuntimeError(
                        "Cannot load PEFT/LoRA model — peft is not installed. "
                        "Install it with: pip install peft"
                    )
                config = PeftConfig.from_pretrained(model_name)
                base_model = AutoModelForCausalLM.from_pretrained(
                    config.base_model_name_or_path,
                    device_map="auto",
                    trust_remote_code=True,
                    cache_dir=settings.HF_CACHE_DIR,
                )
                model = PeftModel.from_pretrained(base_model, model_name)
            else:
                # Load from Hugging Face Hub
                model_kwargs = {
                    "device_map": "auto",
                    "trust_remote_code": True,
                    "cache_dir": settings.HF_CACHE_DIR,
                }

                if use_quantization and settings.USE_4BIT_QUANTIZATION:
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

            # Cache
            self.models[model_name] = model
            self.tokenizers[model_name] = tokenizer

            logger.info("Model %s loaded successfully", model_name)
            return model, tokenizer

        except Exception as exc:
            logger.error("Failed to load model %s: %s", model_name, exc)
            self._available = False
            raise

    # ── Pipeline Creation ────────────────────────────────────────────

    def create_pipeline(
        self,
        task: str,
        model_name: str,
        **kwargs,
    ) -> Optional[Any]:
        """
        Create a Hugging Face pipeline with caching.

        Args:
            task: Pipeline task (e.g. "text-generation")
            model_name: Model to use
            **kwargs: Additional pipeline arguments

        Returns:
            Pipeline object, or None on failure
        """
        if not self._available:
            return None

        key = f"{task}_{model_name}"
        if key in self.pipelines:
            return self.pipelines[key]

        try:
            model, tokenizer = self.load_model(model_name)
            pipe = hf_pipeline(
                task,
                model=model,
                tokenizer=tokenizer,
                device_map="auto",
                **kwargs,
            )
            self.pipelines[key] = pipe
            return pipe

        except Exception as exc:
            logger.error("Failed to create pipeline %s: %s", key, exc)
            return None

    # ── Text Generation ───────────────────────────────────────────────

    def generate(
        self,
        prompt: str,
        model_name: Optional[str] = None,
        max_new_tokens: int = 512,
        temperature: float = 0.1,
        **kwargs,
    ) -> Optional[str]:
        """
        Generate text using a model.

        Args:
            prompt: Input prompt
            model_name: Model to use (defaults to INTENT_MODEL)
            max_new_tokens: Maximum tokens to generate
            temperature: Sampling temperature

        Returns:
            Generated text, or None if generation fails
        """
        if not self._available:
            logger.info("HF unavailable — skipping generation")
            return None

        model_name = model_name or settings.INTENT_MODEL

        try:
            pipe = self.create_pipeline(
                "text-generation",
                model_name,
                max_new_tokens=max_new_tokens,
                temperature=temperature,
                do_sample=True,
                **kwargs,
            )

            if pipe is None:
                return None

            result = pipe(prompt)
            return result[0]["generated_text"]

        except Exception as exc:
            logger.error("Generation failed: %s", exc)
            return None

    # ── Embeddings (RAG) ──────────────────────────────────────────────

    def get_embeddings(
        self,
        texts: Union[str, List[str]],
    ) -> Optional[List[List[float]]]:
        """
        Generate embeddings using sentence-transformers.

        Useful for RAG (Retrieval-Augmented Generation), semantic search,
        and clustering.

        Args:
            texts: Single text string or list of text strings

        Returns:
            List of embedding vectors, or None if unavailable
        """
        if not self._available:
            return None

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
