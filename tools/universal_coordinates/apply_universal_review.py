from __future__ import annotations

import argparse
import csv
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path

from common import load_json, slug

VALID = {"CANDIDATE_1", "CANDIDATE_2", "CANDIDATE_3", "MANUAL", "SKIP"}


def number(value, field, ride):
    try:
        return float(value)
    except (TypeError, ValueError):
        raise ValueError(f"{ride}: {field} must contain a number.")


def main() -> int:
    parser = argparse.ArgumentParser(description="Apply reviewed Universal coordinates to trip_entities.json.")
    parser.add_argument("--repo", type=Path, default=Path.cwd())
    parser.add_argument("--review", type=Path, default=Path("data/universal_coordinates/universal_match_review-reviewed.csv"))
    args = parser.parse_args()
    repo = args.repo.resolve()
    review_path = (repo / args.review).resolve() if not args.review.is_absolute() else args.review
    catalog_path = repo / "docs/assets/data/trip_entities.json"
    catalog = load_json(catalog_path)
    entities = catalog.setdefault("entities", {})

    with review_path.open(newline="", encoding="utf-8-sig") as handle:
        rows = list(csv.DictReader(handle))

    applied, skipped, errors = [], [], []
    for row in rows:
        ride = row.get("LIVE_RIDE_NAME__MATCH_THIS", "").strip()
        park = row.get("PARK__MUST_MATCH", "").strip()
        selection = row.get("USER_SELECTION", "").strip().upper()
        if not selection:
            errors.append(f"{ride}: USER_SELECTION is blank.")
            continue
        if selection not in VALID:
            errors.append(f"{ride}: invalid USER_SELECTION {selection!r}.")
            continue
        if selection == "SKIP":
            skipped.append(ride); continue
        try:
            if selection == "MANUAL":
                lat = number(row.get("MANUAL_LATITUDE"), "MANUAL_LATITUDE", ride)
                lon = number(row.get("MANUAL_LONGITUDE"), "MANUAL_LONGITUDE", ride)
                tpw = {"id": None, "name": None, "entityType": None, "matchReason": "MANUAL"}
                source = "MANUAL_VERIFIED"
                match_status = "MANUAL"
            else:
                prefix = selection
                lat = number(row.get(f"{prefix}_LATITUDE"), f"{prefix}_LATITUDE", ride)
                lon = number(row.get(f"{prefix}_LONGITUDE"), f"{prefix}_LONGITUDE", ride)
                tpw = {
                    "id": row.get(f"{prefix}_TPW_ID") or None,
                    "name": row.get(f"{prefix}_NAME") or None,
                    "entityType": row.get(f"{prefix}_ENTITY_TYPE") or None,
                    "matchReason": "REVIEWED",
                }
                source = "THEMEPARKS_WIKI"
                match_status = "APPROVED"
            if not (28.30 <= lat <= 28.55 and -81.60 <= lon <= -81.35):
                raise ValueError(f"{ride}: coordinates {lat}, {lon} are outside the expected Universal Orlando region.")

            catalog_id = row.get("EXISTING_CATALOG_ID", "").strip()
            if not catalog_id:
                catalog_id = f"live-{slug(park)}-{slug(ride)}"
            entity = entities.get(catalog_id, {})
            entity.update({
                "catalogId": catalog_id,
                "itineraryId": entity.get("itineraryId") or catalog_id,
                "name": entity.get("name") or ride,
                "kind": entity.get("kind") or "live-wait",
                "parkName": park,
                "matchStatus": match_status,
                "themeParksWiki": tpw,
                "queueTimes": {
                    "parkId": int(row["QUEUE_TIMES_PARK_ID"]) if row.get("QUEUE_TIMES_PARK_ID") else None,
                    "rideId": int(row["QUEUE_TIMES_RIDE_ID"]) if row.get("QUEUE_TIMES_RIDE_ID") else None,
                    "name": ride,
                },
                "location": {"latitude": lat, "longitude": lon, "status": "VERIFIED", "source": source},
                "reviewNote": row.get("REVIEW_NOTES", "").strip(),
                "area": entity.get("area", ""),
            })
            entities[catalog_id] = entity
            applied.append((ride, catalog_id))
        except Exception as exc:
            errors.append(str(exc))

    report = repo / "data/universal_coordinates/universal_coordinate_import_report.txt"
    report.parent.mkdir(parents=True, exist_ok=True)
    report.write_text("\n".join([
        f"Applied: {len(applied)}", f"Skipped: {len(skipped)}", f"Errors: {len(errors)}", "",
        *[f"APPLIED: {ride} -> {key}" for ride, key in applied],
        *[f"SKIPPED: {ride}" for ride in skipped],
        *[f"ERROR: {error}" for error in errors],
    ]) + "\n", encoding="utf-8")
    if errors:
        print(report.read_text(encoding="utf-8"))
        print("Catalog was not changed because review errors remain.")
        return 2

    backup = catalog_path.with_suffix(f".before-universal-{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}.json")
    shutil.copy2(catalog_path, backup)
    catalog["generatedAt"] = datetime.now(timezone.utc).isoformat()
    catalog_path.write_text(json.dumps(catalog, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Applied reviewed coordinates: {len(applied)}")
    print(f"Skipped rows: {len(skipped)}")
    print(f"Backup: {backup.relative_to(repo)}")
    print(f"Catalog: {catalog_path.relative_to(repo)}")
    print(f"Report: {report.relative_to(repo)}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
