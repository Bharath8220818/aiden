# AIDEN — stop local dev servers (PowerShell)
foreach ($port in 8000, 5173) {
    $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    foreach ($conn in $conns) {
        Write-Host "Stopping PID $($conn.OwningProcess) (port $port)"
        Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}
Write-Host "Dev servers stopped."
