# Qdrant on Windows — Stability & Native Alternative

This doc records why Qdrant appeared to "crash in a ~70s cycle" on this machine
(Aug 5, 2026), what the actual root cause was, how to keep the Docker container
up reliably, and how to run Qdrant natively on Windows without Docker at all.

---

## 1. Root cause: Docker Desktop was never crashing

Investigation evidence (all from this machine, Aug 5 2026):

| Check | Result | Meaning |
|---|---|---|
| `docker inspect aiden-qdrant` | `restarts=0`, VM up continuously since 20:04 | Engine never died |
| Windows Application event log (last 4h) | No Docker/WSL crash records | No hard crash |
| `wsl -l -v` | `docker-desktop` = Running | VM alive |
| Docker Desktop process tree | Single boot at 20:04:45, PPID chain intact | One clean launch |
| `curl :6333/collections` | `200` | Qdrant serving |
| System RAM (16 GB) | 4.0 GB free, `vmmemWSL` ≈ 2 GB | Not memory-starved |

**Conclusion:** the "~70s cycle" was not an instability of Docker Desktop or
WSL2 — inferred from the absence of event-log crash records, 0 container
restarts, a continuously-running VM, and the exact correlation between
restarts and launching Docker Desktop as a **child of a shell/job object**
(e.g. `nohup "Docker Desktop.exe" &`): when the tooling that spawned it
cleaned up its process tree (~70s later), the Docker Desktop host process was
killed along with it, while the WSL2 VM and the docker engine (which live
outside that job object) kept running. Launching Docker Desktop **fully
detached** with `Start-Process` (no job-object membership) eliminated the
cycle: it has now run stable for over an hour with zero container restarts.

No `.wslconfig` exists, so WSL2 uses its default memory policy (50% of RAM ≈
8 GB). That is fine for this workload; a conservative cap is still recommended
(§3) so a HF model load in the venv and the WSL2 VM never compete for RAM.

## 2. Keeping Qdrant up reliably (Docker path)

Three layers, in order of strength:

1. **`restart: unless-stopped`** — already in `infrastructure/docker/docker-compose.yml`.
   Docker restarts the container after any engine/VM restart.
2. **Healthcheck** (added Aug 5 2026) — qdrant probes `/readyz` with bash's
   built-in `/dev/tcp` (the qdrant image has bash but **no curl/wget/python**,
   so a `curl` healthcheck was rejected during implementation). Interval 10s,
   retries 5, start period 20s. Docker marks the container unhealthy and
   restarts it if storage load hangs; `docker compose ps` shows `(healthy)`.
3. **Detached launch** — never start Docker Desktop from a foreground shell
   that may clean up its process tree. Use the helper:

   ```powershell
   powershell -ExecutionPolicy Bypass -File infrastructure/docker/ensure-qdrant.ps1
   ```

   This starts Docker Desktop detached (if not running), waits for the engine,
   brings up `aiden-qdrant`, and waits for `/readyz` before exiting 0.

The backend already tolerates brief outages: `RAGMemory`/`VectorService`
lazy-reconnect and fall back to the in-memory store while Qdrant is down, then
reconnect automatically when it returns — no restart needed.

## 3. WSL2 memory recommendation

No `.wslconfig` exists today (WSL2 default = 50% of RAM). To make the WSL2 VM
never exceed a predictable share (leaving headroom for the venv's HF model
loads — TinyLlama 1.1B weights ~2.5 GB in RAM, ~4.9 GB download on disk), create
`C:\Users\admin\.wslconfig`:

```ini
[wsl2]
memory=6GB
processors=4
swap=2GB
```

Apply with `wsl --shutdown` once, then restart Docker Desktop. Not required for
stability, but removes the only plausible memory-pressure vector.

## 4. Native Windows Qdrant (no Docker at all)

Qdrant publishes official Windows builds. Latest at time of writing: **v1.19.0**,
asset `qdrant-x86_64-pc-windows-msvc.zip` on
<https://github.com/qdrant/qdrant/releases/latest>.

```powershell
# 1. Download the zip from the link above, extract to e.g. C:\qdrant
# 2. Run it (it listens on 6333 by default; storage persists in ./storage)
C:\qdrant\qdrant.exe --uri http://127.0.0.1:6333
```

- No Docker Desktop, no WSL2, no job-object coupling — a plain Windows process.
- Data persists to `./storage` next to the exe (or point `--storage` elsewhere).
- To keep it running after reboots, register it as a scheduled task or use
  `NSSM` to create a Windows service:
  ```powershell
  nssm install Qdrant C:\qdrant\qdrant.exe --uri http://127.0.0.1:6333
  nssm start Qdrant
  ```

Point the backend at it (default already matches):

```env
# backend/.env
QDRANT_URL=http://127.0.0.1:6333
QDRANT_ENABLED=true
```

The existing `pipeline_intents` collection data can be migrated with the
official backup/restore (Qdrant dashboard → Snapshots), or simply re-populated
by re-running pipelines — RAG memory is a cache, not source of truth.

## 5. Quick check

```bash
curl -s http://127.0.0.1:6333/readyz          # expect HTTP 200
curl -s http://127.0.0.1:6333/collections     # expect JSON list
docker compose -f infrastructure/docker/docker-compose.yml ps qdrant  # (healthy)
```
