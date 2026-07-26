# ============================================================================
# AIDEN — Makefile
# One-command setup, development, testing, and deployment
# ============================================================================

.PHONY: help install install-backend install-frontend
.PHONY: dev dev-backend dev-frontend
.PHONY: test test-backend test-frontend
.PHONY: build build-backend build-frontend
.PHONY: clean clean-pyc clean-node clean-all
.PHONY: db-migrate db-seed db-reset
.PHONY: docker-up docker-down docker-build docker-logs
.PHONY: lint format
.PHONY: pre-commit

# ─── Colors ──────────────────────────────────────────────────────────────
BLUE    := \033[0;34m
GREEN   := \033[0;32m
YELLOW  := \033[0;33m
RED     := \033[0;31m
CYAN    := \033[0;36m
RESET   := \033[0m

help:
	@echo "$(BLUE)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(RESET)"
	@echo "$(GREEN)  AIDEN — Development Commands$(RESET)"
	@echo "$(BLUE)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(RESET)"
	@echo ""
	@echo "$(CYAN)Setup:$(RESET)"
	@echo "  make install        Install all dependencies (backend + frontend)"
	@echo "  make install-backend  Install backend dependencies only"
	@echo "  make install-frontend Install frontend dependencies only"
	@echo ""
	@echo "$(CYAN)Development:$(RESET)"
	@echo "  make dev            Start both backend and frontend servers"
	@echo "  make dev-backend    Start backend server only"
	@echo "  make dev-frontend   Start frontend server only"
	@echo ""
	@echo "$(CYAN)Testing:$(RESET)"
	@echo "  make test           Run all tests (backend + frontend)"
	@echo "  make test-backend   Run backend tests (pytest)"
	@echo "  make test-frontend  Run frontend tests (vitest)"
	@echo ""
	@echo "$(CYAN)Database:$(RESET)"
	@echo "  make db-migrate     Run Alembic migrations"
	@echo "  make db-seed        Seed test users"
	@echo "  make db-reset       Reset database (drop + recreate)"
	@echo ""
	@echo "$(CYAN)Docker:$(RESET)"
	@echo "  make docker-up      Start all Docker services"
	@echo "  make docker-down    Stop all Docker services"
	@echo "  make docker-build   Rebuild Docker images"
	@echo "  make docker-logs    View Docker logs"
	@echo ""
	@echo "$(CYAN)Quality:$(RESET)"
	@echo "  make lint           Run linters (ruff, ESLint)"
	@echo "  make format         Format code (ruff, Prettier)"
	@echo "  make pre-commit     Run pre-commit hooks"
	@echo ""
	@echo "$(CYAN)Build:$(RESET)"
	@echo "  make build          Build production artifacts"
	@echo "  make build-backend  Build backend Docker image"
	@echo "  make build-frontend Build frontend static files"
	@echo ""
	@echo "$(CYAN)Clean:$(RESET)"
	@echo "  make clean          Clean all build artifacts"
	@echo "  make clean-pyc      Clean Python cache files"
	@echo "  make clean-node     Clean node_modules"
	@echo "  make clean-all      Clean everything (including Docker volumes)"
	@echo ""

# ─── Setup ──────────────────────────────────────────────────────────────

install: install-backend install-frontend
	@echo "$(GREEN)All dependencies installed!$(RESET)"

install-backend:
	@echo "$(BLUE)Installing backend dependencies...$(RESET)"
	@cd backend && python -m venv venv
	@cd backend && . venv/bin/activate && pip install -r requirements.txt
	@echo "$(GREEN)Backend dependencies installed$(RESET)"

install-frontend:
	@echo "$(BLUE)Installing frontend dependencies...$(RESET)"
	@cd frontend && npm install
	@echo "$(GREEN)Frontend dependencies installed$(RESET)"

# ─── Development ────────────────────────────────────────────────────────

dev:
	@echo "$(BLUE)Starting development servers...$(RESET)"
	@make -j2 dev-backend dev-frontend

dev-backend:
	@echo "$(GREEN)Starting backend server...$(RESET)"
	@cd backend && . venv/bin/activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-frontend:
	@echo "$(GREEN)Starting frontend server...$(RESET)"
	@cd frontend && npm run dev

# ─── Testing ────────────────────────────────────────────────────────────

test: test-backend test-frontend
	@echo "$(GREEN)All tests passed!$(RESET)"

test-backend:
	@echo "$(BLUE)Running backend tests...$(RESET)"
	@cd backend && . venv/bin/activate && pytest -v

test-frontend:
	@echo "$(BLUE)Running frontend tests...$(RESET)"
	@cd frontend && npm run test

# ─── Database ──────────────────────────────────────────────────────────

db-migrate:
	@echo "$(BLUE)Running migrations...$(RESET)"
	@cd backend && . venv/bin/activate && alembic upgrade head
	@echo "$(GREEN)Migrations applied$(RESET)"

db-seed:
	@echo "$(BLUE)Seeding database...$(RESET)"
	@cd backend && . venv/bin/activate && python scripts/seed_user.py
	@echo "$(GREEN)Database seeded$(RESET)"

db-reset:
	@echo "$(RED)Resetting database...$(RESET)"
	@cd backend && rm -f aiden.db
	@make db-migrate
	@make db-seed
	@echo "$(GREEN)Database reset complete$(RESET)"

# ─── Docker ─────────────────────────────────────────────────────────────

docker-up:
	@echo "$(BLUE)Starting Docker services...$(RESET)"
	@cd infrastructure/docker && docker-compose up -d
	@echo "$(GREEN)Docker services started$(RESET)"

docker-down:
	@echo "$(BLUE)Stopping Docker services...$(RESET)"
	@cd infrastructure/docker && docker-compose down
	@echo "$(GREEN)Docker services stopped$(RESET)"

docker-build:
	@echo "$(BLUE)Building Docker images...$(RESET)"
	@cd infrastructure/docker && docker-compose build
	@echo "$(GREEN)Docker images built$(RESET)"

docker-logs:
	@cd infrastructure/docker && docker-compose logs -f

# ─── Quality ────────────────────────────────────────────────────────────

lint:
	@echo "$(BLUE)Running linters...$(RESET)"
	@cd backend && . venv/bin/activate && ruff check .
	@cd frontend && npm run lint
	@echo "$(GREEN)Linting complete$(RESET)"

format:
	@echo "$(BLUE)Formatting code...$(RESET)"
	@cd backend && . venv/bin/activate && ruff format .
	@cd frontend && npx prettier --write .
	@echo "$(GREEN)Formatting complete$(RESET)"

pre-commit:
	@pre-commit run --all-files

# ─── Build ─────────────────────────────────────────────────────────────

build: build-frontend build-backend
	@echo "$(GREEN)Build complete!$(RESET)"

build-frontend:
	@echo "$(BLUE)Building frontend...$(RESET)"
	@cd frontend && npm run build
	@echo "$(GREEN)Frontend built$(RESET)"

build-backend:
	@echo "$(BLUE)Building backend Docker image...$(RESET)"
	@cd backend && docker build -t aiden-backend .
	@echo "$(GREEN)Backend image built$(RESET)"

# ─── Clean ─────────────────────────────────────────────────────────────

clean: clean-pyc clean-node
	@echo "$(GREEN)Clean complete$(RESET)"

clean-pyc:
	@echo "$(BLUE)Cleaning Python cache...$(RESET)"
	@find . -type f -name "*.pyc" -delete
	@find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".mypy_cache" -exec rm -rf {} + 2>/dev/null || true
	@echo "$(GREEN)Python cache cleaned$(RESET)"

clean-node:
	@echo "$(BLUE)Cleaning node_modules...$(RESET)"
	@rm -rf frontend/node_modules frontend/dist frontend/.vite
	@echo "$(GREEN)Node modules cleaned$(RESET)"

clean-all: clean
	@echo "$(RED)Cleaning Docker volumes...$(RESET)"
	@cd infrastructure/docker && docker-compose down -v
	@echo "$(GREEN)Everything cleaned$(RESET)"

# ─── Default ───────────────────────────────────────────────────────────

.DEFAULT_GOAL := help
