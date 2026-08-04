from __future__ import annotations

import argparse
import csv
from pathlib import Path

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("reviewed", type=Path, help="CSV downloaded from the Entity Review page")
    parser.add_argument(
        "--source",
        type=Path,
        default=Path("data/entity_catalog/match_review.csv"),
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("data/entity_catalog/match_review-approved.csv"),
    )
    args = parser.parse_args()

    with args.source.open(newline="", encoding="utf-8-sig") as handle:
        source_rows = list(csv.DictReader(handle))
        source_fields = handle.seek(0) or []
    with args.reviewed.open(newline="", encoding="utf-8-sig") as handle:
        reviewed_rows = {
            row["itinerary_id"]: row
            for row in csv.DictReader(handle)
        }

    if not source_rows:
        raise SystemExit("Source match_review.csv is empty.")

    fields = list(source_rows[0].keys())

    for row in source_rows:
        reviewed = reviewed_rows.get(row["itinerary_id"])
        if not reviewed:
            continue
        for key in [
            "selected_tpw_candidate",
            "selected_queue_candidate",
            "match_status",
            "review_note",
        ]:
            row[key] = reviewed.get(key, "")

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(source_rows)

    print(f"Wrote merged review to {args.output}")
    print("Inspect it, then replace match_review.csv or pass it to the snapshot builder.")

if __name__ == "__main__":
    main()
