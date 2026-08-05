# Install v2.7.4 Park-aware distance resolution

Extract over v2.7.3, then run:

```powershell
python -m mkdocs build --strict
git add .
git commit -m "Fix park-aware wait-list distances"
git push
```

## Corrected

- Resolves each wait row using its Queue-Times park ID.
- Uses a separate next mapped stop for each park on combined park days.
- Does not reuse an exact itinerary entity from the wrong park.
- Resolves Battle at the Ministry through the Ministry of Magic alias.
- Labels genuinely missing coordinates with the affected park.
