from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List, Optional
import logging
import subprocess
import sys

logger = logging.getLogger(__name__)

# ── CUDA availability check (safe subprocess with timeout) ──
# Both `import torch` and `torch.cuda.is_available()` can hang indefinitely
# on Windows without an NVIDIA GPU. We use a subprocess with a 5-second
# timeout to check safely. The result is cached after the first check.
_CUDA_AVAILABLE: Optional[bool] = None


def _check_cuda() -> bool:
    """Check CUDA availability once and cache the result.

    Uses a subprocess with a 3-second timeout and PYTORCH_NO_CUDA=1
    to avoid hanging the main process on Windows machines without
    an NVIDIA GPU where ``import torch`` can block indefinitely.
    """
    global _CUDA_AVAILABLE
    if _CUDA_AVAILABLE is not None:
        return _CUDA_AVAILABLE

    # Fast early exit: if PYTORCH_NO_CUDA is set, skip the subprocess entirely
    if __import__("os").environ.get("PYTORCH_NO_CUDA"):
        _CUDA_AVAILABLE = False
        return _CUDA_AVAILABLE

    try:
        # The inner subprocess must receive PYTORCH_NO_CUDA so that
        # ``import torch`` does not hang inside the child process.
        child_env = {**__import__("os").environ, "PYTORCH_NO_CUDA": "1"}
        result = subprocess.run(
            [sys.executable, "-c", "import torch; print(torch.cuda.is_available())"],
            capture_output=True, text=True, timeout=3,
            env=child_env,
        )
        _CUDA_AVAILABLE = result.stdout.strip() == "True"
    except Exception:
        _CUDA_AVAILABLE = False
    return _CUDA_AVAILABLE


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "AIDEN"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    SECRET_KEY: str = "your-secret-key-here-change-in-production"

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./aiden.db"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Qdrant Vector DB
    QDRANT_URL: str = "http://localhost:6333"

    # MinIO (S3 Storage)
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET: str = "aiden-pipelines"

    # LLM (Ollama)
    LLM_BASE_URL: str = "http://localhost:11434"
    LLM_MODEL: str = "llama3.2:1b"

    # JWT
    JWT_SECRET_KEY: str = "your-jwt-secret-key"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440

    # CORS — Allow all origins in production for Render + Vercel
    CORS_ORIGINS: Optional[List[str]] = []

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, value):
        if isinstance(value, str):
            raw = value.strip()
            if not raw:
                return []
            if raw.startswith("[") and raw.endswith("]"):
                import json
                try:
                    result = json.loads(raw)
                    if isinstance(result, list):
                        return result
                except json.JSONDecodeError:
                    pass
            origins = [o.strip().strip('"').strip("'") for o in raw.split(",") if o.strip()]
            return origins
        if isinstance(value, list):
            return value
        return []

    # ── Airflow Settings ──
    AIRFLOW_URL: Optional[str] = None
    AIRFLOW_USERNAME: Optional[str] = None
    AIRFLOW_PASSWORD: Optional[str] = None

    # ── OpenAI Settings ──
    OPENAI_API_KEY: Optional[str] = None

    # ── Hugging Face Settings ──
    HF_TOKEN: Optional[str] = None
    HF_CACHE_DIR: str = "./models/cache"
    USE_4BIT_QUANTIZATION: bool = True

    # Model Selection
    INTENT_MODEL: str = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"
    AGENT_MODEL: str = "HuggingFaceTB/SmolAgent"
    CODE_MODEL: str = "HuggingFaceH4/starchat-beta"
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug(cls, value):
        if isinstance(value, str) and value.lower() in {"release", "prod", "production"}:
            return False
        return value

    # ── RAG Settings ──
    RAG_TOP_K: int = 3
    RAG_MIN_SCORE: float = 0.4
    QDRANT_COLLECTION: str = "pipeline_intents"

    # ── Multimodal Settings (auto-disabled on CPU-only machines) ──
    MULTIMODAL_ENABLED: bool = False
    MULTIMODAL_MODEL: str = "llava-hf/llava-v1.6-mistral-7b-hf"
    MULTIMODAL_ADAPTER_PATH: str = "./models/adapters/multimodal"
    MULTIMODAL_REMOTE_URL: Optional[str] = None

    @field_validator("MULTIMODAL_ENABLED", mode="before")
    @classmethod
    def enforce_cuda_requirement(cls, value):
        """Force MULTIMODAL_ENABLED to False when CUDA is unavailable."""
        if not _check_cuda():
            if value is True or (isinstance(value, str) and value.lower() in ("true", "1", "yes")):
                logger.warning(
                    "CUDA is not available — forcing MULTIMODAL_ENABLED=False. "
                    "Multimodal inference (LLaVA 7B) requires a GPU."
                )
            return False
        return value

    # Supabase Settings
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
