# Importing the completed entity review

The file `reviewed_matches-user.csv` is the completed browser export supplied by the user. It is preserved as the authoritative record of:

- selected ThemeParks.wiki candidate number;
- selected Queue-Times candidate number;
- Approved / Not applicable / Needs research status;
- manual notes and coordinates.

## Import and normalize

The detailed local candidate file must already exist:

```text
data/entity_catalog/match_review.csv
```

Then run:

```powershell
.\tools\entity_catalog\import-user-review.ps1
```

Outputs:

```text
data/entity_catalog/match_review-normalized.csv
data/entity_catalog/trip_entity_drafts.json
```

## What the importer does

- merges the browser export back into the detailed candidate file;
- preserves every provider selection already made;
- parses decimal-degree coordinates;
- parses degrees/minutes/seconds coordinates;
- converts west longitudes to negative values;
- infers a west sign only when an unsigned Orlando longitude is supplied;
- retains the original note unchanged;
- classifies manually located unmatched items as draft trip entities;
- flags coordinates outside broad expected park bounds.

## Coordinate status

Imported manual coordinates are never silently marked verified.

Possible statuses:

- `MISSING`
- `PROVISIONAL_IN_RANGE`
- `PROVISIONAL_OUT_OF_RANGE`
- `PROVISIONAL`
- `VERIFIED_MANUAL`

Only coordinates explicitly changed to `VERIFIED_MANUAL` can be promoted into the final approved snapshot.

This preserves the completed review while ensuring approximate or copied coordinates are not treated as authoritative without one final verification.
