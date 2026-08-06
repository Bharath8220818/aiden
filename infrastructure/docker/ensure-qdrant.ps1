# ensure-qdrant.ps1 — Bring up Docker Desktop + the Qdrant container reliably.
#
# WHY THIS EXISTS (root cause of the "Docker Desktop crashes every ~70s" issue):
# Docker Desktop itself was not crashing — the Windows Application event log
# shows no Docker/WSL crash records, and the docker engine kept running with
# zero container restarts. What killed it was the *way* it was launched: when
# started as a child of a shell/job object (e.g. `nohup ... &`), any cleanup of
# that process tree terminates Docker Desktop's host process ~70s later. The
# fix is to launch it fully detached with `Start-Process`, which escapes the
# caller's job object. Use this script (or `powershell -File ensure-qdrant.ps1`)
# instead of launching Docker Desktop from a foreground shell.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File infrastructure/docker/ensure-qdrant.ps1
#
# It is idempotent: if Docker is already running it just waits for Qdrant.

$ErrorActionPreference = "Continue"

$dockerExe = "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe"
$qdrantUrl = "http://127.0.0.1:6333/readyz"

function Test-Qdrant {
    try {
        $resp = Invoke-WebRequest -Uri $qdrantUrl -UseBasicParsing -TimeoutSec 3
        return $resp.StatusCode -eq 200
    } catch {
        return $false
    }
}

# --- 1. Start Docker Desktop detached (escapes the caller's job object) ---
if (-not (Get-Process "Docker Desktop" -ErrorAction SilentlyContinue)) {
    Write-Host "[ensure-qdrant] Starting Docker Desktop detached..."
    if (-not (Test-Path $dockerExe)) {
        Write-Host "[ensure-qdrant] ERROR: Docker Desktop not found at $dockerExe" -ForegroundColor Red
        exit 1
    }
    Start-Process -FilePath $dockerExe -WindowStyle Minimized
} else {
    Write-Host "[ensure-qdrant] Docker Desktop already running."
}

# --- 2. Wait for the docker engine (up to 90s) ---
$engineReady = $false
for ($i = 0; $i -lt 30; $i++) {
    docker version --format "{{.Server.Version}}" 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        $engineReady = $true
        break
    }
    Start-Sleep -Seconds 3
}
if (-not $engineReady) {
    Write-Host "[ensure-qdrant] ERROR: docker engine did not come up within 90s" -ForegroundColor Red
    exit 1
}
Write-Host "[ensure-qdrant] Docker engine up."

# --- 3. Ensure the qdrant container is running (compose brings it up) ---
docker compose -f "$PSScriptRoot\docker-compose.yml" up -d qdrant 2>$null
if ($LASTEXITCODE -ne 0) {
    # Fallback: start the existing container if the compose file is stale
    docker start aiden-qdrant 2>$null | Out-Null
}

# --- 4. Wait for qdrant /readyz (up to 60s) ---
for ($i = 0; $i -lt 20; $i++) {
    if (Test-Qdrant) {
        Write-Host "[ensure-qdrant] Qdrant ready at http://127.0.0.1:6333"
        exit 0
    }
    Start-Sleep -Seconds 3
}
Write-Host "[ensure-qdrant] ERROR: Qdrant did not become ready within 60s" -ForegroundColor Red
exit 1
