"""Standalone health check — probes {base}/api/v1/health/healthz and /health/full.

Usage:
    python scripts/health-check.py http://localhost:8000
    python scripts/health-check.py https://aiden-backend-fq08.onrender.com --require-ok

Exit 0 when healthy; 1 when degraded/required service missing. For the full
14-gate acceptance pass use scripts/phase_a/smoke.py instead.
"""

from __future__ import annotations

import argparse
import sys

import httpx


def main() -> int:
    parser = argparse.ArgumentParser(description="AIDEN health check")
    parser.add_argument("base_url")
    parser.add_argument("--require-ok", action="store_true", help="fail when any optional service is degraded")
    args = parser.parse_args()
    base = args.base_url.rstrip("/")

    failures: list[str] = []
    try:
        r = httpx.get(f"{base}/api/v1/health/healthz", timeout=10)
        print(f"healthz    : {r.status_code} {r.json()}")
        if r.status_code != 200 or r.json().get("status") != "healthy":
            failures.append("healthz")
    except Exception as exc:  # noqa: BLE001 — probe must never crash
        print(f"healthz    : UNREACHABLE ({exc})")
        return 1

    try:
        r = httpx.get(f"{base}/api/v1/health/full", timeout=15)
        checks = r.json().get("checks", {})
        print(f"health/full: {r.json().get('status')}")
        for name, check in sorted(checks.items()):
            mark = "ok" if check.get("status") == "ok" else check.get("status", "?")
            print(f"  {name:10}: {mark}")
            if args.require_ok and check.get("status") == "degraded":
                failures.append(name)
    except Exception as exc:  # noqa: BLE001
        print(f"health/full: UNREACHABLE ({exc})")
        failures.append("health/full")

    if failures:
        print(f"FAIL: {', '.join(failures)}")
        return 1
    print("PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
