# Install v2.7.0 Family Rating Badges

This is a narrow additive update for the current v2.6 repository.

It adds the family rating directly beside rated attractions in live wait lists:

```text
5⭐ Hagrid's Magical Creatures Motorbike Adventure
3.5⭐ The Amazing Adventures of Spider-Man
```

Unrated attractions remain unmarked.

## Install

Extract the patch ZIP over the repository root, then run:

```powershell
python -m mkdocs build --strict

git add .
git commit -m "Show family ratings in live wait lists"
git push
```

## Verify

Review the Universal live-wait panels and confirm compact rating badges appear for the rides represented in `family-ride-ratings-v2.6.0.json`.

This update does not change grouping, opportunity scoring, wait retrieval, distance calculations, or itinerary behavior.
