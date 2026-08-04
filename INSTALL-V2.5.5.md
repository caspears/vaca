# Install v2.5.5 Card Wait Pill

Extract over the repository root.

Then run:

```powershell
python -m mkdocs build --strict
git add .
git commit -m "Style card live waits as Queue-Times pills"
git push
```

## Verify

For Mickey & Minnie's Runaway Railway:

1. Expand **More details and links**.
2. **Current wait** should show a rounded pill.
3. When closed, the pill should use the gray `Closed` style.
4. The pill should read `Closed · Queue-Times details`.
5. Tapping the pill should open that ride's Queue-Times page.

Numeric waits use the same green/yellow/red thresholds already used elsewhere.
