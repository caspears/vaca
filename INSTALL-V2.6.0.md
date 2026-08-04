# Install v2.6.0 Rating-Aware Ride Opportunities

Extract the full ZIP over the repository root, or use the patch ZIP if v2.5.9 is already installed.

```powershell
python -m mkdocs build --strict

git add .
git commit -m "Add rating-aware ride opportunities"
git push
```

## Included

- Uses the attached family ride-review workbook as the rating source.
- Groups Universal waits into Family favorites, Good options, If convenient, More attractions, and Not recommended for us.
- VelociCoaster, Hulk, and Ripsaw Falls are hidden under Not recommended for us by default.
- Supports Current location and Next planned stop distance modes.
- Current location uses Android browser GPS and falls back safely to the next planned stop.
- Persists the selected distance mode per park.
- Shows wait, family rating, distance/walking estimate when coordinates exist, and contextual guidance.
- Protects reserved/confirmed access in recommendation text.
- Retains the expanded Universal live-wait inventory and v2.5.9 dark drawer fix.

## Limitations

Some attractions are not in the verified trip entity catalog. They still appear in the rating-aware list with live waits and ratings, but show `Distance unavailable` until coordinates are added.
