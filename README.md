# Orlando Family Vacation 2026

This repository contains the editable Markdown source for the family review guide, final vacation playbook, and phone-friendly daily guides.

## Repository layout

- `docs/` — content published to the website
- `mkdocs.yml` — site navigation and theme configuration
- `.github/workflows/deploy-pages.yml` — automated GitHub Pages deployment
- `requirements.txt` — local/site build dependencies

## Edit the guide

Most changes only require editing Markdown files under `docs/`.

Start with:

- `docs/index.md`
- `docs/lightning-lane.md`
- `docs/disney/day-01-typhoon-lagoon.md`
- `docs/disney/day-02-animal-kingdom-hollywood.md`
- `docs/disney/day-03-magic-kingdom.md`

The family-comment convention is documented near the top of `docs/style-guide.md`.

## Preview locally

Requires Python 3.10 or later.

### PowerShell

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
mkdocs serve
```

Open the local address shown in the console, normally `http://127.0.0.1:8000`.

## Publish with GitHub Pages

1. Push these files to the repository's default branch.
2. In GitHub, open **Settings → Pages**.
3. Under **Build and deployment**, select **GitHub Actions** as the source.
4. Open the **Actions** tab and confirm the “Deploy vacation guide” workflow completes.
5. GitHub will show the published URL under **Settings → Pages**.

No separate server is required.

## Public-site caution

Do not commit reservation confirmation numbers, ticket barcodes, QR codes, account email addresses, or other private travel credentials. Keep those in the vendor apps or a separate private/offline note.
