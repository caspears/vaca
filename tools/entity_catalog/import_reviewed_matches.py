from __future__ import annotations

import argparse
import csv
import json
import re
from collections import Counter
from pathlib import Path
from typing import Any

PARK_BOUNDS = {
    "Animal Kingdom": (28.340, 28.375, -81.610, -81.570),
    "Animal Kingdom Lodge": (28.345, 28.360, -81.615, -81.590),
    "Epic Universe": (28.425, 28.455, -81.465, -81.430),
    "Islands of Adventure": (28.465, 28.490, -81.485, -81.455),
    "Magic Kingdom": (28.405, 28.430, -81.595, -81.565),
    "Universal Studios Florida": (28.465, 28.490, -81.485, -81.455),
    "Typhoon Lagoon": (28.355, 28.380, -81.545, -81.515),
    "Resort / Transportation": (28.340, 28.365, -81.620, -81.585),
}

ENTITY_CLASS_BY_KIND = {
    "planned": "ATTRACTION_OR_AREA",
    "lightning": "ATTRACTION",
    "show": "SHOW",
    "meal": "RESTAURANT",
    "hotel": "HOTEL",
    "extra": "WAYPOINT",
    "transfer": "TRANSPORTATION",
    "flight": "TRANSPORTATION",
}

DECIMAL_PAIR = re.compile(
    r'(?P<lat>-?\d{1,2}(?:\.\d+)?)\s*°?\s*(?P<lat_dir>[NS])?'
    r'\s*[,;/ ]+\s*'
    r'(?P<lon>-?\d{1,3}(?:\.\d+)?)\s*°?\s*(?P<lon_dir>[EW])?',
    re.I,
)
DMS_PAIR = re.compile(
    r'(?P<lat_d>\d{1,2})\s*°\s*(?P<lat_m>\d{1,2})[\'’]\s*'
    r'(?P<lat_s>\d{1,2}(?:\.\d+)?)["”]?\s*(?P<lat_dir>[NS])'
    r'\s*[,;/ ]+\s*'
    r'(?P<lon_d>\d{1,3})\s*°\s*(?P<lon_m>\d{1,2})[\'’]\s*'
    r'(?P<lon_s>\d{1,2}(?:\.\d+)?)["”]?\s*(?P<lon_dir>[EW])',
    re.I,
)

def slug(value: str) -> str:
    value = re.sub(r"[^a-z0-9]+", "-", (value or "").lower()).strip("-")
    return value or "unknown"

def dms_to_decimal(d, m, s, direction):
    value = float(d) + float(m) / 60 + float(s) / 3600
    return -value if direction.upper() in {"S", "W"} else value

def parse_coordinate_note(note: str) -> dict[str, Any]:
    note = (note or "").strip()
    if not note:
        return {"latitude": None, "longitude": None, "parseStatus": "NO_COORDINATE", "normalizationNote": ""}

    match = DMS_PAIR.search(note)
    if match:
        return {
            "latitude": round(dms_to_decimal(match["lat_d"], match["lat_m"], match["lat_s"], match["lat_dir"]), 7),
            "longitude": round(dms_to_decimal(match["lon_d"], match["lon_m"], match["lon_s"], match["lon_dir"]), 7),
            "parseStatus": "PARSED_DMS",
            "normalizationNote": "Converted degrees/minutes/seconds to decimal degrees.",
        }

    match = DECIMAL_PAIR.search(note)
    if not match:
        return {"latitude": None, "longitude": None, "parseStatus": "UNPARSED",
                "normalizationNote": "No supported coordinate pair was found in the review note."}

    latitude = float(match["lat"])
    longitude = float(match["lon"])
    lat_dir = (match["lat_dir"] or "").upper()
    lon_dir = (match["lon_dir"] or "").upper()
    notes = []

    if lat_dir == "S":
        latitude = -abs(latitude)
    elif lat_dir == "N":
        latitude = abs(latitude)

    if lon_dir == "W":
        longitude = -abs(longitude)
    elif lon_dir == "E":
        longitude = abs(longitude)
    elif longitude > 0 and 70 <= longitude <= 90:
        longitude = -longitude
        notes.append("Inferred west longitude from Orlando context.")

    return {
        "latitude": round(latitude, 7),
        "longitude": round(longitude, 7),
        "parseStatus": "PARSED_DECIMAL",
        "normalizationNote": " ".join(notes),
    }

def coordinate_quality(park_scope, latitude, longitude):
    if latitude is None or longitude is None:
        return {"coordinateStatus": "MISSING", "coordinateWarning": ""}
    bounds = PARK_BOUNDS.get(park_scope)
    if not bounds:
        return {"coordinateStatus": "PROVISIONAL", "coordinateWarning": "No park bounds configured."}
    min_lat, max_lat, min_lon, max_lon = bounds
    if min_lat <= latitude <= max_lat and min_lon <= longitude <= max_lon:
        return {"coordinateStatus": "PROVISIONAL_IN_RANGE", "coordinateWarning": ""}
    return {
        "coordinateStatus": "PROVISIONAL_OUT_OF_RANGE",
        "coordinateWarning": f"Coordinate is outside broad expected bounds for {park_scope}.",
    }

def load_csv(path: Path):
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))

def write_csv(path: Path, rows):
    fields = list(rows[0].keys()) if rows else []
    with path.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)

def identity(row):
    return (
        row.get("itinerary_id", "").strip(),
        row.get("itinerary_name", "").strip().casefold(),
        row.get("park_scope", "").strip().casefold(),
    )

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--reviewed", type=Path, default=Path("data/entity_catalog/reviewed_matches-user.csv"))
    parser.add_argument("--detailed", type=Path, default=Path("data/entity_catalog/match_review.csv"))
    parser.add_argument("--merged-output", type=Path, default=Path("data/entity_catalog/match_review-normalized.csv"))
    parser.add_argument("--draft-output", type=Path, default=Path("data/entity_catalog/trip_entity_drafts.json"))
    args = parser.parse_args()

    reviewed_rows = load_csv(args.reviewed)
    detailed_rows = load_csv(args.detailed) if args.detailed.exists() else []
    detailed_by_identity = {identity(row): row for row in detailed_rows}
    id_counts = Counter(row["itinerary_id"] for row in reviewed_rows)

    merged_rows = []
    draft_entities = {}

    for reviewed in reviewed_rows:
        item_id = reviewed["itinerary_id"]
        detailed = dict(detailed_by_identity.get(identity(reviewed), {}))
        merged = detailed or {
            "itinerary_id": item_id,
            "itinerary_name": reviewed.get("itinerary_name", ""),
            "kind": reviewed.get("kind", ""),
            "park_scope": reviewed.get("park_scope", ""),
        }

        for key in [
            "itinerary_name", "kind", "park_scope",
            "selected_tpw_candidate", "selected_queue_candidate",
            "match_status", "review_note",
        ]:
            merged[key] = reviewed.get(key, "")

        catalog_id = (
            f"{slug(reviewed.get('park_scope'))}--{slug(item_id)}"
            if id_counts[item_id] > 1
            else slug(item_id)
        )
        merged["catalog_id"] = catalog_id

        parsed = parse_coordinate_note(reviewed.get("review_note", ""))
        quality = coordinate_quality(
            reviewed.get("park_scope", ""),
            parsed["latitude"],
            parsed["longitude"],
        )

        merged["manual_latitude"] = parsed["latitude"]
        merged["manual_longitude"] = parsed["longitude"]
        merged["coordinate_parse_status"] = parsed["parseStatus"]
        merged["coordinate_status"] = quality["coordinateStatus"]
        merged["coordinate_warning"] = quality["coordinateWarning"]
        merged["coordinate_normalization_note"] = parsed["normalizationNote"]
        merged["recommended_next_status"] = (
            "MANUAL"
            if reviewed.get("match_status") == "UNRESOLVED" and parsed["latitude"] is not None
            else reviewed.get("match_status", "")
        )
        merged_rows.append(merged)

        draft_entities[catalog_id] = {
            "catalogId": catalog_id,
            "itineraryId": item_id,
            "name": reviewed.get("itinerary_name", ""),
            "kind": reviewed.get("kind", ""),
            "entityClass": ENTITY_CLASS_BY_KIND.get(reviewed.get("kind", ""), "WAYPOINT"),
            "parkName": reviewed.get("park_scope", ""),
            "providerReview": {
                "selectedThemeParksWikiCandidate": reviewed.get("selected_tpw_candidate") or None,
                "selectedQueueTimesCandidate": reviewed.get("selected_queue_candidate") or None,
                "originalStatus": reviewed.get("match_status") or None,
                "recommendedStatus": merged["recommended_next_status"] or None,
            },
            "location": {
                "latitude": parsed["latitude"],
                "longitude": parsed["longitude"],
                "status": quality["coordinateStatus"],
                "warning": quality["coordinateWarning"] or None,
                "source": "USER_REVIEW_NOTE" if parsed["latitude"] is not None else None,
                "normalizationNote": parsed["normalizationNote"] or None,
            },
            "reviewNoteOriginal": reviewed.get("review_note") or None,
        }

    write_csv(args.merged_output, merged_rows)
    args.draft_output.write_text(json.dumps({
        "schemaVersion": 2,
        "status": "DRAFT_REQUIRES_COORDINATE_VERIFICATION",
        "entities": draft_entities,
    }, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    out_of_range = [r for r in merged_rows if r["coordinate_status"] == "PROVISIONAL_OUT_OF_RANGE"]
    unresolved_no_coord = [
        r for r in merged_rows
        if r.get("match_status") == "UNRESOLVED" and r["manual_latitude"] in ("", None)
    ]

    print(f"Imported review rows: {len(merged_rows)}")
    print(f"Unique catalog records: {len(draft_entities)}")
    print(f"Duplicate itinerary IDs disambiguated: {sum(1 for c in id_counts.values() if c > 1)}")
    print(f"Coordinates flagged out of range: {len(out_of_range)}")
    print(f"Unresolved rows without coordinates: {len(unresolved_no_coord)}")
    print(f"Merged review: {args.merged_output}")
    print(f"Entity drafts: {args.draft_output}")
    if out_of_range:
        print("Out-of-range items:")
        for row in out_of_range:
            print(f"  - {row['catalog_id']}: {row['manual_latitude']}, {row['manual_longitude']} ({row['park_scope']})")

if __name__ == "__main__":
    main()
