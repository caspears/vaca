$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Push-Location $repoRoot
try {
    python .\tools\entity_catalog\repair_provider_matches.py
    if ($LASTEXITCODE -ne 0) {
        throw "Provider repair failed with exit code $LASTEXITCODE."
    }

    $exceptions = ".\data\entity_catalog\provider-repair-exceptions.csv"
    if (Test-Path $exceptions) {
        Write-Host ""
        Write-Host "Provider repair requires review:"
        Write-Host "  $exceptions"
        Write-Host ""
        Write-Host "Select candidate 1, 2, or 3 in match_review-repaired.csv,"
        Write-Host "then remove or resolve the corresponding exception rows."
        exit 2
    }

    python .\tools\entity_catalog\build_snapshot.py `
      --review .\data\entity_catalog\match_review-repaired.csv

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
