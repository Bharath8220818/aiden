from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List, Optional


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
    LLM_MODEL: str = "llama3"

    # JWT
    JWT_SECRET_KEY: str = "your-jwt-secret-key"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
    ]

    # ── Hugging Face Settings ──
    HF_TOKEN: Optional[str] = None
    HF_CACHE_DIR: str = "./models/cache"
    USE_4BIT_QUANTIZATION: bool = True

    # Model Selection
    INTENT_MODEL: str = "meta-llama/Llama-3.2-3B-Instruct"
    AGENT_MODEL: str = "HuggingFaceTB/SmolAgent"
    CODE_MODEL: str = "HuggingFaceH4/starchat-beta"
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug(cls, value):
        if isinstance(value, str) and value.lower() in {"release", "prod", "production"}:
            return False
        return value

    # Supabase Settings
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
