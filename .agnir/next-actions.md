# Agnir Next Actions

## Outstanding

1. Push `feature/classic` and `main` atomically, then verify the Pages workflow run, the published `/all-in-one/` and `/classic/` pages, and that `/classic/` still contains the corner tilt fix.
2. QA the 汇总版 on `main` in a real browser: levels 1–5, per-card level memory, WebGL switch and fallback, pack opening, mobile layout.
3. Confirm the corner tilt fix on `feature/classic` with a real pointer (headless geometry only so far).
4. Consider whether `feature/all-in-one` should be retired or kept as a historical branch; it no longer has its own route.

## Available next steps

- Local multi-version preview: `node .github/pages/build.mjs _site`, then serve `_site`; or use the existing `/tmp/holo-preview/holo-card` build on port 8081.
- Classic page: open `feature/classic`'s `index.html`, or http://127.0.0.1:8080/ for the working tree at the time of the install.
- If the classic corners still feel strong, tune `CONFIG.maxTilt` or `--perspective`; the vector clamp lives in `onMove`.
- 汇总版 tuning lives in its own `index.html` / `js/holo.js`; do not port classic tilt constants into it blindly.

## Version layout reminders

- 汇总版 changes belong on `main` now.
- Classic changes belong on `feature/classic`.
- Other variants remain on their `feature/*` branches.
- New routes need an entry in `.github/pages/versions.json`; auto-discovered `feature/*` branches still appear automatically unless their route is explicitly taken.
