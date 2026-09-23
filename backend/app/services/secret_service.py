"""Credential vault — secret references resolved server-side, never exposed.

Storage model (spec §4):

    connection_registry.credentials  →  metadata + `credential_reference`
        e.g. {"username": "svc_aiden", "credential_reference": "secret://connections/<id>"}

    The secret material itself lives in the dev vault (Fernet-encrypted rows
    keyed by reference) — production swaps this module for Vault/AWS Secrets
    Manager without touching callers.

Guarantees:
- `resolve()` builds adapter credentials from a connection row + vault.
- `for_ai()` / `for_frontend()` strip secret material — the AI never sees
  passwords, and the Connections page keeps showing masked values only.
- The vault stores ciphertext at rest (Fernet over the platform SECRET_KEY
  until a dedicated master key setting is configured).
"""

from __future__ import annotations

import base64
import hashlib
import json
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.logging import get_logger
from app.integrations.databases.base import AdapterCredentials
from app.models import ConnectionRegistry

logger = get_logger("aiden.secrets")

REF_PREFIX = "secret://"

_SECRET_KEYS = {"password", "secret", "token", "apiKey", "apiSecret", "serviceAccountJson"}

try:  # optional dependency — the vault requires it, resolution does not
    from cryptography.fernet import Fernet  # noqa: F401

    _HAS_CRYPTO = True
except ImportError:  # pragma: no cover
    _HAS_CRYPTO = False


class SecretService:
    """Resolve / store credential references. Swap for Vault in production."""

    def __init__(self, db: AsyncSession | None = None) -> None:
        self.db = db

    # -- cipher ---------------------------------------------------------------
    def _fernet(self):
        try:
            from cryptography.fernet import Fernet
        except ImportError as exc:  # pragma: no cover - cryptography ships in reqs
            raise RuntimeError("cryptography package required for the secret vault") from exc
        settings = get_settings()
        digest = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
        key = base64.urlsafe_b64encode(digest)
        return Fernet(key)

    def encrypt(self, plaintext: str) -> str:
        token = self._fernet().encrypt(plaintext.encode())
        return token.decode()

    def decrypt(self, ciphertext: str) -> str:
        return self._fernet().decrypt(ciphertext.encode()).decode()

    # -- dev vault (in-DB JSON rows, encrypted at rest) -------------------------
    async def put(self, reference: str, secret_material: dict[str, Any]) -> None:
        """Encrypt + persist a payload under `secret://...` (dev vault).

        Requires a session bound to this service ( SecretService(db) ); the
        dev-vault rows live in `connection_registry.credentials` of a
        sentinel connection row `vault:<ref>` — invisible to the catalog
        (filtered by provider id) and encrypted.
        """
        if self.db is None:
            raise RuntimeError("SecretService needs a session for vault operations")
        from app.models import ConnectionRegistry

        row_id = f"vault-{reference.removeprefix(REF_PREFIX)}"
        row = await self.db.get(ConnectionRegistry, row_id)
        payload = self.encrypt(json.dumps(secret_material))
        if row is None:
            row = ConnectionRegistry(
                id=row_id,
                name="vault entry (internal)",
                provider_id="vault",
                category="cloud",
                environment="internal",
                host="vault",
                credentials={"data": payload},
            )
            self.db.add(row)
        else:
            row.credentials = {"data": payload}
        await self.db.flush()

    async def get(self, reference: str) -> dict[str, Any] | None:
        if self.db is None:
            raise RuntimeError("SecretService needs a session for vault operations")
        from app.models import ConnectionRegistry

        row_id = f"vault-{reference.removeprefix(REF_PREFIX)}"
        row = await self.db.get(ConnectionRegistry, row_id)
        if row is None or not row.credentials:
            return None
        try:
            return json.loads(self.decrypt(row.credentials.get("data", "")))
        except Exception:  # noqa: BLE001 — tampered/rotated key
            logger.warning("Vault payload for %s is unreadable", reference)
            return None

    # -- resolution ---------------------------------------------------------
    async def resolve(self, connection: ConnectionRegistry) -> AdapterCredentials:
        """Build adapter credentials for a connection row.

        Secret material precedence:
        1. vault reference (`credential_reference` / `secret://` values)
        2. inline values in `credentials` (dev-only, masked everywhere)
        """
        creds = dict(connection.credentials or {})
        extra = {
            k: v
            for k, v in creds.items()
            if k not in _SECRET_KEYS and k != "credential_reference"
        }

        # Pull secret material from the vault reference when present.
        reference = creds.get("credential_reference")
        vaulted: dict[str, Any] = {}
        if reference and (await self.get(reference)) is not None:
            vaulted = (await self.get(reference)) or {}
        else:
            # Inline vault: values shaped like "secret://connections/x" point
            # at vault rows; resolve each secret-ish key that references.
            for key in list(creds):
                value = creds[key]
                if isinstance(value, str) and value.startswith(REF_PREFIX):
                    resolved = await self.get(value)
                    if resolved is not None:
                        vaulted[key] = resolved.get("value", resolved)

        username = creds.get("username") or vaulted.get("username")
        password = vaulted.get("password") or creds.get("password")
        # Masked dev values ("•••••••• (vault)") are not real secrets.
        if password and password.startswith("•"):
            password = None

        port = connection.port
        return AdapterCredentials(
            host=connection.host,
            port=port,
            database=connection.database,
            username=username,
            password=password,
            extra={**extra, **vaulted.get("extra", {})},
        )


def for_ai(connection: ConnectionRegistry) -> dict[str, Any]:
    """Safe connection descriptor for AI context — metadata only, no secrets."""
    return {
        "connection_id": connection.id,
        "provider": connection.provider_id,
        "host": connection.host,
        "database": connection.database,
        "environment": connection.environment,
    }


def for_frontend(creds: dict[str, Any] | None) -> dict[str, Any]:
    """Mask secret-shaped keys (the Connections page contract)."""
    import re

    masked: dict[str, Any] = {}
    secret_re = re.compile(r"password|secret|token|json|key", re.IGNORECASE)
    for key, value in (creds or {}).items():
        masked[key] = "•••••••• (vault)" if secret_re.search(key) else value
    return masked
