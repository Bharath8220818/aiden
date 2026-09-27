"""Provider factory — resolves the correct AIProvider from config.

The active provider is controlled by `AI_PROVIDER` in the backend env:

    AI_PROVIDER=ollama           → OllamaProvider (default / local dev)
    AI_PROVIDER=huggingface      → HuggingFaceProvider (production fine-tuned)
    AI_PROVIDER=auto             → HuggingFaceProvider if HF_TOKEN present,
                                   else OllamaProvider

The factory is intentionally simple (no DI framework) — one singleton per
process.  Call `get_provider()` everywhere; never import a concrete provider
class outside of this module and the provider tests.
"""

from __future__ import annotations

from functools import lru_cache
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.ai.providers.base import AIProvider


@lru_cache(maxsize=1)
def get_provider() -> AIProvider:
    """Return the singleton AIProvider for this process."""
    from app.core.config import get_settings

    mode = (getattr(get_settings(), "AI_PROVIDER", None) or "ollama").lower().strip()

    if mode == "huggingface":
        from app.ai.providers.huggingface_provider import HuggingFaceProvider

        return HuggingFaceProvider()

    if mode == "auto":
        # Use HF when token is present, fall back to Ollama
        hf_token = getattr(get_settings(), "HF_TOKEN", None)
        if hf_token:
            from app.ai.providers.huggingface_provider import HuggingFaceProvider

            return HuggingFaceProvider()

    # Default: Ollama (local / dev)
    from app.ai.providers.ollama_provider import OllamaProvider

    return OllamaProvider()


def reset_provider_cache() -> None:
    """Clear the singleton cache (test helper only)."""
    get_provider.cache_clear()
