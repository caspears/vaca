# Install v2.8.2 — Universal Park Mapping Fix

This is a narrow correction for the coordinate-review generator.

## Correction

ThemeParks.wiki currently returns these parks under Universal Orlando Resort:

- Universal Studios Florida
- Universal Epic Universe
- Universal Islands of Adventure
- Universal Volcano Bay

The prior script used the shared ride-name normalizer to identify parks. That
normalizer removes words such as `Universal`, `Studios`, and `Florida`, which
made Universal Studios Florida fail the confidence threshold.

This version maps the three required parks by exact raw aliases within the
already-verified Universal Orlando Resort destination.

## Run

Extract over the repository root, then:

```powershell
cd C:\dev\vaca

Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

.\tools\universal_coordinates\build-review.ps1
```

Expected successful output includes:

```text
Universal live rides: ...
Rides already having verified coordinates: ...
Rides requiring coordinate review: ...
Review file: data\universal_coordinates\universal_match_review.csv
```
