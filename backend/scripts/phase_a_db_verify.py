"""AIDEN Phase A — Step 10: real DB verification.

Drives the HTTP API end-to-end (register → login → workspace → project →
requirement → pipeline → run → knowledge upload → retrieve), then re-reads
every created record DIRECTLY from the database via SQLAlchemy. If the rows
don't exist in the DB, the platform was faking it — this gate catches that.

Run with a disposable database (dev is SQLite; production is Postgres):
    python scripts/phase_a_db_verify.py [--base http://localhost:8000]
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
import time
import urllib.error
import urllib.request
import uuid

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

BASE = "http://localhost:8000"
results: list[tuple[str, bool, str]] = []


def call(method: str, path: str, body: dict | None = None, token: str | None = None) -> tuple[int, dict | bytes]:
    req = urllib.request.Request(BASE + path, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    data = json.dumps(body).encode() if body is not None else None
    try:
        with urllib.request.urlopen(req, data=data, timeout=20) as resp:
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


async def verify_db_rows(ids: dict) -> None:
    from dotenv import load_dotenv

    load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))
    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import create_async_engine

    url = os.environ["DATABASE_URL"]
    eng = create_async_engine(url)
    # UUIDs are stored dash-less (CHAR(32)) in SQLite — compare canonicalized.
    checks = [
        ("users", ids["user_id"]),
        ("workspaces", ids["workspace_id"]),
        ("projects", ids["project_id"]),
        ("requirements", ids["requirement_id"]),
        ("pipelines", ids["pipeline_id"]),
        ("pipeline_runs", ids["run_id"]),
    ]
    async with eng.connect() as conn:
        for table, value in checks:
            res = await conn.execute(
                text(f"SELECT COUNT(*) FROM {table} WHERE REPLACE(CAST(id AS TEXT), '-', '') = :v"),
                {"v": str(value).replace("-", "")},
            )
            count = res.scalar() or 0
            gate(f"DB  {table} row persisted", count == 1, f"count={count}")
        # pipeline run lifecycle: must have moved past PENDING
        res = await conn.execute(
            text("SELECT status FROM pipeline_runs WHERE REPLACE(CAST(id AS TEXT), '-', '') = :v"),
            {"v": str(ids["run_id"]).replace("-", "")},
        )
        run_status = (res.scalar() or "").lower()
        gate("DB  run lifecycle recorded", run_status not in ("", "pending"), f"status={run_status}")
        # degraded mode (no embeddings): the knowledge_documents row is the
        # persistence proof; chunks/vectors only exist once Ollama is up.
        # source_key = 'upload:<uuid>:<filename>' — match the filename + window.
        res = await conn.execute(
            text(
                "SELECT COUNT(*) FROM knowledge_documents "
                "WHERE source_key LIKE '%dbverify%' AND created_at >= :t"
            ),
            {"t": time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime(int(ids["since"]) - 1))},
        )
        docs = res.scalar() or 0
        gate("DB  knowledge_documents row persisted", docs >= 1, f"docs={docs}")
        # audit created_at is SQLite CURRENT_TIMESTAMP ('YYYY-MM-DD HH:MM:SS',
        # UTC) — bound in the same format so the string comparison is real.
        res = await conn.execute(
            text("SELECT COUNT(*) FROM audit_logs WHERE created_at >= :t"),
            {"t": time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime(int(ids["since"]) - 1))},
        )
        audits = res.scalar() or 0
        gate("DB  audit_logs captured actions", audits > 0, f"entries={audits}")
    await eng.dispose()


async def main_async() -> int:
    stamp = int(time.time())
    email = f"dbverify-{stamp}@aiden-test.dev"
    password = "dbverify-Pass-123"
    ids: dict = {}
    print(f"AIDEN Phase A DB verification — {BASE}\n")

    # ---- drive the API ----------------------------------------------------
    call("POST", "/api/v1/users/register", {"email": email, "password": password, "full_name": "DB Verify"})
    _, sess = call("POST", "/api/v1/auth/login", {"email": email, "password": password})
    token = (sess or {}).get("token")
    if not token:
        gate("setup: login", False, str(sess)[:120])
        return finish()
    _, me = call("GET", "/api/v1/auth/me", token=token)
    ids["user_id"] = (me or {}).get("id")

    _, ws = call("POST", "/api/v1/workspaces", {"name": f"DBVerify WS {stamp}"}, token=token)
    ids["workspace_id"] = (ws or {}).get("id")
    _, proj = call("POST", "/api/v1/projects", {"workspace_id": ids["workspace_id"], "name": f"DBVerify Project {stamp}"}, token=token)
    ids["project_id"] = (proj or {}).get("id")
    _, req_out = call("POST", "/api/v1/requirements", {"project_id": ids["project_id"], "title": f"DBVerify requirement {stamp}"}, token=token)
    ids["requirement_id"] = (req_out or {}).get("id")
    _, pipe = call("POST", "/api/v1/pipelines", {"project_id": ids["project_id"], "name": f"DBVerify pipeline {stamp}", "pipeline_type": "batch"}, token=token)
    ids["pipeline_id"] = (pipe or {}).get("id")
    _, run = call("POST", f"/api/v1/pipelines/{ids['pipeline_id']}/run", {}, token=token)
    ids["run_id"] = (run or {}).get("id")

    # knowledge upload is multipart: file + projectId form fields
    doc_id = None
    try:
        boundary = "aiden-phase-a"
        file_content = (
            b"Daily Sales ETL failed because customer_id changed from VARCHAR to BIGINT. "
            b"Fix: update transformation mapping. Incident INC-1045 resolved."
        )
        body = (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="projectId"\r\n\r\n'
            f"{ids['project_id']}\r\n"
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="file"; filename="dbverify.txt"\r\n'
            f"Content-Type: text/plain\r\n\r\n"
        ).encode() + file_content + f"\r\n--{boundary}--\r\n".encode()
        req = urllib.request.Request(BASE + "/api/v1/knowledge/documents", data=body, method="POST")
        req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")
        req.add_header("Authorization", f"Bearer {token}")
        with urllib.request.urlopen(req, timeout=30) as resp:
            payload = json.loads(resp.read())
        doc_id = payload.get("documentId")
        gate("API knowledge document upload", bool(doc_id), f"mode={payload.get('mode')}, chunks={payload.get('chunks')}")
    except urllib.error.HTTPError as e:
        gate("API knowledge document upload", False, f"status={e.code}")
    ids["document_id"] = doc_id or uuid.uuid4()  # placeholder keeps later gates readable

    _, retr = call("POST", "/api/v1/knowledge/retrieve", {"query": "INC-1045 customer_id transformation mapping", "top_k": 3}, token=token)
    retr_results = retr if isinstance(retr, list) else (retr or {}).get("results") or []
    gate("API knowledge retrieve returns results", len(retr_results) > 0, f"hits={len(retr_results)}")

    missing = [k for k in ("user_id", "workspace_id", "project_id", "requirement_id", "pipeline_id", "run_id") if not ids.get(k)]
    for key in missing:
        gate(f"API {key} returned by API", False, "null id")
    if missing:
        return finish()

    # ---- read it back straight from the DB --------------------------------
    ids["since"] = stamp  # used to build the audit time bound in verify_db_rows
    await verify_db_rows(ids)
    return finish()


def finish() -> int:
    failed = [n for n, ok, _ in results if not ok]
    print(f"\n{'=' * 50}\n{len(results) - len(failed)}/{len(results)} gates PASS" + (f" — FAILED: {failed}" if failed else " — REAL DB VERIFICATION PASS"))
    return 1 if failed else 0


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default=BASE)
    args = ap.parse_args()
    BASE = args.base.rstrip("/")
    sys.exit(asyncio.run(main_async()))
