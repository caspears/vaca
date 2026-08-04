from __future__ import annotations

import json
import math
import re
import unicodedata
import urllib.error
import urllib.request
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any

THEMEPARKS_API = "https://api.themeparks.wiki/v1"
QUEUE_TIMES_API = "https://queue-times.com"

QUEUE_PARKS = {
    "Magic Kingdom": 6,
    "Hollywood Studios": 7,
    "Animal Kingdom": 8,
    "Islands of Adventure": 64,
    "Universal Studios Florida": 65,
    "Epic Universe": 334,
}

PARK_SCOPE_ALIASES = {
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
    "Animal Kingdom Lodge": [
        "Disney's Animal Kingdom Lodge",
        "Animal Kingdom Lodge",
    ],
    "Hard Rock Hotel": [
        "Universal's Hard Rock Hotel",
        "Hard Rock Hotel",
    ],
}

ITINERARY_PARK_NORMALIZATION = {
    "Typhoon Lagoon / Resort": "Typhoon Lagoon",
    "Animal Kingdom Lodge": "Animal Kingdom Lodge",
    "Magic Kingdom / Transfer": "Magic Kingdom",
    "Epic Universe": "Epic Universe",
    "Islands of Adventure": "Islands of Adventure",
    "Universal Studios Florida": "Universal Studios Florida",
    "Animal Kingdom": "Animal Kingdom",
    "Hollywood Studios": "Hollywood Studios",
    "Magic Kingdom": "Magic Kingdom",
    "Resort": "",
    "Transfer": "",
    "Departure": "",
}

KIND_TO_ENTITY_TYPES = {
    "planned": {"ATTRACTION"},
    "lightning": {"ATTRACTION"},
    "show": {"SHOW", "ATTRACTION"},
    "meal": {"RESTAURANT"},
    "hotel": {"HOTEL", "DESTINATION"},
    "extra": {"RESTAURANT", "ATTRACTION", "SHOP"},
    "transfer": set(),
    "flight": set(),
}

KIND_TO_QUEUE_ALLOWED = {"planned", "lightning"}

SKIP_NAME_PATTERNS = [
    r"\bcheck[\s-]?in\b",
    r"\bcheck[\s-]?out\b",
    r"\breturn to\b",
    r"\bretrieve luggage\b",
    r"\bdrive to\b",
    r"\bpark admission\b",
    r"\bearly park admission\b",
    r"\bquick-service lunch\b",
    r"\bfavorite or missed\b",
]

def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))

def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

def fetch_json(url: str, *, timeout: int = 45) -> Any:
    request = urllib.request.Request(
        url,
        headers={"Accept": "application/json", "User-Agent": "vaca-static-entity-catalog/1.1"},
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return json.load(response)
    except urllib.error.HTTPError as exc:
        raise RuntimeError(f"HTTP {exc.code} fetching {url}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Unable to fetch {url}: {exc.reason}") from exc

def normalize(value: str) -> str:
    value = unicodedata.normalize("NFKD", value or "")
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    value = value.lower().replace("™", "").replace("®", "")
    value = value.replace("&", " and ")
    value = re.sub(r"\bthe\b", " ", value)
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return " ".join(value.split())

def tokens(value: str) -> set[str]:
    return {token for token in normalize(value).split() if len(token) > 1}

def name_score(left: str, right: str) -> float:
    a = normalize(left)
    b = normalize(right)
    if not a or not b:
        return 0.0
    if a == b:
        return 1.0
    sequence = SequenceMatcher(None, a, b).ratio()
    ta, tb = tokens(a), tokens(b)
    jaccard = len(ta & tb) / len(ta | tb) if (ta | tb) else 0.0
    containment = 0.95 if a in b or b in a else 0.0
    return max(sequence * 0.65 + jaccard * 0.35, containment)

def canonical_scope(park_name: str) -> str:
    return ITINERARY_PARK_NORMALIZATION.get(park_name, park_name).strip()

def scope_aliases(scope: str) -> list[str]:
    return PARK_SCOPE_ALIASES.get(scope, [scope] if scope else [])

def entity_matches_scope(entity: dict[str, Any], scope: str) -> bool:
    if not scope:
        return False
    haystacks = [
        str(entity.get("parkName", "")),
        str(entity.get("parentName", "")),
        str(entity.get("destinationName", "")),
        str(entity.get("scopeName", "")),
    ]
    aliases = scope_aliases(scope)
    return any(
        name_score(alias, haystack) >= 0.80
        for alias in aliases
        for haystack in haystacks
        if haystack
    )

def entity_matches_type(entity: dict[str, Any], kind: str) -> bool:
    allowed = KIND_TO_ENTITY_TYPES.get(kind, set())
    if not allowed:
        return False
    entity_type = str(entity.get("entityType", "")).upper()
    return entity_type in allowed

def should_include(row: dict[str, str]) -> bool:
    if row.get("include_in_catalog", "YES").upper() != "YES":
        return False
    kind = row.get("kind", "")
    if not KIND_TO_ENTITY_TYPES.get(kind):
        return False
    name = row.get("name", "")
    return not any(re.search(pattern, name, re.I) for pattern in SKIP_NAME_PATTERNS)

def score_candidate(row: dict[str, str], candidate: dict[str, Any]) -> float:
    score = name_score(row["name"], str(candidate.get("name", "")))
    if entity_matches_scope(candidate, canonical_scope(row.get("park_name", ""))):
        score += 0.10
    if entity_matches_type(candidate, row.get("kind", "")):
        score += 0.08
    return min(score, 1.0)

def flatten_entities(
    value: Any,
    *,
    parent_name: str = "",
    destination_name: str = "",
    scope_name: str = "",
) -> list[dict[str, Any]]:
    output: list[dict[str, Any]] = []

    if isinstance(value, list):
        for item in value:
            output.extend(flatten_entities(
                item,
                parent_name=parent_name,
                destination_name=destination_name,
                scope_name=scope_name,
            ))
        return output

    if not isinstance(value, dict):
        return output

    entity_id = value.get("id")
    name = value.get("name")
    entity_type = str(value.get("entityType", "") or "")
    current_parent = parent_name
    current_destination = destination_name
    current_scope = scope_name

    if entity_id and name:
        if entity_type.upper() == "DESTINATION":
            current_destination = str(name)
        if entity_type.upper() == "PARK":
            current_scope = str(name)

        location = value.get("location") or {}
        output.append({
            "id": entity_id,
            "name": name,
            "entityType": entity_type,
            "parentId": value.get("parentId"),
            "parentName": parent_name,
            "destinationName": current_destination,
            "scopeName": current_scope,
            "parkName": current_scope or parent_name,
            "latitude": location.get("latitude"),
            "longitude": location.get("longitude"),
            "raw": value,
        })
        current_parent = str(name)

    for key, child in value.items():
        if key in {"location", "timezone", "raw"}:
            continue
        if isinstance(child, (list, dict)):
            output.extend(flatten_entities(
                child,
                parent_name=current_parent,
                destination_name=current_destination,
                scope_name=current_scope,
            ))
    return output

def queue_rides(payload: dict[str, Any], park_name: str, park_id: int) -> list[dict[str, Any]]:
    rides: list[dict[str, Any]] = []
    for land in payload.get("lands", []) or []:
        for ride in land.get("rides", []) or []:
            rides.append({
                "id": ride.get("id"),
                "name": ride.get("name"),
                "entityType": "ATTRACTION",
                "parkName": park_name,
                "scopeName": park_name,
                "parkId": park_id,
                "land": land.get("name"),
            })
    for ride in payload.get("rides", []) or []:
        rides.append({
            "id": ride.get("id"),
            "name": ride.get("name"),
            "entityType": "ATTRACTION",
            "parkName": park_name,
            "scopeName": park_name,
            "parkId": park_id,
            "land": None,
        })
    return rides
