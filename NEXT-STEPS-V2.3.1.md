# Next steps after importing the completed review

## 1. Re-run the corrected importer

```powershell
.\tools\entity_catalog\import-user-review.ps1
```

The corrected importer:

- preserves the completed browser review;
- prevents duplicate `breakfast` records from overwriting each other;
- creates `catalog_id`;
- retains normalized manual coordinates.

## 2. Review only the manual-coordinate rows

Open:

```text
data\entity_catalog\match_review-normalized.csv
```

Filter `coordinate_parse_status` to values beginning with `PARSED_`.

For each row:

- confirm `manual_latitude` and `manual_longitude`;
- correct them if necessary;
- change `coordinate_status` to `VERIFIED_MANUAL`.

Do not mark an out-of-range coordinate verified until corrected.

For an unresolved item that is not needed for location-aware behavior, change `match_status` to `NOT_APPLICABLE`.

## 3. Build the static catalog

```powershell
.\tools\entity_catalog\build-verified-catalog.ps1
```

This:

1. promotes manually verified unresolved records to `MANUAL`;
2. builds `docs/assets/data/trip_entities.json`;
3. validates the snapshot.

The snapshot builder now uses `manual_latitude` and `manual_longitude` whenever `coordinate_status` is `VERIFIED_MANUAL`.
