"""Authentication schemas (Phase 2.9) — login session contract.

Mirrors the frontend auth contract: camelCase `expiresAt`, `systemRole`,
`roleTitle`, `workspaceName` (see `schemas/user.py` for the user shape).
"""

from __future__ import annotations

from datetime import datetime

from pydantic import EmailStr, Field

from app.schemas.common import APIModel
from app.schemas.user import UserOut


class LoginRequest(APIModel):
    email: EmailStr
    password: str


class SessionOut(APIModel):
    user: UserOut
    token: str
    expires_at: datetime = Field(alias="expiresAt")


class LogoutOut(APIModel):
    status: str = "ok"


class TokenPayloadOut(APIModel):
    """Decoded claims — used by /auth/verify-style introspection."""

    subject: str = Field(alias="sub")
    expires_at: datetime = Field(alias="exp")
    issued_at: datetime = Field(alias="iat")
