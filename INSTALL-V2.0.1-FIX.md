# Install v2.0.1 Planner Fix

This replaces the blocking planner JavaScript from v2.0.

1. Extract this ZIP into the repository root and replace matching files.
2. Run:

```powershell
python -m mkdocs build --strict
git add .
git commit -m "Fix planner initialization loop"
git push
```

## Verify

- The page loads completely.
- Sticky next activity no longer remains on Loading.
- Park overview, live weather, route list and cards render.
- Planner expands and collapses.
- Marking an item Complete or Skip updates the planner.
- The browser console has no repeated planner-related errors.
