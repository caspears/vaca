from __future__ import annotations

import html
import json
import re
import unicodedata
from dataclasses import dataclass
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any, Iterable

PARKS = {
    334: "Epic Universe",
    64: "Islands of Adventure",
    65: "Universal Studios Florida",
}

TPW_PARK_ALIASES = {
    "Epic Universe": ["Universal Epic Universe", "Epic Universe"],
    "Islands of Adventure": ["Universal's Islands of Adventure", "Islands of Adventure"],
    "Universal Studios Florida": ["Universal Studios Florida"],
}


def normalize(value: Any) -> str:
    text = unicodedata.normalize("NFKD", str(value or ""))
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.replace("™", "").replace("®", "").replace("’", "'").lower()
    text = re.sub(r"\b(the|at|universal|studios|florida)\b", " ", text)
    return re.sub(r"[^a-z0-9]+", " ", text).strip()


def slug(value: str) -> str:
    return normalize(value).replace(" ", "-") or "entity"


def similarity(left: str, right: str) -> float:
    a, b = normalize(left), normalize(right)
    if not a or not b:
        return 0.0
    sequence = SequenceMatcher(None, a, b).ratio()
    ta, tb = set(a.split()), set(b.split())
    jaccard = len(ta & tb) / max(1, len(ta | tb))
    contains = 1.0 if a in b or b in a else 0.0
    return round(sequence * 0.55 + jaccard * 0.35 + contains * 0.10, 4)


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def extract_live_rides(repo: Path) -> list[dict[str, Any]]:
    rows: dict[tuple[int, str], dict[str, Any]] = {}
    pages = sorted((repo / "docs" / "universal").glob("day-*.md"))
    pattern = re.compile(r'data-priority-rides="([^"]+)"')
    for page in pages:
        content = page.read_text(encoding="utf-8")
        match = pattern.search(content)
        if not match:
            continue
        rides = json.loads(html.unescape(match.group(1)))
        for ride in rides:
            park_id = int(ride["parkId"])
            name = str(ride["name"]).strip()
            rows[(park_id, normalize(name))] = {
                "queue_times_park_id": park_id,
                "park_name": PARKS.get(park_id, f"Queue-Times park {park_id}"),
                "live_ride_name": name,
                "source_page": str(page.relative_to(repo)).replace("\\", "/"),
            }
    return sorted(rows.values(), key=lambda row: (row["park_name"], row["live_ride_name"]))


def catalog_match(catalog: dict[str, Any], row: dict[str, Any], queue_ride_id: int | None = None):
    entities = catalog.get("entities", {})
    if queue_ride_id is not None:
        for key, entity in entities.items():
            if entity.get("queueTimes", {}).get("rideId") == queue_ride_id:
                return key, entity, "QUEUE_TIMES_ID"
    target = normalize(row["live_ride_name"])
    same_park = [(key, e) for key, e in entities.items() if e.get("parkName") == row["park_name"]]
    for key, entity in same_park:
        names = [entity.get("name"), entity.get("queueTimes", {}).get("name"), entity.get("themeParksWiki", {}).get("name")]
        if any(normalize(name) == target for name in names if name):
            return key, entity, "EXACT_NAME"
    best = None
    for key, entity in same_park:
        names = [entity.get("name"), entity.get("queueTimes", {}).get("name"), entity.get("themeParksWiki", {}).get("name")]
        score = max((similarity(row["live_ride_name"], name) for name in names if name), default=0)
        if not best or score > best[0]:
            best = (score, key, entity)
    if best and best[0] >= 0.90:
        return best[1], best[2], f"FUZZY_{best[0]:.2f}"
    return None, None, "NONE"


def location_of(entity: dict[str, Any] | None):
    location = (entity or {}).get("location", {})
    if location.get("status") == "VERIFIED" and isinstance(location.get("latitude"), (int, float)) and isinstance(location.get("longitude"), (int, float)):
        return location
    return None
