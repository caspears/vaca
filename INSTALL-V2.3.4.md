# Install v2.3.4 Final Trip Catalog

This release no longer depends on the ThemeParks.wiki selections lost by the browser export.

It includes the merged review file containing:

- current review statuses;
- approved Queue-Times selections;
- corrected manual coordinates;
- verified manual-coordinate statuses.

Extract over the repository root, then run:

```powershell
.\tools\entity_catalog\finalize-trip-catalog.ps1
```

The finalizer directly queries each known ThemeParks.wiki park and resolves approved attractions using:

1. itinerary name;
2. already-approved Queue-Times name;
3. trip-specific aliases.

Exact and uniquely high-confidence matches are accepted automatically.

If a genuinely ambiguous match remains, the script stops and writes:

```text
data\entity_catalog\final-catalog-exceptions.csv
```

Otherwise it writes:

```text
docs\assets\data\trip_entities.json
```
