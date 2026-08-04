# Install v2.5.8 Priority Context and Final Dark-Mode Refinements

Extract over the repository root.

Then run:

```powershell
python -m mkdocs build --strict

git add .
git commit -m "Add contextual priority waits and finish dark mode"
git push
```

## Included

### Dark mode

- Bold, readable page and section headings.
- Dark navigation drawer with readable active and inactive items.
- Dark weather-at-planned-time cards with readable text.
- Consistent Route summary and Today at a glance styling.

### Priority waits

Universal pages now receive priority-wait sections for:

- Epic Universe
- Islands of Adventure
- Universal Studios Florida

Typhoon Lagoon includes family-oriented attractions:

- Miss Adventure Falls
- Crush 'n' Gusher
- Gangplank Falls
- Castaway Creek
- Typhoon Lagoon Surf Pool

### Contextual guidance

Each matched priority attraction can show:

- approximate distance;
- estimated walking time;
- the itinerary location used as the reference;
- contextual guidance combining wait, travel time, and planned/reserved status.

Examples:

```text
🚶 450 ft · 2–4 min from Three Broomsticks
Short wait and nearby — a strong opportunity now.
```

```text
🚶 0.8 mi · 14–20 min from the next stop
Short wait, but account for the walk before diverting.
```

The distance remains coordinate-based rather than official park-path routing.
