# GA4 Maccabi - Create Installable ZIP
$source = Join-Path $PSScriptRoot "ga4-maccabi-tracking"
$zipPath = Join-Path $PSScriptRoot "ga4-maccabi-tracking.zip"

if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path $source -DestinationPath $zipPath -Force

if (Test-Path $zipPath) {
    $size = (Get-Item $zipPath).Length
    Write-Host "Created: $zipPath" -ForegroundColor Green
    Write-Host "Size: $([math]::Round($size/1024, 1)) KB"
    explorer /select,$zipPath
} else {
    Write-Host "Error creating ZIP" -ForegroundColor Red
    exit 1
}
