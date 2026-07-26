"""
Model Downloader
================
Downloads the HuggingFace models needed by AIDEN into the local cache.

Usage:
    python scripts/download_models.py                   # Download all models
    python scripts/download_models.py --model intent     # Intent model only
    python scripts/download_models.py --model embedding  # Embedding model only
    python scripts/download_models.py --model all        # All models (default)
    python scripts/download_models.py --skip-code        # Skip optional code model
"""

import argparse
import logging
import os
import sys
from pathlib import Path

# ── Path setup ──────────────────────────────────────────────────────────
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

# ── Models ──────────────────────────────────────────────────────────────

MODELS = {
    "intent": {
        "id": "TinyLlama/TinyLlama-1.1B-Chat-v1.0",
        "type": "causal_lm",
        "size": "~2.2 GB",
        "info": "TinyLlama 1.1B Chat — intent parser model (no gating required)",
    },
    "embedding": {
        "id": "sentence-transformers/all-MiniLM-L6-v2",
        "type": "embedding",
        "size": "~90 MB",
        "info": "MiniLM-L6-v2 — embeddings for RAG / semantic search",
    },
    "code": {
        "id": "HuggingFaceH4/starchat-beta",
        "type": "causal_lm",
        "size": "~15 GB",
        "info": "StarChat Beta — code generation (optional)",
        "optional": True,
    },
    "agent": {
        "id": "HuggingFaceTB/smolagents",
        "type": "causal_lm",
        "size": "~800 MB",
        "info": "SmolAgents — agent orchestration model",
    },
    "multimodal": {
        "id": "llava-hf/llava-v1.6-mistral-7b-hf",
        "type": "multimodal",
        "size": "~7 GB",
        "info": "LLaVA-Next-Mistral-7B — vision-language model for multimodal diagram analysis",
        "optional": True,
    },
}


class Downloader:
    """Handles downloading and caching of HuggingFace models."""

    def __init__(self, hf_token: str | None = None):
        self.hf_token = hf_token or os.getenv("HF_TOKEN")
        self.cache_dir = os.getenv("HF_CACHE_DIR", "./models/cache")
        self.has_cuda = self._check_cuda()

    def _check_cuda(self) -> bool:
        """Check if CUDA is available."""
        try:
            import torch
            return torch.cuda.is_available()
        except:
            return False

    def download_causal_lm(self, model_id: str) -> bool:
        """Download a causal LM (AutoModelForCausalLM)."""
        try:
            from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
            import torch

            logger.info("  → Downloading model: %s", model_id)

            # Try 4-bit quantization if CUDA available, else use CPU
            if self.has_cuda:
                try:
                    quantization_config = BitsAndBytesConfig(
                        load_in_4bit=True,
                        bnb_4bit_compute_dtype=torch.float16,
                        bnb_4bit_use_double_quant=True,
                    )
                    model = AutoModelForCausalLM.from_pretrained(
                        model_id,
                        token=self.hf_token,
                        cache_dir=self.cache_dir,
                        trust_remote_code=True,
                        device_map="auto",
                        quantization_config=quantization_config,
                    )
                except Exception as e:
                    logger.warning("  4-bit quantization failed: %s", e)
                    logger.info("  → Falling back to CPU mode...")
                    model = AutoModelForCausalLM.from_pretrained(
                        model_id,
                        token=self.hf_token,
                        cache_dir=self.cache_dir,
                        trust_remote_code=True,
                        device_map="cpu",
                    )
            else:
                logger.info("  → CUDA not available, using CPU mode...")
                model = AutoModelForCausalLM.from_pretrained(
                    model_id,
                    token=self.hf_token,
                    cache_dir=self.cache_dir,
                    trust_remote_code=True,
                    device_map="cpu",
                )

            logger.info("  ✓ Model downloaded (files saved to %s)", self.cache_dir)

            logger.info("  → Downloading tokenizer: %s", model_id)
            tokenizer = AutoTokenizer.from_pretrained(
                model_id,
                token=self.hf_token,
                cache_dir=self.cache_dir,
                trust_remote_code=True,
            )
            logger.info("  ✓ Tokenizer downloaded")

            # Quick sanity — encode + decode
            tokens = tokenizer.encode("Hello, world!", return_tensors="pt")
            decoded = tokenizer.decode(tokens[0])
            logger.info("  ✓ Sanity check passed: '%s' → %s tokens → '%s'", "Hello, world!", tokens.shape[-1], decoded[:50])
            return True

        except ImportError as e:
            logger.error("  ✗ Missing dependency: %s", e)
            logger.error("  → Run: pip install transformers torch accelerate")
            return False
        except Exception as exc:
            logger.error("  ✗ Failed to download %s: %s", model_id, exc)
            return False

    def download_multimodal(self, model_id: str) -> bool:
        """Download a multimodal vision-language model (LLaVA / Qwen-VL)."""
        try:
            from transformers import LlavaNextForConditionalGeneration, AutoProcessor

            logger.info("  -> Downloading multimodal model: %s", model_id)
            processor = AutoProcessor.from_pretrained(
                model_id,
                cache_dir=self.cache_dir,
                trust_remote_code=True,
            )
            logger.info("  -> Processor downloaded")

            model = LlavaNextForConditionalGeneration.from_pretrained(
                model_id,
                cache_dir=self.cache_dir,
                trust_remote_code=True,
                device_map="auto",
            )
            logger.info("  -> Model downloaded (files saved to %s)", self.cache_dir)

            logger.info("  -> Sanity check: model type = %s", model.config.model_type)
            logger.info("  -> Multimodal model downloaded successfully")
            return True

        except ImportError as e:
            logger.error("  -> Missing dependency: %s", e)
            logger.error("  -> Run: pip install transformers torch accelerate pillow")
            return False
        except Exception as exc:
            logger.error("  -> Failed to download %s: %s", model_id, exc)
            return False

    def download_embedding(self, model_id: str) -> bool:
        """Download a sentence-transformers embedding model."""
        try:
            from sentence_transformers import SentenceTransformer

            logger.info("  → Downloading embedding model: %s", model_id)
            model = SentenceTransformer(model_id, cache_folder=self.cache_dir)
            logger.info("  ✓ Model downloaded")

            # Quick sanity — encode a test sentence
            vec = model.encode("AIDEN data pipeline test", normalize_embeddings=True)
            logger.info("  ✓ Sanity check passed — embedding dimension: %d", len(vec))
            return True

        except ImportError as e:
            logger.error("  ✗ Missing dependency: %s", e)
            logger.error("  → Run: pip install sentence-transformers")
            return False
        except Exception as exc:
            logger.error("  ✗ Failed to download %s: %s", model_id, exc)
            return False

    def download(self, model_key: str) -> bool:
        """Download a specific model by key."""
        if model_key not in MODELS:
            logger.error("Unknown model key: %s (choose from: %s)", model_key, ", ".join(MODELS))
            return False

        info = MODELS[model_key]
        logger.info("─" * 60)
        logger.info("Model:  %s", info["id"])
        logger.info("Size:   %s", info["size"])
        logger.info("Type:   %s", info["info"])
        if info.get("optional"):
            logger.info("Note:   Optional model — can skip if storage is limited")

        os.makedirs(self.cache_dir, exist_ok=True)

        if info["type"] == "embedding":
            return self.download_embedding(info["id"])
        elif info["type"] == "multimodal":
            return self.download_multimodal(info["id"])
        else:
            return self.download_causal_lm(info["id"])


def main():
    parser = argparse.ArgumentParser(
        description="Download HuggingFace models for AIDEN",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python scripts/download_models.py              # Download all models
  python scripts/download_models.py --model intent  # Intent model only
  python scripts/download_models.py --model embedding  # Embedding model only
  python scripts/download_models.py --skip-code      # Skip optional code model
        """,
    )
    parser.add_argument(
        "--model",
        "-m",
        choices=list(MODELS.keys()) + ["all"],
        default="all",
        help="Which model to download (default: all)",
    )
    parser.add_argument(
        "--token",
        "-t",
        default=None,
        help="HuggingFace access token (or set HF_TOKEN env var)",
    )
    parser.add_argument(
        "--skip-code",
        action="store_true",
        help="Skip downloading the optional code model (StarChat)",
    )
    parser.add_argument(
        "--skip-agent",
        action="store_true",
        help="Skip downloading the agent model",
    )
    args = parser.parse_args()

    logger.info("")
    logger.info("╔══════════════════════════════════════════════════════╗")
    logger.info("║        AIDEN — HuggingFace Model Downloader        ║")
    logger.info("╚══════════════════════════════════════════════════════╝")
    logger.info("")

    # Warn about missing token
    token = args.token or os.getenv("HF_TOKEN")
    if not token:
        logger.warning(
            "⚠ No HF_TOKEN found. Some models require authentication.\n"
            "  Get your token at https://huggingface.co/settings/tokens\n"
            "  Then set it:  export HF_TOKEN=hf_...\n"
        )

    downloader = Downloader(hf_token=token)

    # Determine which models to download
    keys = list(MODELS.keys()) if args.model == "all" else [args.model]

    if args.skip_code and "code" in keys:
        keys.remove("code")
        logger.info("ℹ Skipping code model (--skip-code)")

    if args.skip_agent and "agent" in keys:
        keys.remove("agent")
        logger.info("ℹ Skipping agent model (--skip-agent)")

    results = {}

    for key in keys:
        logger.info("")
        results[key] = downloader.download(key)

    # Summary
    logger.info("")
    logger.info("─" * 60)
    success_count = sum(1 for v in results.values() if v)
    total_count = len(results)
    logger.info("Summary: %d / %d models downloaded successfully", success_count, total_count)

    for key, ok in results.items():
        status = "✓" if ok else "✗"
        logger.info("  %s %s — %s", status, key, MODELS[key]["id"])

    if success_count < total_count:
        logger.info("")
        logger.info("💡 If you're having issues, try using Ollama instead:")
        logger.info("   1. Install Ollama from https://ollama.com")
        logger.info("   2. Run: ollama pull llama3.2:3b")
        logger.info("   3. Set USE_OLLAMA=true in .env")

    return 0 if all(results.values()) else 1


if __name__ == "__main__":
    sys.exit(main())