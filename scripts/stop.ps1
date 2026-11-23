$task = Get-ScheduledTask -TaskName 'QuantNavLocalWeb' -ErrorAction SilentlyContinue
if ($task -and $task.State -eq 'Running') {
    Stop-ScheduledTask -TaskName 'QuantNavLocalWeb'
    Start-Sleep -Milliseconds 700
}

$listener = Get-NetTCPConnection -LocalPort 8765 -State Listen -ErrorAction SilentlyContinue |
    Select-Object -First 1

if (-not $listener) {
    Write-Output 'quant-nav is not running.'
    exit 0
}

$processId = $listener.OwningProcess
$process = Get-CimInstance Win32_Process -Filter "ProcessId = $processId"
$expectedScript = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\server.py'))

if (-not $process -or $process.CommandLine -notlike "*$expectedScript*") {
    throw "Port 8765 belongs to a different process (PID $processId). It was left running."
}

Stop-Process -Id $processId -Force
Write-Output 'quant-nav server stopped.'
