$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Push-Location $repoRoot
try {
    python .\tools\entity_catalog\build_snapshot.py `
      --review .\data\entity_catalog\match_review-normalized.csv

    if ($LASTEXITCODE -ne 0) {
        throw "Snapshot build failed with exit code $LASTEXITCODE."
    }

    python .\tools\entity_catalog\validate_snapshot.py

    if ($LASTEXITCODE -ne 0) {
        throw "Snapshot validation failed with exit code $LASTEXITCODE."
    }
}
finally {
    Pop-Location
}
