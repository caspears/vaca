# Install v2.3.2 Direct Catalog Build

Extract this ZIP over the repository root.

After correcting Blue Dragon and marking all manually confirmed coordinates as:

```text
VERIFIED_MANUAL
```

run:

```powershell
.\tools\entity_catalog\build-verified-catalog.ps1
```

The script now:

- builds directly from `match_review-normalized.csv`;
- automatically treats `UNRESOLVED + VERIFIED_MANUAL` as `MANUAL`;
- does not require `match_review-approved.csv`;
- stops immediately if build or validation fails;
- uses verified manual coordinates in the runtime catalog.
