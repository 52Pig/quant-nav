$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$serverScript = Join-Path $projectRoot 'server.py'
$python = (Get-Command python -ErrorAction Stop).Source
$taskName = 'QuantNavLocalWeb'
$arguments = "-u `"$serverScript`""

$action = New-ScheduledTaskAction -Execute $python -Argument $arguments -WorkingDirectory $projectRoot
$trigger = New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME"
$settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -RestartCount 5 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit ([TimeSpan]::Zero) `
    -MultipleInstances IgnoreNew

Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Description 'Serve quant-nav locally at http://quant-nav.localhost:8765 after this user signs in.' `
    -Force | Out-Null

Start-ScheduledTask -TaskName $taskName

$deadline = (Get-Date).AddSeconds(10)
do {
    Start-Sleep -Milliseconds 500
    try {
        $response = Invoke-WebRequest -Uri 'http://quant-nav.localhost:8765/' -UseBasicParsing -TimeoutSec 2
        if ($response.StatusCode -eq 200 -and $response.Content -match 'quant-nav') {
            Write-Output "Installed and started startup task '$taskName'."
            Write-Output "The site will start after $env:USERNAME signs in to Windows."
            Write-Output 'Open: http://quant-nav.localhost:8765/'
            exit 0
        }
    }
    catch {
        $task = Get-ScheduledTask -TaskName $taskName
        if ($task.State -eq 'Ready') {
            throw "The startup task did not stay running. Check the Windows Task Scheduler history for '$taskName'."
        }
    }
} while ((Get-Date) -lt $deadline)

Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
throw 'quant-nav did not pass its HTTP health check within 10 seconds.'
Write-Output "Open: http://127.0.0.1:8765/"
