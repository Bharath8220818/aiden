"""Security foundation — password hashing & JWT issuance/validation.

Full RBAC / authentication flows land in Phase 2; this module provides the
primitives the rest of the application depends on.
"""

from __future__ import annotations

import datetime as dt
from typing import Any

import bcrypt
import jwt

from app.core.config import get_settings


# --------------------------------------------------------------------------- #
# Password hashing
# --------------------------------------------------------------------------- #
def hash_password(plain: str) -> str:
    """Hash a plaintext password with bcrypt (returns a str-encoded hash)."""
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, password_hash: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), password_hash.encode("utf-8"))
    except (ValueError, TypeError):
        return False


# --------------------------------------------------------------------------- #
# JWT
# --------------------------------------------------------------------------- #
def create_access_token(
    subject: str,
    *,
    expires_delta: dt.timedelta | None = None,
    extra_claims: dict[str, Any] | None = None,
) -> str:
    """Create a signed JWT access token with a configurable lifetime."""
    settings = get_settings()
    now = dt.datetime.now(dt.UTC)
    expire = now + (expires_delta or dt.timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    payload: dict[str, Any] = {
        "sub": subject,
        "iat": now,
        "exp": expire,
        "iss": settings.APP_NAME,
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    """Decode and validate a JWT access token, returning its claims."""
    settings = get_settings()
    return jwt.decode(
        token,
        settings.JWT_SECRET,
        algorithms=[settings.JWT_ALGORITHM],
        issuer=settings.APP_NAME,
    )


def expires_at_from_token(token: str) -> dt.datetime:
    """Return the token expiry timestamp (naive UTC) for session metadata."""
    claims = decode_access_token(token)
    return dt.datetime.fromtimestamp(claims["exp"], tz=dt.UTC)
