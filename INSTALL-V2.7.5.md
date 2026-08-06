# Install v2.7.5 Location Reliability

Extract the patch over the repository root, then run:

```powershell
python -m mkdocs build --strict

git add .
git commit -m "Improve phone location reliability"
git push
```

## Changes

- Explicit taps always request a fresh location.
- High-accuracy GPS gets 20 seconds, then retries once with standard accuracy.
- Permission denied, position unavailable, and timeout are reported separately.
- Park Companion and live wait distances share the same successful location.
- Failures use inline status text rather than a misleading permission alert.
- Successful location displays approximate GPS accuracy.
