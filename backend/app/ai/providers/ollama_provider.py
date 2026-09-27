"""Ollama AI provider — wraps the existing ai_client transport.

This is a thin adapter over `app.services.ai_client` so the rest of the
codebase can talk through the `AIProvider` interface without any behaviour
change.  All Ollama-specific logic (probe cache, JSON mode, embed endpoint)
stays in ai_client.py — this file just delegates.
"""

from __future__ import annotations

from app.ai.providers.base import AIProvider
from app.services import ai_client as _ollama


class OllamaProvider(AIProvider):
    """Delegates to the existing Ollama ai_client module."""

    async def chat(
        self,
        prompt: str,
        *,
        system: str | None = None,
        model: str | None = None,
        json_mode: bool = True,
    ) -> str:
        # Canonical ai_client exceptions propagate unchanged.
        return await _ollama.chat(prompt, system=system, model=model, json_mode=json_mode)

    async def chat_json(
        self,
        prompt: str,
        *,
        system: str | None = None,
        model: str | None = None,
    ) -> dict:
        return await _ollama.chat_json(prompt, system=system, model=model)

    async def embed(self, texts: list[str]) -> list[list[float]]:
        return await _ollama.embed(texts)

    async def available(self, model: str | None = None) -> bool:
        return await _ollama.ollama_available(model)
