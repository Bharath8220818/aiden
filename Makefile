# AIDEN — developer tasks (Git Bash / WSL / macOS / Linux)
# Windows users without `make`: use the scripts/ PowerShell twins.

PY        := backend/venv/Scripts/python.exe   # Windows venv layout
PY_POSIX  := backend/venv/bin/python           # POSIX venv layout
PY_BIN    := $(shell test -f "$(PY)" && echo "$(PY)" || echo "$(PY_POSIX)")

.PHONY: help install install-frontend dev-backend dev-frontend test test-frontend \
        lint format ml-validate ml-test eval-prepare eval-baseline smoke compose-up compose-down clean

help:
	@grep -E '^[a-zA-Z_-]+:.*?##' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "};{printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

install: ## create backend venv + install backend deps
	cd backend && python -m venv venv && \
		$(PY_BIN) -m pip install --upgrade pip && \
		$(PY_BIN) -m pip install -r requirements.txt

install-frontend: ## npm ci for the frontend
	cd frontend && npm ci

dev-backend: ## run the API on :8000 (SQLite dev mode)
	cd backend && $(PY_BIN) -m uvicorn app.main:app --port 8000

dev-frontend: ## run the Vite dev server on :5173
	cd frontend && npm run dev

test: ## backend pytest suite
	cd backend && $(PY_BIN) -m pytest

test-frontend: ## frontend lint + vitest + build
	cd frontend && npm run lint && npm test && npm run build

lint: ## ruff check (backend + ml)
	$(PY_BIN) -m ruff check backend ml

format: ## ruff format (backend + ml)
	$(PY_BIN) -m ruff format backend ml

ml-validate: ## frozen contracts vs backend registry
	$(PY_BIN) -m ml.validate

ml-test: ## ml workspace unit tests
	$(PY_BIN) -m pytest ml/tests -q

eval-prepare: ## rebuild ml datasets from the backend scaffold + split
	$(PY_BIN) ml/scripts/prepare_datasets.py --source backend-scaffold

eval-baseline: ## Phase 5 baseline over all agents
	$(PY_BIN) ml/evaluation/run_baseline.py --all

smoke: ## 14-gate smoke against a running backend (URL=... to override)
	$(PY_BIN) -m scripts.phase_a.smoke --base-url $(or $(URL),http://localhost:8000)

compose-up: ## Phase B local stack (postgres/redis/qdrant/ollama/backend/frontend)
	docker compose up -d --build

compose-down: ## stop the local stack
	docker compose down

clean: ## remove caches and stray logs
	rm -rf backend/.pytest_cache backend/.ruff_cache ml/.pytest_cache ml/__pycache__ \
		ml/*/__pycache__ frontend_vite.log uvicorn.log vite.log
