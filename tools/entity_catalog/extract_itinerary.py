from __future__ import annotations

import argparse
import csv
import html
import re
from pathlib import Path

ITEM_RE = re.compile(
    r'<div class="trip-item [^"]+" id="activity-(?P<activity_id>[^"]+)"(?P<attrs>[^>]*)>'
    r'(?P<body>.*?)(?=<div class="trip-item |\Z)',
    re.S,
)
ATTR_RE = re.compile(r'data-([a-z0-9-]+)="([^"]*)"')
TITLE_RE = re.compile(r'<div class="trip-item-title">(?P<title>.*?)</div>', re.S)
ROUTE_RE = re.compile(r'<div class="trip-item-route">.*?<span>(?P<route>.*?)</span>.*?</div>', re.S)

def strip_tags(value: str) -> str:
    value = re.sub(r"<[^>]+>", " ", value)
    value = html.unescape(value)
    value = re.sub(r"^[^\w]+", "", value)
    return " ".join(value.split())

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--docs", type=Path, default=Path("docs"))
    parser.add_argument("--output", type=Path, default=Path("data/entity_catalog/itinerary_entities.csv"))
    args = parser.parse_args()

    rows = []
    for path in sorted(args.docs.rglob("day-*.md")):
        text = path.read_text(encoding="utf-8")
        for match in ITEM_RE.finditer(text):
            attrs = {key.replace("-", "_"): value for key, value in ATTR_RE.findall(match.group("attrs"))}
            title_match = TITLE_RE.search(match.group("body"))
            route_match = ROUTE_RE.search(match.group("body"))
            title = strip_tags(title_match.group("title")) if title_match else match.group("activity_id")
            rows.append({
                "itinerary_id": attrs.get("item_id", match.group("activity_id")),
                "activity_anchor": match.group("activity_id"),
                "name": title,
                "kind": attrs.get("kind", ""),
                "park_name": attrs.get("park_name", ""),
                "area": strip_tags(route_match.group("route")) if route_match else "",
                "source_page": path.as_posix(),
                "window_label": attrs.get("window_label", ""),
                "commitment": attrs.get("commitment", "false"),
                "include_in_catalog": "NO" if attrs.get("kind") in {"transfer", "flight"} else "YES",
                "notes": "",
            })

    args.output.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = list(rows[0].keys()) if rows else []
    with args.output.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {len(rows)} itinerary entities to {args.output}")

if __name__ == "__main__":
    main()
