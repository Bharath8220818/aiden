"""Phase A smoke scenario — pure HTTP acceptance (Steps 3, 8, 9).

Runs against any backend without DB credentials:

    python -m scripts.phase_a.smoke --base-url http://localhost:8000

Flow: health -> register+login -> /auth/me -> auth negatives (bad password,
missing token, invalid token) -> workspace -> project -> requirement ->
pipeline -> run -> knowledge retrieve -> viewer-RBAC 403 (self-registered).
"""

from __future__ import annotations

import sys
import time

from scripts.phase_a.client import Gates, PhaseAClient, parse_base_args


def main() -> int:
    args = parse_base_args(__doc__ or "")
    client = PhaseAClient(args.base_url, not args.insecure)
    gates = Gates()
    stamp = str(int(time.time()))
    password = args.password or "phase-a-smoke-pass"
    email = args.email or f"smoke-{stamp}@aiden-test.dev"

    # 1 - health -------------------------------------------------------------- #
    r = client.json("GET", "/api/v1/health/healthz")
    alive = gates.check(
        r.status_code == 200 and r.json().get("status") == "healthy",
        "S1  liveness /health/healthz",
    )
    if not alive:
        client.close()
        print("Aborting - API unreachable.")
        return 1

    # 2 - account: register a throwaway, or log in with --email/--password ------- #
    if args.email:
        token = client.login(email, password)
        gates.check(bool(token), "S2  login (existing account)")
    else:
        r = client.json(
            "POST",
            "/api/v1/users/register",
            body={"email": email, "password": password, "full_name": "Phase A Smoke"},
        )
        gates.check(r.status_code == 201, "S2  register (201)", f"status={r.status_code}")
        token = client.login(email, password)
        gates.check(bool(token), "S2b login returns token")
    if not token:
        client.close()
        print("Aborting - cannot authenticate.")
        return 1

    # 3 - current user ------------------------------------------------------------ #
    r = client.json("GET", "/api/v1/auth/me", token=token)
    gates.check(r.status_code == 200 and bool(r.json().get("id")), "S3  /auth/me with Bearer token")

    # auth negatives ---------------------------------------------------------------- #
    r = client.json("POST", "/api/v1/auth/login", body={"email": email, "password": "wrong-password"})
    gates.check(r.status_code == 401, "A4  bad password rejected (401)", f"status={r.status_code}")
    r = client.json("GET", "/api/v1/projects")
    gates.check(r.status_code == 401, "A5  missing token rejected (401)", f"status={r.status_code}")
    r = client.http.get(
        client.base + "/api/v1/auth/me",
        headers={"Authorization": "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.invalidsig"},
    )
    gates.check(r.status_code == 401, "A6  invalid token rejected (401)", f"status={r.status_code}")

    # 4-8 - core lifecycle ------------------------------------------------------------ #
    r = client.json("POST", "/api/v1/workspaces", body={"name": f"Smoke WS {stamp}"}, token=token)
    ws_id = r.json().get("id")
    gates.check(r.status_code in (200, 201) and bool(ws_id), "S4  workspace create", f"status={r.status_code}")

    r = client.json(
        "POST", "/api/v1/projects", body={"workspace_id": ws_id, "name": f"Smoke Project {stamp}"}, token=token
    )
    proj_id = r.json().get("id")
    gates.check(r.status_code in (200, 201) and bool(proj_id), "S5  project create", f"status={r.status_code}")

    r = client.json(
        "POST",
        "/api/v1/requirements",
        body={"project_id": proj_id, "title": f"Smoke requirement {stamp}", "description": "Phase A verification"},
        token=token,
    )
    gates.check(r.status_code in (200, 201), "S6  requirement create", f"status={r.status_code}")

    r = client.json(
        "POST",
        "/api/v1/pipelines",
        body={
            "project_id": proj_id,
            "name": f"Smoke pipeline {stamp}",
            "pipeline_type": "batch",
            "config": {"source": "pg.raw_orders", "target": "snow.marts"},
        },
        token=token,
    )
    pipe_id = r.json().get("id")
    gates.check(r.status_code in (200, 201) and bool(pipe_id), "S7  pipeline create", f"status={r.status_code}")

    if pipe_id:
        r = client.json("POST", f"/api/v1/pipelines/{pipe_id}/run", body={}, token=token)
        gates.check(
            r.status_code in (200, 201) and bool(r.json().get("status")),
            "S8  pipeline run created",
            f"status={r.status_code} run.status={r.json().get('status')}",
        )
    else:
        gates.check(False, "S8  pipeline run created", "no pipeline")

    # 9 - knowledge retrieval ----------------------------------------------------------- #
    r = client.json(
        "POST", "/api/v1/knowledge/retrieve", body={"query": "why did the pipeline fail", "top_k": 3}, token=token
    )
    gates.check(r.status_code == 200, "S9  knowledge retrieve 200", f"status={r.status_code}")

    # 10 - RBAC negative: viewer role blocked server-side --------------------------------- #
    v_email = f"viewer-{stamp}@aiden-test.dev"
    client.json(
        "POST",
        "/api/v1/users/register",
        body={"email": v_email, "password": password, "full_name": "Viewer Smoke", "role": "viewer"},
    )
    v_token = client.login(v_email, password)
    if v_token:
        r = client.json(
            "POST", "/api/v1/projects", body={"workspace_id": ws_id, "name": "not allowed"}, token=v_token
        )
        gates.check(r.status_code == 403, "S10 viewer write rejected (403)", f"status={r.status_code}")
    else:
        gates.check(False, "S10 viewer write rejected (403)", "viewer login failed")

    # cleanup (best-effort) ---------------------------------------------------------------- #
    if pipe_id:
        client.json("DELETE", f"/api/v1/pipelines/{pipe_id}", token=token)
    if proj_id:
        client.json("DELETE", f"/api/v1/projects/{proj_id}", token=token)

    client.close()
    return gates.summary("DEPLOYMENT PASS")


if __name__ == "__main__":
    sys.exit(main())
