# ─── AIDEN Backend — Multi-stage Dockerfile ───────────────────────────
# Optimized for production with minimal image size.
#
# Build stages:
#   1. builder  — Installs all dependencies (including build tools)
#   2. runtime  — Minimal production image with only runtime deps
#
# Build (preferred — uses BuildKit secrets, no token leak):
#   DOCKER_BUILDKIT=1 docker build \
#     --secret id=hf_token,src=../hf_token.txt \
#     -t aiden-backend .
#
# Build (fallback — token baked into image, visible in history):
#   docker build --build-arg HF_TOKEN=hf_... -t aiden-backend .
#
# Run:
#   docker run -p 8000:8000 aiden-backend
# ──────────────────────────────────────────────────────────────────────

# ═══════════════════════════════════════════════════════════════════════
# STAGE 1: Builder — Install dependencies and download models
# ═══════════════════════════════════════════════════════════════════════
FROM python:3.11-slim AS builder

WORKDIR /app

# Build args
ARG HF_TOKEN
ARG HF_CACHE_DIR=./models/cache

# System dependencies for building Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies (with build tools available)
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Download embedding model during build
COPY scripts/download_models.py scripts/download_models.py
ENV HF_CACHE_DIR=${HF_CACHE_DIR}

RUN --mount=type=secret,id=hf_token \
    if [ "${SKIP_MODEL_DOWNLOAD:-false}" = "true" ]; then \
      echo "  → SKIP_MODEL_DOWNLOAD=true — skipping model download"; \
    else \
      if [ -f /run/secrets/hf_token ] && [ -s /run/secrets/hf_token ]; then \
        export HF_TOKEN=$(cat /run/secrets/hf_token); \
      fi && \
      echo "  → Downloading embedding model (~90 MB)..." && \
      PYTHONPATH=/install python scripts/download_models.py --model embedding || \
      echo "  ⚠ Model download failed (non-fatal — will download at runtime)"; \
    fi

# ═══════════════════════════════════════════════════════════════════════
# STAGE 2: Runtime — Minimal production image
# ═══════════════════════════════════════════════════════════════════════
FROM python:3.11-slim AS runtime

WORKDIR /app

# Runtime system dependencies only (no gcc, no git, no build tools)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Copy installed Python packages from builder
COPY --from=builder /install /usr/local

# Copy model cache from builder (if downloaded)
COPY --from=builder /app/models /app/models

# Copy application code
COPY app/ app/
COPY alembic/ alembic/
COPY alembic.ini .
COPY docker-entrypoint.sh .

# Make entrypoint executable
RUN chmod +x docker-entrypoint.sh

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTORCH_NO_CUDA=1
ENV OMP_NUM_THREADS=1
ENV MKL_NUM_THREADS=1

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

EXPOSE 8000

ENTRYPOINT ["./docker-entrypoint.sh"]
