# Quick setup: live waits, ride weather and guidance

From the repository root in PowerShell:

```powershell
cd .\cloudflare-worker
.\deploy.ps1
cd ..
python -m mkdocs build --strict
git add .
git commit -m "Add live park proxy and day-of guidance"
git push
```

The script installs Wrangler locally, opens Cloudflare authentication, deploys the Worker, detects the `workers.dev` URL, and writes it into `docs/assets/vacation-api-config.js`.

The only interactive step should be approving the Cloudflare login in the browser.

## Verify

Open:

```text
https://YOUR-WORKER.workers.dev/health
```

It should return JSON with `"status":"ok"`.

After GitHub Pages deploys, each daily page should show:

- hourly rain/thunderstorm windows;
- live priority waits;
- weather near each planned ride time;
- current wait links in ride details;
- conservative guidance: Use reserved access, Good standby opportunity, Wait for later, Protect the schedule, or Weather caution.

The official Disney and Universal apps remain authoritative.
