# Install v2.7.6 Current Location Click Fix

Extract this patch over the repository root.

```powershell
python -m mkdocs build --strict

git add .
git commit -m "Fix current-location GPS request"
git push
```

## Fix

The wait-list toolbar correctly passed `true` when **Current location** was tapped,
but the renderer's callback discarded that argument and reused the initial
`requestGps=false` value. As a result, the button changed state without calling
`navigator.geolocation.getCurrentPosition()`.

This version forwards the explicit-click flag into the shared location request.

## Phone verification

1. Remove the site's location permission in Android Chrome.
2. Reload the deployed page.
3. Tap **Current location** in the wait panel.
4. Chrome should request location permission.
5. After allowing it, the status should show current-phone-location accuracy and
   mapped rides should display distance from current location.

The separate **Use my location** button remains supported and shares the same
successful coordinate cache.
