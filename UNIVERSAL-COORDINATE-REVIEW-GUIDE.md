# Universal Coordinate Matching Workflow

This workflow fills coordinates for the additional Universal attractions shown in **Live attraction waits**. It preserves every existing verified catalog entry.

## What you match

The authoritative source field is:

- **`LIVE_RIDE_NAME__MATCH_THIS`** — the ride/experience name used by the live wait list.

The required park constraint is:

- **`PARK__MUST_MATCH`** — the ThemeParks.wiki candidate must belong to this exact Universal park.

The review file is already park-scoped. It will not intentionally offer candidates from another Universal park, Disney, Six Flags, or another company.

## Step 1 — Generate the review file

From the repository root:

```powershell
.\tools\universal_coordinates\build-review.ps1
```

This calls:

- Queue-Times to recover the stable ride ID where available;
- ThemeParks.wiki to retrieve entities only from the corresponding Universal park;
- the existing `trip_entities.json` catalog to exclude rides that already have verified coordinates.

Output:

```text
data\universal_coordinates\universal_match_review.csv
```

## Step 2 — Review in Excel

For each row, focus on these fields, in this order:

1. **`LIVE_RIDE_NAME__MATCH_THIS`** — the live-wait ride being matched. Do not edit it.
2. **`PARK__MUST_MATCH`** — confirm the candidate is in this same park. Do not edit it.
3. **`CANDIDATE_1_NAME`**, then candidates 2 and 3 — compare the actual attraction names.
4. **`CANDIDATE_n_ENTITY_TYPE`** — normally choose `ATTRACTION`; transportation and experiences can legitimately use another type.
5. **`CANDIDATE_n_MAP`** — open this link if the name is ambiguous or you want to verify the entrance location.
6. **`CANDIDATE_n_SCORE`** — useful as a clue, but never approve a candidate solely because it has the highest number.

Set **`USER_SELECTION`** to exactly one of:

- `CANDIDATE_1`
- `CANDIDATE_2`
- `CANDIDATE_3`
- `MANUAL`
- `SKIP`

### Recommended rows

`REVIEW_STATUS= AUTO_RECOMMENDED` means candidate 1 has a strong, unambiguous same-park name match and usable coordinates. You must still verify the ride name before accepting `CANDIDATE_1`.

### Manual coordinates

Use `MANUAL` only when none of the candidates is correct. Enter values in:

- `MANUAL_LATITUDE`
- `MANUAL_LONGITUDE`

Use the guest entrance/queue location rather than the center of a show building or themed land whenever possible.

### Save the reviewed file

Save it as:

```text
data\universal_coordinates\universal_match_review-reviewed.csv
```

Do not change the column headings.

## Step 3 — Apply reviewed coordinates

```powershell
.\tools\universal_coordinates\apply-reviewed-coordinates.ps1
```

The importer:

- refuses to update the catalog while any selection is blank or invalid;
- validates coordinates against the Orlando region;
- updates an existing entity when one is already present;
- creates a `live-wait` catalog entity for a newly added ride;
- creates a timestamped backup of `trip_entities.json`;
- runs the existing catalog validator.

## Step 4 — Build and test

```powershell
python -m mkdocs build --strict

git add .
git commit -m "Add verified Universal attraction coordinates"
git push
```

On the phone, test both:

- **Current location** — mapped rides should show a distance from the phone;
- **Next stop** — mapped rides should show distance from the relevant park's next mapped itinerary stop.

## Important distinctions

- A themed land such as Super Nintendo World is not a substitute for the entrance coordinate of Mario Kart, Yoshi's Adventure, or Mine-Cart Madness.
- Hogwarts Express stations are separate locations and should remain separate entities.
- Single Rider pseudo-queues and reservation-status rows are not included.
- A `SKIP` row remains in the live wait list but continues to display `Distance unavailable`.
