"""Phase A DB-verification scenario — Step 10: records really persist.

Drives the same lifecycle as ``smoke`` through the API, then re-reads every
created record DIRECTLY from the database. If the rows don't exist, the
platform was faking it — this gate catches that. Needs DB credentials, so it
only runs where ``.env``/``DATABASE_URL`` is reachable (localhost or CI with
a disposable DB).

    python -m scripts.phase_a.db_verify --base-url http://localhost:8000
"""

from __future__ import annotations

import asyncio
import os
import sys
import time
from datetime import UTC, datetime, timedelta

from scripts.phase_a.client import Gates, PhaseAClient, parse_base_args

BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


async def verify_db_rows(ids: dict, window_start: datetime, gates: Gates) -> None:
    """Re-read the API-created records straight from the database."""
    from dotenv import load_dotenv
    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import create_async_engine

    load_dotenv(os.path.join(BACKEND_ROOT, ".env"))
    eng = create_async_engine(os.environ["DATABASE_URL"])

    def norm(v: object) -> str:
        # UUIDs are stored dash-less (CHAR(32)) in SQLite — compare canonicalized.
        return str(v).replace("-", "")

    # SQLite CURRENT_TIMESTAMP renders 'YYYY-MM-DD HH:MM:SS' (UTC, second
    # precision) — bound the run window in the same format, with slack.
    window = (window_start - timedelta(seconds=2)).strftime("%Y-%m-%d %H:%M:%S")

    async with eng.connect() as conn:
        checks = [
            ("users", ids["user_id"]),
            ("workspaces", ids["workspace_id"]),
            ("projects", ids["project_id"]),
            ("requirements", ids["requirement_id"]),
            ("pipelines", ids["pipeline_id"]),
            ("pipeline_runs", ids["run_id"]),
        ]
        for table, value in checks:
            res = await conn.execute(
                text("SELECT COUNT(*) FROM " + table + " WHERE REPLACE(CAST(id AS TEXT), '-', '') = :v"),
                {"v": norm(value)},
            )
            count = res.scalar() or 0
            gates.check(count == 1, f"DB  {table} row persisted", f"count={count}")

        res = await conn.execute(
            text("SELECT status FROM pipeline_runs WHERE REPLACE(CAST(id AS TEXT), '-', '') = :v"),
            {"v": norm(ids["run_id"])},
        )
        run_status = (res.scalar() or "").lower()
        gates.check(run_status not in ("", "pending"), "DB  run lifecycle recorded", f"status={run_status}")

        # degraded mode (no embeddings): the knowledge_documents row is the
        # persistence proof; chunks/vectors only exist once Ollama is up.
        res = await conn.execute(
            text("SELECT COUNT(*) FROM knowledge_documents WHERE source_key LIKE 'upload:%' AND created_at >= :t"),
            {"t": window},
        )
        docs = res.scalar() or 0
        gates.check(docs >= 1, "DB  knowledge_documents row persisted", f"docs={docs}")

        res = await conn.execute(
            text("SELECT COUNT(*) FROM audit_logs WHERE created_at >= :t"),
            {"t": window},
        )
        audits = res.scalar() or 0
        gates.check(audits > 0, "DB  audit_logs captured actions", f"entries={audits}")
    await eng.dispose()


def main() -> int:
    args = parse_base_args(__doc__ or "")
    client = PhaseAClient(args.base_url, not args.insecure)
    gates = Gates()
    window_start = datetime.now(UTC)
    stamp = int(time.time())
    email = args.email or f"dbverify-{stamp}@aiden-test.dev"
    password = args.password or "dbverify-Pass-123"
    print(f"AIDEN Phase A DB verification — {args.base_url}\n")

    # drive the API: account → login → lifecycle -------------------------------- #
    if not args.email:
        client.json("POST", "/api/v1/users/register", body={"email": email, "password": password, "full_name": "DB Verify"})
    token = client.login(email, password)
    if not token:
        gates.check(False, "setup: login", "credentials rejected")
        client.close()
        return gates.summary("REAL DB VERIFICATION PASS")

    ids: dict = {}
    ids["user_id"] = client.json("GET", "/api/v1/auth/me", token=token).json().get("id")
    ids["workspace_id"] = client.json("POST", "/api/v1/workspaces", body={"name": f"DBVerify WS {stamp}"}, token=token).json().get("id")
    ids["project_id"] = client.json("POST", "/api/v1/projects", body={"workspace_id": ids["workspace_id"], "name": f"DBVerify Project {stamp}"}, token=token).json().get("id")
    ids["requirement_id"] = client.json("POST", "/api/v1/requirements", body={"project_id": ids["project_id"], "title": f"DBVerify requirement {stamp}"}, token=token).json().get("id")
    ids["pipeline_id"] = client.json("POST", "/api/v1/pipelines", body={"project_id": ids["project_id"], "name": f"DBVerify pipeline {stamp}", "pipeline_type": "batch"}, token=token).json().get("id")
    ids["run_id"] = client.json("POST", f"/api/v1/pipelines/{ids['pipeline_id']}/run", body={}, token=token).json().get("id")

    # knowledge upload (multipart) → retrieve → delete (§14 round-trip) --------- #
    up = client.upload(
        "/api/v1/knowledge/documents",
        filename=f"dbverify-{stamp}.txt",
        content=(
            b"Daily Sales ETL failed because customer_id changed from VARCHAR to BIGINT. "
            b"Fix: update transformation mapping. Incident INC-1045 resolved."
        ),
        token=token,
        fields={"projectId": ids["project_id"]},
    )
    doc_id = up.json().get("documentId") if up.status_code == 200 else None
    gates.check(bool(doc_id), "API knowledge document upload", f"status={up.status_code}")

    retr = client.json(
        "POST",
        "/api/v1/knowledge/retrieve",
        body={"query": "INC-1045 customer_id transformation mapping", "top_k": 3},
        token=token,
    )
    body = retr.json() if retr.status_code == 200 else {}
    hits = body if isinstance(body, list) else (body or {}).get("results") or []
    gates.check(len(hits) > 0, "API knowledge retrieve returns results", f"hits={len(hits)}")

    missing = [k for k in ("user_id", "workspace_id", "project_id", "requirement_id", "pipeline_id", "run_id") if not ids.get(k)]
    for key in missing:
        gates.check(False, f"API {key} returned by API", "null id")

    # prove persistence FIRST — the §14 delete below removes the evidence —
    # then delete the upload so the verification leaves no residue.
    if not missing:
        asyncio.run(verify_db_rows(ids, window_start, gates))

    if doc_id:
        del_resp = client.json("DELETE", f"/api/v1/knowledge/documents/{doc_id}", token=token)
        gates.check(del_resp.status_code in (200, 204), "API knowledge document delete", f"status={del_resp.status_code}")

    client.close()
    return gates.summary("REAL DB VERIFICATION PASS")


if __name__ == "__main__":
    sys.exit(main())
