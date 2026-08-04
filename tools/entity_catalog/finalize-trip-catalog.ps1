$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Push-Location $repoRoot
try {
    python .\tools\entity_catalog\finalize_trip_catalog.py

    if ($LASTEXITCODE -ne 0) {
        throw "Final catalog build stopped with exit code $LASTEXITCODE."
    }

    python .\tools\entity_catalog\validate_snapshot.py

    if ($LASTEXITCODE -ne 0) {
        throw "Catalog validation failed with exit code $LASTEXITCODE."
    }
}
finally {
    Pop-Location
}
