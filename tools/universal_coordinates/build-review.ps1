$ErrorActionPreference = "Stop"
$Repo = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path

Push-Location $Repo
try {
    python .\tools\universal_coordinates\build_universal_review.py

    if ($LASTEXITCODE -ne 0) {
        throw "Universal coordinate review build failed with exit code $LASTEXITCODE."
    }

    Write-Host ""
    Write-Host "Review created successfully:"
    Write-Host "  data\universal_coordinates\universal_match_review.csv"
    Write-Host ""
    Write-Host "Open the CSV in Excel."
    Write-Host "Save the completed copy as:"
    Write-Host "  data\universal_coordinates\universal_match_review-reviewed.csv"
}
finally {
    Pop-Location
}
