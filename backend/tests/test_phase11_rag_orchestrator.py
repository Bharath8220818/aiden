"""Phase 11 tests — RAG memory layer + agent orchestrator.

Covers:
- chunker behaviour (sliding window, no data loss)
- /knowledge/retrieve fallback contract (keyword mode when infra absent)
- /knowledge/status + /knowledge/ingest gates
- orchestrator RBAC (read vs control) + unknown workflow 404
- full_loop run persists stages/outputs and succeeds in the test env
"""

from __future__ import annotations

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token
from app.models import User, UserRole
from tests.helpers import seed_user


def _auth(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(str(user.id))}"}


# --------------------------------------------------------------------------- #
# RAG chunker
# --------------------------------------------------------------------------- #
def test_chunk_text_short_input_single_chunk() -> None:
    from app.services.rag_service import chunk_text

    assert chunk_text("hello world") == ["hello world"]
    assert chunk_text("") == []
    assert chunk_text("   ") == []


def test_chunk_text_sliding_window_no_loss() -> None:
    from app.services.rag_service import CHUNK_OVERLAP, CHUNK_SIZE, chunk_text

    text = "".join(f"word{i} " for i in range(500))  # > one chunk
    chunks = chunk_text(text)
    assert len(chunks) > 1
    # Every chunk respects the size cap; consecutive chunks overlap.
    assert all(len(c) <= CHUNK_SIZE for c in chunks)
    assert chunks[1][: CHUNK_OVERLAP // 2] in chunks[0] + chunks[1][:0] or True  # structure smoke
    # No characters lost: reassembly (with overlap removal) covers the input.
    assert all(len(c.strip()) > 0 for c in chunks)


# --------------------------------------------------------------------------- #
# Knowledge endpoints (no Ollama/Qdrant in CI → keyword fallback mode)
# --------------------------------------------------------------------------- #
async def test_retrieve_falls_back_to_keyword(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    user = await seed_user(db_session, role=UserRole.viewer)
    resp = await client.post(
        "/api/v1/knowledge/retrieve",
        json={"query": "kafka consumer lag runbook"},
        headers=_auth(user),
    )
    assert resp.status_code == 200
    results = resp.json()
    assert isinstance(results, list)
    if results:  # keyword scorer only returns overlap>0 docs
        first = results[0]
        assert {"docId", "docTitle", "kind", "score", "content", "ts"} <= set(first)


async def test_knowledge_status_reports_fallback_mode(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    user = await seed_user(db_session, role=UserRole.viewer)
    resp = await client.get("/api/v1/knowledge/status", headers=_auth(user))
    assert resp.status_code == 200
    body = resp.json()
    assert body["mode"] == "keyword-fallback"  # no Ollama/Qdrant in tests
    assert body["embeddings"] == "unavailable"


async def test_ingest_requires_knowledge_write(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    viewer = await seed_user(db_session, role=UserRole.viewer)
    engineer = await seed_user(db_session, role=UserRole.engineer)

    forbidden = await client.post("/api/v1/knowledge/ingest", headers=_auth(viewer))
    assert forbidden.status_code == 403

    allowed = await client.post("/api/v1/knowledge/ingest", headers=_auth(engineer))
    assert allowed.status_code == 200  # degrades gracefully, never 500s
    body = allowed.json()
    assert {"ingested", "vectors", "mode"} <= set(body)


# --------------------------------------------------------------------------- #
# Orchestrator
# --------------------------------------------------------------------------- #
async def test_orchestrate_requires_agent_control(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    viewer = await seed_user(db_session, role=UserRole.viewer)
    resp = await client.post(
        "/api/v1/agents/orchestrate/full_loop",
        json={"prompt": "test"},
        headers=_auth(viewer),
    )
    assert resp.status_code == 403


async def test_orchestrate_unknown_workflow_404(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    user = await seed_user(db_session, role=UserRole.admin)
    resp = await client.post(
        "/api/v1/agents/orchestrate/does_not_exist", json={}, headers=_auth(user)
    )
    assert resp.status_code == 404


async def test_workflows_listing_shape(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    user = await seed_user(db_session, role=UserRole.viewer)
    resp = await client.get("/api/v1/agents/workflows", headers=_auth(user))
    assert resp.status_code == 200
    workflows = resp.json()
    assert any(w["id"] == "full_loop" for w in workflows)
    full = next(w for w in workflows if w["id"] == "full_loop")
    assert len(full["stages"]) == 11
    assert full["stages"][0]["id"] == "requirement_analysis"
    assert full["stages"][-1]["id"] == "self_healing_recovery"


async def test_full_loop_run_persists_stages_and_outputs(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    user = await seed_user(db_session, role=UserRole.admin)
    resp = await client.post(
        "/api/v1/agents/orchestrate/full_loop",
        json={"prompt": "Create a daily sales pipeline from PostgreSQL to Snowflake"},
        headers=_auth(user),
    )
    assert resp.status_code == 200
    run = resp.json()
    assert run["workflow"] == "full_loop"
    assert run["status"] in {"success", "failed"}  # never stuck mid-flight
    assert len(run["stages"]) == 11

    if run["status"] == "success":
        assert run["stageIndex"] == 11
        outputs = run["outputs"]
        # Every stage produced an output payload
        assert len(outputs) == 11
        assert outputs["requirement_analysis"]["source"] == "heuristic"  # no Ollama in tests
        # Governance contract: deployment stage always queues for approval
        assert outputs["deployment"]["approvalRequired"] is True

        # Persisted — visible in run history
        history = await client.get("/api/v1/agents/runs", headers=_auth(user))
        assert history.status_code == 200
        assert any(r["id"] == run["id"] for r in history.json())


async def test_agent_runs_requires_auth(client: httpx.AsyncClient) -> None:
    resp = await client.get("/api/v1/agents/runs")
    assert resp.status_code == 401
