# Knowledge (RAG)

| Method | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/knowledge/documents` | `knowledge.read` | list ingested documents |
| POST | `/knowledge/documents` | `knowledge.write` | add document (upload/text) |
| DELETE | `/knowledge/documents/{source_key}` | `knowledge.write` | remove document + chunks |
| POST | `/knowledge/documents/{source_key}/ingest` | `knowledge.write` | (re)ingest one document → chunks |
| POST | `/knowledge/ingest` | `knowledge.write` | bulk ingest |
| POST | `/knowledge/retrieve` | `knowledge.read` | hybrid retrieval (vector + keyword + RRF, rerank when embeddings available) |
| GET | `/knowledge/docs` | `knowledge.read` | legacy docs listing |
| GET | `/knowledge/status` | `knowledge.read` | backend status (qdrant/embeddings availability, chunk counts) |

## Retrieval contract

Request: `{ "query": "...", "project_id": "...", "top_k": 5 }` →
ranked chunks with scores + source metadata. Vector search requires
Qdrant + the embedding model (`nomic-embed-text` via Ollama); without them
the keyword retriever answers and `/knowledge/status` says so — the RCA and
documentation agents consume the same interface
(`backend/app/ai/rag/`, Phase B infra pending per
`docs/architecture/deployment-architecture.md`).
