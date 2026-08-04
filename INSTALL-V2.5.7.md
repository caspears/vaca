# Install v2.5.7 Dark-Mode Cleanup

Extract this ZIP over the repository root.

Then run:

```powershell
python -m mkdocs build --strict

git add .
git commit -m "Finish dark mode and card UI cleanup"
git push
```

## Corrected

- Removes the obsolete diamond from Reserved and Confirmed.
- Ensures only one walking icon appears.
- Removes the redundant movement-cue sentence.
- Applies dark styling to both Material dark mode and the custom Night toggle.
- Corrects timing-panel background and text contrast.
- Corrects Day-of guidance contrast.
- Corrects rating and Revisit controls.
- Corrects Park Companion and live-conditions summary styling.
- Corrects remaining dark-on-dark and light-on-light text.

## Phone checks

Review in Night mode:

1. Tiffins or another reservation card.
2. The timing box.
3. An expanded More details section.
4. Day-of guidance.
5. Rating stars and Revisit.
6. Park Companion.
7. Live park conditions and priority waits.
