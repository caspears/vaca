# Entity Review UI

The browser-based Entity Review page replaces direct CSV editing.

## Generate candidates and the review page

```powershell
Remove-Item .\data\entity_catalog\cache -Recurse -Force -ErrorAction SilentlyContinue
.\tools\entity_catalog\run-candidate-generation.ps1
python -m mkdocs serve
```

Open the local site and select **Tools → Entity Review**.

For every itinerary item:

1. Pick the correct ThemeParks.wiki candidate.
2. Pick the correct Queue-Times candidate when shown.
3. Mark the item:
   - Approved
   - Not applicable
   - Needs research
4. Optionally add a note.

Selections are saved in that browser's local storage.

## Export the review

Click **Download reviewed matches**. The browser downloads:

```text
reviewed_matches.csv
```

## Merge the export with provider details

```powershell
python .\tools\entity_catalog\merge_review_export.py `
  "$HOME\Downloads\reviewed_matches.csv"
```

This produces:

```text
data\entity_catalog\match_review-approved.csv
```

Inspect the merged file, then build the snapshot using it:

```powershell
python .\tools\entity_catalog\build_snapshot.py `
  --review .\data\entity_catalog\match_review-approved.csv

python .\tools\entity_catalog\validate_snapshot.py
```

The static runtime snapshot remains:

```text
docs\assets\data\trip_entities.json
```
