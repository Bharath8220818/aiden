"""End-to-end AIDEN loop — Phase 6 Step 9.

Runs the full realistic scenario against a LIVE backend:

    "Create a daily sales pipeline from PostgreSQL to Snowflake."

    User → Ask AIDEN (requirements/analyze)
         → Intent Recognition + contract (real AI when Ollama is up, else heuristic)
         → Planner/Architecture (architecture/generate)
         → Pipeline Generation (pipelines/generate)
         → Validation (artifact inspection + sql/explain)
         → Approval gate (pipelines/{id}/deploy → 409 APPROVAL_REQUIRED)
         → Approval decision (approvals/{id}/approve)
         → Monitoring (monitoring/services + /overview)
    then the failure loop:
         → Pipeline Failure (failed run recorded)
         → Incident (GET /incidents)
         → Root Cause (incidents/{id}/diagnose)
         → Self-Healing fix (incidents/{id}/fix)
         → Sandbox Test (sandbox/test)
         → Approval (healing advance → awaiting_approval → learned)
         → Pipeline Retry (pipelines/{id}/run)
         → Success (incident resolved, MTTR recorded)

Usage (backend/):
    venv/Scripts/python.exe -m scripts.aiden_loop_demo
Requires: uvicorn on :8000, seeded database (scripts/seed_database.py).
"""

from __future__ import annotations

import asyncio
import io
import sys

import httpx

# Windows consoles default to cp1252 — force UTF-8 so the status markers print.
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

BASE = "http://localhost:8000/api/v1"


def step(n: int, title: str) -> None:
    print(f"\n{'=' * 70}\n  Step {n}: {title}\n{'=' * 70}")


async def main() -> int:
    failures: list[str] = []

    def check(label: str, ok: bool, detail: str = "") -> None:
        mark = "🟢" if ok else "🔴"
        print(f"  {mark} {label}" + (f" — {detail}" if detail else ""))
        if not ok:
            failures.append(label)

    async with httpx.AsyncClient(timeout=60) as client:
        # ------------------------------------------------------------------ #
        step(1, "Login — POST /auth/login")
        resp = await client.post(
            f"{BASE}/auth/login", json={"email": "lead@acmedata.io", "password": "lead123"}
        )
        if resp.status_code != 200:
            resp = await client.post(
                f"{BASE}/auth/login", json={"email": "admin@acmedata.io", "password": "admin123"}
            )
        check("login 200", resp.status_code == 200)
        token = resp.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        me = (await client.get(f"{BASE}/auth/me", headers=headers)).json()
        print(f"  identity: {me.get('name')} ({me.get('systemRole')})")

        # ------------------------------------------------------------------ #
        step(2, "Ask AIDEN — requirements/analyze (Intent Recognition)")
        intent_text = (
            "Create a daily sales pipeline from PostgreSQL to Snowflake. "
            "Sales rows carry customer_email (PII) — mask before load. "
            "Nightly at 02:00 UTC, freshness within 24 hours."
        )
        resp = await client.post(
            f"{BASE}/requirements/analyze",
            headers=headers,
            json={
                "activeMode": "text",
                "text": {"rawText": intent_text, "tags": ["sales"]},
                "audio": {"transcript": "", "durationSeconds": 0},
                "sql": {
                    "sqlQuery": "",
                    "inferredSources": ["PostgreSQL OLTP"],
                    "inferredTarget": "Snowflake Mart",
                },
                "diagram": {},
                "document": {"fileContent": ""},
            },
        )
        body = resp.json()
        analysis, contract = body["analysis"], body["contract"]
        check("analyze 200", resp.status_code == 200)
        print(
            f"  engine: {analysis.get('source', 'n/a')} · pattern: {analysis['pipelinePattern']} · confidence: {analysis['confidenceScore']}"
        )
        print(f"  PII detected: {[p['columnName'] for p in analysis['detectedPii']]}")
        print(
            f"  contract: {contract['datasetName']} v{contract['contractVersion']} ({len(contract['columns'])} columns, {len(contract['qualityRules'])} rules)"
        )

        # ------------------------------------------------------------------ #
        step(3, "Planner / Architecture — POST /architecture/generate")
        resp = await client.post(
            f"{BASE}/architecture/generate",
            headers=headers,
            json={"prompt": intent_text, "pattern": "batch_etl"},
        )
        blueprint = resp.json()
        check("generate 200", resp.status_code == 200)
        print(f"  topology: {len(blueprint['nodes'])} nodes / {len(blueprint['edges'])} edges")
        print(f"  rationale: {blueprint['rationale'][:140]}…")

        # ------------------------------------------------------------------ #
        step(4, "Pipeline Generation — POST /pipelines/generate")
        config = {
            "pipelineName": "sales_daily_pipeline_v2",
            "executionMode": "scheduled_batch",
            "schedule": "daily",
            "sourceSystem": "PostgreSQL",
            "targetSystem": "Snowflake",
            "retryPolicy": {"maxRetries": 3, "backoff": "exponential", "timeoutMinutes": 30},
            "qualityChecksEnabled": True,
            "piiMaskingEnabled": bool(analysis["detectedPii"]),
            "slaFreshnessMinutes": 1440,
        }
        graph = {
            "sources": ["PostgreSQL OLTP"],
            "sinks": ["Snowflake Mart"],
            "hasQualityGate": True,
            "nodeCount": 5,
            "edgeCount": 4,
        }
        resp = await client.post(
            f"{BASE}/pipelines/generate", headers=headers, json={"config": config, "graph": graph}
        )
        artifacts = resp.json()
        check("codegen 200", resp.status_code == 200)
        artifact_summary = [(a["target"], a["fileName"], str(a["lineCount"]) + "L") for a in artifacts]
        print("  artifacts:", artifact_summary)

        # ------------------------------------------------------------------ #
        step(5, "Validation — artifact + plan sanity")
        pyspark = next(a for a in artifacts if a["target"] == "pyspark")
        dag = next(a for a in artifacts if a["target"] == "airflow_dag")
        check("pyspark references target", "snowflake" in pyspark["content"].lower())
        check("dag has retries", "retries" in dag["content"])
        resp = await client.post(
            f"{BASE}/sql/explain",
            headers=headers,
            json={"sql": "SELECT status, SUM(amount) FROM sales GROUP BY status"},
        )
        plan = resp.json()
        check("explain 200", resp.status_code == 200)
        print(f"  plan totalCost: {plan['totalCost']} · warnings: {plan['warnings'] or 'none'}")

        # ------------------------------------------------------------------ #
        step(6, "Deploy gate — engineer/lead request routes to approval queue")
        fleet = (await client.get(f"{BASE}/pipelines/fleet", headers=headers)).json()
        check("fleet 200", isinstance(fleet, list) and len(fleet) > 0)
        target = next((p for p in fleet if "sales" in p["name"] or "orders" in p["name"]), fleet[0])
        print(f"  target pipeline: {target['name']} ({target['status']}, SLA {target['slaMinutes']}m)")
        deploy = await client.post(f"{BASE}/pipelines/{target['id']}/deploy", headers=headers)
        check(
            "deploy → approval gate",
            deploy.status_code == 409 and deploy.json()["error"]["code"] == "APPROVAL_REQUIRED",
            f"HTTP {deploy.status_code}",
        )
        approval_id = deploy.json().get("approval_id")

        # ------------------------------------------------------------------ #
        step(7, "Approval decision — POST /approvals/{id}/approve")
        if approval_id:
            resp = await client.post(
                f"{BASE}/approvals/{approval_id}/approve",
                headers=headers,
                json={"note": "AIDEN loop demo — approved"},
            )
            check("approve 200", resp.status_code == 200)
        else:
            approvals = (await client.get(f"{BASE}/approvals", headers=headers)).json()
            pending = next((a for a in approvals if a["status"] == "pending"), None)
            check("pending approval present", pending is not None)
            if pending:
                resp = await client.post(
                    f"{BASE}/approvals/{pending['id']}/approve",
                    headers=headers,
                    json={"note": "AIDEN loop demo — approved"},
                )
                check("approve 200", resp.status_code == 200)
        audit = (await client.get(f"{BASE}/audit?limit=3", headers=headers)).json()
        check("audit recorded", any("approval" in a["action"] for a in audit))
        audit_summary = [a["actor"] + " " + a["action"] for a in audit[:2]]
        print("  latest audit:", audit_summary)

        # ------------------------------------------------------------------ #
        step(8, "Monitoring — services + fleet health")
        services = (await client.get(f"{BASE}/monitoring/services", headers=headers)).json()
        check("services 200", resp.status_code == 200)
        healthy = [s["name"] for s in services if s["status"] == "healthy"]
        print(f"  healthy services: {len(healthy)}/{len(services)}")
        overview = (await client.get(f"{BASE}/overview", headers=headers)).json()
        check("overview 200", "pipelineMetrics" in overview)

        # ------------------------------------------------------------------ #
        step(9, "Pipeline Failure — a failed run exists (seeded) → Incident")
        incidents = (await client.get(f"{BASE}/incidents", headers=headers)).json()
        open_incidents = [i for i in incidents if i["status"] not in {"resolved", "dismissed"}]
        check("incident detected", len(open_incidents) > 0)
        incident = open_incidents[0]
        print(f"  incident: {incident['title'][:70]} ({incident['severity']}, {incident['occurrences']}×)")

        # ------------------------------------------------------------------ #
        step(10, "Root Cause — POST /incidents/{id}/diagnose")
        resp = await client.post(f"{BASE}/incidents/{incident['id']}/diagnose", headers=headers)
        diagnosis = resp.json()
        check("diagnose 200", resp.status_code == 200)
        print(
            f"  root cause: {diagnosis['rootCause']['title'][:80]} ({diagnosis['rootCause']['confidence']}%)"
        )
        print(
            f"  blast radius: {len(diagnosis['blastRadius']['downstreamPipelines'])} pipelines, ~{diagnosis['blastRadius']['estimatedStaleDataMinutes']}m stale"
        )

        # ------------------------------------------------------------------ #
        step(11, "Self-Healing — fix + sandbox + advance to approval")
        resp = await client.post(f"{BASE}/incidents/{incident['id']}/fix", headers=headers)
        fix = resp.json()
        check("fix 200", resp.status_code == 200)
        print(
            f"  strategy: {fix['strategyLabel']} · risk {fix['riskLevel']} · {len(fix['patches'])} patch(es)"
        )
        resp = await client.post(f"{BASE}/sandbox/test", headers=headers, json={"fixId": fix["id"]})
        sandbox = resp.json()
        passed = sum(1 for a in sandbox["assertions"] if a["passed"])
        check(
            f"sandbox {passed}/{len(sandbox['assertions'])} assertions",
            resp.status_code == 200 and passed == len(sandbox["assertions"]),
        )
        run_id = f"heal-{incident['id']}"
        for stage in ("investigating", "generating_fix", "awaiting_approval"):
            resp = await client.post(
                f"{BASE}/healing/{run_id}/advance", headers=headers, json={"targetStage": stage}
            )
            check(f"advance → {stage}", resp.status_code == 200)

        # ------------------------------------------------------------------ #
        step(12, "Deploy Fix + Monitor + Retry — advance to learned, re-run")
        for stage in ("deploying", "rerunning", "monitoring", "learned"):
            resp = await client.post(
                f"{BASE}/healing/{run_id}/advance", headers=headers, json={"targetStage": stage}
            )
            check(f"advance → {stage}", resp.status_code == 200)
        resolved = (await client.get(f"{BASE}/incidents", headers=headers)).json()
        healed = next((i for i in resolved if i["id"] == incident["id"]), None)
        check(
            "incident resolved with MTTR",
            healed is not None and healed["status"] == "resolved" and healed["mttrMinutes"] is not None,
            f"MTTR {healed['mttrMinutes'] if healed else '—'}m",
        )
        resp = await client.post(f"{BASE}/pipelines/{target['id']}/run", headers=headers)
        check("pipeline retry → run created", resp.status_code == 201)

        # ------------------------------------------------------------------ #
        step(13, "Success — final platform state")
        overview = (await client.get(f"{BASE}/overview", headers=headers)).json()
        insights = overview["insights"]
        print(f"  insights: {[(i['severity'], i['title'][:40]) for i in insights[:3]]}")
        cycle = overview["engineeringCycle"]
        done = sum(1 for s in cycle if s["status"] == "completed")
        print(f"  engineering loop: {done}/12 stages completed")

    print(f"\n{'=' * 70}")
    if failures:
        print(f"  RESULT: 🔴 {len(failures)} step(s) failed: {failures}")
        return 1
    print("  RESULT: 🟢 AIDEN CLOSED LOOP COMPLETE — all steps passed")
    print("  (analyze → architect → codegen → validate → approval gate → approve →")
    print("   monitor → incident → RCA → fix → sandbox → heal → retry → resolved)")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
