$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$python = (Get-Command python -ErrorAction Stop).Source
$url = 'http://quant-nav.localhost:8765/'

$listener = Get-NetTCPConnection -LocalPort 8765 -State Listen -ErrorAction SilentlyContinue |
    Select-Object -First 1

if ($listener) {
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3
        if ($response.Content -match 'quant-nav') {
            Write-Output "quant-nav is already serving at $url"
            exit 0
        }
    }
    catch {
        throw "Port 8765 is occupied by another service. Stop it or choose a different port before starting quant-nav."
    }
}

$process = Start-Process -FilePath $python `
    -ArgumentList @('-u', (Join-Path $projectRoot 'server.py')) `
    -WorkingDirectory $projectRoot `
    -WindowStyle Hidden `
    -PassThru

$deadline = (Get-Date).AddSeconds(10)
do {
    Start-Sleep -Milliseconds 400
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2
        if ($response.StatusCode -eq 200 -and $response.Content -match 'quant-nav') {
            Write-Output "quant-nav is serving at $url (PID $($process.Id))"
            exit 0
        }
    }
    catch {
        if ($process.HasExited) {
            throw "quant-nav server exited during startup. Exit code: $($process.ExitCode)"
        }
    }
} while ((Get-Date) -lt $deadline)

if (-not $process.HasExited) {
    Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
}
throw 'quant-nav did not become healthy within 10 seconds.'
