# Install v2.1.1 Park-Scoped Matching

Extract over the repository root.

Remove the old generated provider cache before rerunning:

```powershell
Remove-Item .\data\entity_catalog\cache -Recurse -Force -ErrorAction SilentlyContinue
```

Then run:

```powershell
.\tools\entity_catalog\run-candidate-generation.ps1
```

Open the newly generated:

```text
data\entity_catalog\match_review.csv
```

The review file now contains top-three candidates constrained by park/destination and entity type.
