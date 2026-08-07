$ErrorActionPreference = "Stop"
$Repo = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Push-Location $Repo
try { python .\tools\universal_coordinates\build_universal_review.py --inventory-only }
finally { Pop-Location }
