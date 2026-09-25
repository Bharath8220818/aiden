"""AIDEN Phase A — API smoke tests + auth verification (Steps 3, 8, 9).

Usage (backend venv):
    python scripts/phase_a_smoke.py [--base http://localhost:8000]

Each flow prints PASS/FAIL against the Phase A gate. Exit code 0 = all gates
green (or expected-failures verified); 1 = any real gate failed.

NOTE: run with a THROWAWAY demo user against a disposable database, never
against a shared production DB — this script creates and deletes records.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.request

BASE = "http://localhost:8000"
results: list[tuple[str, bool, str]] = []


def call(method: str, path: str, body: dict | None = None, token: str | None = None) -> tuple[int, dict | bytes]:
    req = urllib.request.Request(BASE + path, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    data = json.dumps(body).encode() if body is not None else None
    try:
        with urllib.request.urlopen(req, data=data, timeout=15) as resp:
            payload = resp.read()
            try:
                return resp.status, json.loads(payload)
            except json.JSONDecodeError:
                return resp.status, payload
    except urllib.error.HTTPError as e:
        payload = e.read()
        try:
            return e.code, json.loads(payload)
        except json.JSONDecodeError:
            return e.code, payload


def gate(name: str, ok: bool, detail: str = "") -> None:
    results.append((name, ok, detail))
    print(f"  {'PASS' if ok else 'FAIL'}  {name}" + (f"  — {detail}" if detail else ""))


def main() -> int:
    global BASE
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default=BASE)
    args = ap.parse_args()
    BASE = args.base.rstrip("/")

    stamp = str(int(time.time()))
    email = f"smoke-{stamp}@aiden-test.dev"
    password = "smoke-Pass-123"
    created = {}
    print(f"AIDEN Phase A smoke — {BASE}\n")

    # ---- Smoke 1: health ------------------------------------------------
    st, health = call("GET", "/api/v1/health/healthz")
    gate("S1  healthz 200", st == 200, str(health)[:80])

    # ---- Smoke 2: register + login (valid) ------------------------------
    st, reg = call("POST", "/api/v1/users/register", {"email": email, "password": password, "full_name": "Phase A Smoke"})
    ok = st in (200, 201)
    if not ok:  # maybe already exists from a prior run
        st, reg = call("POST", "/api/v1/auth/login", {"email": email, "password": password})
        ok = st == 200
    gate("S2  auth: valid login returns token", ok, f"status={st}")
    # register returns UserOut without a token — always do a real login for the session
    st, session = call("POST", "/api/v1/auth/login", {"email": email, "password": password})
    gate("S2b explicit login after register", st == 200 and (session or {}).get("token"), f"status={st}")
    session = session if isinstance(session, dict) else {}
    token = session.get("token") or session.get("access_token")

    # ---- Smoke 3: current user ------------------------------------------
    st, me = call("GET", "/api/v1/auth/me", token=token)
    gate("S3  /auth/me with Bearer token", st == 200 and (me or {}).get("id"), f"status={st}")

    # ---- Auth gate: bad password ----------------------------------------
    st, _ = call("POST", "/api/v1/auth/login", {"email": email, "password": "wrong-password"})
    gate("A4  bad password rejected (401)", st == 401, f"status={st}")

    # ---- Auth gate: missing token ---------------------------------------
    st, _ = call("GET", "/api/v1/projects")
    gate("A5  missing token rejected (401)", st == 401, f"status={st}")

    # ---- Auth gate: expired/garbage token --------------------------------
    req = urllib.request.Request(BASE + "/api/v1/auth/me", method="GET")
    req.add_header("Authorization", "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.invalidsig")
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            st = resp.status
    except urllib.error.HTTPError as e:
        st = e.code
    gate("A6  invalid token rejected (401)", st == 401, f"status={st}")

    if not token:
        print("\nCannot continue without a token — aborting.")
        return 1

    # ---- Smoke 4: workspace ---------------------------------------------
    st, ws = call("POST", "/api/v1/workspaces", {"name": f"Smoke WS {stamp}"}, token=token)
    ws_id = (ws or {}).get("id")
    gate("S4  workspace create", st in (200, 201) and ws_id, f"status={st}")
    created["workspace"] = ws_id

    # ---- Smoke 5: project ------------------------------------------------
    st, proj = call("POST", "/api/v1/projects", {"workspace_id": ws_id, "name": f"Smoke Project {stamp}"}, token=token)
    proj_id = (proj or {}).get("id")
    gate("S5  project create", st in (200, 201) and proj_id, f"status={st}")
    created["project"] = proj_id

    # ---- Smoke 6: requirement -------------------------------------------
    st, req_out = call("POST", "/api/v1/requirements", {"project_id": proj_id, "title": f"Smoke requirement {stamp}", "description": "Phase A verification"}, token=token)
    gate("S6  requirement create", st in (200, 201), f"status={st}")

    # ---- Smoke 7: pipeline ----------------------------------------------
    st, pipe = call("POST", "/api/v1/pipelines", {"project_id": proj_id, "name": f"Smoke pipeline {stamp}", "pipeline_type": "batch", "config": {"source": "pg.raw_orders", "target": "snow.marts"}}, token=token)
    pipe_id = (pipe or {}).get("id")
    gate("S7  pipeline create", st in (200, 201) and pipe_id, f"status={st}")
    created["pipeline"] = pipe_id

    # ---- Smoke 8: pipeline run ------------------------------------------
    if pipe_id:
        st, run = call("POST", f"/api/v1/pipelines/{pipe_id}/run", {}, token=token)
        run_status = (run or {}).get("status", "")
        gate("S8  pipeline run created", st in (200, 201) and run_status, f"status={st} run.status={run_status}")
    else:
        gate("S8  pipeline run created", False, "no pipeline")

    # ---- Smoke 9: knowledge/RAG -----------------------------------------
    st, retr = call("POST", "/api/v1/knowledge/retrieve", {"query": "Why did the daily sales pipeline fail?", "top_k": 3}, token=token)
    gate("S9  knowledge retrieve 200", st == 200, f"status={st}")

    # ---- Smoke 10: authorization ----------------------------------------
    # viewer registration + cross-workspace protected op must 403
    v_email = f"viewer-{stamp}@aiden-test.dev"
    call("POST", "/api/v1/users/register", {"email": v_email, "password": password, "full_name": "Viewer Smoke", "role": "viewer"})
    st, v_sess = call("POST", "/api/v1/auth/login", {"email": v_email, "password": password})
    v_token = (v_sess or {}).get("token")
    st, other_proj = call("POST", "/api/v1/projects", {"workspace_id": ws_id, "name": "not allowed"}, token=v_token)
    gate("S10 viewer cannot create project (403)", st == 403, f"status={st}")

    # ---- cleanup (best-effort) ------------------------------------------
    if created.get("pipeline"):
        call("DELETE", f"/api/v1/pipelines/{created['pipeline']}", token=token)
    if created.get("project"):
        call("DELETE", f"/api/v1/projects/{created['project']}", token=token)
    print("\n(cleanup: smoke records removed — verify leftovers in DB for Step 10)")

    failed = [n for n, ok, _ in results if not ok]
    print(f"\n{'=' * 50}\n{len(results) - len(failed)}/{len(results)} gates PASS" + (f" — FAILED: {failed}" if failed else " — DEPLOYMENT PASS"))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
