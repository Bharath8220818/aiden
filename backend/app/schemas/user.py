"""User / auth schemas.

Serialization mirrors the frontend `AuthUser` contract:
camelCase fields (`systemRole`, `roleTitle`, `workspaceName`).
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime

from pydantic import EmailStr, Field

from app.schemas.common import APIModel


class SystemRole(str, enum.Enum):
    admin = "admin"
    lead = "lead"
    engineer = "engineer"
    viewer = "viewer"


class UserStatus(str, enum.Enum):
    online = "online"
    busy = "busy"
    away = "away"
    offline = "offline"


# --------------------------------------------------------------------------- #
# Requests
# --------------------------------------------------------------------------- #
class UserCreate(APIModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    full_name: str = Field(min_length=1, max_length=255)
    role: SystemRole = SystemRole.engineer


class UserUpdate(APIModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    role: SystemRole | None = None
    is_active: bool | None = None


class LoginRequest(APIModel):
    email: EmailStr
    password: str


# --------------------------------------------------------------------------- #
# Responses
# --------------------------------------------------------------------------- #
class UserOut(APIModel):
    id: uuid.UUID
    name: str
    email: EmailStr
    system_role: SystemRole = Field(alias="systemRole")
    role_title: str = Field(alias="roleTitle")
    status: str
    workspace_name: str | None = Field(default=None, alias="workspaceName")


class SessionOut(APIModel):
    user: UserOut
    token: str
    expires_at: datetime = Field(alias="expiresAt")


class LogoutOut(APIModel):
    status: str = "ok"


class UserListOut(APIModel):
    items: list[UserOut]
    total: int
