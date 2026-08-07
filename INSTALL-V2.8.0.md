# Install v2.8.0 Universal Coordinate Workflow

Extract this ZIP over the repository root.

Generate the review workbook data with:

```powershell
.\tools\universal_coordinates\build-review.ps1
```

Then follow `UNIVERSAL-COORDINATE-REVIEW-GUIDE.md`.

The workflow is additive: it does not alter the production catalog until you complete the review and run `apply-reviewed-coordinates.ps1`.
