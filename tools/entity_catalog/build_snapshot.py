from __future__ import annotations

import argparse
import csv
from datetime import datetime, timezone
from pathlib import Path

from common import THEMEPARKS_API, fetch_json, write_json

FINAL_STATUSES = {"APPROVED", "MANUAL", "NOT_APPLICABLE"}

def clean_number(value):
    value = str(value or "").strip()
    if not value:
        return None
    try:
        return int(value)
    except ValueError:
        try:
            return float(value)
        except ValueError:
            return value

def selected(row, prefix, selector_field):
    number = (row.get(selector_field) or "").strip()
    if not number:
        return {}
    if number not in {"1", "2", "3"}:
        raise SystemExit(
            f"{row.get('catalog_id') or row['itinerary_id']}: "
            f"{selector_field} must be 1, 2, 3, or blank."
        )

    key = f"{prefix}{number}_"
    return {
        "name": row.get(key + "name", ""),
        "id": row.get(key + "id", ""),
        "entityType": row.get(key + "type", ""),
        "park": row.get(key + "park", ""),
        "latitude": row.get(key + "latitude", ""),
        "longitude": row.get(key + "longitude", ""),
    }

def effective_status(row):
    current = (row.get("match_status") or "").strip().upper()
    coordinate_status = (row.get("coordinate_status") or "").strip().upper()

    # A manually located entity is complete once its coordinates were explicitly
    # verified. It does not require a provider match.
    if current == "UNRESOLVED" and coordinate_status == "VERIFIED_MANUAL":
        return "MANUAL"

    return current

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--review",
        type=Path,
        default=Path("data/entity_catalog/match_review-repaired.csv"),
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("docs/assets/data/trip_entities.json"),
    )
    parser.add_argument("--skip-api-refresh", action="store_true")
    args = parser.parse_args()

    with args.review.open(newline="", encoding="utf-8-sig") as handle:
        rows = list(csv.DictReader(handle))

    blockers = []
    for row in rows:
        status = effective_status(row)
        coordinate_status = (row.get("coordinate_status") or "").strip().upper()

        if status not in FINAL_STATUSES:
            blockers.append(
                f"{row.get('catalog_id') or row['itinerary_id']} "
                f"(status={status or 'blank'})"
            )
            continue

        if status == "MANUAL" and coordinate_status != "VERIFIED_MANUAL":
            blockers.append(
                f"{row.get('catalog_id') or row['itinerary_id']} "
                f"(manual coordinates are not VERIFIED_MANUAL)"
            )

    if blockers:
        raise SystemExit(
            "Catalog build blocked by:\n  - " + "\n  - ".join(blockers)
        )

    entities = {}

    for row in rows:
        status = effective_status(row)
        catalog_id = row.get("catalog_id") or row["itinerary_id"]

        tpw = selected(row, "tpw_", "selected_tpw_candidate")
        queue = selected(row, "queue_", "selected_queue_candidate")

        if status == "NOT_APPLICABLE":
            tpw = {}
            queue = {}

        detail = None
        tpw_id = str(tpw.get("id") or "").strip()

        if tpw_id and not args.skip_api_refresh:
            try:
                detail = fetch_json(f"{THEMEPARKS_API}/entity/{tpw_id}")
            except RuntimeError as exc:
                print(f"Warning: {exc}")

        entity_detail = (
            detail.get("entity")
            if isinstance(detail, dict) and "entity" in detail
            else detail
        )
        api_location = (
            entity_detail.get("location", {})
            if isinstance(entity_detail, dict)
            else {}
        )

        manual_verified = (
            (row.get("coordinate_status") or "").strip().upper()
            == "VERIFIED_MANUAL"
        )

        if manual_verified:
            latitude = clean_number(row.get("manual_latitude"))
            longitude = clean_number(row.get("manual_longitude"))
            location_source = "MANUAL_VERIFIED"
        else:
            latitude = (
                api_location.get("latitude")
                or clean_number(tpw.get("latitude"))
            )
            longitude = (
                api_location.get("longitude")
                or clean_number(tpw.get("longitude"))
            )
            location_source = (
                "THEMEPARKS_WIKI"
                if latitude is not None and longitude is not None
                else None
            )

        entities[catalog_id] = {
            "catalogId": catalog_id,
            "itineraryId": row["itinerary_id"],
            "name": row["itinerary_name"],
            "kind": row["kind"],
            "parkName": row["park_scope"],
            "matchStatus": status,
            "themeParksWiki": {
                "id": tpw.get("id") or None,
                "name": tpw.get("name") or None,
                "entityType": tpw.get("entityType") or None,
            },
            "queueTimes": {
                "parkId": clean_number(row.get("selected_queue_park_id")),
                "parkName": queue.get("park") or None,
                "rideId": clean_number(queue.get("id")),
                "name": queue.get("name") or None,
            },
            "location": {
                "latitude": latitude,
                "longitude": longitude,
                "status": (
                    "VERIFIED"
                    if latitude is not None and longitude is not None
                    else "MISSING"
                ),
                "source": location_source,
            },
            "reviewNote": row.get("review_note", ""),
        }

    write_json(args.output, {
        "schemaVersion": 4,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "temporaryTripDataset": True,
        "entities": entities,
    })

    print(f"Wrote {len(entities)} entities to {args.output}")

if __name__ == "__main__":
    main()
