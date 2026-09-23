"""Deployment verification — §7 smoke test as executable assertions.

Run against a DEPLOYED backend (Render/VPS) — not just localhost:

    python scripts/verify_deployment.py --base-url https://aiden-api.onrender.com \
        --email admin@example.com --password ***

Checks (each printed PASS/FAIL, non-zero exit on any failure):
  1. Liveness + readiness   GET /health/healthz, /health/full
  2. Auth                   POST /auth/login → GET /auth/me
  3. Core DB reads          GET /workspaces (proves migrations applied)
  4. RBAC negative          optional --viewer-email/--viewer-password → 403 on write
  5. Knowledge round-trip   optional --rag: upload → retrieve → delete (§14)

Stdout-only summary; no secrets are printed.
"""

from __future__ import annotations

import argparse
import sys

import httpx

# Windows consoles default to cp1252 — force UTF-8 so status glyphs never crash.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

PASS, FAIL = "✅ PASS", "❌ FAIL"
results: list[tuple[bool, str]] = []


def record(ok: bool, label: str) -> bool:
    results.append((ok, label))
    print(f"{PASS if ok else FAIL}  {label}")
    return ok


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", required=True, help="e.g. https://aiden-api.onrender.com")
    parser.add_argument("--email", default="bharath@acmedata.io")
    parser.add_argument("--password", default="lead123")
    parser.add_argument("--viewer-email", help="viewer account for the RBAC 403 check")
    parser.add_argument("--viewer-password")
    parser.add_argument("--rag", action="store_true", help="knowledge upload→retrieve→delete round-trip")
    parser.add_argument("--insecure", action="store_true", help="skip TLS verification (self-signed only)")
    args = parser.parse_args()

    base = args.base_url.rstrip("/")
    verify = not args.insecure
    client = httpx.Client(timeout=30, verify=verify)
    ok = True

    # 1 — health ----------------------------------------------------------- #
    try:
        r = client.get(f"{base}/api/v1/health/healthz")
        ok &= record(r.status_code == 200 and r.json().get("status") == "healthy", "liveness /health/healthz")
    except Exception as exc:  # noqa: BLE001
        ok &= record(False, f"liveness /health/healthz ({exc})")
        print("Aborting — API unreachable.")
        return 1

    r = client.get(f"{base}/api/v1/health/full")
    db_ok = False
    if r.status_code == 200:
        body = r.json()
        components = body.get("components", body)
        db_field = components.get("database", {}) if isinstance(components, dict) else {}
        db_ok = (db_field.get("status") if isinstance(db_field, dict) else db_field) in {"healthy", True, None} or body.get("status") in {"healthy", "degraded"}
        record(db_ok, f"readiness /health/full (status={body.get('status')})")
        for name, comp in (components.items() if isinstance(components, dict) else []):
            if isinstance(comp, dict) and comp.get("status") not in {"healthy", "ok", "disabled", None}:
                print(f"     ⚠ component '{name}' = {comp.get('status')} (degraded services may be expected)")
    else:
        record(False, f"readiness /health/full (HTTP {r.status_code})")

    # 2 — auth -------------------------------------------------------------- #
    r = client.post(f"{base}/api/v1/auth/login", json={"email": args.email, "password": args.password})
    if not record(r.status_code == 200, "auth login"):
        print("Aborting — cannot authenticate.")
        return 1
    token = r.json().get("token") or r.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}

    r = client.get(f"{base}/api/v1/auth/me", headers=headers)
    ok &= record(r.status_code == 200, "auth /auth/me")

    # 3 — core DB reads ------------------------------------------------------ #
    r = client.get(f"{base}/api/v1/workspaces", headers=headers)
    ok &= record(r.status_code == 200, "core reads /workspaces (migrations applied)")

    # 4 — RBAC negative (optional) ------------------------------------------- #
    if args.viewer_email and args.viewer_password:
        rv = client.post(
            f"{base}/api/v1/auth/login", json={"email": args.viewer_email, "password": args.viewer_password}
        )
        if rv.status_code == 200:
            vtoken = rv.json().get("token") or rv.json().get("access_token")
            r403 = client.post(
                f"{base}/api/v1/projects",
                headers={"Authorization": f"Bearer {vtoken}"},
                json={"name": "verify-deployment-probe", "workspaceId": None},
            )
            ok &= record(r403.status_code == 403, "RBAC viewer write → 403")
        else:
            ok &= record(False, "RBAC viewer login (credentials rejected)")

    # 5 — knowledge round-trip (optional) ------------------------------------ #
    if args.rag:
        files = {"file": ("verify-deploy.md", b"# Verify\n\nError: deployment probe\nFix: none needed\n", "text/markdown")}
        ru = client.post(f"{base}/api/v1/knowledge/documents", headers=headers, files=files, data={"tags": "verify"})
        uploaded = ru.status_code == 200
        ok &= record(uploaded, "knowledge upload")
        if uploaded:
            key = ru.json().get("documentId") or "upload:global:verify-deploy.md"
            rr = client.post(
                f"{base}/api/v1/knowledge/retrieve", headers=headers, json={"query": "deployment probe", "topK": 3}
            )
            ok &= record(rr.status_code == 200, "knowledge retrieve")
            rd = client.delete(f"{base}/api/v1/knowledge/documents/{key}", headers=headers)
            ok &= record(rd.status_code == 200, "knowledge delete")

    client.close()
    total, failed = len(results), sum(1 for good, _ in results if not good)
    print(f"\n{total - failed}/{total} checks passed — {'ALL GREEN' if failed == 0 else 'FAILURES PRESENT'}")
    return 0 if failed == 0 and ok else 1


if __name__ == "__main__":
    sys.exit(main())
