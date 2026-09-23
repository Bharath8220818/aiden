"""Live behavioral verification - drives the REAL running server + DB.

Run:  cd backend && python scripts/verify_gateway_live.py   (server on :8000)

Asserts state transitions, not just status codes: chat intents must create
real rows (tasks, audit logs, incidents, stage runs), RBAC must actually gate,
and degradations must be honest. Exits non-zero on any failure.
"""

from __future__ import annotations

import json
import sqlite3
import sys
import time
import urllib.error
import urllib.request

BASE = "http://localhost:8000/api/v1"
DB_PATH = "aiden_dev.db"

PASS: list[str] = []
FAIL: list[str] = []


def check(name, condition, detail=""):
    (PASS if condition else FAIL).append(name)
    print(f"  {'PASS' if condition else 'FAIL'} {name}" + (f" -- {detail}" if detail and not condition else ""))


def api(method, path, token=None, body=None):
    req = urllib.request.Request(
        BASE + path,
        method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"Content-Type": "application/json"},
    )
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or "{}")


def q(sql, params=()):
    conn = sqlite3.connect(DB_PATH)
    try:
        return conn.execute(sql, params).fetchall()
    finally:
        conn.close()


def main():
    print("== 1. Real logins ==")
    s, eng = api("POST", "/auth/login", body={"email": "engineer@acmedata.io", "password": "eng123"})
    check("engineer login returns token", s == 200 and bool(eng.get("token")))
    s, adm = api("POST", "/auth/login", body={"email": "admin@acmedata.io", "password": "admin123"})
    check("admin login returns token", s == 200 and bool(adm.get("token")))
    s, vw = api("POST", "/auth/login", body={"email": "analyst@acmedata.io", "password": "view123"})
    check("viewer login returns token", s == 200 and bool(vw.get("token")))
    et, at, vt = eng["token"], adm["token"], vw["token"]

    print("== 2. Anonymous RBAC ==")
    s, _ = api("GET", "/workspace/tools")
    check("anonymous /workspace/tools -> 401", s == 401)
    s, _ = api("POST", "/workspace/chat", body={"message": "hi"})
    check("anonymous /workspace/chat -> 401", s == 401)

    print("== 3. Tool catalog is permission-filtered ==")
    s, vtools = api("GET", "/workspace/tools", vt)
    vnames = {t["name"] for t in vtools}
    check("viewer catalog excludes task tool", "team.create_task" not in vnames, str(vnames))
    s, etools = api("GET", "/workspace/tools", et)
    enames = {t["name"] for t in etools}
    check("engineer catalog includes notify.email + team.create_task",
          {"notify.email", "team.create_task"} <= enames, str(enames))

    print("== 4. Chat pipeline intent (artifacts) ==")
    s, body = api("POST", "/workspace/chat", et, {"message": "Create a daily sales pipeline from PostgreSQL to Snowflake"})
    check("intent=pipeline", s == 200 and body.get("intent") == "pipeline", str(body.get("intent")))
    check("pipeline artifact present", any(a["type"] == "pipeline" for a in body.get("artifacts", [])))
    check("context payload present", "context" in body)

    print("== 5. Task intent creates a REAL task row + notification ==")
    s, wsrow = api("GET", "/workspaces", et)
    ws_id = wsrow["items"][0]["id"] if isinstance(wsrow, dict) and wsrow.get("items") else wsrow[0]["id"]
    s, prows = api("GET", f"/projects?workspace_id={ws_id}", et)
    projects = prows["items"] if isinstance(prows, dict) and prows.get("items") else prows
    pid = projects[0]["id"]
    before = q("SELECT COUNT(*) FROM tasks")[0][0]
    s, body = api("POST", "/workspace/chat", et,
                  {"message": "Create a high task for Maya to fix the failed validation",
                   "projectId": pid})
    check("intent=task", body.get("intent") == "task", str(body.get("reply", ""))[:80])
    after = q("SELECT COUNT(*) FROM tasks")[0][0]
    check("tasks row count increased", after == before + 1, f"{before}->{after}")
    row = q("SELECT title, status, priority, source, project_id FROM tasks ORDER BY created_at DESC LIMIT 1")[0]
    check("task persisted with source=agent + project scoping",
          row[3] == "agent" and row[4] == pid.replace("-", "") and row[1] == "todo", str(row))

    print("== 6. Email intent executes governed tool + writes audit ==")
    s, body = api("POST", "/workspace/chat", et,
                  {"message": "Send Maya an email saying the ETL issue is fixed", "projectId": pid})
    check("intent=email", body.get("intent") == "email", str(body.get("reply", ""))[:80])
    check("reply reports audit trail", "audit" in body.get("reply", "").lower())
    check("tool + risk echoed", body.get("tool") == "notify.email" and body.get("risk") == "medium")
    audit = q("SELECT action, details FROM audit_logs WHERE action='tool.notify.email' ORDER BY created_at DESC LIMIT 1")  # noqa: E501
    audit_details = json.loads(audit[0][1]) if audit and isinstance(audit[0][1], str) else (audit[0][1] if audit else {})
    check("audit_logs row for tool.notify.email", len(audit) == 1 and audit_details.get("risk") == "medium")
    s, notif = api("GET", "/notifications", et)
    check("internal notification stored", isinstance(notif, list) and any("ETL" in n.get("title", "") or "AIDEN" in n.get("title", "") for n in notif))

    print("== 7. Email RBAC: viewer denied, honest reply ==")
    s, body = api("POST", "/workspace/chat", vt,
                  {"message": "Send Maya an email saying hi", "projectId": pid})
    check("viewer email intent gated", "can't send email" in body.get("reply", "").lower() or "permission" in body.get("reply", "").lower(), str(body.get("reply", ""))[:90])

    print("== 8. Drift detection creates a REAL incident ==")
    s, prows2 = api("GET", "/projects", at)
    projects2 = prows2["items"] if isinstance(prows2, dict) and prows2.get("items") else prows2
    pid2 = projects2[0]["id"]
    s, plines = api("GET", f"/pipelines?project_id={pid2}", at)
    pipelines = plines["items"] if isinstance(plines, dict) and plines.get("items") else plines
    if not pipelines:
        s, body = api("POST", "/pipelines", at, {"projectId": pid2, "name": "verify_orders_daily"})
        pipelines = [body]
    pl = pipelines[0]
    cols_v1 = [{"name": "id", "dataType": "INTEGER", "nullable": False},
               {"name": "name", "dataType": "VARCHAR", "nullable": True}]
    table = f"verify_customers_{int(time.time())}"  # unique per run: baseline must be genuinely new
    s, snap = api("POST", "/drift/snapshots", at,
                  {"pipelineId": pl["id"], "table": table, "columns": cols_v1, "rowCount": 100})
    check("baseline snapshot stored", s == 200 and snap.get("drifted") is False)
    cols_v2 = [dict(cols_v1[0], dataType="BIGINT"), cols_v1[1]]
    s, snap2 = api("POST", "/drift/snapshots", at,
                   {"pipelineId": pl["id"], "table": table, "columns": cols_v2, "rowCount": 110})
    check("drift detected INTEGER->BIGINT", snap2.get("drifted") is True and snap2.get("incidentId"))
    inc = q("SELECT title, severity, detection_source FROM incidents WHERE id=?",
            (snap2["incidentId"].replace("-", ""),))
    check("incident row persisted with source=drift", len(inc) == 1 and inc[0][2] == "drift", str(inc))

    print("== 9. Orchestrator persists per-stage rows ==")
    s, run = api("POST", "/agents/orchestrate/quality_gate", at, {"prompt": "verify stages"})
    check("orchestration completed", s == 200 and run.get("status") in {"success", "failed"}, str(run.get("error"))[:80])
    stage_rows = q("SELECT stage_no, status, output FROM agent_stage_runs WHERE run_id=? ORDER BY stage_no",
                   (run["id"].replace("-", ""),))
    check("agent_stage_runs rows == 3 (quality_gate)", len(stage_rows) == 3, str(len(stage_rows)))
    check("all stages done", all(r[1] == "done" for r in stage_rows), str([r[1] for r in stage_rows]))
    check("stage outputs persisted", all(r[2] is not None and "durationMs" in json.dumps(r[2]) for r in stage_rows))

    print("== 10. Degradations are honest ==")
    s, pl2 = api("GET", "/connections", et)
    conns = pl2 if isinstance(pl2, list) else pl2.get("items", [])
    check("connections respond", s == 200 and len(conns) > 0)
    s, exec_body = api("POST", f"/pipelines/{pl['id']}/execute", at)
    check("execute without Airflow fails honestly", s == 200 and exec_body.get("status") == "failed" and exec_body.get("mode") == "unavailable", str(exec_body)[:100])

    print()
    print(f"RESULT: {len(PASS)} passed, {len(FAIL)} failed")
    if FAIL:
        print("Failures:", FAIL)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
