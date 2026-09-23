"""Project import endpoint — existing-folder ingestion into RAG knowledge."""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token
from app.models import User, UserRole, Workspace
from tests.helpers import seed_user


def _auth(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(str(user.id))}"}


async def _make_project(client, db_session: AsyncSession, monkeypatch: pytest.MonkeyPatch) -> str:
    """Create a project through the API as admin and return its id."""

    user = await seed_user(db_session, role=UserRole.admin)
    ws = Workspace(name=f"ImportWS-{user.id}", slug=f"import-ws-{str(user.id)[:8]}")
    db_session.add(ws)
    await db_session.commit()

    resp = await client.post(
        "/api/v1/projects",
        json={"workspace_id": str(ws.id), "name": "Legacy Sales ETL"},
        headers=_auth(user),
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


async def test_import_ingests_and_reports_per_file(
    client,
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    project_id = await _make_project(client, db_session, monkeypatch)
    user = await seed_user(db_session, role=UserRole.admin)

    from app.ai.rag.sources import documents as docs

    async def _no_embeddings() -> bool:
        return False

    monkeypatch.setattr(docs.ai_client, "embeddings_available", _no_embeddings)

    files = [
        {"path": "sql/ddl.sql", "content": "CREATE TABLE customers (\n  id BIGINT PRIMARY KEY,\n  email VARCHAR\n);"},
        {"path": "README.md", "content": "# Legacy Sales ETL\n\nRun nightly via cron."},
        {"path": "model.bin", "content": "not text"},  # unsupported type → skipped
        {"path": "empty.txt", "content": "   "},  # empty → skipped
    ]
    resp = await client.post(
        f"/api/v1/projects/{project_id}/import",
        json=files,
        headers=_auth(user),
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["projectId"] == project_id
    summary = body["summary"]
    assert summary["ingested"] == 2
    assert summary["skipped"] >= 2
    assert summary["failed"] == 0
    assert summary["totalChunks"] >= 1

    by_path = {r["path"]: r for r in body["results"]}
    assert by_path["sql/ddl.sql"]["status"] == "ingested"
    assert by_path["model.bin"]["status"] == "skipped"
    assert "unsupported" in by_path["model.bin"]["reason"]


async def test_import_requires_knowledge_write(
    client,
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    project_id = await _make_project(client, db_session, monkeypatch)
    viewer = await seed_user(db_session, role=UserRole.viewer)
    resp = await client.post(
        f"/api/v1/projects/{project_id}/import",
        json=[{"path": "a.md", "content": "x"}],
        headers=_auth(viewer),
    )
    assert resp.status_code == 403


async def test_import_unknown_project_404(
    client,
    db_session: AsyncSession,
) -> None:
    user = await seed_user(db_session, role=UserRole.admin)
    resp = await client.post(
        "/api/v1/projects/00000000-0000-0000-0000-000000000001/import",
        json=[{"path": "a.md", "content": "x"}],
        headers=_auth(user),
    )
    assert resp.status_code == 404


async def test_import_rejects_empty_body(
    client,
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    project_id = await _make_project(client, db_session, monkeypatch)
    user = await seed_user(db_session, role=UserRole.admin)
    resp = await client.post(
        f"/api/v1/projects/{project_id}/import",
        json=[],
        headers=_auth(user),
    )
    assert resp.status_code == 422
