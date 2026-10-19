# Corner tilt deformation fix

Date: 2026-10-19

## Report

Principal: when the mouse moves to the four corners of the card, the deformation is a bit too strong.

## Root cause

Two independent issues in `index.html` `onMove`:

1. **Diagonal tilt was not capped.** `rx` and `ry` were each clamped to `maxTilt` (14°), so a pointer exactly at a corner requested 14° on both axes. The rotation applied to the card plane is the vector length, ≈19.8° (√2 × 14°). Under `--perspective: 800px` this pushed the near corner ~72–79px toward the viewer and magnified it to ~1.10–1.11×, while edge midpoints stayed at ~14° and ~1.04×. Corners therefore looked disproportionately stretched.
2. **Pointer coordinates were measured against the transformed element.** `onMove` used `rotator.getBoundingClientRect()`, whose box grows and shifts as the card tilts. At a corner the measured card became ~302×410 instead of 280×391, compressing the normalized pointer position (e.g. px 94.6 / py 5.2 at the top-right instead of ~100 / 0). The compression was asymmetric, so the old corners did not even reach a consistent angle: 17.7°–19.6° depending on which corner.

## Change

`index.html`:

- measure the pointer against the untransformed `.card` rect;
- build the tilt vector `(tx, ty)` and, when its length exceeds `maxTilt`, scale it back to exactly `maxTilt` (`Math.hypot`), so diagonal targets rotate the card plane by at most 14° instead of 19.8°.

Side midpoints are unchanged in intent (and now reach the full 14° instead of ~13.1°); only the corner lobes beyond the inscribed circle are reduced.

## Measured effect (headless Chrome, 280×391 card, 800px perspective)

Measured 2px inside each corner, 1.5s settle:

| Target | Before | After |
|---|---|---|
| top-left | rx 13.80°, ry −13.86° (19.56° combined) | rx 9.88°, ry −9.92° (14.00°) |
| top-right | rx −12.50°, ry −12.55° (17.71°) | rx −9.88°, ry −9.92° (14.00°) |
| bottom-left | rx 13.05°, ry 13.72° (18.94°) | rx 9.88°, ry 9.92° (14.00°) |
| bottom-right | rx −12.50°, ry 12.58° (17.73°) | rx −9.88°, ry 9.92° (14.00°) |
| right-edge midpoint | rx −13.06°, ry −0.64° (13.08°) | rx −13.80°, ry 0° (13.80°) |
| near-corner perspective scale | 1.099–1.109× | 1.077× |
| projected top-edge slope at top-left | 17.9px | 12.6px |

## Verification

- Inline script extracted and checked with `node --check`: pass.
- Headless Chrome pointer simulation at all four corners and both inspected edges; `--rx`/`--ry`/`--px`/`--py` read from computed style: as tabled.
- No page errors or console errors; `prefers-reduced-motion: reduce` keeps `rx`/`ry` at 0.
- Before/after crops of top-left, bottom-right, and right-edge-midpoint captured and visually compared: corners are visibly less stretched, edge tilt is essentially unchanged, no clipping or artifacts.

Limits: verification is headless static geometry, not a live interactive session; final judgement of hand-feel belongs to the Principal.

## Review aids

Screenshots (temporary): `/tmp/holo-test/before-*.png`, `/tmp/holo-test/after-*.png`.

## Status

Uncommitted; awaiting Principal visual confirmation before the commit checkpoint.

## Scope correction (2026-10-19)

The Principal later clarified that the original "四角形变过头" report referred to the 汇总版 (all-in-one), not this classic page. This fix is therefore not the requested target; it remains valid for the classic page. The 汇总版 fix and measurements are recorded in `.agnir/evidence/2026-10-19-all-in-one-corner-clamp.md`.
