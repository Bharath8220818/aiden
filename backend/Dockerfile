# ─── AIDEN Backend ──────────────────────────────────────────────────────
# Self-contained image that downloads HuggingFace models during the build.
# Docker layer caching means the model download layer only rebuilds when
# requirements.txt, download_models.py, or HF_TOKEN changes.
#
# Build (preferred — uses BuildKit secrets, no token leak):
#   DOCKER_BUILDKIT=1 docker build \
#     --secret id=hf_token,src=../hf_token.txt \
#     -t aiden-backend .
#
# Build (fallback — token baked into image, visible in history):
#   # PowerShell:   --build-arg "HF_TOKEN=$env:HF_TOKEN"
#   # CMD:          --build-arg HF_TOKEN=%HF_TOKEN%
#   # bash:         --build-arg HF_TOKEN=$HF_TOKEN
#   docker build \
#     --build-arg HF_TOKEN=hf_... \
#     -t aiden-backend .
#
# Run:
#   docker run -p 8000:8000 aiden-backend
# ────────────────────────────────────────────────────────────────────────

FROM python:3.11-slim

WORKDIR /app

# ── Build args (only used as fallback when BuildKit secrets unavailable) ─
ARG HF_TOKEN
ARG HF_CACHE_DIR=./models/cache

# ── System dependencies ─────────────────────────────────────────────────
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    git \
    && rm -rf /var/lib/apt/lists/*

# ── Python dependencies ─────────────────────────────────────────────────
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Model download script ──────────────────────────────────────────────
COPY scripts/download_models.py scripts/download_models.py

ENV HF_CACHE_DIR=${HF_CACHE_DIR}

# Download small embedding model during build.  The large intent model
# (~6 GB) is skipped here to keep builds fast — it downloads on first use.
# Preferred: uses BuildKit secret mount (token never in image layers).
# If SKIP_MODEL_DOWNLOAD=true the entire download is skipped.
RUN --mount=type=secret,id=hf_token \
    if [ "${SKIP_MODEL_DOWNLOAD:-false}" = "true" ]; then \
      echo "  → SKIP_MODEL_DOWNLOAD=true — skipping model download"; \
    else \
      if [ -f /run/secrets/hf_token ] && [ -s /run/secrets/hf_token ]; then \
        export HF_TOKEN=$(cat /run/secrets/hf_token); \
      fi && \
      echo "  → Downloading embedding model (~90 MB)..." && \
      python scripts/download_models.py --model embedding || \
      echo "  ⚠ Model download failed (non-fatal — will download at runtime)"; \
    fi

# ── Application code ───────────────────────────────────────────────────
COPY . .

# ── Docker entrypoint (wait for DB, seed users, then start) ────────────
COPY docker-entrypoint.sh .
RUN chmod +x docker-entrypoint.sh

# ── Runtime ─────────────────────────────────────────────────────────────
EXPOSE 8000

ENTRYPOINT ["./docker-entrypoint.sh"]
