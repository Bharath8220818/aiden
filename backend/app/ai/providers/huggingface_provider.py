"""Hugging Face Inference API provider — stub for Phase 13+.

This provider reads `HF_TOKEN` and `HF_BASE_URL` from the application
settings and routes completions through the Hugging Face serverless
Inference API.

Current state:
  - `available()` returns False when HF_TOKEN is absent (safe default).
  - `chat()` / `embed()` raise AIServiceUnavailable when unconfigured.
  - The model ref format expected: "Bharath-k-s/AIDEN-requirement-agent"
    (a Hugging Face repo ID, resolved from the model registry).

Activation (Phase 13):
  Set in backend .env:
      AI_PROVIDER=huggingface
      HF_TOKEN=hf_...
      HF_BASE_URL=https://api-inference.huggingface.co

The token is NEVER forwarded to the frontend — FastAPI owns it.

TODO (Phase 13):
  - Wire the real HF /models/<repo>/chat/completions endpoint.
  - Add retry + exponential back-off for rate-limit responses (429).
  - Add embed support via the HF feature-extraction endpoint.
"""

from __future__ import annotations

import time

import httpx

from app.ai.providers.base import AIProvider, AIServiceError, AIServiceUnavailable
from app.core.config import get_settings

_CHAT_TIMEOUT = 60.0
_EMBED_TIMEOUT = 30.0
_probe_cache: dict[str, tuple[bool, float]] = {}
_PROBE_TTL = 60.0


def _hf_token() -> str | None:
    return getattr(get_settings(), "HF_TOKEN", None) or None


def _hf_base_url() -> str:
    url = getattr(get_settings(), "HF_BASE_URL", None)
    return (url or "https://api-inference.huggingface.co").rstrip("/")


class HuggingFaceProvider(AIProvider):
    """Routes completions to the Hugging Face Inference API.

    Raises AIServiceUnavailable when HF_TOKEN is not set.
    """

    def _require_token(self) -> str:
        token = _hf_token()
        if not token:
            raise AIServiceUnavailable(
                "HF_TOKEN is not configured — set it in backend/.env and ensure AI_PROVIDER=huggingface"
            )
        return token

    async def available(self, model: str | None = None) -> bool:
        token = _hf_token()
        if not token:
            return False
        cache_key = f"hf:{model or '*'}"
        cached = _probe_cache.get(cache_key)
        now = time.monotonic()
        if cached and now - cached[1] < _PROBE_TTL:
            return cached[0]
        ok = False
        try:
            base = _hf_base_url()
            url = f"{base}/models/{model}" if model else f"{base}/models"
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(url, headers={"Authorization": f"Bearer {token}"})
                ok = resp.status_code < 500
        except Exception:
            ok = False
        _probe_cache[cache_key] = (ok, now)
        return ok

    async def chat(
        self,
        prompt: str,
        *,
        system: str | None = None,
        model: str | None = None,
        json_mode: bool = True,
    ) -> str:
        """POST to HF /models/<repo>/v1/chat/completions (OpenAI-compat endpoint).

        NOTE: This requires the model to be hosted on HF Inference Endpoints
        or an Inference Provider that supports the chat completions API.
        """
        token = self._require_token()
        if not model:
            raise AIServiceError("HuggingFaceProvider requires an explicit model repo id")

        base = _hf_base_url()
        url = f"{base}/models/{model}/v1/chat/completions"
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        payload: dict = {"model": model, "messages": messages, "stream": False}
        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        try:
            async with httpx.AsyncClient(timeout=_CHAT_TIMEOUT) as client:
                resp = await client.post(
                    url,
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )
                resp.raise_for_status()
                data = resp.json()
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        except httpx.HTTPStatusError as exc:
            raise AIServiceError(
                f"HF backend returned {exc.response.status_code}: {exc.response.text[:200]}"
            ) from exc
        except Exception as exc:
            raise AIServiceError(f"HF backend unreachable: {exc}") from exc

        if not content.strip():
            raise AIServiceError("HF model returned an empty completion")
        return content

    async def embed(self, texts: list[str]) -> list[list[float]]:
        """Feature extraction endpoint — returns sentence embeddings.

        TODO Phase 13: choose the correct HF embedding model (e.g.
        sentence-transformers/all-MiniLM-L6-v2) and expose via settings.
        """
        token = self._require_token()
        base = _hf_base_url()
        embed_model = (
            getattr(get_settings(), "HF_EMBED_MODEL", None) or "sentence-transformers/all-MiniLM-L6-v2"
        )
        url = f"{base}/models/{embed_model}"

        try:
            async with httpx.AsyncClient(timeout=_EMBED_TIMEOUT) as client:
                resp = await client.post(
                    url,
                    headers={"Authorization": f"Bearer {token}"},
                    json={"inputs": texts},
                )
                resp.raise_for_status()
                vectors = resp.json()
        except httpx.HTTPStatusError as exc:
            raise AIServiceError(f"HF embed returned {exc.response.status_code}") from exc
        except Exception as exc:
            raise AIServiceError(f"HF embed unreachable: {exc}") from exc

        if not isinstance(vectors, list) or len(vectors) != len(texts):
            raise AIServiceError(f"HF embed returned unexpected shape for {len(texts)} inputs")
        return vectors
