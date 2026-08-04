# Install v2.5.4 Runaway Railway Wait Fix

Extract over the repository root.

Then run:

```powershell
python -m mkdocs build --strict
git add .
git commit -m "Align Runaway Railway live wait matching"
git push
```

## Changes

- Removes the underline from Priority attraction wait links.
- Keeps the link color, chevron, and whole-row tap target.
- Renames the itinerary card to **Mickey & Minnie’s Runaway Railway**.
- Updates the mini-map label and catalog display name.
- Preserves the separate Runaway Railway decision-rule guidance.

Using the official card title allows the original live-data annotator to populate both:

- `Current wait`
- `Day-of guidance`

The catalog/Queue-Times ID synchronization remains as an additional safeguard.
