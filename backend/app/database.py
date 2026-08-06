from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
from app.config import settings
import logging
import ssl

logger = logging.getLogger(__name__)


def _resolve_database_url(raw_url: str) -> str:
    """Normalize DATABASE_URL for the async SQLAlchemy engine.

    Handles common misconfigurations:
    • https://xxx.supabase.co  →  detects misconfiguration, falls back to SQLite
    • postgresql://            →  upgrades to postgresql+asyncpg://
    • postgres://              →  upgrades to postgresql+asyncpg://
    • sqlite                   →  wraps with aiosqlite driver
    """
    url = raw_url.strip()

    # ── 1. Supabase REST URL mistakenly used as DATABASE_URL ──────────
    if url.startswith("https://") or url.startswith("http://"):
        logger.error(
            "DATABASE_URL starts with '%s://' — this looks like a Supabase REST API URL, "
            "not a PostgreSQL connection string.\n"
            "\n"
            "Fix: Use the *PostgreSQL* connection string from your Supabase dashboard:\n"
            "  Settings → Database → Connection string → URI\n"
            "\n"
            "It should look like:\n"
            "  postgresql+asyncpg://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres\n"
            "\n"
            "Falling back to SQLite for now."
        )
        # Fall back to SQLite so the app can at least start
        return "sqlite+aiosqlite:///./aiden.db"

    # ── 2. Render / most hosted Postgres expose postgresql:// ─────────
    #    The async driver needs the +asyncpg suffix.
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)

    # ── 3. SQLite: ensure aiosqlite driver is present ─────────────────
    if url.startswith("sqlite://") and "+aiosqlite" not in url:
        url = url.replace("sqlite://", "sqlite+aiosqlite://", 1)

    # ── 4. Supabase hosted Postgres requires SSL ──────────────────────
    if "supabase" in url and "sslmode=" not in url:
        separator = "&" if "?" in url else "?"
        url = f"{url}{separator}sslmode=require"
        logger.info("Added sslmode=require for Supabase PostgreSQL connection")

    return url


_database_url = _resolve_database_url(settings.DATABASE_URL)
logger.debug("Resolved DATABASE_URL: %s", _database_url.split("@")[-1] if "@" in _database_url else _database_url)

# Connection args based on dialect
engine_kwargs = {"echo": settings.DEBUG}
if not _database_url.startswith("sqlite"):
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20

    # Handle SSL for asyncpg — extract sslmode from URL and use connect_args
    if "sslmode=" in _database_url:
        parsed = urlparse(_database_url)
        params = parse_qs(parsed.query)
        sslmode = params.pop("sslmode", [None])[0]

        # Rebuild URL without sslmode
        new_query = urlencode(params, doseq=True)
        _database_url_clean = urlunparse(parsed._replace(query=new_query))

        if sslmode in ("require", "verify-ca", "verify-full"):
            # asyncpg: ssl=True verifies certs (fails on self-signed).
            # PostgreSQL's sslmode=require means "use SSL but skip
            # certificate verification", so we build an SSLContext
            # with verification disabled.
            ssl_ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
            ssl_ctx.check_hostname = False
            ssl_ctx.verify_mode = ssl.CERT_NONE
            engine_kwargs["connect_args"] = {"ssl": ssl_ctx}
            logger.info(
                f"SSL mode '{sslmode}' — cert verification disabled "
                "(required for self-signed certs like Supabase)."
            )

        # Update the engine URL
        _database_url = _database_url_clean

# asyncpg + Supabase pooler (pgbouncer in transaction mode) doesn't support
# server-side prepared statements — disable the statement cache to avoid
# "prepared statement already exists" errors.
if "pooler.supabase.com" in _database_url or "sslmode=" in _database_url:
    engine_kwargs.setdefault("connect_args", {})["statement_cache_size"] = 0
    logger.info("Statement cache disabled for pooled Supabase connection")

engine = create_async_engine(
    _database_url,
    # Re-validate pooled connections before use — Supabase's pooler/
    # network drops idle connections, and without pre-ping the first
    # query after an idle period fails with "connection is closed".
    pool_pre_ping=True,
    **engine_kwargs
)

# Session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Base class for models
Base = declarative_base()

# Dependency to get database session
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()