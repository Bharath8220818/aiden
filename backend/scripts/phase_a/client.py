"""Phase A verification harness (DEPLOYMENT_PLAN §A.5).

Shared plumbing for the two scenario modules:

- ``smoke``     — pure HTTP acceptance: health, auth, RBAC, core writes,
                  knowledge retrieve. Runs against ANY backend (localhost or
                  deployed) without DB credentials.
- ``db_verify`` — the same lifecycle driven through the API, then re-read
                  straight from the database to prove records really persist.

This module provides the HTTP client, the PASS/FAIL gate reporter and the
common CLI flags so the scenarios contain only their own flows.
"""

from __future__ import annotations

import argparse
import sys

import httpx

# Windows consoles default to cp1252 — force UTF-8 so status glyphs never crash.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

PASS, FAIL = "✅ PASS", "❌ FAIL"


class Gates:
    """Collects PASS/FAIL results and prints the final gate summary."""

    def __init__(self) -> None:
        self.results: list[tuple[bool, str]] = []

    def check(self, ok: bool, label: str, detail: str = "") -> bool:
        self.results.append((ok, label))
        print(f"{PASS if ok else FAIL}  {label}" + (f" — {detail}" if detail else ""))
        return ok

    def summary(self, success_line: str) -> int:
        total = len(self.results)
        failed = sum(1 for ok, _ in self.results if not ok)
        print(f"\n{total - failed}/{total} gates PASS — " + (success_line if failed == 0 else f"FAILURES PRESENT: {[label for ok, label in self.results if not ok]}"))
        return 0 if failed == 0 else 1


class PhaseAClient:
    """Thin httpx wrapper for the AIDEN API (JSON + multipart uploads)."""

    def __init__(self, base_url: str, verify: bool = True) -> None:
        self.base = base_url.rstrip("/")
        self.http = httpx.Client(timeout=30, verify=verify)

    def json(
        self,
        method: str,
        path: str,
        *,
        body: dict | None = None,
        token: str | None = None,
    ) -> httpx.Response:
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        return self.http.request(method, self.base + path, json=body, headers=headers)

    def upload(
        self,
        path: str,
        *,
        filename: str,
        content: bytes,
        token: str,
        fields: dict[str, str] | None = None,
    ) -> httpx.Response:
        return self.http.post(
            self.base + path,
            files={"file": (filename, content, "text/plain")},
            data=fields or {},
            headers={"Authorization": f"Bearer {token}"},
        )

    def login(self, email: str, password: str) -> str | None:
        """Return the session token, or None when credentials are rejected."""
        r = self.json("POST", "/api/v1/auth/login", body={"email": email, "password": password})
        if r.status_code != 200:
            return None
        return r.json().get("token") or r.json().get("access_token")

    def close(self) -> None:
        self.http.close()


def parse_base_args(description: str) -> argparse.Namespace:
    """Shared CLI: ``--base-url``, ``--insecure`` and optional existing-account
    credentials (``--email``/``--password``) for backends where self-registration
    is not appropriate (e.g. a deployed admin account)."""
    parser = argparse.ArgumentParser(description=description)
    parser.add_argument("--base-url", default="http://localhost:8000", help="API root, e.g. https://aiden-api.onrender.com")
    parser.add_argument("--insecure", action="store_true", help="skip TLS verification (self-signed only)")
    parser.add_argument("--email", help="existing account to log in with (skips registration)")
    parser.add_argument("--password", help="password for --email")
    args = parser.parse_args()
    if bool(args.email) != bool(args.password):
        parser.error("--email and --password must be given together")
    return args
