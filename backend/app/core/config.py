"""Environment / configuration loading (pydantic-settings)."""

from __future__ import annotations

from functools import lru_cache

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings, loaded from environment variables and ``.env``."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    APP_NAME: str = "AIDEN Backend"
    APP_VERSION: str = "0.1.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"

    # API
    API_PREFIX: str = "/api/v1"

    # Database (async SQLAlchemy URL)
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/aiden"

    # Auxiliary / AI services (optional)
    REDIS_URL: str | None = None
    QDRANT_URL: str | None = None
    OLLAMA_URL: str | None = None
    AI_MODEL: str = "llama3.1"
    AI_EMBEDDING_MODEL: str = "nomic-embed-text"

    # Execution — Airflow (Sprint 4). Empty AIRFLOW_URL = execution adapter
    # reports `mode: unavailable` and callers degrade honestly.
    AIRFLOW_URL: str | None = None
    AIRFLOW_USERNAME: str | None = None
    AIRFLOW_PASSWORD: str | None = None
    AIRFLOW_DAGS_FOLDER: str = "/opt/airflow/dags"

    # Integration gateway — notification channels (spec §5/§10). All optional;
    # each degrades independently and never fails the calling operation.
    SMTP_HOST: str | None = None
    SMTP_PORT: int = 587
    SMTP_TLS: bool = True
    SMTP_USERNAME: str | None = None
    SMTP_PASSWORD: str | None = None
    SMTP_FROM: str | None = None
    SLACK_WEBHOOK_URL: str | None = None
    TEAMS_WEBHOOK_URL: str | None = None
    JIRA_URL: str | None = None
    JIRA_EMAIL: str | None = None
    JIRA_API_TOKEN: str | None = None
    JIRA_PROJECT_KEY: str | None = None
    FRONTEND_URL: str | None = None

    # Security
    SECRET_KEY: str = "aiden-insecure-dev-secret-change-me"
    JWT_SECRET: str = "aiden-insecure-dev-jwt-change-me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8  # 8h — matches frontend session TTL

    # CORS — comma-separated string in env; parsed list via `cors_origin_list`.
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    # API rate limit (requests per minute per client IP).
    RATE_LIMIT_PER_MINUTE: int = 60

    @property
    def cors_origin_list(self) -> list[str]:
        return [item.strip() for item in self.CORS_ORIGINS.split(",") if item.strip()]

    @field_validator("DATABASE_URL")
    @classmethod
    def _normalise_database_url(cls, v: str) -> str:
        # Allow plain postgres/postgresql URLs (e.g. Render's internal connection
        # string) to be used by the async engine.
        if isinstance(v, str) and v.startswith(("postgres://", "postgresql://")) and "+" not in v.split("://", 1)[0]:
            return v.replace("postgres://", "postgresql+asyncpg://", 1).replace(
                "postgresql://", "postgresql+asyncpg://", 1
            )
        return v

    @field_validator("DEBUG", mode="before")
    @classmethod
    def _parse_bool(cls, v: object) -> object:
        if isinstance(v, str):
            return v.strip().lower() in {"1", "true", "yes", "on"}
        return v


    @model_validator(mode="after")
    def _production_guard(self) -> Settings:
        """Refuse to boot production with development-insecure settings."""
        if self.ENVIRONMENT == "production":
            insecure = (
                not self.SECRET_KEY
                or "insecure-dev" in self.SECRET_KEY
                or not self.JWT_SECRET
                or "insecure-dev" in self.JWT_SECRET
                or self.DEBUG
            )
            if insecure:
                raise RuntimeError(
                    "Refusing to start: ENVIRONMENT=production requires a real "
                    "SECRET_KEY/JWT_SECRET (no 'insecure-dev' placeholders) and DEBUG=false."
                )
        return self


@lru_cache
def get_settings() -> Settings:
    """Cached settings singleton."""
    return Settings()
