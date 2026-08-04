# Install v2.5 Park Companion

Extract this ZIP over the repository root.

Then run:

```powershell
python -m mkdocs build --strict
git add .
git commit -m "Add Park Companion and mobile layout polish"
git push
```

## Mobile test

Review August 10, 12, 13, and 14.

Confirm:

- Cards use more of the available screen width.
- Park Advisor is renamed Park Companion.
- Same-area transitions show the known area name.
- Travel wording is shorter.
- Timing label says Start walking.
- Confirmed access appears as a separate badge.
- Locate and Walk there buttons have short subtitles.
- Nearby shows catalog destinations around the next stop.
- Restrooms nearby opens a Google Maps search around the reference point.
- Use my location requests browser permission and updates Nearby.
- Denying location permission does not break the itinerary.
