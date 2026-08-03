# Install v1.6.1

1. Extract this ZIP into the repository root and replace matching files.
2. Run:

```powershell
python -m mkdocs build --strict
git add .
git commit -m "Replace schematic maps with ordered route lists"
git push
```

## Result

- Removes pseudo-geographic schematic maps.
- Keeps the clickable Today at a Glance route list.
- Keeps Locate and Navigate as the authoritative destination tools.
- Preserves live weather, waits, planner guidance, ratings, revisit tracking, and themed cards.
