# Install v2.3.3 Provider Match Repair

The prior browser export did not preserve ThemeParks.wiki candidate selections. This release repairs that data from a newly generated, correctly park-scoped candidate set.

Extract over the repository root, then run:

```powershell
.\tools\entity_catalog\repair-and-build-catalog.ps1
```

The workflow:

1. refreshes ThemeParks.wiki and Queue-Times candidates;
2. restores exact or uniquely high-confidence ThemeParks.wiki selections for approved rows;
3. preserves all verified manual coordinates;
4. writes numeric Queue-Times park IDs;
5. builds the runtime catalog when no ambiguous provider rows remain.

If an exception file is produced:

```text
data\entity_catalog\provider-repair-exceptions.csv
```

review only those rows. The full completed review does not need to be repeated.
