# Documentation — AIDEN

This folder collects project documentation and running guides for AIDEN.

## Docs index

| Doc | What's in it |
|-----|--------------|
| [`AIDEN_Comprehensive_Project_Documentation.md`](AIDEN_Comprehensive_Project_Documentation.md) | Full platform documentation — architecture, agents, Tool Gateway, algorithms, deployment plan (20 sections) |
| [`PROJECT_STATUS_REPORT.md`](PROJECT_STATUS_REPORT.md) | Current status, pending-task checklist, sprint plan, **next-level roadmap** |
| [`INTENT_AGENT_FINETUNING.md`](INTENT_AGENT_FINETUNING.md) | LoRA fine-tuning pipeline, datasets, evaluation harness |
| [`QDRANT_WINDOWS.md`](QDRANT_WINDOWS.md) | Qdrant on Windows — Docker Desktop issues and native fallback |
| [`aiden_training_colab.ipynb`](aiden_training_colab.ipynb) | Colab notebook for agent fine-tuning |
| [`aiden_multimodal_colab.ipynb`](aiden_multimodal_colab.ipynb) | Colab notebook for multimodal model |
| Root [`README.md`](../README.md) | Project overview, quick start, tech stack |

## Quick start (short version)

1. **Docker (everything at once):**
   ```bash
   cd infrastructure/docker
   docker compose up -d
   ```
2. **Or manually:**
   - Backend: `cd backend && pip install -r requirements.txt && alembic upgrade head && uvicorn app.main:app --reload --port 8000`
   - Frontend: `cd frontend && npm install && npm run dev`
3. Open `http://localhost:5173` (frontend) or `http://localhost:8000/docs` (API docs).

See the root [`README.md`](../README.md) for the full quick start and env vars.

## Notes

- The backend is FastAPI; OpenAPI docs at `/docs`.
- The frontend expects `VITE_API_URL` and `VITE_WS_URL` pointing at the backend (use `127.0.0.1`, not `localhost`, to avoid IPv6 `::1` issues).
- Docker Compose stack: PostgreSQL, Redis, Qdrant, MinIO, backend, frontend. Prometheus config under `infrastructure/docker/prometheus/`.
- Kubernetes manifests live in [`../deployment/kubernetes/`](../deployment/kubernetes/README.md).
- The `docs/*.py` files (build_doc, create_doc, create_docs, generate_doc, write_doc) are one-off script variants used to generate the comprehensive documentation; they are not part of the runtime.
