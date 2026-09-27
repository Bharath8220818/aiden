# AIDEN — Windows setup (PowerShell)
# Usage:  powershell -ExecutionPolicy Bypass -File scripts/setup.ps1
$ErrorActionPreference = "Stop"

Write-Host "== AIDEN setup ==" -ForegroundColor Cyan

# --- Backend ---
Push-Location backend
if (-not (Test-Path "venv")) {
    Write-Host "Creating backend venv..."
    python -m venv venv
}
Write-Host "Installing backend dependencies..."
.\venv\Scripts\python.exe -m pip install --upgrade pip
.\venv\Scripts\python.exe -m pip install -r requirements.txt
if (-not (Test-Path ".env")) { Copy-Item .env.example .env; Write-Host "Created backend/.env (review it)" }
.\venv\Scripts\python.exe -m scripts.seed_database
Pop-Location

# --- Frontend ---
Push-Location frontend
if (-not (Test-Path ".env")) { Copy-Item .env.example .env; Write-Host "Created frontend/.env" }
Write-Host "Installing frontend dependencies (npm ci)..."
npm ci
Pop-Location

Write-Host ""
Write-Host "Done. Start dev servers:" -ForegroundColor Green
Write-Host "  backend :  cd backend; .\venv\Scripts\python.exe -m uvicorn app.main:app --port 8000"
Write-Host "  frontend:  cd frontend; npm run dev"
Write-Host "  or all services: docker compose up -d --build"
