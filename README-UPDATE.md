# v0.2 update instructions

1. Copy `docs/assets/checklist.css` and `docs/assets/checklist.js` into the matching paths in the repository.
2. Add the `extra_css` and `extra_javascript` blocks from `MKDOCS-PATCH.md` to `mkdocs.yml`.
3. Copy the checklist block from each file under `docs/disney/` into the corresponding daily page immediately below a `## Day-of checklist` heading.
4. Add the relevant meal sections from `docs/FOOD-SUGGESTIONS.md`.
5. Commit and push to `main`.
6. After GitHub Pages redeploys, open the site on a phone and tap a status button repeatedly to confirm:
   `Not decided → Completed → Skipped → Not decided`.