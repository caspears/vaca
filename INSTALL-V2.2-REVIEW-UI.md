# Install v2.2 Entity Review UI

Extract over the repository root.

Then run:

```powershell
Remove-Item .\data\entity_catalog\cache `
  -Recurse -Force -ErrorAction SilentlyContinue

.\tools\entity_catalog\run-candidate-generation.ps1

python -m mkdocs serve
```

Open the local site URL shown by MkDocs, then select:

```text
Tools → Entity Review
```

Do not publish the review page unless desired. It is intended as a temporary local tool.

After reviewing, use **Download reviewed matches** and follow `data/entity_catalog/README.md`.
