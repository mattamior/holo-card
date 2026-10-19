# Merge feature/all-in-one into main (汇总版 promotion)

Date: 2026-10-19

## Authorization

- Principal: "feature/all-in-one可以合并到main分支了".
- Chosen shape: preserve the classic CSS demo on a new branch, promote the 汇总版 to `main`, then push `main`.

## Inputs

- `main` before merge: `a42d348` (Agnir install `641dfab` + corner tilt fix).
- `feature/all-in-one`: `adf07cc` (full-card face laser).
- Merge base: `5fb5c2a` (multi-version Pages site).
- Source branch was fetched immediately before merging; no newer remote commits were overwritten.

## Actions

1. Committed the classic corner tilt fix (`a42d348`), then cut `feature/classic` from it.
2. Merged `origin/feature/all-in-one` into `main` with `--no-ff`.
3. Conflict resolution:
   - `index.html`: took the 汇总版 (branch side); the classic page, including the corner fix, now lives on `feature/classic`.
   - `AGNIR.md`, `AGNIR.yaml`: kept `main`'s identity `urn:agnir:project:holo-card` and binding-free continuity model. The branch's independent `urn:agnir:project:mattamior/holo-card` + `refs/heads/feature/all-in-one` binding was treated as reconciliation input, not adopted.
   - `.agnir/{state,next-actions,decisions}.md`: hand-reconciled, preserving the branch's 2026-10-12 decisions verbatim and recording the promotion.
   - `.github/pages/versions.json`: kept `main`'s file, then mapped `/all-in-one/` → `main` and `/classic/` → `feature/classic`.
   - `.github/pages/build.mjs`: restored from `main` (the all-in-one branch had deleted it); auto-discovery now skips a `feature/*` branch whose route is already explicitly registered instead of generating a duplicate `v-*` route.
   - `README.md`: auto-merge kept both Agnir sections; removed the duplicate, corrected the current-branch/route table, and documented `PAGES_LOCAL_REFS=1` for previewing unpushed commits.
   - `feature/all-in-one` is retained as historical source; it no longer owns a route.

## Verification

- `node --check .github/pages/build.mjs`: pass; `versions.json` parses.
- Build with `PAGES_LOCAL_REFS=1 node .github/pages/build.mjs`:
  - `/all-in-one/` ← `main` @ merge commit, title "汇总版", 5 cards;
  - `/classic/` ← `feature/classic` @ `a42d348`, 3 cards, contains the corner-clamp code;
  - `feature/all-in-one` auto-discovery skipped: `/all-in-one/` is explicitly occupied;
  - 6 routes total, no duplicate `v-*` route.
- Headless Chrome against the built site: all-in-one 5 cards, classic 3 cards, home page renders; no page errors or failed requests.
- Classic corner simulation still reports `--rx: 9.88`, `--ry: -9.92`, so the fix survived the branch cut.

Limits: headless verification only; live interactive QA (levels, WebGL switch/fallback, pack opening, mobile) remains outstanding and is listed in `.agnir/next-actions.md`.

## Pending at record time

- Push `feature/classic` and `main` atomically to `origin`.
- Verify the Pages workflow and the published `/all-in-one/` + `/classic/` pages.
