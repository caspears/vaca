# Install v2.7.2 Integrated Live Waits

This replaces the superseded post-render rating scripts with one source-level renderer inside `live-park-data.js`.

Extract over the repository root, then run:

```powershell
python -m mkdocs build --strict

git add .
git commit -m "Integrate ratings distance and sorting into live waits"
git push
```

## Expected result

The wait panel shows:

- compact `5⭐` / `4⭐` ratings for rated rides;
- a small walking-time and distance line;
- sort controls for Rating, Distance, and Wait;
- reference controls for Next stop and Current location.

Current location requests GPS only when selected. If location is unavailable, it falls back to the next planned stop.
