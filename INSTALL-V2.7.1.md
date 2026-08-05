# Install v2.7.1 Rating, Distance, and Wait Sorting

This replaces the v2.6 rating-aware wait renderer. It does not use a post-render badge overlay.

## Install

Extract over the repository root, then run:

```powershell
python -m mkdocs build --strict

git add .
git commit -m "Add compact ride ratings and wait sorting"
git push
```

## Changes

- Renders compact `5⭐`, `4⭐`, `3.5⭐`, etc. directly in each wait row.
- Shows walking time and distance in smaller text.
- Adds persistent sort controls:
  - Rating
  - Distance
  - Wait
- Retains the distance reference toggle:
  - Current location
  - Next planned stop
- Rating sort retains family groups and collapses unrated/not-recommended rides.
- Distance and Wait use a compact flat list, with not-recommended rides kept at the bottom.
- Removes the prior post-render rating overlay from `mkdocs.yml` when present.

## Verify

On Epic Universe, Mario Kart should show `4⭐`, Monsters Unchained `5⭐`, and Mine-Cart Madness `5⭐`. Switch among all three sort modes and both distance reference modes.
