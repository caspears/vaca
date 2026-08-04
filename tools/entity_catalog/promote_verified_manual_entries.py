from __future__ import annotations

import argparse
import csv
from pathlib import Path

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, default=Path("data/entity_catalog/match_review-normalized.csv"))
    parser.add_argument("--output", type=Path, default=Path("data/entity_catalog/match_review-approved.csv"))
    args = parser.parse_args()

    with args.input.open(newline="", encoding="utf-8-sig") as handle:
        rows = list(csv.DictReader(handle))

    unresolved = []
    for row in rows:
        if row.get("recommended_next_status") == "MANUAL" and row.get("coordinate_status") == "VERIFIED_MANUAL":
            row["match_status"] = "MANUAL"
        if row.get("match_status") == "UNRESOLVED":
            unresolved.append(row.get("catalog_id") or row["itinerary_id"])

    if unresolved:
        raise SystemExit("Manual verification still required for: " + ", ".join(unresolved))

    fields = list(rows[0].keys()) if rows else []
    with args.output.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote approved review to {args.output}")

if __name__ == "__main__":
    main()
