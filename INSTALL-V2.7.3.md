# Install v2.7.3 Distance Reference Fix

Extract over the current repository root.

```powershell
python -m mkdocs build --strict

git add .
git commit -m "Fix wait-list distance references"
git push
```

## Changes

- Next stop skips incomplete itinerary cards without verified coordinates.
- The toolbar identifies the mapped stop actually used for distance calculations.
- If no future mapped stop exists, the renderer uses a verified location in the current park as a safe reference.
- Harry Potter and the Battle at the Ministry resolves to the verified Ministry of Magic coordinates.
- Rides without attraction-specific coordinates continue to show `Distance unavailable`; area-center coordinates are not substituted as though they were ride entrances.

## Epic Universe verification

- Monsters Unchained should show distance from the next mapped stop.
- Battle at the Ministry should show distance.
- Mine-Cart Madness, Mario Kart, Yoshi, and Curse of the Werewolf may still show Distance unavailable until attraction-specific coordinates are added.
