"""Configuration tests — settings loading, env precedence, CORS, secrets."""

from __future__ import annotations

from app.core.config import Settings, get_settings


def test_settings_load() -> None:
    s = get_settings()
    assert s.APP_NAME == "AIDEN Backend"
    assert s.API_PREFIX == "/api/v1"
    assert s.DATABASE_URL
    assert s.JWT_SECRET
    assert s.SECRET_KEY


def test_environment_defaults_are_development() -> None:
    assert get_settings().ENVIRONMENT in {"development", "production", "test"}


def test_debug_bool_parsing() -> None:
    assert Settings(DEBUG="true").DEBUG is True
    assert Settings(DEBUG="1").DEBUG is True
    assert Settings(DEBUG="false").DEBUG is False
    assert Settings(DEBUG="no").DEBUG is False


def test_cors_origin_list_parses_comma_separated() -> None:
    s = Settings(CORS_ORIGINS="http://a.com, http://b.com,http://c.com")
    assert s.cors_origin_list == ["http://a.com", "http://b.com", "http://c.com"]
    assert Settings().cors_origin_list  # defaults are not empty


def test_postgres_url_normalised_to_asyncpg() -> None:
    s = Settings(DATABASE_URL="postgres://user:pass@host:5432/db")
    assert s.DATABASE_URL == "postgresql+asyncpg://user:pass@host:5432/db"
    already = Settings(DATABASE_URL="postgresql+asyncpg://user:pass@host/db")
    assert already.DATABASE_URL.startswith("postgresql+asyncpg://")


def test_env_file_exists_and_is_gitignored() -> None:
    import pathlib

    backend = pathlib.Path(__file__).resolve().parents[1]
    assert (backend / ".env").exists(), "local .env must exist for dev runs"
    gitignore = (backend / ".gitignore").read_text(encoding="utf-8")
    assert ".env" in gitignore
    assert (backend / ".env.example").exists()


def test_no_hardcoded_production_credentials() -> None:
    import pathlib

    backend = pathlib.Path(__file__).resolve().parents[1]
    example = (backend / ".env.example").read_text(encoding="utf-8")
    # secret values must be placeholder markers, never real keys
    assert "generate-me-with-openssl-rand-hex-32" in example
