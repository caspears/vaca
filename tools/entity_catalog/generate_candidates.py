from __future__ import annotations

import argparse
import csv
import json
import urllib.parse
from pathlib import Path
from typing import Any

from common import (
    KIND_TO_QUEUE_ALLOWED,
    QUEUE_PARKS,
    QUEUE_TIMES_API,
    THEMEPARKS_API,
    canonical_scope,
    entity_matches_scope,
    entity_matches_type,
    fetch_json,
    flatten_entities,
    queue_rides,
    score_candidate,
    should_include,
    write_json,
)

def load_inventory(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))

def fetch_tpw_entities(cache_dir: Path, refresh: bool) -> list[dict[str, Any]]:
    cache = cache_dir / "themeparks_entities.json"
    if cache.exists() and not refresh:
        return json.loads(cache.read_text(encoding="utf-8"))

    destinations = fetch_json(f"{THEMEPARKS_API}/destinations")
    entities = flatten_entities(destinations)
    seen = {str(entity["id"]) for entity in entities}

    parent_ids = [
        entity["id"] for entity in entities
        if str(entity.get("entityType", "")).upper() in {"DESTINATION", "PARK"}
    ]

    for parent_id in parent_ids:
        try:
            children = fetch_json(
                f"{THEMEPARKS_API}/entity/{urllib.parse.quote(str(parent_id))}/children"
            )
        except RuntimeError as exc:
            print(f"Warning: {exc}")
            continue

        parent = next(
            (entity for entity in entities if str(entity.get("id")) == str(parent_id)),
            {},
        )
        parent_type = str(parent.get("entityType", "")).upper()
        inherited_scope = (
            str(parent.get("name", ""))
            if parent_type == "PARK"
            else str(parent.get("scopeName", ""))
        )
        inherited_destination = (
            str(parent.get("name", ""))
            if parent_type == "DESTINATION"
            else str(parent.get("destinationName", ""))
        )

        for entity in flatten_entities(
            children,
            parent_name=str(parent.get("name", "")),
            destination_name=inherited_destination,
            scope_name=inherited_scope,
        ):
            if str(entity["id"]) not in seen:
                entities.append(entity)
                seen.add(str(entity["id"]))

    write_json(cache, entities)
    return entities

def fetch_queue_entities(cache_dir: Path, refresh: bool) -> list[dict[str, Any]]:
    cache = cache_dir / "queue_times_entities.json"
    if cache.exists() and not refresh:
        return json.loads(cache.read_text(encoding="utf-8"))

    output = []
    for park_name, park_id in QUEUE_PARKS.items():
        try:
            payload = fetch_json(f"{QUEUE_TIMES_API}/parks/{park_id}/queue_times.json")
        except RuntimeError as exc:
            print(f"Warning: {exc}")
            continue
        output.extend(queue_rides(payload, park_name, park_id))

    write_json(cache, output)
    return output

def rank(row, entities, *, limit=3):
    scope = canonical_scope(row.get("park_name", ""))

    scoped = [
        entity for entity in entities
        if entity_matches_scope(entity, scope)
        and entity_matches_type(entity, row.get("kind", ""))
    ]

    scored = sorted(
        ((score_candidate(row, entity), entity) for entity in scoped),
        key=lambda item: item[0],
        reverse=True,
    )

    return [
        {
            "score": round(score, 4),
            **{key: value for key, value in entity.items() if key != "raw"},
        }
        for score, entity in scored[:limit]
        if score >= 0.30
    ]

def rank_queue(row, entities, *, limit=3):
    if row.get("kind") not in KIND_TO_QUEUE_ALLOWED:
        return []

    scope = canonical_scope(row.get("park_name", ""))
    scoped = [
        entity for entity in entities
        if str(entity.get("parkName", "")) == scope
    ]

    scored = sorted(
        ((score_candidate(row, entity), entity) for entity in scoped),
        key=lambda item: item[0],
        reverse=True,
    )

    return [
        {
            "score": round(score, 4),
            **entity,
        }
        for score, entity in scored[:limit]
        if score >= 0.30
    ]

def candidate_columns(prefix: str, candidates: list[dict[str, Any]]) -> dict[str, Any]:
    values = {}
    for index in range(3):
        candidate = candidates[index] if index < len(candidates) else {}
        number = index + 1
        values[f"{prefix}{number}_name"] = candidate.get("name", "")
        values[f"{prefix}{number}_id"] = candidate.get("id", "")
        values[f"{prefix}{number}_type"] = candidate.get("entityType", "")
        values[f"{prefix}{number}_park"] = candidate.get("parkName", "")
        values[f"{prefix}{number}_latitude"] = candidate.get("latitude", "")
        values[f"{prefix}{number}_longitude"] = candidate.get("longitude", "")
        values[f"{prefix}{number}_score"] = candidate.get("score", "")
    return values

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--inventory", type=Path, default=Path("data/entity_catalog/itinerary_entities.csv"))
    parser.add_argument("--output-json", type=Path, default=Path("data/entity_catalog/match_candidates.json"))
    parser.add_argument("--output-csv", type=Path, default=Path("data/entity_catalog/match_review.csv"))
    parser.add_argument("--cache-dir", type=Path, default=Path("data/entity_catalog/cache"))
    parser.add_argument("--refresh", action="store_true")
    args = parser.parse_args()

    inventory = load_inventory(args.inventory)
    args.cache_dir.mkdir(parents=True, exist_ok=True)

    tpw_entities = fetch_tpw_entities(args.cache_dir, args.refresh)
    queue_entities = fetch_queue_entities(args.cache_dir, args.refresh)

    results = []
    review_rows = []

    for row in inventory:
        if not should_include(row):
            continue

        tpw_candidates = rank(row, tpw_entities)
        queue_candidates = rank_queue(row, queue_entities)

        results.append({
            "itinerary": row,
            "scope": canonical_scope(row.get("park_name", "")),
            "themeParksWikiCandidates": tpw_candidates,
            "queueTimesCandidates": queue_candidates,
        })

        best = tpw_candidates[0] if tpw_candidates else {}
        second = tpw_candidates[1] if len(tpw_candidates) > 1 else {}
        clear_margin = float(best.get("score", 0)) - float(second.get("score", 0))
        auto_status = (
            "LIKELY"
            if best.get("score", 0) >= 0.94 and clear_margin >= 0.10
            else "REVIEW"
        )

        review_row = {
            "itinerary_id": row["itinerary_id"],
            "itinerary_name": row["name"],
            "kind": row["kind"],
            "park_scope": canonical_scope(row.get("park_name", "")),
            "area": row["area"],
            **candidate_columns("tpw_", tpw_candidates),
            **candidate_columns("queue_", queue_candidates),
            "selected_tpw_candidate": "1" if tpw_candidates else "",
            "selected_queue_candidate": "1" if queue_candidates else "",
            "match_status": auto_status,
            "review_note": "",
        }
        review_rows.append(review_row)

    write_json(args.output_json, results)

    args.output_csv.parent.mkdir(parents=True, exist_ok=True)
    with args.output_csv.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(review_rows[0].keys()) if review_rows else [])
        writer.writeheader()
        writer.writerows(review_rows)

    print(f"ThemeParks.wiki entities loaded: {len(tpw_entities)}")
    print(f"Queue-Times rides loaded: {len(queue_entities)}")
    print(f"Park/type-scoped review rows: {len(review_rows)}")
    print(f"Review file: {args.output_csv}")

if __name__ == "__main__":
    main()
