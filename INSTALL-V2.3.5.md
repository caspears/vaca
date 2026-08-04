# Install v2.3.5 Islands of Adventure Fix

This patch fixes ThemeParks.wiki resolution for:

```text
Universal Islands of Adventure
```

It also uses the stable ThemeParks.wiki park entity ID as a fallback.

Extract over the repository root, remove the prior exception file, and rerun:

```powershell
Remove-Item .\data\entity_catalog\final-catalog-exceptions.csv `
  -Force -ErrorAction SilentlyContinue

.\tools\entity_catalog\finalize-trip-catalog.ps1
```

No review data needs to be regenerated.
