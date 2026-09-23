"""ai/rag package tests (spec §4–§14) — structure-aware chunking, hybrid
retrieval, closed-loop memory, and document ingestion endpoints.

Runs fully offline: Ollama/Qdrant are absent in CI, so every writer must
degrade honestly and every retriever must fall back deterministically.
"""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token
from app.models import User, UserRole
from tests.helpers import seed_user


def _auth(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(str(user.id))}"}


# --------------------------------------------------------------------------- #
# §5 — structure-aware chunker
# --------------------------------------------------------------------------- #
class TestChunker:
    def test_prose_markdown_sections(self) -> None:
        from app.ai.rag.ingestion.chunker import chunk

        doc = "# Overview\n\nShort intro.\n\n# Runbook\n\nRestart the consumer.\n\n## Notes\n\nWatch lag."
        chunks = chunk(doc, source_type="document", title="runbook.md")
        assert [c.text for c in chunks]  # never empty for non-empty text
        sections = {c.section for c in chunks}
        assert {"Overview", "Runbook", "Notes"} & sections

    def test_sql_keeps_create_table_intact(self) -> None:
        from app.ai.rag.ingestion.chunker import chunk

        sql = (
            "CREATE TABLE customers (\n  id BIGINT PRIMARY KEY,\n  email VARCHAR\n);\n"
            "CREATE TABLE orders (\n  id BIGINT PRIMARY KEY,\n  customer_id BIGINT\n);\n"
            "CREATE INDEX idx_orders_customer ON orders (customer_id);"
        )
        chunks = chunk(sql, source_type="sql", title="schema.sql")
        texts = [c.text for c in chunks]
        assert len(texts) >= 2
        assert any("CREATE TABLE customers" in t and "CREATE TABLE orders" not in t for t in texts)
        assert any("customer_id" in t and "email" not in t for t in texts)

    def test_python_function_blocks(self) -> None:
        from app.ai.rag.ingestion.chunker import chunk

        code = (
            "def extract():\n    return 1\n\ndef transform(df):\n    return df\n\nclass Loader:\n"
            "    def load(self):\n        return 2\n"
        )
        chunks = chunk(code, source_type="python", title="etl.py")
        sections = [c.section for c in chunks]
        assert "extract" in sections and "Loader" in sections

    def test_incident_sections_split(self) -> None:
        from app.ai.rag.ingestion.chunker import chunk, looks_like_incident

        incident = (
            "Incident: Nightly load failed\nError: connection timeout to warehouse\n"
            "Root cause: pool exhausted at 100 connections\n"
            "Fix: raised pool timeout to 60s and added retry\nResult: rerun succeeded"
        )
        assert looks_like_incident(incident)
        chunks = chunk(incident, source_type="incident", title="INC-1024")
        sections = [c.section for c in chunks]
        assert "fix" in sections and "root cause" in sections

    def test_title_header_prepended(self) -> None:
        from app.ai.rag.ingestion.chunker import chunk

        chunks = chunk("Some knowledge content.", title="contracts.md")
        assert chunks[0].text.startswith("contracts.md")

    def test_empty_input(self) -> None:
        from app.ai.rag.ingestion.chunker import chunk

        assert chunk("") == []
        assert chunk("   ") == []


# --------------------------------------------------------------------------- #
# §4 — loaders
# --------------------------------------------------------------------------- #
class TestLoaders:
    def test_json_flattens_to_key_paths(self) -> None:
        from app.ai.rag.ingestion.loader import load_document

        out = load_document("contract.json", b'{"table": "orders", "owner": "data-eng"}')
        assert "table: orders" in out["text"]
        assert out["format"] == "json"

    def test_csv_rows_normalize(self) -> None:
        from app.ai.rag.ingestion.loader import load_document

        out = load_document("metrics.csv", b"name,value\nmau,1024\n")
        assert "Columns: name, value" in out["text"]
        assert "name: mau; value: 1024" in out["text"]  # normalized row pairs

    def test_sql_extension_detected(self) -> None:
        from app.ai.rag.ingestion.loader import detect_format, load_document

        assert detect_format("x.sql", b"") == "sql"
        out = load_document("x.sql", b"SELECT 1;")
        assert out["format"] == "sql"

    def test_pdf_without_driver_raises_honestly(self) -> None:
        pytest.importorskip("app.ai.rag.ingestion.loader")
        from app.ai.rag.ingestion.loader import LoaderError, load_document

        try:  # pymupdf may or may not be installed
            import fitz  # noqa: F401
        except ImportError:
            with pytest.raises(LoaderError, match="pymupdf"):
                load_document("doc.pdf", b"%PDF-1.4 fake")
        else:
            # If pymupdf IS installed, a corrupt PDF must still raise.
            with pytest.raises(LoaderError):
                load_document("doc.pdf", b"%PDF-1.4 garbage-not-a-pdf")

    def test_empty_document_raises(self) -> None:
        from app.ai.rag.ingestion.loader import LoaderError, load_document

        with pytest.raises(LoaderError):
            load_document("empty.txt", b"   ")


# --------------------------------------------------------------------------- #
# §9–10 — keyword channel + RRF fusion (deterministic, offline)
# --------------------------------------------------------------------------- #
def _hit(doc_id: str, text: str, score: float = 0.9) -> dict:
    return {"score": score, "payload": {"doc_id": doc_id, "doc_title": doc_id, "text": text}}


class TestHybrid:
    def test_extract_terms_keeps_codey_needles(self) -> None:
        from app.ai.rag.retrieval.keyword_search import extract_terms

        terms = extract_terms("Why did INC-1024 fail on customer_id with ORA-00942?")
        assert "INC-1024" in terms and "ORA-00942" in terms and "customer_id" in terms

    def test_rrf_fuses_both_channels(self) -> None:
        from app.ai.rag.retrieval.hybrid_search import fuse

        vector = [_hit("a", "v"), _hit("b", "v"), _hit("c", "v")]
        keyword = [_hit("b", "k"), _hit("d", "k")]
        fused = fuse(vector, keyword)
        keys = [f["payload"]["doc_id"] for f in fused]
        # b appears in both channels → rank 1; a (vector#1) beats d (keyword#2)
        assert keys[0] == "b"
        assert set(keys) >= {"a", "b", "d"}

    def test_fusion_with_one_empty_channel(self) -> None:
        from app.ai.rag.retrieval.hybrid_search import fuse

        assert fuse([], [_hit("x", "k")])  # keyword-only still returns hits
        assert fuse([_hit("y", "v")], [])

    def test_reranker_prefers_term_coverage(self) -> None:
        from app.ai.rag.retrieval.reranker import heuristic_rerank

        query = "schema drift customer_id"
        hits = [
            _hit("irrelevant", "unrelated text about weather"),
            _hit("relevant", "schema drift detected on customer_id column"),
        ]
        top = heuristic_rerank(query, hits, top_k=2)
        assert top[0]["payload"]["doc_id"] == "relevant"
        assert all("rerank_score" in h for h in top)

    def test_evaluation_metrics(self) -> None:
        from app.ai.rag.evaluation.metrics import EvalCase, evaluate_cases

        result = evaluate_cases(
            [
                EvalCase(
                    query="orders pipeline failure",
                    relevant_ids=["orders-doc"],
                    channels=[
                        [_hit("orders-doc", "v"), _hit("noise", "v")],
                        [_hit("noise2", "k"), _hit("orders-doc", "k")],
                    ],
                )
            ],
            k=2,
        )
        assert result.mrr == 1.0  # relevant doc fused to rank 1
        assert result.recall_at_k == 1.0


# --------------------------------------------------------------------------- #
# §12 — closed-loop memory writer (degraded-honest without Ollama/Qdrant)
# --------------------------------------------------------------------------- #
async def test_store_incident_fix_degrades_honestly(
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.ai.rag.sources import incidents as src

    async def _no_embeddings() -> bool:
        return False

    monkeypatch.setattr(src.ai_client, "embeddings_available", _no_embeddings)
    result = await src.store_incident_fix(
        db_session,
        incident_id=__import__("uuid").uuid4(),
        title="Nightly load failed",
        pipeline="sales_daily_etl",
        root_cause="connection pool exhausted",
        fix_summary="raised pool timeout to 60s",
    )
    assert result["stored"] is False
    assert result["reason"] == "embeddings-unavailable"


# --------------------------------------------------------------------------- #
# §14 — document upload endpoints
# --------------------------------------------------------------------------- #
async def test_document_upload_persists_row(
    client: __import__("httpx").AsyncClient,
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import uuid as uuid_mod

    from app.ai.rag.sources import documents as docs
    from app.models import KnowledgeDocument

    async def _no_embeddings() -> bool:
        return False

    monkeypatch.setattr(docs.ai_client, "embeddings_available", _no_embeddings)

    user = await seed_user(db_session, role=UserRole.admin)
    resp = await client.post(
        "/api/v1/knowledge/documents",
        files={"file": ("runbook.md", b"# Runbook\n\nRestart the Kafka consumer when lag spikes.", "text/markdown")},
        data={"tags": "kafka,runbook"},
        headers=_auth(user),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["mode"] == "no-embedding-model"  # honest degradation
    assert body["chunks"] >= 1

    row = (
        await db_session.execute(
            KnowledgeDocument.__table__.select().where(
                KnowledgeDocument.source_key
                == "upload:global:runbook.md"
            )
        )
    ).first()
    assert row is not None
    assert row.chunk_count >= 1
    assert uuid_mod.UUID(str(row.id))  # valid row id

    # Listed by the §14 listing endpoint
    resp_list = await client.get("/api/v1/knowledge/documents", headers=_auth(user))
    assert resp_list.status_code == 200
    assert any(d["sourceKey"] == "upload:global:runbook.md" for d in resp_list.json())

    # Re-ingest + delete round trip
    resp_re = await client.post(
        "/api/v1/knowledge/documents/upload:global:runbook.md/ingest", headers=_auth(user)
    )
    assert resp_re.status_code == 200
    resp_del = await client.delete(
        "/api/v1/knowledge/documents/upload:global:runbook.md", headers=_auth(user)
    )
    assert resp_del.status_code == 200
    assert resp_del.json()["deleted"] == "upload:global:runbook.md"


async def test_document_upload_requires_knowledge_write(
    client: __import__("httpx").AsyncClient,
    db_session: AsyncSession,
) -> None:
    user = await seed_user(db_session, role=UserRole.viewer)
    resp = await client.post(
        "/api/v1/knowledge/documents",
        files={"file": ("x.txt", b"hello", "text/plain")},
        headers=_auth(user),
    )
    assert resp.status_code == 403


async def test_document_upload_rejects_empty(
    client: __import__("httpx").AsyncClient,
    db_session: AsyncSession,
) -> None:
    user = await seed_user(db_session, role=UserRole.admin)
    resp = await client.post(
        "/api/v1/knowledge/documents",
        files={"file": ("x.txt", b"", "text/plain")},
        headers=_auth(user),
    )
    assert resp.status_code == 422


async def test_reingest_unknown_document_404(
    client: __import__("httpx").AsyncClient,
    db_session: AsyncSession,
) -> None:
    user = await seed_user(db_session, role=UserRole.admin)
    resp = await client.post(
        "/api/v1/knowledge/documents/upload:nosuch.md/ingest", headers=_auth(user)
    )
    assert resp.status_code == 404


# --------------------------------------------------------------------------- #
# Closed loop — resolve persists and attempts memory write (integration)
# --------------------------------------------------------------------------- #
async def test_resolve_triggers_memory_write(
    client: __import__("httpx").AsyncClient,
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:

    from app.models import Incident, IncidentSeverity, IncidentStatus, Project, Workspace
    from app.services import incident_healing_service as ihs

    captured: dict = {}

    async def fake_store(self, incident):
        captured["title"] = incident.title
        captured["fix"] = incident.proposed_fix
        return {"stored": False, "reason": "embeddings-unavailable"}

    monkeypatch.setattr(ihs.IncidentHealingService, "_store_fix_in_memory", fake_store)

    ws = Workspace(name="LoopWS", slug="loopws-rag")
    db_session.add(ws)
    await db_session.flush()
    project = Project(name="LoopProject", workspace_id=ws.id)
    db_session.add(project)
    await db_session.flush()
    incident = Incident(
        title="Load failed — connection timeout",
        severity=IncidentSeverity.high,
        status=IncidentStatus.detected,
        project_id=project.id,
        proposed_fix={"summary": "raise pool timeout"},
        root_cause={"summary": "pool exhausted"},
    )
    db_session.add(incident)
    await db_session.commit()

    resp = await client.post(
        f"/api/v1/incidents/{incident.id}/resolve",
        json={"mttrMinutes": 12},
        headers=_auth(await seed_user(db_session, role=UserRole.lead)),
    )
    assert resp.status_code in {200, 204}
    await db_session.refresh(incident)
    assert incident.status == IncidentStatus.resolved
    assert captured["title"] == "Load failed — connection timeout"
    assert "pool timeout" in str(captured["fix"])
