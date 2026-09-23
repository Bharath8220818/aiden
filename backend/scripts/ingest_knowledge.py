"""Ingest the knowledge corpus into the Qdrant vector store.

Usage (backend venv):
    python -m scripts.ingest_knowledge            # full (re)ingest
    python -m scripts.ingest_knowledge --status   # inspect memory-layer health

Requires: OLLAMA_URL reachable with the embedding model pulled, e.g.
    ollama pull nomic-embed-text
and QDRANT_URL pointing at a running Qdrant (docker compose includes one).
"""

from __future__ import annotations

import argparse
import asyncio
import sys

from app.core.database import AsyncSessionLocal
from app.services import ai_client, qdrant_client, rag_service


async def _status() -> int:
    embeddings = await ai_client.embeddings_available()
    qdrant = await qdrant_client.is_reachable()
    print(f"embeddings ({ai_client.embedding_model()}): {'ok' if embeddings else 'UNAVAILABLE'}")
    print(f"qdrant:             {'ok' if qdrant else 'UNAVAILABLE'}")
    mode = "vector" if embeddings and qdrant else "keyword-fallback"
    print(f"retrieval mode:     {mode}")
    if not embeddings:
        print(f"\nhint: ollama pull {ai_client.embedding_model()}")
    return 0 if mode == "vector" else 1


async def _ingest() -> int:
    if not await ai_client.embeddings_available():
        print(
            f"Embedding model not available. Start Ollama and run:\n"
            f"  ollama pull {ai_client.embedding_model()}"
        )
        return 1
    if not await qdrant_client.is_reachable():
        print("Qdrant is not reachable. Start it with: docker compose up -d qdrant")
        return 1

    async with AsyncSessionLocal() as session:
        summary = await rag_service.ingest_registry_knowledge(session)
    print(
        f"Ingested {summary['ingested']} docs → {summary['vectors']} vectors "
        f"(mode: {summary['mode']}, collection: {qdrant_client.COLLECTION})"
    )
    return 0 if summary["vectors"] else 1


def main() -> int:
    parser = argparse.ArgumentParser(description="AIDEN knowledge ingestion")
    parser.add_argument("--status", action="store_true", help="show memory-layer status only")
    args = parser.parse_args()
    return asyncio.run(_status() if args.status else _ingest())


if __name__ == "__main__":
    sys.exit(main())
