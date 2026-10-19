# Agnir Next Actions

## Outstanding

1. QA the 汇总版 on `main` in a real browser: corners in both the list and the detail modal, levels 1–5, per-card level memory, WebGL switch and fallback, pack opening, mobile layout.
2. Confirm the classic corner tilt fix on `feature/classic` with a real pointer.
3. Consider whether `feature/all-in-one` should be retired or kept as a historical branch; it no longer has its own route.

## Available next steps

- Local multi-version preview: `PAGES_LOCAL_REFS=1 node .github/pages/build.mjs _site`, then serve `_site`; or use the existing `/tmp/holo-preview-merge` build on port 8082.
- 汇总版 working tree: http://127.0.0.1:8080/ (serves the repo root through the local static server).
- Classic page: check out `feature/classic`, or use the `/classic/` route in a built `_site`.
- Corner tuning: CSS `CONFIG.maxTilt` is 11 in `index.html`, WebGL `CONFIG.maxTilt` is 14 in `js/holo.js`; both pass through `limitTilt`. Raising either raises the corner cap with it.

## Version layout reminders

- 汇总版 changes belong on `main` now.
- Classic changes belong on `feature/classic`.
- Other variants remain on their `feature/*` branches.
- New routes need an entry in `.github/pages/versions.json`; auto-discovered `feature/*` branches still appear automatically unless their route is explicitly taken.
