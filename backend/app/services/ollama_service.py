import json
import logging
from typing import Optional, Dict, Any
import httpx
from app.config import settings

logger = logging.getLogger(__name__)


class OllamaService:
    """Service for interacting with local Ollama LLM."""

    def __init__(self):
        self.base_url = settings.LLM_BASE_URL.rstrip("/") if settings.LLM_BASE_URL else "http://localhost:11434"
        self.model = settings.LLM_MODEL or "llama3.2:1b"
        self._available = False
        self._check_availability()

    def _check_availability(self):
        try:
            response = httpx.get(f"{self.base_url}/api/tags", timeout=3.0)
            self._available = response.status_code == 200
            if self._available:
                models = response.json().get("models", [])
                model_names = [m.get("name") for m in models]
                logger.info(f"Ollama available. Models: {', '.join(model_names[:5])}")
            else:
                logger.warning("Ollama returned non-200 status")
        except Exception as e:
            self._available = False
            logger.warning(f"Ollama not available: {e}")

    def is_available(self) -> bool:
        return self._available

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.1,
        max_tokens: int = 512,
    ) -> Optional[str]:
        """Generate text using Ollama."""
        if not self._available:
            return None

        payload = {
            "model": self.model,
            "prompt": prompt,
            "system": system_prompt or "",
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
            },
            "stream": False,
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(f"{self.base_url}/api/generate", json=payload)
                if response.status_code == 200:
                    return response.json().get("response", "")
                logger.warning(f"Ollama returned {response.status_code}")
        except Exception as e:
            logger.warning(f"Ollama generation failed: {e}")
        return None

    async def chat(self, messages: list, temperature: float = 0.1) -> Optional[str]:
        """Chat completion using Ollama."""
        if not self._available:
            return None

        payload = {
            "model": self.model,
            "messages": messages,
            "options": {"temperature": temperature},
            "stream": False,
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(f"{self.base_url}/api/chat", json=payload)
                if response.status_code == 200:
                    return response.json().get("message", {}).get("content", "")
        except Exception as e:
            logger.warning(f"Ollama chat failed: {e}")
        return None


ollama_service = OllamaService()
