from __future__ import annotations

import argparse
import csv
import json
import re
import urllib.parse
from datetime import datetime, timezone
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any

from common import THEMEPARKS_API, fetch_json, normalize, write_json

PARK_ALIASES = {
    "Animal Kingdom": [
        "Disney's Animal Kingdom Theme Park",
        "Disney's Animal Kingdom",
        "Animal Kingdom",
    ],
    "Hollywood Studios": [
        "Disney's Hollywood Studios",
        "Hollywood Studios",
    ],
    "Magic Kingdom": [
        "Magic Kingdom Park",
        "Magic Kingdom",
    ],
    "Epic Universe": [
        "Universal Epic Universe",
        "Epic Universe",
    ],
    "Islands of Adventure": [
        "Universal Islands of Adventure",
        "Universal's Islands of Adventure",
        "Islands of Adventure",
    ],
    "Universal Studios Florida": [
        "Universal Studios Florida",
    ],
    "Typhoon Lagoon": [
        "Disney's Typhoon Lagoon Water Park",
        "Typhoon Lagoon",
    ],
}

# Itinerary labels sometimes contain planning language that is not part of the
# actual provider entity name. These aliases are deliberately trip-specific.
NAME_ALIASES = {
    "runaway": ["Mickey & Minnie's Runaway Railway"],
    "express": ["Hogwarts Express - Hogsmeade Station", "Hogwarts Express"],
    "monsters": ["Monsters Unchained: The Frankenstein Experiment", "Monsters Unchained"],
    "gringotts": ["Harry Potter and the Escape from Gringotts", "Escape from Gringotts"],
    "forbidden": ["Harry Potter and the Forbidden Journey"],
    "hagrid": ["Hagrid's Magical Creatures Motorbike Adventure"],
    "fop": ["Avatar Flight of Passage"],
    "safari": ["Kilimanjaro Safaris"],
    "everest": ["Expedition Everest - Legend of the Forbidden Mountain", "Expedition Everest"],
    "star": ["Star Tours - The Adventures Continue", "Star Tours"],
    "rise": ["Star Wars: Rise of the Resistance", "Rise of the Resistance"],
    "seven": ["Seven Dwarfs Mine Train"],
    "tiana": ["Tiana's Bayou Adventure"],
    "navi": ["Na'vi River Journey"],
    "alien": ["Alien Swirling Saucers"],
    "slinky": ["Slinky Dog Dash"],
    "haunted": ["Haunted Mansion"],
    "pirates": ["Pirates of the Caribbean"],
    "space": ["Space Mountain"],
    "minion": ["Despicable Me Minion Mayhem"],
}

THEMEPARKS_WIKI_PARK_IDS = {
    "Islands of Adventure": "267615cc-8943-4c2a-ae2c-5da728ca591f",
}

QUEUE_PARK_IDS = {
    "Magic Kingdom": 6,
    "Hollywood Studios": 7,
    "Animal Kingdom": 8,
    "Islands of Adventure": 64,
    "Universal Studios Florida": 65,
    "Epic Universe": 334,
}

FINAL_STATUSES = {"APPROVED", "MANUAL", "NOT_APPLICABLE"}

def load_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))

def clean_number(value: Any):
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

def entity_list(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)]
    if not isinstance(payload, dict):
        return []
    for key in ("children", "entities", "parks", "destinations"):
        value = payload.get(key)
        if isinstance(value, list):
            return [item for item in value if isinstance(item, dict)]
    if payload.get("id") and payload.get("name"):
        return [payload]
    return []

def get_location(entity: dict[str, Any]) -> tuple[float | None, float | None]:
    location = entity.get("location") or {}
    return clean_number(location.get("latitude")), clean_number(location.get("longitude"))

def find_park_entities() -> dict[str, dict[str, Any]]:
    destinations_payload = fetch_json(f"{THEMEPARKS_API}/destinations")
    destinations = entity_list(destinations_payload)
    parks: list[dict[str, Any]] = []

    for destination in destinations:
        destination_id = destination.get("id")
        if not destination_id:
            continue
        try:
            children = entity_list(
                fetch_json(
                    f"{THEMEPARKS_API}/entity/"
                    f"{urllib.parse.quote(str(destination_id))}/children"
                )
            )
        except RuntimeError as exc:
            print(f"Warning: {exc}")
            continue
        parks.extend(
            child for child in children
            if str(child.get("entityType", "")).upper() == "PARK"
        )

    resolved = {}
    for scope, aliases in PARK_ALIASES.items():
        matches = [
            park for park in parks
            if any(normalize(alias) == normalize(str(park.get("name", ""))) for alias in aliases)
        ]
        if len(matches) == 1:
            resolved[scope] = matches[0]
        elif len(matches) > 1:
            raise RuntimeError(f"Multiple ThemeParks.wiki parks matched {scope}")
        else:
            fallback_id = THEMEPARKS_WIKI_PARK_IDS.get(scope)
            if fallback_id:
                try:
                    fallback_payload = fetch_json(
                        f"{THEMEPARKS_API}/entity/{urllib.parse.quote(fallback_id)}"
                    )
                    fallback_entity = (
                        fallback_payload.get("entity")
                        if isinstance(fallback_payload, dict)
                        and "entity" in fallback_payload
                        else fallback_payload
                    )
                    if isinstance(fallback_entity, dict):
                        resolved[scope] = fallback_entity
                        print(
                            f"Used stable ThemeParks.wiki park ID fallback for {scope}: "
                            f"{fallback_id}"
                        )
                        continue
                except RuntimeError as exc:
                    print(f"Warning: {exc}")
            print(f"Warning: no ThemeParks.wiki park matched {scope}")
    return resolved

def fetch_children(park: dict[str, Any]) -> list[dict[str, Any]]:
    park_id = park.get("id")
    payload = fetch_json(
        f"{THEMEPARKS_API}/entity/{urllib.parse.quote(str(park_id))}/children"
    )
    return entity_list(payload)

def similarity(left: str, right: str) -> float:
    a, b = normalize(left), normalize(right)
    if not a or not b:
        return 0.0
    if a == b:
        return 1.0
    if a in b or b in a:
        return 0.96
    return SequenceMatcher(None, a, b).ratio()

def queue_selected_name(row: dict[str, str]) -> str:
    selection = str(row.get("selected_queue_candidate") or "").strip()
    if selection not in {"1", "2", "3"}:
        return ""
    return row.get(f"queue_{selection}_name", "")

def candidate_names(row: dict[str, str]) -> list[str]:
    names = [
        row.get("itinerary_name", ""),
        queue_selected_name(row),
        *NAME_ALIASES.get(row.get("catalog_id", ""), []),
    ]
    # Remove common planning suffixes while preserving the full name too.
    stripped = []
    for name in names:
        if not name:
            continue
        stripped.append(name)
        simplified = re.sub(
            r"\b(decision point|priorities|optional|evening extension)\b",
            "",
            name,
            flags=re.I,
        )
        simplified = re.sub(r"\s+", " ", simplified).strip(" -")
        if simplified and simplified != name:
            stripped.append(simplified)
    return list(dict.fromkeys(stripped))

def match_entity(row: dict[str, str], entities: list[dict[str, Any]]):
    names = candidate_names(row)
    scored = []

    for entity in entities:
        entity_name = str(entity.get("name", ""))
        score = max((similarity(name, entity_name) for name in names), default=0.0)
        lat, lon = get_location(entity)
        if lat is not None and lon is not None:
            score += 0.01
        scored.append((min(score, 1.0), entity))

    scored.sort(key=lambda pair: pair[0], reverse=True)
    if not scored:
        return None, [], "NO_CANDIDATE"

    first_score, first = scored[0]
    second_score = scored[1][0] if len(scored) > 1 else 0.0
    exact = any(
        normalize(name) == normalize(str(first.get("name", "")))
        for name in names
    )

    if exact:
        return first, scored[:3], "EXACT"
    if first_score >= 0.91 and first_score - second_score >= 0.08:
        return first, scored[:3], "HIGH_CONFIDENCE"
    return None, scored[:3], "AMBIGUOUS"

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--review",
        type=Path,
        default=Path("data/entity_catalog/match_review-merged.csv"),
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("docs/assets/data/trip_entities.json"),
    )
    parser.add_argument(
        "--exceptions",
        type=Path,
        default=Path("data/entity_catalog/final-catalog-exceptions.csv"),
    )
    args = parser.parse_args()

    rows = load_csv(args.review)
    parks = find_park_entities()
    children_by_scope = {}

    for scope, park in parks.items():
        children_by_scope[scope] = fetch_children(park)

    entities_output = {}
    exceptions = []

    for row in rows:
        catalog_id = row.get("catalog_id") or row["itinerary_id"]
        current_status = str(row.get("match_status") or "").strip().upper()
        coordinate_status = str(row.get("coordinate_status") or "").strip().upper()

        if current_status == "UNRESOLVED" and coordinate_status == "VERIFIED_MANUAL":
            status = "MANUAL"
        else:
            status = current_status

        if status not in FINAL_STATUSES:
            exceptions.append({
                "catalog_id": catalog_id,
                "itinerary_name": row.get("itinerary_name", ""),
                "park_scope": row.get("park_scope", ""),
                "reason": f"Unsupported status: {status or 'blank'}",
                "candidate_1": "",
                "candidate_2": "",
                "candidate_3": "",
            })
            continue

        tpw_entity = None
        match_reason = None

        if status == "APPROVED":
            scope = row.get("park_scope", "")
            park_children = children_by_scope.get(scope, [])
            tpw_entity, top, match_reason = match_entity(row, park_children)

            if not tpw_entity:
                exceptions.append({
                    "catalog_id": catalog_id,
                    "itinerary_name": row.get("itinerary_name", ""),
                    "park_scope": scope,
                    "reason": match_reason,
                    "candidate_1": top[0][1].get("name", "") if len(top) > 0 else "",
                    "candidate_2": top[1][1].get("name", "") if len(top) > 1 else "",
                    "candidate_3": top[2][1].get("name", "") if len(top) > 2 else "",
                })
                continue

        manual_verified = coordinate_status == "VERIFIED_MANUAL"
        if manual_verified:
            latitude = clean_number(row.get("manual_latitude"))
            longitude = clean_number(row.get("manual_longitude"))
            location_source = "MANUAL_VERIFIED"
        elif tpw_entity:
            latitude, longitude = get_location(tpw_entity)
            location_source = "THEMEPARKS_WIKI"
        else:
            latitude = longitude = None
            location_source = None

        queue_selection = str(row.get("selected_queue_candidate") or "").strip()
        queue_name = (
            row.get(f"queue_{queue_selection}_name", "")
            if queue_selection in {"1", "2", "3"} else ""
        )
        queue_ride_id = (
            clean_number(row.get(f"queue_{queue_selection}_id", ""))
            if queue_selection in {"1", "2", "3"} else None
        )
        queue_park_id = (
            QUEUE_PARK_IDS.get(row.get("park_scope", ""))
            if queue_ride_id is not None else None
        )

        entities_output[catalog_id] = {
            "catalogId": catalog_id,
            "itineraryId": row["itinerary_id"],
            "name": row["itinerary_name"],
            "kind": row["kind"],
            "parkName": row["park_scope"],
            "matchStatus": status,
            "themeParksWiki": {
                "id": tpw_entity.get("id") if tpw_entity else None,
                "name": tpw_entity.get("name") if tpw_entity else None,
                "entityType": tpw_entity.get("entityType") if tpw_entity else None,
                "matchReason": match_reason,
            },
            "queueTimes": {
                "parkId": queue_park_id,
                "rideId": queue_ride_id,
                "name": queue_name or None,
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

    if exceptions:
        fields = list(exceptions[0].keys())
        with args.exceptions.open("w", newline="", encoding="utf-8-sig") as handle:
            writer = csv.DictWriter(handle, fieldnames=fields)
            writer.writeheader()
            writer.writerows(exceptions)
        print(f"Catalog not written: {len(exceptions)} exceptions remain.")
        print(f"Review: {args.exceptions}")
        raise SystemExit(2)

    if args.exceptions.exists():
        args.exceptions.unlink()

    write_json(args.output, {
        "schemaVersion": 5,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "temporaryTripDataset": True,
        "entities": entities_output,
    })

    located = sum(
        1 for entity in entities_output.values()
        if entity["location"]["status"] == "VERIFIED"
    )
    print(f"Wrote {len(entities_output)} entities to {args.output}")
    print(f"Verified locations: {located}")
    print(f"Missing locations: {len(entities_output) - located}")

if __name__ == "__main__":
    main()
