#!/usr/bin/env python
"""
Test PostgreSQL / Supabase connection from .env

Run:
    cd backend
    python test_db_connection.py

Requires: asyncpg, python-dotenv (both in requirements.txt)
"""

import asyncio
import asyncpg
import os
import sys
from urllib.parse import quote_plus
from dotenv import load_dotenv

load_dotenv()


def url_encode_password(password: str) -> str:
    """URL-encode special characters in a password."""
    return quote_plus(password)


def safe_print(msg: str):
    """Print a message, encoding to utf-8 if stdout is restrictive."""
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode("utf-8", errors="replace").decode("utf-8", errors="replace"))


async def test_connection():
    """Test the database connection and report status."""

    database_url = os.getenv("DATABASE_URL")

    if not database_url:
        safe_print("[FAIL] DATABASE_URL not found in environment or .env file!")
        safe_print("       Add it to backend/.env like:")
        safe_print("       DATABASE_URL=postgresql+asyncpg://user:password@host:5432/db")
        return False

    # Truncate for display (hide password)
    display_url = database_url
    if "@" in database_url:
        display_url = database_url[: database_url.rfind("@") + 1] + "..."
    safe_print("Connecting to: " + display_url[:60])

    # Strip SQLAlchemy async driver suffix so asyncpg can parse the URL
    # postgresql+asyncpg:// -> postgresql://
    conn_string = database_url.replace("+asyncpg", "").replace("+aiosqlite", "")

    # Handle SQLite -- skip test
    if conn_string.startswith("sqlite"):
        safe_print("[SKIP] DATABASE_URL points to SQLite, not PostgreSQL.")
        safe_print("       Set DATABASE_URL to a PostgreSQL connection to test remote DB.")
        return True

    try:
        conn = await asyncpg.connect(conn_string)

        version = await conn.fetchval("SELECT version()")
        safe_print("[OK] Connected successfully!")
        safe_print("     PostgreSQL: " + str(version)[:60] + "...")

        tables = await conn.fetch(
            """
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name
            """
        )

        table_names = [t["table_name"] for t in tables]
        safe_print(f"\nTables ({len(table_names)} found):")
        if table_names:
            for name in table_names:
                try:
                    count = await conn.fetchval(f"SELECT COUNT(*) FROM {name}")
                    safe_print(f"  - {name} ({count} rows)")
                except Exception:
                    safe_print(f"  - {name}")
        else:
            safe_print("  (no tables yet -- run: alembic upgrade head)")

        expected_tables = ["users", "pipelines", "pipeline_executions"]
        safe_print("\nChecking for AIDEN tables:")
        for table in expected_tables:
            if table in table_names:
                safe_print(f"  [OK] {table}")
            else:
                safe_print(f"  [..] {table} (not found -- run: alembic upgrade head)")

        await conn.close()
        return True

    except asyncpg.exceptions.InvalidPasswordError:
        safe_print("[FAIL] Invalid password! URL-encode special characters.")
        safe_print("       Example: Aiden@2026!Secure -> " + quote_plus("Aiden@2026!Secure"))
        return False
    except asyncpg.exceptions.CannotConnectNowError:
        safe_print("[FAIL] Cannot connect now (server may be waking from sleep).")
        safe_print("       Wait 30 seconds and retry.")
        return False
    except asyncpg.exceptions.InsufficientPrivilegeError:
        safe_print("[FAIL] Insufficient privileges for this user.")
        return False
    except Exception as e:
        safe_print(f"[FAIL] Connection failed: {e}")
        return False


if __name__ == "__main__":
    safe_print("=" * 50)
    safe_print("  AIDEN - Database Connection Test")
    safe_print("=" * 50)
    safe_print("")
    result = asyncio.run(test_connection())
    safe_print("")
    if result:
        safe_print("[OK] Connection test passed.")
    else:
        safe_print("[FAIL] Connection test failed. Fix the issue and retry.")
        sys.exit(1)
