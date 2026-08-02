# Orlando Vacation Site v1.3 Release Candidate

## v1.3 live companion

- Cloudflare Worker CORS proxy with five-minute caching.
- One combined request per day page for weather and relevant parks.
- Ride-level weather near planned times.
- Conservative Level 1 guidance:
  - Use reserved access
  - Good standby opportunity
  - Wait for later
  - Protect the schedule
  - Weather caution
- Polling pauses while the page is hidden and refreshes when reopened.
- Automated PowerShell deployment/configuration script.

# Orlando Vacation Site v1.2 Release Candidate

## v1.2.1 refinements

- Shows approximate hourly start/end windows for rain and thunderstorms.
- Adds a linked current Queue-Times wait inside each matched ride card, before **Next**.
- Makes priority wait badges in the live panel link to the Queue-Times attraction page.
- Adds consistent spacing between **Window / time**, **Leave by**, **Allow**, and their values.

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
