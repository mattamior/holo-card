# Agnir Next Actions

## Outstanding

1. Visually confirm the corner tilt fix in a real browser: pointer at each corner should keep the 3D tilt but no longer over-stretch the near corner; side midpoints should look unchanged.
2. Commit the fix when accepted (`提交` / `commit` runs checkpoint evaluation first).

## Available next steps

- Preview the classic version by opening `index.html` directly in a browser.
- Preview the assembled multi-version site with `node .github/pages/build.mjs _site`, then serve `_site` with any static server.
- If corners still feel strong, tune `CONFIG.maxTilt` (global) or `--perspective` (projection); the vector clamp lives in `onMove` in `index.html`.

## Version layout reminders for future work

- Effect changes for the classic demo belong on `main`.
- Changes for a named variant belong on its `feature/*` branch; the site rebuilds from branches on push, so no version code needs to be copied into `main`.
- New variants need a root `index.html` on a `feature/<name>` branch and, optionally, an entry in `.github/pages/versions.json`.
