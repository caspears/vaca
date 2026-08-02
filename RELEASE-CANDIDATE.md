# Orlando Vacation Site v1.2 Release Candidate

## Included fixes

- Removed the duplicate `orlando-vacation-site-starter/` directory.
- Restored independent rounded high-contrast attribute/status badges.
- Added live weather and priority wait-time panels to all daily pages.
- Added source attribution and official-app fallback language.
- Preserved mobile checklist, ratings, clear-rating behavior, revisit list, maps and navigation.
- Removed stale dashboard/navigator references from `mkdocs.yml`.

## Live-data behavior

- Weather uses Open-Meteo and refreshes every 15 minutes.
- Waits use Queue-Times and refresh every 5 minutes.
- A manual Refresh button is available.
- Wait times shown before the trip are current reference values, not forecasts.
- If browser CORS, connectivity or the provider prevents loading, the panel displays a fallback message.
- Disney and Universal official apps remain the authoritative operational source.

## Final release tests

- [ ] `mkdocs build --strict` succeeds.
- [ ] Hamburger menu opens above the sticky navigator.
- [ ] Every badge is a separate rounded pill in Outdoor, Light and Dark modes.
- [ ] Live panel loads or fails gracefully on a phone.
- [ ] Queue-Times attribution is visible.
- [ ] Checklist persists.
- [ ] Rating can be cleared by tapping the selected star again or Clear Rating.
- [ ] Revisit list displays Navigate links.
- [ ] All daily homepage links work.
- [ ] Breakfast dates and Hard Rock after-checkout parking are confirmed.
- [ ] Offline PDF is generated after family approval.
