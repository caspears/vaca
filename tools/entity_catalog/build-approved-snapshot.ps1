$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Push-Location $repoRoot
try {
    python .\tools\entity_catalog\build_snapshot.py
    python .\tools\entity_catalog\validate_snapshot.py
}
finally {
    Pop-Location
}
