$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Push-Location $repoRoot
try {
    python .\tools\entity_catalog\extract_itinerary.py
    python .\tools\entity_catalog\generate_candidates.py
    python .\tools\entity_catalog\generate_review_page.py
    Write-Host ""
    Write-Host "Candidate generation complete."
    Write-Host "Review this file:"
    Write-Host "  data\entity_catalog\match_review.csv"
    Write-Host ""
    Write-Host "Set match_status to APPROVED, MANUAL, or NOT_APPLICABLE."
    Write-Host "Do not build the runtime snapshot until all rows are reviewed."
}
finally {
    Pop-Location
}
