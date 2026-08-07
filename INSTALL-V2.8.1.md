# Install v2.8.1 — ThemeParks.wiki Discovery Fix

This is a narrow correction for the Universal coordinate-review workflow.

## What was wrong

The destination discovery code reused the ride-name normalization function.
That function removes the word `Universal`, so the script could never identify
`Universal Orlando Resort`.

The PowerShell wrapper also printed the review instructions after Python failed.

## Install and run

Extract this ZIP over the repository root.

```powershell
cd C:\dev\vaca

Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

.\tools\universal_coordinates\build-review.ps1
```

Expected output ends with:

```text
Universal live rides: ...
Rides already having verified coordinates: ...
Rides requiring coordinate review: ...
Review file: data\universal_coordinates\universal_match_review.csv
```

Then open:

```text
data\universal_coordinates\universal_match_review.csv
```

Only after reviewing it, save a copy as:

```text
data\universal_coordinates\universal_match_review-reviewed.csv
```
