# Infrastructure — AIDEN

This folder contains infrastructure and runtime support for AIDEN. Use it to start the project with Docker Compose and manage local service dependencies.

---

## Docker Compose

The primary Docker Compose file is:

- `infrastructure/docker/docker-compose.yml`

It defines the following services:

- `postgres` — PostgreSQL database on port `5432`
- `redis` — Redis cache on port `6379`
- `qdrant` — Qdrant vector database on port `6333`
- `minio` — S3-compatible storage on port `9000`
- `backend` — FastAPI backend on port `8000`
- `frontend` — React frontend on ports `80` and `443`

---

## Start services

```bash
cd infrastructure/docker
docker compose up -d
```

Check container status:

```bash
docker compose ps
```

Stop services:

```bash
docker compose down
```

---

## Recommended local workflow

1. Ensure Docker Desktop is running.
2. Start the stack with `docker compose up -d`.
3. Visit `http://localhost` for the frontend.
4. Visit `http://localhost:8000/docs` for the backend API docs.

---

## Notes

- The backend container reads environment variables from the compose file and seeds demo users if enabled.
- The frontend container serves the built React app from port `80`.
- If you need to reset persistent data, stop containers and remove volumes:

```bash
docker compose down -v
```

---

## Windows guidance

If Windows path or Docker networking issues appear, use the built-in PowerShell helper:

```powershell
.
```

and ensure `docker compose` is available in PowerShell.
