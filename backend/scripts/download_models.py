"""
Model Downloader
================
Downloads the HuggingFace models needed by AIDEN into the local cache.

Usage:
    python scripts/download_models.py                   # Download all models
    python scripts/download_models.py --model intent     # Intent model only
    python scripts/download_models.py --model embedding  # Embedding model only
    python scripts/download_models.py --model all        # All models (default)
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
        "id": "meta-llama/Llama-3.2-3B-Instruct",
        "type": "causal_lm",
        "size": "~6 GB",
        "info": "Llama 3.2 3B — default intent parser model",
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
    },
    "agent": {
        "id": "HuggingFaceTB/SmolAgent",
        "type": "causal_lm",
        "size": "~800 MB",
        "info": "SmolAgent — agent orchestration model",
    },
}


class Downloader:
    """Handles downloading and caching of HuggingFace models."""

    def __init__(self, hf_token: str | None = None):
        self.hf_token = hf_token or os.getenv("HF_TOKEN")
        self.cache_dir = os.getenv("HF_CACHE_DIR", "./models/cache")

    def download_causal_lm(self, model_id: str) -> bool:
        """Download a causal LM (AutoModelForCausalLM)."""
        try:
            from transformers import AutoModelForCausalLM, AutoTokenizer

            logger.info("  → Downloading model: %s", model_id)
            model = AutoModelForCausalLM.from_pretrained(
                model_id,
                token=self.hf_token,
                cache_dir=self.cache_dir,
                trust_remote_code=True,
                device_map="auto",
                load_in_4bit=True,
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

        except Exception as exc:
            logger.error("  ✗ Failed to download %s: %s", model_id, exc)
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

        except Exception as exc:
            logger.error("  ✗ Failed to download %s: %s", model_id, exc)
            return False

    def download(self, model_key: str) -> bool:
        """Download a specific model by key ('intent', 'embedding', 'code', 'agent')."""
        if model_key not in MODELS:
            logger.error("Unknown model key: %s (choose from: %s)", model_key, ", ".join(MODELS))
            return False

        info = MODELS[model_key]
        logger.info("─" * 60)
        logger.info("Model:  %s", info["id"])
        logger.info("Size:   %s", info["size"])
        logger.info("Type:   %s", info["info"])

        os.makedirs(self.cache_dir, exist_ok=True)

        if info["type"] == "embedding":
            return self.download_embedding(info["id"])
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
    args = parser.parse_args()

    logger.info("")
    logger.info("╔══════════════════════════════════════════════════════╗")
    logger.info("║        AIDEN — HuggingFace Model Downloader        ║")
    logger.info("╚══════════════════════════════════════════════════════╝")
    logger.info("")

    # Warn about missing token for gated models
    token = args.token or os.getenv("HF_TOKEN")
    if not token:
        logger.warning(
            "⚠ No HF_TOKEN found. Some models (especially Llama) require authentication.\n"
            "  Get your token at https://huggingface.co/settings/tokens\n"
            "  Then set it:  export HF_TOKEN=hf_...\n"
        )

    downloader = Downloader(hf_token=token)
    keys = list(MODELS.keys()) if args.model == "all" else [args.model]
    results = {}

    for key in keys:
        logger.info("")
        results[key] = downloader.download(key)

    # Summary
    logger.info("")
    logger.info("─" * 60)
    success_count = sum(1 for v in results.values() if v)
    logger.info("Summary: %d / %d models downloaded successfully", success_count, len(results))
    for key, ok in results.items():
        status = "✓" if ok else "✗"
        logger.info("  %s %s — %s", status, key, MODELS[key]["id"])

    return 0 if all(results.values()) else 1


if __name__ == "__main__":
    sys.exit(main())
