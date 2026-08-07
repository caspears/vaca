$ErrorActionPreference = "Stop"
$Repo = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Push-Location $Repo
try {
    python .\tools\universal_coordinates\apply_universal_review.py
    if ($LASTEXITCODE -ne 0) { throw "Universal coordinate import stopped with exit code $LASTEXITCODE." }
    python .\tools\entity_catalog\validate_snapshot.py
} finally { Pop-Location }
