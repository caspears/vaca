# Install v2.3 Reviewed Entity Import

Extract over the repository root.

Your completed review is already included as:

```text
data\entity_catalog\reviewed_matches-user.csv
```

After generating candidates locally, run:

```powershell
.\tools\entity_catalog\import-user-review.ps1
```

Review the resulting coordinate warnings in:

```text
data\entity_catalog\match_review-normalized.csv
```

Your prior candidate selections and review statuses are preserved. You only need to verify the manually entered coordinates that remain provisional or are flagged out of range.
