param(
    [string]$ProjectPath = "C:\1-IA\template-lab",
    [string]$PromptFile = ".agy-stitch-output\prompt-agy.md",
    [int]$AgyTimeout = 300,
    [int]$WatcherTimeout = 600
)

$ErrorActionPreference = "Stop"
$OutputDir = Join-Path $ProjectPath ".agy-stitch-output"
$LogsDir = Join-Path $OutputDir "logs"
$LockFile = Join-Path $OutputDir ".lock"
$CompletedFile = Join-Path $OutputDir "completed.txt"
$MetadataFile = Join-Path $OutputDir "metadata.json"

# Ensure directories
New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
New-Item -ItemType Directory -Path $LogsDir -Force | Out-Null

# Check lock
if (Test-Path $LockFile) {
    $lockContent = Get-Content $LockFile -Raw
    Write-Warning "Lock file exists: $lockContent"
    Write-Warning "Remove manually or wait for completion."
    exit 1
}

# Remove stale completed.txt
Remove-Item $CompletedFile -ErrorAction SilentlyContinue
Remove-Item $MetadataFile -ErrorAction SilentlyContinue

# Create lock
$pid | Out-File -FilePath $LockFile -Encoding utf8

# Read prompt
$promptPath = Join-Path $ProjectPath $PromptFile
if (!(Test-Path $promptPath)) {
    Write-Error "Prompt file not found: $promptPath"
    Remove-Item $LockFile -ErrorAction SilentlyContinue
    exit 1
}

$prompt = Get-Content $promptPath -Raw

Write-Host "=== Run Stitch Pipeline ==="
Write-Host "Project: $ProjectPath"
Write-Host "Timeout agy: ${AgyTimeout}s"
Write-Host "Timeout watcher: ${WatcherTimeout}s"
Write-Host "Launching agy in background..."

# Kill stale agy processes
Get-Process -Name "agy" -ErrorAction SilentlyContinue | Stop-Process -Force

# Launch agy in background
$agyJob = Start-Job -ScriptBlock {
    param($dir, $prompt, $timeout)
    Set-Location $dir
    $env:STITCH_API_KEY = [System.Environment]::GetEnvironmentVariable("STITCH_API_KEY", "User")
    agy -p $prompt --dangerously-skip-permissions --print-timeout "${timeout}s" 2>&1
} -ArgumentList $ProjectPath, $prompt, $AgyTimeout

# Launch watcher in background
$watcherJob = Start-Job -ScriptBlock {
    param($dir, $timeout)
    & (Join-Path $dir "scripts\watch-completion.ps1") -ProjectPath $dir -Timeout $timeout
} -ArgumentList $ProjectPath, $WatcherTimeout

Write-Host "Agy PID: $($agyJob.Id)"
Write-Host "Watcher PID: $($watcherJob.Id)"
Write-Host "Waiting for completion..."

# Wait for watcher to finish
$watcherResult = $watcherJob | Wait-Job | Receive-Job

# Display watcher result
Write-Host "Watcher result: $watcherResult"

# Clean up
Remove-Item $LockFile -ErrorAction SilentlyContinue

if ($watcherResult -match "SUCCESS") {
    Write-Host "=== Pipeline completed successfully ==="
    exit 0
} else {
    Write-Warning "=== Pipeline finished with issues ==="
    Write-Warning $watcherResult
    exit 1
}
