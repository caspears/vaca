# Install v2.1 Static Entity Workflow

Extract this ZIP over the repository root.

Then run:

```powershell
python -m mkdocs build --strict

.\tools\entity_catalog\run-candidate-generation.ps1
```

Do **not** build the runtime snapshot immediately. First open:

```text
data\entity_catalog\match_review.csv
```

and manually verify the provider matches.

No runtime site behavior changes in this release. It establishes the reviewed static-data workflow first.
