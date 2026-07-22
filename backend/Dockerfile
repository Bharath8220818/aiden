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

# Download models during build.
# Preferred: uses BuildKit secret mount (token never in image layers).
# If HF_TOKEN was passed via --build-arg, the secret mount is empty and
# the --mount target won't exist, so the fallback $HF_TOKEN env var is used.
RUN --mount=type=secret,id=hf_token \
    if [ -f /run/secrets/hf_token ] && [ -s /run/secrets/hf_token ]; then \
      export HF_TOKEN=$(cat /run/secrets/hf_token); \
    fi && \
    python scripts/download_models.py --model intent --model embedding

# ── Application code ───────────────────────────────────────────────────
COPY . .

# ── Runtime ─────────────────────────────────────────────────────────────
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
