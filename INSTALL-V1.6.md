# Install v1.6

1. Commit or back up the repository.
2. Extract this ZIP into the repository root and replace matching files.
3. Run:

```powershell
python -m mkdocs build --strict
git add .
git commit -m "Polish mobile cards timeline and status controls"
git push
```

## Mobile verification

- Cards use almost the full mobile width.
- Timing information appears in compact icon/value rows.
- Planned / Skip / Complete is a three-button segmented control.
- The top timeline jumps to cards.
- Timeline and route-map markers update as cards are completed or skipped.
- Land-specific accent borders are visible.
- Wait-time arrows appear after the site has observed a prior wait value.
