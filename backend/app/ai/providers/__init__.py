"""AI provider abstraction layer.

Exports the abstract base class and the provider factory.  Concrete
providers live alongside this package:

    OllamaProvider        — wraps the existing ai_client (Ollama /api/chat)
    HuggingFaceProvider   — Hugging Face Inference API (HF_TOKEN required)
    LocalTransformersProvider — future: in-process transformers + PEFT
"""

from app.ai.providers.base import AIProvider, AIServiceError, AIServiceUnavailable
from app.ai.providers.factory import get_provider

__all__ = [
    "AIProvider",
    "AIServiceError",
    "AIServiceUnavailable",
    "get_provider",
]
