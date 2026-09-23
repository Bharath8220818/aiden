"""AI client — Ollama-backed intent analysis, blueprint generation, SQL assist.

Design:
- `ollama_available()` probes `${OLLAMA_URL}/api/tags` once per process and
  caches the result (60 s TTL) so requests never pay the probe cost twice.
- `chat()` wraps `POST /api/chat` (JSON mode) with a hard timeout; any
  failure raises `AIServiceError`, and callers fall back to the heuristic
  synthesizers — the frontend contracts never break because the model is
  down, slow, or absent.
"""

from __future__ import annotations

import json
import re
import time

import httpx

from app.core.config import get_settings


class AIServiceError(RuntimeError):
    """Raised when the model backend is unavailable or returns garbage."""


class AIServiceUnavailable(AIServiceError):
    """OLLAMA_URL not configured."""


_probe_cache: dict[str, tuple[bool, float]] = {}
PROBE_TTL_SECONDS = 60.0
CHAT_TIMEOUT_SECONDS = 45.0
EMBED_TIMEOUT_SECONDS = 30.0
EMBED_MODEL = "nomic-embed-text"


def embedding_model() -> str:
    """Embedding model name used by the RAG memory layer (override via env)."""
    return get_settings().AI_EMBEDDING_MODEL or EMBED_MODEL


def ollama_base_url() -> str | None:
    url = get_settings().OLLAMA_URL
    return url.rstrip("/") if url else None


async def ollama_available(model: str | None = None) -> bool:
    """True when Ollama answers /api/tags (and, if given, lists `model`)."""
    base = ollama_base_url()
    if not base:
        return False
    key = f"{base}:{model or '*'}"
    cached = _probe_cache.get(key)
    now = time.monotonic()
    if cached and now - cached[1] < PROBE_TTL_SECONDS:
        return cached[0]
    available = False
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.get(f"{base}/api/tags")
            if resp.status_code < 500:
                models = {m.get("name", "") for m in resp.json().get("models", [])}
                available = True if not model else any(m == model or m.split(":")[0] == model for m in models)
    except Exception:
        available = False
    _probe_cache[key] = (available, now)
    return available


async def chat(
    prompt: str,
    *,
    system: str | None = None,
    model: str | None = None,
    json_mode: bool = True,
) -> str:
    """One-shot chat completion. Raises AIServiceError on any failure."""
    base = ollama_base_url()
    if not base:
        raise AIServiceUnavailable("OLLAMA_URL is not configured")
    payload = {
        "model": model or get_settings().AI_MODEL,
        "messages": ([{"role": "system", "content": system}] if system else [])
        + [{"role": "user", "content": prompt}],
        "stream": False,
    }
    if json_mode:
        payload["format"] = "json"
    try:
        async with httpx.AsyncClient(timeout=CHAT_TIMEOUT_SECONDS) as client:
            resp = await client.post(f"{base}/api/chat", json=payload)
            resp.raise_for_status()
            content = resp.json().get("message", {}).get("content", "")
    except httpx.HTTPStatusError as exc:
        raise AIServiceError(f"Model backend returned {exc.response.status_code}") from exc
    except Exception as exc:
        raise AIServiceError(f"Model backend unreachable: {exc}") from exc
    if not content.strip():
        raise AIServiceError("Model returned an empty completion")
    return content


async def chat_json(prompt: str, *, system: str | None = None, model: str | None = None) -> dict:
    """Chat completion parsed as a JSON object."""
    raw = await chat(prompt, system=system, model=model, json_mode=True)
    try:
        data = json.loads(raw)
        if not isinstance(data, dict):
            raise ValueError("not an object")
        return data
    except (json.JSONDecodeError, ValueError) as exc:
        raise AIServiceError(f"Model returned invalid JSON: {raw[:120]}") from exc


async def embeddings_available() -> bool:
    """True when Ollama is reachable AND serves the embedding model."""
    return await ollama_available(model=embedding_model())


async def embed(texts: list[str]) -> list[list[float]]:
    """Batch embeddings via Ollama /api/embed. Raises AIServiceError on failure.

    Callers should probe `embeddings_available()` first and fall back to the
    keyword retriever when the embedding model is not pulled.
    """
    base = ollama_base_url()
    if not base:
        raise AIServiceUnavailable("OLLAMA_URL is not configured")
    if not texts:
        return []
    try:
        async with httpx.AsyncClient(timeout=EMBED_TIMEOUT_SECONDS) as client:
            resp = await client.post(
                f"{base}/api/embed",
                json={"model": embedding_model(), "input": texts},
            )
            resp.raise_for_status()
            vectors = resp.json().get("embeddings", [])
    except httpx.HTTPStatusError as exc:
        raise AIServiceError(f"Embedding backend returned {exc.response.status_code}") from exc
    except Exception as exc:
        raise AIServiceError(f"Embedding backend unreachable: {exc}") from exc
    if len(vectors) != len(texts):
        raise AIServiceError(
            f"Embedding backend returned {len(vectors)} vectors for {len(texts)} inputs"
        )
    return vectors


# --------------------------------------------------------------------------- #
# Structured extraction helpers (shared by the AI-backed endpoints)
# --------------------------------------------------------------------------- #
def extract_topic(text: str) -> str:
    words = re.findall(r"[a-z_]{3,}", text.lower())
    topic = next(
        (
            w
            for w in words
            if w
            in {
                "orders",
                "order",
                "sales",
                "payments",
                "customers",
                "inventory",
                "fraud",
                "clickstream",
                "events",
            }
        ),
        words[0] if words else "orders",
    )
    return topic.rstrip("s") or "order"


def extract_json_object(text: str) -> dict:
    """Best-effort JSON object extraction from arbitrary model text."""
    text = text.strip()
    fence = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if fence:
        text = fence.group(1)
    try:
        data = json.loads(text)
        return data if isinstance(data, dict) else {}
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start >= 0 and end > start:
            try:
                data = json.loads(text[start : end + 1])
                return data if isinstance(data, dict) else {}
            except json.JSONDecodeError:
                return {}
    return {}
