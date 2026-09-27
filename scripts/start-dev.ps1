# AIDEN — start local dev servers (PowerShell)
# Usage: powershell -ExecutionPolicy Bypass -File scripts/start-dev.ps1
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

function Test-Port($port) {
    (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) -ne $null
}

if (Test-Port 8000) { Write-Host "Port 8000 busy — is the backend already running?" -ForegroundColor Yellow; exit 1 }
if (Test-Port 5173) { Write-Host "Port 5173 busy — is the frontend already running?" -ForegroundColor Yellow; exit 1 }

Write-Host "Starting backend on :8000 (logs: $root\uvicorn.log)..."
Start-Process -WorkingDirectory "$root\backend" -WindowStyle Hidden `
  -FilePath ".\venv\Scripts\python.exe" `
  -ArgumentList "-m","uvicorn","app.main:app","--port","8000" `
  -RedirectStandardOutput "$root\uvicorn.log" -RedirectStandardError "$root\uvicorn.err.log"

Write-Host "Starting frontend on :5173 (logs: $root\frontend_vite.log)..."
Start-Process -WorkingDirectory "$root\frontend" -WindowStyle Hidden `
  -FilePath "cmd" -ArgumentList "/c","npm run dev" `
  -RedirectStandardOutput "$root\frontend_vite.log" -RedirectStandardError "$root\frontend_vite.err.log"

Start-Sleep -Seconds 6
try {
    $health = Invoke-RestMethod "http://localhost:8000/api/v1/health/healthz" -TimeoutSec 5
    Write-Host "backend: $($health.status)" -ForegroundColor Green
} catch { Write-Host "backend not answering yet — check uvicorn.log" -ForegroundColor Yellow }
Write-Host "frontend: http://localhost:5173 (check frontend_vite.log)"
