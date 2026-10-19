# Agnir Current State

Durable continuity belongs to the Project.

## Project

- Repository `mattamior/holo-card`, authoritative branch `main`, currently at `305944d` (versions 汇总版描述).
- Zero-dependency static demo: `main` ships a single-file `index.html` implementing the classic CSS holo-card effect (pointer-driven 3D tilt, highlight, rainbow laser, sparkles, brushed metal). No build step and no runtime dependency for that page.
- Multi-version preview site: GitHub Actions workflow `.github/workflows/pages.yml` runs `.github/pages/build.mjs`, which exports each version branch with `git archive` into `_site` and publishes to GitHub Pages. Version metadata and landing copy live in `.github/pages/versions.json`; published site is https://mattamior.github.io/holo-card/.
- Version branches: `feature/all-in-one`, `feature/gyro`, `feature/foil-mask`, `feature/parallax`, `feature/webgl`. Each carries its own root `index.html` plus the same `pages.yml`; `main` assembles and deploys them all.

## Agnir installation

- Installed 2026-10-19 on a fresh clone: Agnir Core `1.0`, profile `repository-filesystem/1.0`, distribution `v1.0.2` from `iorLab/agnir` (applied revision `b5626394ec40a5cb7a28c01892acde07cc0adc8e`).
- Installation added `AGNIR.yaml`, `AGNIR.md`, `AGENTS.md`, the `.agnir/` continuity surface, and a README compatibility locator. No effect code, `index.html`, or `.github/` file was modified.
- The installation was committed as a single coherent revision at the Principal's request (`提交`), after checkpoint evaluation. The commit receipt lives in repository history rather than inside the record itself. No Project task is otherwise in progress.

## Corner tilt fix (2026-10-19)

- Report: moving the pointer to the card corners produced excessive deformation.
- Cause: `rx` and `ry` were each capped at `maxTilt` (14°), so corner targets reached √2 × 14° ≈ 19.8° of combined tilt under an 800px perspective. The pointer mapping also read `rotator.getBoundingClientRect()`; that rect changes as the card tilts, compressing edge coordinates and making the response inconsistent.
- Change in `index.html`: pointer coordinates now come from the untransformed `.card`, and the tilt vector `(rx, ry)` is capped at length `maxTilt`. Side midpoints keep ~14°; corners use ~9.9° per axis (14° combined, previously 17.7–19.6°). Projected near-corner scale drops from ~1.10–1.11× to ~1.077×.
- Verification: headless Chrome at a corner reports `--rx: 9.88`, `--ry: -9.92`; no console errors; `prefers-reduced-motion` keeps tilt at 0. Before/after screenshots inspected.
- Status: implemented, uncommitted, awaiting the Principal's visual confirmation.

## Invariants

- Durable continuity belongs to the Project.
- Project identity, logical lineage identity, selector/binding, and revision receipts remain distinct concepts.
- A checkpoint is reconciliation of durable Project truth, not an activity log.
- Unchanged durable truth is a checkpoint no-op.
- `main` is authoritative; version variants stay on their `feature/*` branches and are assembled at deploy time.
