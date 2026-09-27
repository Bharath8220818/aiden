"""Abstract AI provider interface.

Every concrete provider (Ollama, HuggingFace, LocalTransformers) must
implement this interface.  The rest of the backend imports only from here —
never from a concrete provider module directly.
"""

from __future__ import annotations

from abc import ABC, abstractmethod

# Canonical exception hierarchy — single source of truth is
# app.services.ai_client (the ~11 production fallback call sites catch it
# from there).  Re-exported here so app.ai.providers and the services layer
# raise/catch the SAME classes.  Never re-define these.
from app.services.ai_client import AIServiceError, AIServiceUnavailable  # noqa: F401


class AIProvider(ABC):
    """Abstract interface for all AIDEN model backends."""

    # ------------------------------------------------------------------ #
    # Core completion
    # ------------------------------------------------------------------ #
    @abstractmethod
    async def chat(
        self,
        prompt: str,
        *,
        system: str | None = None,
        model: str | None = None,
        json_mode: bool = True,
    ) -> str:
        """One-shot chat completion.  Returns raw text.

        Raises:
            AIServiceError  – backend unreachable or returned garbage.
        """

    async def chat_json(
        self,
        prompt: str,
        *,
        system: str | None = None,
        model: str | None = None,
    ) -> dict:
        """Chat completion parsed as a JSON object.

        Default implementation calls `self.chat(json_mode=True)` and parses.
        Concrete providers may override for efficiency.
        """
        import json

        raw = await self.chat(prompt, system=system, model=model, json_mode=True)
        try:
            data = json.loads(raw)
            if not isinstance(data, dict):
                raise ValueError("not a JSON object")
            return data
        except (json.JSONDecodeError, ValueError) as exc:
            raise AIServiceError(f"Provider returned invalid JSON: {raw[:120]}") from exc

    # ------------------------------------------------------------------ #
    # Embeddings
    # ------------------------------------------------------------------ #
    @abstractmethod
    async def embed(self, texts: list[str]) -> list[list[float]]:
        """Batch text embeddings.

        Raises:
            AIServiceError  – backend unreachable or wrong vector count.
        """

    # ------------------------------------------------------------------ #
    # Health
    # ------------------------------------------------------------------ #
    @abstractmethod
    async def available(self, model: str | None = None) -> bool:
        """Return True when the backend is reachable (and serves `model`)."""
