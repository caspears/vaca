# Install v2.5.3 Attraction Card Wait Fix

Extract over the repository root.

Then run:

```powershell
python -m mkdocs build --strict
git add .
git commit -m "Fix live waits inside attraction details"
git push
```

## Verify

On August 10:

1. Tap **Mickey & Minnie's Runaway Railway** in Priority attraction waits.
2. It should jump to **Runaway Railway decision point**.
3. Expand **More details and links**.
4. `Current wait` should show the same value as the priority-waits panel.

This patch keeps the catalog/Queue-Times ID match and fixes only the card-detail update logic.
