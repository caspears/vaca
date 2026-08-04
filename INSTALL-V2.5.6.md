# Install v2.5.6 UI Refinements

Extract over the repository root.

```powershell
python -m mkdocs build --strict
git add .
git commit -m "Refine trip card status icons and dark mode"
git push
```

Changes: separate status pills, check-marked Reserved, distinct Planned/Optional/Time-sensitive/Strongly recommended icons, one walking icon, removed movement-cue sentence, and consistent dark-mode surfaces/text.
