param(
    [string]$ProjectPath = "C:\1-IA\template-lab"
)

$OutputDir = Join-Path $ProjectPath ".agy-stitch-output"
$ResponsesDir = Join-Path $OutputDir "responses"
$LogsDir = Join-Path $OutputDir "logs"
$CompletedFile = Join-Path $OutputDir "completed.txt"
$MetadataFile = Join-Path $OutputDir "metadata.json"
$FinalReportFile = Join-Path $OutputDir "final-report.json"

Write-Host "=== Process Responses ==="

if (!(Test-Path $CompletedFile)) {
    Write-Error "No completed.txt found. Pipeline may not have finished."
    exit 1
}

if (!(Test-Path $MetadataFile)) {
    Write-Error "No metadata.json found. Pipeline may not have finished."
    exit 1
}

# Read metadata
$metadata = Get-Content $MetadataFile -Raw | ConvertFrom-Json
Write-Host "Metadata: $($metadata.response_count) responses, status=$($metadata.status)"

# Read and validate each response
$responses = @()
$errors = @()

if (Test-Path $ResponsesDir) {
    $files = Get-ChildItem -Path $ResponsesDir -File | Sort-Object Name
    foreach ($file in $files) {
        if ($file.Name -like "*.txt" -or $file.Name -like "*.md" -or $file.Name -like "*.html" -or $file.Name -like "*.json") {
            if ($file.Name -like ".writing" -or $file.Name -like ".lock") { continue }
            $content = Get-Content $file.FullName -Raw
            $responses += @{
                filename = $file.Name
                size = $file.Length
                content_preview = if ($content.Length -gt 500) { $content.Substring(0, 500) + "..." } else { $content }
            }
            Write-Host "  Read: $($file.Name) ($($file.Length) bytes)"
        }
    }
}

# Check metadata checksums
if ($metadata.checksums) {
    Write-Host "Validating checksums..."
    $checksumOk = $true
    foreach ($entry in $metadata.checksums.PSObject.Properties) {
        $filePath = Join-Path $OutputDir $entry.Name
        if (Test-Path $filePath) {
            $hash = Get-FileHash -Path $filePath -Algorithm SHA256
            if ($hash.Hash -ne $entry.Value) {
                Write-Warning "Checksum MISMATCH for $($entry.Name)"
                $checksumOk = $false
                $errors += "Checksum mismatch: $($entry.Name)"
            } else {
                Write-Host "  OK $($entry.Name)"
            }
        }
    }
}

# Generate processing report
$report = @{
    timestamp = (Get-Date -Format 'o')
    status = if ($errors.Count -eq 0) { "SUCCESS" } else { "ERRORS_FOUND" }
    response_count = $responses.Count
    total_size_bytes = ($responses | Measure-Object -Property size -Sum).Sum
    errors = $errors
    stitch_project_id = $metadata.stitch_project_id
    response_files = $responses | ForEach-Object { $_.filename }
    ready_for_refine = ($responses.Count -gt 0) -and ($errors.Count -eq 0)
}

$report | ConvertTo-Json -Depth 10 | Out-File -FilePath $FinalReportFile -Encoding utf8 -Force

Write-Host "=== Processing complete ==="
Write-Host "Responses: $($responses.Count)"
Write-Host "Errors: $($errors.Count)"

if ($report.ready_for_refine) {
    Write-Host "Ready for agy refinement phase. Responses available in $ResponsesDir"
}

return $report
