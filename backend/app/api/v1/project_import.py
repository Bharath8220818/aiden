"""Project import — bring an existing project folder INTO AIDEN (§14 + §17).

A user points AIDEN at files that already describe a project — SQL DDL,
DAGs, READMEs, dbt models, data contracts, incident notes — and AIDEN
1. creates (or reuses) the project,
2. runs every file through the real RAG ingestion pipeline
   (loader → cleaner → structure-aware chunker → embed → Qdrant + DB),
3. reports per-file results honestly (which files ingested, which failed, why).

The imported knowledge becomes project-scoped memory: the Command Workspace
and every agent can then retrieve it, so the user can immediately "edit, run,
and monitor" the existing project with AIDEN.
"""

from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.rag.sources import documents as doc_source
from app.core.database import get_db
from app.core.dependencies import AuthContext, require_permission
from app.services.project_service import ProjectService

router = APIRouter(prefix="/projects", tags=["projects"])

# Ignored directories' basename markers (venvs, caches, build output...).
_SKIP_DIR_MARKERS = {
    "node_modules", "__pycache__", ".git", ".venv", "venv", "dist",
    "build", ".next", ".idea", ".vscode", ".mypy_cache", ".pytest_cache",
}
# Default include-list: text/data/code formats the RAG loader understands.
DEFAULT_INCLUDE = [
    ".sql", ".py", ".md", ".markdown", ".txt", ".yaml", ".yml", ".json",
    ".csv", ".html", ".htm",
]
MAX_FILES = 200
MAX_FILE_BYTES = 1_000_000  # 1 MB per file — knowledge chunks, not data dumps


@router.post("/{project_id}/import")
async def import_project_files(
    project_id: str,
    files: list[dict[str, Any]],
    ctx: AuthContext = Depends(require_permission("knowledge.write")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Import files of an existing project folder into AIDEN knowledge.

    Body: [{"path": "relative/path.sql", "content": "...", "size": 1234}, ...]
    Paths are metadata only (displayed in results); content is ingested text.

    Returns a per-file manifest: ingested / failed with reasons, plus the
    total chunk count now in the project's knowledge base.
    """
    if not isinstance(files, list) or not files:
        raise HTTPException(status_code=422, detail="files must be a non-empty list")
    if len(files) > MAX_FILES:
        raise HTTPException(
            status_code=422, detail=f"Too many files ({len(files)}); limit is {MAX_FILES} per import"
        )

    # Validate the project via the project service — raises NotFoundError,
    # which the global AppError handler maps to a clean 404 envelope.
    service = ProjectService(db)
    try:
        project_uuid = uuid.UUID(project_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="project_id must be a UUID") from exc
    project = await service.get(project_uuid)

    results: list[dict[str, Any]] = []
    ingested = skipped = failed = 0
    total_chunks = 0

    for entry in files:
        path = str(entry.get("path") or entry.get("name") or "").replace("\\", "/")
        content = entry.get("content")
        if not path or content is None:
            results.append({"path": path or "(unnamed)", "status": "failed", "reason": "missing path or content"})
            failed += 1
            continue
        if any(marker in path for marker in _SKIP_DIR_MARKERS):
            results.append({"path": path, "status": "skipped", "reason": "ignored directory"})
            skipped += 1
            continue
        ext = ("." + path.rsplit(".", 1)[-1].lower()) if "." in path else ""
        if ext and ext not in DEFAULT_INCLUDE:
            results.append({"path": path, "status": "skipped", "reason": f"unsupported type '{ext}'"})
            skipped += 1
            continue

        try:
            if isinstance(content, str):
                raw = content.encode("utf-8")
            else:
                raw = bytes(content)
            if not raw.strip():
                results.append({"path": path, "status": "skipped", "reason": "empty file"})
                skipped += 1
                continue
            if len(raw) > MAX_FILE_BYTES:
                results.append({"path": path, "status": "skipped", "reason": f"file larger than {MAX_FILE_BYTES} bytes"})
                skipped += 1
                continue

            filename = path.rsplit("/", 1)[-1]
            outcome = await doc_source.ingest_upload_persistent(
                db,
                filename=filename,
                content=raw,
                project_id=str(project.id),
                tags=["imported", path],
                uploaded_by=str(getattr(ctx, "user_id", "") or ""),
            )
            chunk_count = int(outcome.get("chunks") or 0)
            total_chunks += chunk_count
            ingested += 1
            results.append(
                {
                    "path": path,
                    "status": "ingested",
                    "chunks": chunk_count,
                    "vectors": outcome.get("vectors") or 0,
                    "mode": outcome.get("mode"),
                }
            )
        except doc_source.LoaderError as exc:
            failed += 1
            results.append({"path": path, "status": "failed", "reason": str(exc)})
        except Exception as exc:  # noqa: BLE001 — one bad file must not kill the import
            failed += 1
            results.append({"path": path, "status": "failed", "reason": f"{type(exc).__name__}: {exc}"})

    await db.commit()
    return {
        "projectId": str(project.id),
        "summary": {
            "filesReceived": len(files),
            "ingested": ingested,
            "skipped": skipped,
            "failed": failed,
            "totalChunks": total_chunks,
        },
        "results": results,
    }
