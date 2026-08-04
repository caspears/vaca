# Install v2.4 Coordinate Travel Guidance

Extract this ZIP over the repository root.

Then run:

```powershell
python -m mkdocs build --strict
git add .
git commit -m "Add coordinate-backed travel guidance"
git push
```

## What changes on daily pages

For consecutive itinerary stops in the same park with verified coordinates:

- the travel line shows an approximate adjusted distance;
- it shows a conservative walking-time range;
- the original hand-authored travel guidance remains visible beneath it;
- Locate and Navigate links use the verified latitude/longitude.

The estimate is derived from straight-line distance with a path multiplier. It is not a park routing engine and is labeled accordingly.

Items without a physical location or across park transfers retain their existing travel text.
