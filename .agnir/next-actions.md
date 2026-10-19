# Agnir Next Actions

No Project work has been requested beyond installing Agnir, and nothing is in flight.

## Outstanding

None recorded.

## Available next steps

- Preview the classic version by opening `index.html` directly in a browser.
- Preview the assembled multi-version site with `node .github/pages/build.mjs _site`, then serve `_site` with any static server.
- Commit the Agnir installation when requested (`commit` / `提交` triggers checkpoint evaluation first).

## Version layout reminders for future work

- Effect changes for the classic demo belong on `main`.
- Changes for a named variant belong on its `feature/*` branch; the site rebuilds from branches on push, so no version code needs to be copied into `main`.
- New variants need a root `index.html` on a `feature/<name>` branch and, optionally, an entry in `.github/pages/versions.json`.
