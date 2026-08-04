from __future__ import annotations

import argparse
import html
import json
from pathlib import Path

def esc(value):
    return html.escape(str(value or ""))

def candidate_card(provider, number, candidate):
    if not candidate:
        return ""

    name = esc(candidate.get("name"))
    entity_id = esc(candidate.get("id"))
    park = esc(candidate.get("parkName") or candidate.get("park") or "")
    entity_type = esc(candidate.get("entityType") or "")
    score = candidate.get("score", "")
    latitude = candidate.get("latitude", "")
    longitude = candidate.get("longitude", "")

    if provider == "tpw":
        href = f"https://www.themeparks.wiki/browse/{entity_id}" if entity_id else ""
        provider_label = "ThemeParks.wiki"
    else:
        park_id = candidate.get("parkId") or candidate.get("park")
        href = (
            f"https://queue-times.com/en-US/parks/{park_id}/rides/{entity_id}"
            if park_id and entity_id else ""
        )
        provider_label = "Queue-Times"

    link = (
        f'<a class="entity-candidate-link" href="{esc(href)}" target="_blank" rel="noopener">'
        f'Open {provider_label}</a>'
        if href else ""
    )

    location = ""
    if latitude not in ("", None) and longitude not in ("", None):
        location = (
            f'<div class="entity-candidate-location">📍 {esc(latitude)}, {esc(longitude)}</div>'
        )

    return f"""
<label class="entity-candidate">
  <input type="radio"
         name="{provider}-{{ITEM_ID}}"
         value="{number}"
         data-provider="{provider}"
         data-item-id="{{ITEM_ID}}">
  <span class="entity-candidate-body">
    <span class="entity-candidate-name">{name}</span>
    <span class="entity-candidate-meta">{entity_type} · {park} · score {esc(score)}</span>
    {location}
    {link}
  </span>
</label>
"""

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--candidates", type=Path, default=Path("data/entity_catalog/match_candidates.json"))
    parser.add_argument("--output", type=Path, default=Path("docs/entity-review.md"))
    args = parser.parse_args()

    rows = json.loads(args.candidates.read_text(encoding="utf-8"))
    grouped = {}

    for row in rows:
        itinerary = row["itinerary"]
        scope = row.get("scope") or itinerary.get("park_name") or "Other"
        grouped.setdefault(scope, []).append(row)

    parts = [
        "# Entity Match Review",
        "",
        "Use this temporary page to verify the static trip entity catalog.",
        "",
        "For each itinerary item:",
        "",
        "1. Review the itinerary name and park.",
        "2. Choose the correct ThemeParks.wiki candidate.",
        "3. Choose the correct Queue-Times candidate when applicable.",
        "4. Mark the row **Approved**, **Not applicable**, or **Needs research**.",
        "5. Export the reviewed selections when finished.",
        "",
        '<div class="entity-review-toolbar">',
        '  <button id="entity-review-export" class="md-button md-button--primary">Download reviewed matches</button>',
        '  <button id="entity-review-clear" class="md-button">Clear saved review</button>',
        '  <span id="entity-review-progress">0 reviewed</span>',
        '</div>',
        "",
    ]

    for scope in sorted(grouped):
        parts.append(f"## {scope}")
        parts.append("")
        for row in grouped[scope]:
            itinerary = row["itinerary"]
            item_id = itinerary["itinerary_id"]
            name = itinerary["name"]
            kind = itinerary["kind"]
            area = itinerary.get("area", "")
            tpw = row.get("themeParksWikiCandidates", [])
            queue = row.get("queueTimesCandidates", [])

            parts.append(
                f'<section class="entity-review-item" '
                f'data-item-id="{esc(item_id)}" '
                f'data-name="{esc(name)}" '
                f'data-kind="{esc(kind)}" '
                f'data-park="{esc(scope)}">'
            )
            parts.append(f'<h3>{esc(name)}</h3>')
            parts.append(
                f'<div class="entity-review-context">'
                f'<span>{esc(kind)}</span>'
                f'<span>{esc(scope)}</span>'
                f'<span>{esc(area)}</span>'
                f'</div>'
            )

            parts.append('<div class="entity-provider-group">')
            parts.append('<h4>ThemeParks.wiki</h4>')
            if tpw:
                for idx, candidate in enumerate(tpw[:3], start=1):
                    parts.append(
                        candidate_card("tpw", idx, candidate)
                        .replace("{ITEM_ID}", esc(item_id))
                    )
            else:
                parts.append('<p class="entity-review-empty">No scoped candidate found.</p>')
            parts.append("</div>")

            parts.append('<div class="entity-provider-group">')
            parts.append('<h4>Queue-Times</h4>')
            if queue:
                for idx, candidate in enumerate(queue[:3], start=1):
                    parts.append(
                        candidate_card("queue", idx, candidate)
                        .replace("{ITEM_ID}", esc(item_id))
                    )
            else:
                parts.append('<p class="entity-review-empty">No Queue-Times match is required or available.</p>')
            parts.append("</div>")

            parts.append('<div class="entity-review-status">')
            for value, label in [
                ("APPROVED", "✓ Approved"),
                ("NOT_APPLICABLE", "Not applicable"),
                ("UNRESOLVED", "Needs research"),
            ]:
                parts.append(
                    f'<label><input type="radio" name="status-{esc(item_id)}" '
                    f'value="{value}" data-status-item="{esc(item_id)}"> {label}</label>'
                )
            parts.append(
                f'<input class="entity-review-note" type="text" '
                f'data-note-item="{esc(item_id)}" placeholder="Optional review note">'
            )
            parts.append("</div>")
            parts.append("</section>")
            parts.append("")

    args.output.write_text("\n".join(parts), encoding="utf-8")
    print(f"Wrote {len(rows)} review items to {args.output}")

if __name__ == "__main__":
    main()
