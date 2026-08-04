from __future__ import annotations

import argparse
import csv
import json
import subprocess
import sys
from pathlib import Path

from common import QUEUE_PARKS, name_score, normalize

def load_csv(path: Path):
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))

def write_csv(path: Path, rows):
    fields = list(rows[0].keys()) if rows else []
    with path.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)

def identity_from_itinerary(itinerary):
    return (
        itinerary.get("itinerary_id", "").strip(),
        itinerary.get("name", "").strip().casefold(),
        (itinerary.get("park_name") or "").strip().casefold(),
    )

def identity_from_row(row):
    return (
        row.get("itinerary_id", "").strip(),
        row.get("itinerary_name", "").strip().casefold(),
        row.get("park_scope", "").strip().casefold(),
    )

def set_candidate_columns(row, prefix, candidates):
    for index in range(1, 4):
        candidate = candidates[index - 1] if len(candidates) >= index else {}
        key = f"{prefix}{index}_"
        row[key + "name"] = candidate.get("name", "")
        row[key + "id"] = candidate.get("id", "")
        row[key + "type"] = candidate.get("entityType", "")
        row[key + "park"] = candidate.get("parkName", "")
        row[key + "latitude"] = candidate.get("latitude", "")
        row[key + "longitude"] = candidate.get("longitude", "")
        row[key + "score"] = candidate.get("score", "")
        if prefix == "queue_":
            row[key + "park_id"] = candidate.get("parkId", "")

def auto_select_tpw(row, candidates):
    if not candidates:
        return "", "NO_CANDIDATE"

    first = candidates[0]
    second_score = float(candidates[1].get("score", 0)) if len(candidates) > 1 else 0.0
    first_score = float(first.get("score", 0))
    exact = normalize(row["itinerary_name"]) == normalize(str(first.get("name", "")))
    unique_margin = first_score - second_score

    if exact:
        return "1", "EXACT_NAME"
    if first_score >= 0.96 and unique_margin >= 0.10:
        return "1", "HIGH_CONFIDENCE"
    return "", "AMBIGUOUS"

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--normalized",
        type=Path,
        default=Path("data/entity_catalog/match_review-normalized.csv"),
    )
    parser.add_argument(
        "--candidates",
        type=Path,
        default=Path("data/entity_catalog/match_candidates.json"),
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("data/entity_catalog/match_review-repaired.csv"),
    )
    parser.add_argument(
        "--exceptions",
        type=Path,
        default=Path("data/entity_catalog/provider-repair-exceptions.csv"),
    )
    parser.add_argument("--skip-regeneration", action="store_true")
    args = parser.parse_args()

    if not args.skip_regeneration:
        command = [
            sys.executable,
            "tools/entity_catalog/generate_candidates.py",
            "--refresh",
        ]
        result = subprocess.run(command)
        if result.returncode != 0:
            raise SystemExit(f"Candidate regeneration failed with exit code {result.returncode}")

    rows = load_csv(args.normalized)
    candidate_rows = json.loads(args.candidates.read_text(encoding="utf-8"))
    by_identity = {
        identity_from_itinerary(item["itinerary"]): item
        for item in candidate_rows
    }

    exceptions = []
    repaired_count = 0

    for row in rows:
        item = by_identity.get(identity_from_row(row))
        if not item:
            exceptions.append({
                "catalog_id": row.get("catalog_id", ""),
                "itinerary_name": row.get("itinerary_name", ""),
                "park_scope": row.get("park_scope", ""),
                "reason": "No regenerated candidate record matched this itinerary row.",
                "candidate_1": "",
                "candidate_2": "",
                "candidate_3": "",
                "selected_candidate": "",
            })
            continue

        tpw = item.get("themeParksWikiCandidates", [])
        queue = item.get("queueTimesCandidates", [])
        set_candidate_columns(row, "tpw_", tpw)
        set_candidate_columns(row, "queue_", queue)

        # Preserve an existing selection if present. Otherwise restore approved
        # provider matches only when the regenerated result is unambiguous.
        selected = str(row.get("selected_tpw_candidate") or "").strip()
        if row.get("match_status") == "APPROVED" and not selected:
            selected, reason = auto_select_tpw(row, tpw)
            if selected:
                row["selected_tpw_candidate"] = selected
                row["provider_repair_status"] = reason
                repaired_count += 1
            else:
                row["provider_repair_status"] = reason
                exceptions.append({
                    "catalog_id": row.get("catalog_id", ""),
                    "itinerary_name": row.get("itinerary_name", ""),
                    "park_scope": row.get("park_scope", ""),
                    "reason": reason,
                    "candidate_1": tpw[0].get("name", "") if len(tpw) > 0 else "",
                    "candidate_2": tpw[1].get("name", "") if len(tpw) > 1 else "",
                    "candidate_3": tpw[2].get("name", "") if len(tpw) > 2 else "",
                    "selected_candidate": "",
                })
        else:
            row["provider_repair_status"] = (
                "PRESERVED_EXISTING_SELECTION" if selected else "NOT_REQUIRED"
            )

        # Normalize Queue-Times park ID. Existing data incorrectly put the park
        # name in the parkId field.
        queue_selection = str(row.get("selected_queue_candidate") or "").strip()
        if queue_selection in {"1", "2", "3"}:
            candidate = queue[int(queue_selection) - 1] if len(queue) >= int(queue_selection) else {}
            row["selected_queue_park_id"] = (
                candidate.get("parkId")
                or QUEUE_PARKS.get(row.get("park_scope", ""))
                or ""
            )
        else:
            row["selected_queue_park_id"] = ""

    write_csv(args.output, rows)

    if exceptions:
        write_csv(args.exceptions, exceptions)
    elif args.exceptions.exists():
        args.exceptions.unlink()

    print(f"Repaired approved ThemeParks.wiki selections: {repaired_count}")
    print(f"Provider exceptions requiring review: {len(exceptions)}")
    print(f"Repaired review: {args.output}")
    if exceptions:
        print(f"Exceptions: {args.exceptions}")

if __name__ == "__main__":
    main()
