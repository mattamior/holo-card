# Agnir Current State

Durable continuity belongs to the Project.

## Project

- Repository `mattamior/holo-card`; `main` is authoritative.
- Since the 2026-10-19 integration, **`main` ships the 汇总版 (all-in-one) page**: five cards (应龙 / 霜晶龙 / 焰尾狐 / 星尘狐 / 金曜狮王), card levels 1–5, CSS and WebGL modes, pack opening. Source: `index.html`, `js/holo.js`, `js/textures.js`, `vendor/three-holo.min.js` (local three subset, loaded only on first WebGL switch), `assets/yinglong/`, `yinglong.html`.
- Classic CSS demo is preserved on branch `feature/classic` (cut from `a42d348`, includes the 2026-10-19 corner tilt fix).
- Multi-version Pages site: `.github/workflows/pages.yml` runs `.github/pages/build.mjs`, exporting each route branch with `git archive` into `_site`. Routes in `.github/pages/versions.json`: `/all-in-one/` ← `main`, `/classic/` ← `feature/classic`, `/gyro/`, `/foil-mask/`, `/parallax/`, `/webgl/` ← their feature branches. Auto-discovery now skips a `feature/*` branch when its route is already explicitly registered, so the retired `feature/all-in-one` does not create a duplicate entry.
- Published site: https://mattamior.github.io/holo-card/.

## 2026-10-19 integration

- Merged `origin/feature/all-in-one` (`adf07cc`) into `main` after committing the corner tilt fix (`a42d348`).
- Conflict resolution:
  - `index.html` → 汇总版 (branch side);
  - `AGNIR.md`, `AGNIR.yaml`, `.github/pages/versions.json` → `main` side, then routes updated (`all-in-one` → `main`, `classic` → `feature/classic`);
  - `.github/pages/build.mjs` → restored from `main` (the branch had deleted it) and given the route-collision skip;
  - `.agnir/{state,next-actions,decisions}.md` → hand-reconciled from both sides;
  - `README.md` → merged, then corrected branch/route references and the duplicated Agnir section.
- `feature/classic` was created from `a42d348` before the merge.
- Push of `main` + `feature/classic` and the resulting Pages deployment were still pending when this record was written; see Next Actions.

## 汇总版 technical truth (carried from feature/all-in-one)

- Portrait 2:3 cards; HoK-style list + modal; levels 1–5 per card id (`localStorage`).
- Full-card face foil (`.layer--foil` clipped to `--card-radius`), tilt-driven specular sweep + soft-light low-sat iridescence; rejected the earlier `color-dodge` rainbow-sticker look. L5 keeps a ~1.25% pearl/silver rim plus independent rim laser; L1–4 are no-rim.
- L3 animates subject only (Yinglong `00_body`, fox tail/ears), L4 adds per-card environment FX; particles may slightly exceed the frame.
- WebGL mode uses a local three subset and a stencil window for true layered 3D breakout; it downloads only on first switch and falls back with a notice when WebGL2 is unavailable.
- Branch decisions and evidence for this work are preserved in `.agnir/decisions.md` and `.agnir/evidence/` (2026-10-12).

## Corner tilt fix (classic page, on `feature/classic`)

- `rx`/`ry` were each capped at 14°, so corners reached ~19.8° of combined tilt; pointer mapping also read the transformed rotator rect.
- Fixed by measuring the untransformed `.card` and capping the tilt vector length at `maxTilt`. Corners ~9.9°/axis, edges ~14°, near-corner perspective scale ~1.077× (was ~1.10–1.11×).
- This fix applies to the classic page only; the 汇总版 page has its own tilt logic.

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
