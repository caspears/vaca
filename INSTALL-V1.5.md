# Install v1.5

1. Commit or back up the current repository.
2. Extract this ZIP into the repository root and replace matching files.
3. Run:

```powershell
python -m mkdocs build --strict
git add .
git commit -m "Replace thumbnails with route maps and fix Universal links"
git push
```

## Verify

- Attraction thumbnails are gone.
- Each daily page has a numbered schematic route map.
- Tapping a numbered map stop jumps to the matching itinerary card.
- Universal Official links open Universal Orlando pages rather than `#`.
- Live waits, ride weather and guidance still render.
