# Install v1.2 Release Candidate

1. Commit or back up the existing repository.
2. Extract this ZIP into the repository root.
3. Replace matching files.
4. Confirm no nested `orlando-vacation-site-starter/` folder remains.
5. Run:

```powershell
python -m pip install -r requirements.txt
mkdocs build --strict
```

6. Commit and push to `main`.
7. Complete the mobile tests in `RELEASE-CANDIDATE.md`.
