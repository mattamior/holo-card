# Agnir Current State

Durable continuity belongs to the Project.

## Project

- Repository `mattamior/holo-card`; `main` is authoritative.
- Since the 2026-10-19 integration, **`main` ships the 汇总版 (all-in-one) page**: five cards (应龙 / 霜晶龙 / 焰尾狐 / 星尘狐 / 金曜狮王), card levels 1–5, CSS and WebGL modes, pack opening. Source: `index.html`, `js/holo.js`, `js/textures.js`, `vendor/three-holo.min.js` (local three subset, loaded only on first WebGL switch), `assets/yinglong/`, `yinglong.html`.
- Classic CSS demo is preserved on branch `feature/classic` (cut from `a42d348`, includes the 2026-10-19 corner tilt fix).
- Multi-version Pages site: `.github/workflows/pages.yml` runs `.github/pages/build.mjs`, exporting each route branch with `git archive` into `_site`. Routes in `.github/pages/versions.json`: `/all-in-one/` ← `main`, `/classic/` ← `feature/classic`, `/gyro/`, `/foil-mask/`, `/parallax/`, `/webgl/` ← their feature branches. Auto-discovery now skips a `feature/*` branch when its route is already explicitly registered, so the retired `feature/all-in-one` does not create a duplicate entry.
- Published site: https://mattamior.github.io/holo-card/.

## 2026-10-19 integration

- Merged `origin/feature/all-in-one` (`adf07cc`) into `main` after committing the classic corner tilt fix (`a42d348`).
- Conflict resolution:
  - `index.html` → 汇总版 (branch side);
  - `AGNIR.md`, `AGNIR.yaml`, `.github/pages/versions.json` → `main` side, then routes updated (`all-in-one` → `main`, `classic` → `feature/classic`);
  - `.github/pages/build.mjs` → restored from `main` (the branch had deleted it) and given the route-collision skip;
  - `.agnir/{state,next-actions,decisions}.md` → hand-reconciled from both sides;
  - `README.md` → merged, then corrected branch/route references and the duplicated Agnir section.
- `feature/classic` was created from `a42d348` before the merge.
- Pushed atomically on 2026-10-19: `main` `305944d..dab1555`, `feature/classic` new at `a42d348`; Pages runs `39224965877` and `39224978596` (both `main` @ `dab1555`) completed successfully.
- Published checks: `/all-in-one/` serves the 汇总版 (5 cards), `/classic/` serves the classic page and contains the corner tilt clamp, homepage lists the updated routes.

## 汇总版 technical truth (carried from feature/all-in-one)

- Portrait 2:3 cards; HoK-style list + modal; levels 1–5 per card id (`localStorage`).
- Full-card face foil (`.layer--foil` clipped to `--card-radius`), tilt-driven specular sweep + soft-light low-sat iridescence; rejected the earlier `color-dodge` rainbow-sticker look. L5 keeps a ~1.25% pearl/silver rim plus independent rim laser; L1–4 are no-rim.
- L3 animates subject only (Yinglong `00_body`, fox tail/ears), L4 adds per-card environment FX; particles may slightly exceed the frame.
- WebGL mode uses a local three subset and a stencil window for true layered 3D breakout; it downloads only on first switch and falls back with a notice when WebGL2 is unavailable.
- Branch decisions and evidence for this work are preserved in `.agnir/decisions.md` and `.agnir/evidence/` (2026-10-12).

## Corner tilt fix — 汇总版 (`main`, 2026-10-19)

- The Principal clarified that the original corner report referred to the 汇总版, not the classic page.
- Before: CSS mode capped each axis at 11°, so corners reached 15.25° combined (`rx 10.74`, `ry -10.83`); WebGL mode capped each axis at 14° and allowed 19.8° combined.
- Change: `limitTilt()` caps the tilt vector length at `maxTilt`. It is used by pointer and gyro input in `index.html`, and by hover and gyro in `js/holo.js`. Light/foil UV is derived from the clamped angles; edge midpoints keep the full per-axis angle.
- After: CSS corners 11.00° combined (7.75/7.81 per axis); WebGL corners 14.00° (10.02/9.78); mobile CSS corner 11.00°; `prefers-reduced-motion` stays at 0.
- Detail modal: the same card is grown to 380–620px, so `--persp` and `--depth-scale` now scale with `modalWidth / listWidth` (620 → 2952px / 3.69×), keeping the 11° corner visually equivalent to the list (~1.037× near-corner instead of ~1.15×). Mobile 328 → 1988px / 2.48×. Inline overrides are removed when the card returns to the list.
- Committed and pushed: `35448f6` (list clamp) and `9afd227` (modal perspective); Pages run `39231564748` succeeded. Live checks: `/all-in-one/` list corner 11.00° with `--persp: 800`; modal 620px card gets `--persp: 2952` / `--depth-scale: 3.6905` and its corner stays 11.00°.

## Corner tilt fix — classic (`feature/classic`)

- The earlier fix (commit `a42d348`) capped the 14° per-axis angles at a 14° vector, measured the untransformed `.card`, and reduced corner tilt to ~9.9°/axis.
- It was implemented for the earlier report that the Principal has since clarified was about the 汇总版; it remains a valid improvement for the classic page.

## Identity and installation

- Agnir Core `1.0`, profile `repository-filesystem/1.0`, distribution `v1.0.2` from `iorLab/agnir` (`b5626394ec40a5cb7a28c01892acde07cc0adc8e`).
- Project identity `urn:agnir:project:holo-card`; lineage `urn:agnir:lineage:authoritative`; no VCS selector binding.
- `feature/all-in-one` had independently initialized Agnir with identity `urn:agnir:project:mattamior/holo-card` and a binding to its own ref. That identity was **not** adopted; its continuity is reconciliation input only.

## Invariants

- Durable continuity belongs to the Project.
- Project identity, logical lineage identity, selector/binding, and revision receipts remain distinct concepts.
- A checkpoint is reconciliation of durable Project truth, not an activity log.
- Unchanged durable truth is a checkpoint no-op.
- `main` is authoritative; version variants stay on their branches and are assembled at deploy time.
- The classic demo keeps its zero-dependency, single-file property on `feature/classic`; the 汇总版 may load its local three subset only when WebGL is requested.
