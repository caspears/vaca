# Install v2.5.2 Clickable Priority Wait Rows

Extract over the repository root.

Then run:

```powershell
python -m mkdocs build --strict
git add .
git commit -m "Make priority wait rows visibly clickable"
git push
```

## Verify

On a daily page:

1. Each matched ride name in **Priority attraction waits** is underlined and uses the primary link color.
2. A circular chevron appears beside the ride name.
3. Tapping anywhere in the matched ride row jumps to the itinerary card.
4. The corresponding card receives the same live wait under **More details and links**.

The prior issue was that generated wait entries use `.live-ride`; v2.5.1 did not include that class in its row selector.
