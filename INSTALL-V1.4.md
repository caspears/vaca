# Install v1.4

1. Commit or back up the current repository.
2. Extract this ZIP into the repository root and replace matching files.
3. Run:

```powershell
python -m mkdocs build --strict
git add .
git commit -m "Apply consistent themes and attraction thumbnails"
git push
```

## Verify

- Desktop sidebars no longer overlap the itinerary.
- The sticky navigator remains below the Material header/drawers.
- Every day has a pastel Outdoor background and a themed Dark background.
- Cards remain high contrast.
- Each card displays a small local visual thumbnail.
- Live weather/waits continue to use the configured Worker.
