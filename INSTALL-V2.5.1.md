# Install v2.5.1 Wait Matching Fix

Extract over the repository root.

```powershell
python -m mkdocs build --strict
git add .
git commit -m "Fix catalog-backed live wait matching"
git push
```

Verify that names in Priority attraction waits jump to their cards and that Runaway Railway receives its current wait in More details and links. Matching uses Queue-Times ride ID first and normalized names only as a fallback.
