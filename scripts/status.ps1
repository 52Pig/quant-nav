$url = 'http://quant-nav.localhost:8765/'
$listener = Get-NetTCPConnection -LocalPort 8765 -State Listen -ErrorAction SilentlyContinue |
    Select-Object -First 1

if (-not $listener) {
    Write-Output 'quant-nav is stopped.'
    exit 1
}

try {
    $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3
    if ($response.StatusCode -eq 200 -and $response.Content -match 'quant-nav') {
        Write-Output "quant-nav is healthy at $url (PID $($listener.OwningProcess))"
        exit 0
    }
}
catch {
    Write-Output "Port 8765 is listening (PID $($listener.OwningProcess)), but quant-nav did not pass its health check."
    exit 1
}

Write-Output "Port 8765 is listening (PID $($listener.OwningProcess)), but the response is not quant-nav."
exit 1
