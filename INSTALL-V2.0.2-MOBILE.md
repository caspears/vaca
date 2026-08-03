# Install v2.0.2 Mobile Cache Fix

This release changes the planner asset filenames so phones cannot continue using the broken cached v2.0 script.

1. Extract this ZIP into the repository root and replace matching files.
2. Run:

```powershell
python -m mkdocs build --strict
git add .
git commit -m "Bust mobile planner cache"
git push
```

## Phone verification

After GitHub Pages completes deployment:

1. Open the site in a private/incognito tab first.
2. If it works there, close the old tab and reopen the normal site.
3. If the normal tab is still blank, clear website data for `caspears.github.io`.
4. Confirm the browser requests `planner-card-v2.0.2.js`, not `planner-card.js`.

The planner now has an error boundary so a planner failure should not prevent the rest of the itinerary from rendering.
