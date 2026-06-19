param(
    [string]$ProjectPath = "C:\1-IA\template-lab",
    [int]$Timeout = 600,
    [int]$PollInterval = 2
)

$OutputDir = Join-Path $ProjectPath ".agy-stitch-output"
$ResponsesDir = Join-Path $OutputDir "responses"
$LogsDir = Join-Path $OutputDir "logs"
$CompletedFile = Join-Path $OutputDir "completed.txt"
$MetadataFile = Join-Path $OutputDir "metadata.json"
$FinalReportFile = Join-Path $OutputDir "final-report.json"

$started = Get-Date

Write-Host "[Watcher] Monitoring $CompletedFile"
Write-Host "[Watcher] Timeout: ${Timeout}s, Poll: ${PollInterval}s"

while ($true) {
    $elapsed = [math]::Round(((Get-Date) - $started).TotalSeconds)

    # Check timeout
    if ($elapsed -ge $Timeout) {
        Write-Warning "[Watcher] TIMEOUT after ${elapsed}s"
        "STATUS=TIMEOUT`nTIMESTAMP=$(Get-Date -Format 'o')" | Out-File -FilePath $CompletedFile -Encoding utf8 -Force
        break
    }

    # Check completed.txt + metadata.json
    if ((Test-Path $CompletedFile) -and (Test-Path $MetadataFile)) {
        try {
            $metadata = Get-Content $MetadataFile -Raw | ConvertFrom-Json
            $completed = Get-Content $CompletedFile -Raw

            Write-Host "[Watcher] Detected completion after ${elapsed}s"
            Write-Host "[Watcher] Status: $($metadata.status)"

            # Verify integrity: check each listed response file exists
            $allOk = $true
            $totalSize = 0
            $errors = @()

            foreach ($file in $metadata.response_files) {
                $fullPath = Join-Path $OutputDir $file
                if (Test-Path $fullPath) {
                    $size = (Get-Item $fullPath).Length
                    $totalSize += $size
                    Write-Host "[Watcher]  OK $file ($size bytes)"
                } else {
                    Write-Warning "[Watcher]  MISSING $file"
                    $allOk = $false
                    $errors += "Missing: $file"
                }
            }

            # Generate final report
            $report = @{
                timestamp = (Get-Date -Format 'o')
                elapsed_seconds = $elapsed
                status = if ($allOk) { "SUCCESS" } else { "INCOMPLETE" }
                response_count = $metadata.response_count
                total_size_bytes = $totalSize
                errors = $errors
                stitch_project_id = $metadata.stitch_project_id
                response_files = @($metadata.response_files)
            }

            $report | ConvertTo-Json -Depth 10 | Out-File -FilePath $FinalReportFile -Encoding utf8 -Force
            Write-Host "[Watcher] Final report saved to $FinalReportFile"

            if ($allOk) {
                Set-Content -Path $CompletedFile -Value "STATUS=SUCCESS`nTIMESTAMP=$(Get-Date -Format 'o')" -Encoding utf8 -Force
                Write-Host "[Watcher] STATUS=SUCCESS"
                return "SUCCESS"
            } else {
                Set-Content -Path $CompletedFile -Value "STATUS=INCOMPLETE`nTIMESTAMP=$(Get-Date -Format 'o')" -Encoding utf8 -Force
                Write-Warning "[Watcher] Some files missing"
                return "INCOMPLETE: $($errors -join '; ')"
            }
        }
        catch {
            Write-Warning "[Watcher] Error reading metadata: $_"
        }
    }

    Start-Sleep -Seconds $PollInterval
}
