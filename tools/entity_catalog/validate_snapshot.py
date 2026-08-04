from __future__ import annotations

import argparse
from pathlib import Path

from common import read_json

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--snapshot", type=Path, default=Path("docs/assets/data/trip_entities.json"))
    args = parser.parse_args()

    data = read_json(args.snapshot)
    entities = data.get("entities", {})
    missing_location = [
        key for key, value in entities.items()
        if value.get("location", {}).get("status") != "VERIFIED"
    ]
    missing_queue = [
        key for key, value in entities.items()
        if value.get("matchStatus") == "APPROVED"
        and value.get("kind") in {"planned", "lightning"}
        and not value.get("queueTimes", {}).get("rideId")
    ]

    print(f"Entities: {len(entities)}")
    print(f"Verified locations: {len(entities) - len(missing_location)}")
    print(f"Missing locations: {len(missing_location)}")
    print(f"Ride entities without Queue-Times ID: {len(missing_queue)}")

    if missing_location:
        print("Missing location:", ", ".join(missing_location))
    if missing_queue:
        print("Missing Queue-Times match:", ", ".join(missing_queue))

if __name__ == "__main__":
    main()
