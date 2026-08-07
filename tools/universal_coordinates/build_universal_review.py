from __future__ import annotations

import argparse
import csv
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

from common import PARKS, TPW_PARK_ALIASES, catalog_match, extract_live_rides, load_json, location_of, normalize, similarity

TPW_BASE = "https://api.themeparks.wiki/v1"
QUEUE_BASE = "https://queue-times.com/parks/{park_id}/queue_times.json"


def fetch_json(url: str) -> dict[str, Any]:
    request = urllib.request.Request(url, headers={"User-Agent": "vaca-universal-coordinate-review/1.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def queue_inventory(park_id: int) -> dict[str, dict[str, Any]]:
    try:
        payload = fetch_json(QUEUE_BASE.format(park_id=park_id))
    except Exception as exc:
        print(f"Warning: Queue-Times lookup failed for park {park_id}: {exc}", file=sys.stderr)
        return {}
    rides = {}
    for land in payload.get("lands", []):
        for ride in land.get("rides", []):
            rides[normalize(ride.get("name"))] = ride
    return rides


def discover_tpw_parks() -> dict[str, dict[str, Any]]:
    destinations = fetch_json(f"{TPW_BASE}/destinations").get("destinations", [])

    # Do not use common.normalize() to identify the destination. That function
    # intentionally removes words such as "universal" and "florida" for ride
    # matching, which made "Universal Orlando Resort" impossible to detect.
    destination = None
    for candidate in destinations:
        raw_name = str(candidate.get("name") or "").casefold()
        slug = str(candidate.get("slug") or "").casefold()
        external_id = str(candidate.get("externalId") or "").casefold()

        if (
            external_id == "universalresort_orlando"
            or slug == "universalresort_orlando"
            or ("universal" in raw_name and "orlando" in raw_name)
        ):
            destination = candidate
            break

    if destination is None:
        available = sorted(
            str(item.get("name") or "")
            for item in destinations
            if "universal" in str(item.get("name") or "").casefold()
        )
        raise RuntimeError(
            "ThemeParks.wiki did not return the Universal Orlando Resort "
            f"destination. Universal destinations returned: {available}"
        )

    # These are stable ThemeParks.wiki entities within the already-verified
    # Universal Orlando Resort destination. Match exact raw names first rather
    # than using the ride-name normalizer, which intentionally strips words
    # such as "Universal", "Studios", and "Florida".
    expected_names = {
        "Epic Universe": {
            "universal epic universe",
            "epic universe",
        },
        "Islands of Adventure": {
            "universal islands of adventure",
            "universal's islands of adventure",
            "islands of adventure",
        },
        "Universal Studios Florida": {
            "universal studios florida",
        },
    }

    parks_by_name = {
        str(park.get("name") or "").casefold().strip(): park
        for park in destination.get("parks", [])
    }

    result = {}
    for expected, aliases in expected_names.items():
        match = next(
            (parks_by_name[alias] for alias in aliases if alias in parks_by_name),
            None,
        )
        if match is None:
            available = sorted(parks_by_name)
            raise RuntimeError(
                f"Could not map ThemeParks.wiki park for {expected}. "
                f"Parks returned for Universal Orlando Resort: {available}"
            )
        result[expected] = match

    return result


def tpw_children(park_id: str) -> list[dict[str, Any]]:
    payload = fetch_json(f"{TPW_BASE}/entity/{park_id}/children")
    return payload.get("children", payload.get("entities", []))


def ensure_location(candidate: dict[str, Any]) -> dict[str, Any]:
    if candidate.get("location", {}).get("latitude") is not None:
        return candidate
    try:
        entity = fetch_json(f"{TPW_BASE}/entity/{candidate['id']}")
        candidate = {**candidate, **entity}
    except Exception:
        pass
    return candidate


def candidate_rows(name: str, children: list[dict[str, Any]]) -> list[dict[str, Any]]:
    ranked = []
    for child in children:
        entity_type = str(child.get("entityType") or "")
        if entity_type in {"PARK", "DESTINATION", "RESTAURANT"}:
            continue
        score = similarity(name, child.get("name", ""))
        ranked.append((score, child))
    ranked.sort(key=lambda item: item[0], reverse=True)
    return [ensure_location(dict(child, score=score)) for score, child in ranked[:3]]


def map_url(lat, lon):
    return f"https://www.google.com/maps/search/?api=1&query={lat},{lon}" if lat is not None and lon is not None else ""


def main() -> int:
    parser = argparse.ArgumentParser(description="Build a park-scoped Universal ride coordinate review.")
    parser.add_argument("--repo", type=Path, default=Path.cwd())
    parser.add_argument("--output", type=Path, default=Path("data/universal_coordinates/universal_match_review.csv"))
    parser.add_argument("--inventory-only", action="store_true", help="Do not call external APIs; write the missing-ride inventory only.")
    args = parser.parse_args()
    repo = args.repo.resolve()
    output = (repo / args.output).resolve() if not args.output.is_absolute() else args.output
    output.parent.mkdir(parents=True, exist_ok=True)

    catalog_path = repo / "docs/assets/data/trip_entities.json"
    catalog = load_json(catalog_path)
    live_rides = extract_live_rides(repo)
    queue_by_park = {park_id: {} for park_id in PARKS}
    tpw_parks = {}
    children_by_park = {}
    if not args.inventory_only:
        queue_by_park = {park_id: queue_inventory(park_id) for park_id in PARKS}
        tpw_parks = discover_tpw_parks()
        children_by_park = {park_name: tpw_children(park["id"]) for park_name, park in tpw_parks.items()}

    rows = []
    for source in live_rides:
        queue_match = queue_by_park.get(source["queue_times_park_id"], {}).get(normalize(source["live_ride_name"]))
        queue_ride_id = queue_match.get("id") if queue_match else None
        key, entity, match_reason = catalog_match(catalog, source, queue_ride_id)
        existing_location = location_of(entity)
        if existing_location:
            continue
        candidates = [] if args.inventory_only else candidate_rows(source["live_ride_name"], children_by_park[source["park_name"]])
        scores = [float(c.get("score", 0)) for c in candidates]
        best = scores[0] if scores else 0
        gap = best - (scores[1] if len(scores) > 1 else 0)
        auto = bool(candidates and best >= 0.92 and gap >= 0.08 and candidates[0].get("location", {}).get("latitude") is not None)
        row = {
            "REVIEW_STATUS": "AUTO_RECOMMENDED" if auto else ("MANUAL_REVIEW" if candidates else "NO_MATCH"),
            "USER_SELECTION": "",
            "LIVE_RIDE_NAME__MATCH_THIS": source["live_ride_name"],
            "PARK__MUST_MATCH": source["park_name"],
            "QUEUE_TIMES_PARK_ID": source["queue_times_park_id"],
            "QUEUE_TIMES_RIDE_ID": queue_ride_id or "",
            "EXISTING_CATALOG_ID": key or "",
            "EXISTING_CATALOG_NAME": (entity or {}).get("name", ""),
            "EXISTING_MATCH_REASON": match_reason,
            "RECOMMENDED_SELECTION": "CANDIDATE_1" if auto else "",
            "WHAT_TO_VERIFY": "Compare the LIVE_RIDE_NAME to candidate name; confirm the candidate is the same attraction in the PARK shown; prefer an ATTRACTION entrance location.",
            "MANUAL_LATITUDE": "",
            "MANUAL_LONGITUDE": "",
            "REVIEW_NOTES": "",
            "SOURCE_PAGE": source["source_page"],
        }
        for index in range(3):
            c = candidates[index] if index < len(candidates) else {}
            loc = c.get("location") or {}
            prefix = f"CANDIDATE_{index+1}"
            row.update({
                f"{prefix}_TPW_ID": c.get("id", ""),
                f"{prefix}_NAME": c.get("name", ""),
                f"{prefix}_ENTITY_TYPE": c.get("entityType", ""),
                f"{prefix}_SCORE": c.get("score", ""),
                f"{prefix}_LATITUDE": loc.get("latitude", ""),
                f"{prefix}_LONGITUDE": loc.get("longitude", ""),
                f"{prefix}_MAP": map_url(loc.get("latitude"), loc.get("longitude")),
                f"{prefix}_API": f"{TPW_BASE}/entity/{c.get('id')}" if c.get("id") else "",
            })
        rows.append(row)

    fieldnames = list(rows[0].keys()) if rows else [
        "REVIEW_STATUS", "USER_SELECTION", "LIVE_RIDE_NAME__MATCH_THIS", "PARK__MUST_MATCH", "QUEUE_TIMES_PARK_ID", "QUEUE_TIMES_RIDE_ID"
    ]
    with output.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader(); writer.writerows(rows)
    print(f"Universal live rides: {len(live_rides)}")
    print(f"Rides already having verified coordinates: {len(live_rides)-len(rows)}")
    print(f"Rides requiring coordinate review: {len(rows)}")
    print(f"Review file: {output.relative_to(repo) if output.is_relative_to(repo) else output}")
    if args.inventory_only:
        print("Inventory-only mode: candidate columns are intentionally blank.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
