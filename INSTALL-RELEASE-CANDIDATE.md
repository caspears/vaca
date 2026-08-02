# Install v1.2.1 Release Candidate

1. Commit or back up the repository.
2. Extract this ZIP into the repository root and replace matching files.
3. Confirm there is no nested `orlando-vacation-site-starter/` folder.
4. Run:

```powershell
python -m pip install -r requirements.txt
mkdocs build --strict
```

5. Push to `main`.
6. On a phone, verify:
   - rain/thunderstorm forecast windows;
   - linked current waits in the live panel;
   - linked current wait inside ride-card details;
   - spacing in Window / time, Leave by and Allow;
   - graceful fallback when live providers are unavailable.
