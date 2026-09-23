"""RAG subsystem — ingestion → chunking → embedding → Qdrant → retrieval.

Module map (spec §2):

    ingestion/   loaders → cleaner → structure-aware chunker → metadata
    retrieval/   vector + keyword → hybrid fusion → reranker → context builder
    sources/     runtime knowledge writers (incidents/fixes, documents)
    service.py   the facade agents and the API consume

Existing infrastructure reused (not duplicated): `services/qdrant_client.py`
is the qdrant client (spec's qdrant/ subpackage), `services/ai_client.py` the
embedding model gateway (Ollama nomic-embed-text, 768-d).
"""
