"""Check the AIDEN backend environment and report readiness.

Run from backend/:
    venv\\Scripts\\python.exe -m scripts.check_environment

Exit codes: 0 = ready, 1 = problems (non-fatal), 2 = fatal.
"""

from __future__ import annotations

import importlib
import importlib.metadata
import platform
import sys

PACKAGES = [
    "fastapi",
    "uvicorn",
    "sqlalchemy",
    "asyncpg",
    "aiosqlite",
    "alembic",
    "pydantic",
    "pydantic_settings",
    "jwt",
    "bcrypt",
    "httpx",
    "pytest",
]


def check_python() -> list[str]:
    problems: list[str] = []
    major, minor = sys.version_info[:2]
    if (major, minor) < (3, 10):
        problems.append(f"Python too old: {platform.python_version()} (need >= 3.10)")
    return problems


def check_packages() -> list[str]:
    problems: list[str] = []
    for name in PACKAGES:
        try:
            importlib.metadata.version(name)
        except importlib.metadata.PackageNotFoundError:
            try:
                importlib.import_module(name)
            except Exception:
                problems.append(f"Missing package: {name} (pip install -r requirements.txt)")
    return problems


def check_settings() -> list[str]:
    problems: list[str] = []
    try:
        from app.core.config import get_settings

        settings = get_settings()
        if settings.SECRET_KEY.startswith("aiden-insecure"):
            problems.append("SECRET_KEY is still the dev default — set a real secret in .env")
        if settings.JWT_SECRET.startswith("aiden-insecure"):
            problems.append("JWT_SECRET is still the dev default — set a real secret in .env")
        if not settings.DATABASE_URL:
            problems.append("DATABASE_URL is empty")
    except Exception as exc:  # pragma: no cover
        problems.append(f"Could not load settings: {exc}")
    return problems


def check_app_import() -> list[str]:
    problems: list[str] = []
    try:
        from app.main import app  # noqa: F401
    except Exception as exc:
        problems.append(f"Application failed to import: {exc}")
    return problems


def main() -> int:
    print(f"AIDEN environment check — Python {platform.python_version()} on {platform.system()}")
    print("-" * 60)

    all_problems: dict[str, list[str]] = {
        "Python": check_python(),
        "Packages": check_packages(),
        "Settings": check_settings(),
        "App import": check_app_import(),
    }

    fatal = False
    for section, problems in all_problems.items():
        if problems:
            fatal = fatal or section in {"Packages", "App import"}
            for problem in problems:
                print(f"  [{section}] {problem}")
        else:
            print(f"  [{section}] OK")

    if not all_problems["Settings"]:
        from app.core.config import get_settings

        settings = get_settings()
        print(f"  [DB]      {_redact_url(settings.DATABASE_URL)}")

    print("-" * 60)
    if fatal:
        print("Result: FATAL — fix issues before starting the server.")
        return 2
    if any(problems for problems in all_problems.values()):
        print("Result: READY (with warnings).")
        return 1
    print("Result: READY.")
    return 0


def _redact_url(url: str) -> str:
    if "@" in url:
        scheme, _, rest = url.partition("://")
        userinfo, _, host = rest.partition("@")
        return f"{scheme}://***@{host}"
    return url


if __name__ == "__main__":
    sys.exit(main())
