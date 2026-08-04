# Install v2.5.9 Universal Wait Coverage and Dark Drawer

Extract over the repository root.

Then run:

```powershell
python -m mkdocs build --strict

git add .
git commit -m "Expand Universal live waits and fix dark drawer"
git push
```

## Dark drawer

The custom Night mode now styles the nested Material navigation list, list
items, active item, inactive items, labels, and drawer sheet—not only the outer
sidebar container.

## Universal live waits

The three Universal park pages now show a much broader live attraction list:

- 13 Epic Universe entries
- 23 Islands of Adventure entries
- 14 Universal Studios Florida entries

Single Rider pseudo-queues and reservation-slot status rows are excluded.

Because the lists are longer, they are labeled **Live attraction waits** and
scroll within a bounded panel on mobile. Contextual distance/guidance remains
available where the attraction is present in the verified trip entity catalog.
Additional rides still show their current live status and wait.
