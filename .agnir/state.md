# Current State — holo-card (all-in-one)

Updated: 2026-10-12 (Asia/Shanghai) — tilt black-seam fix + footer NO.n / 出处 / ★

## Project
Branch `feature/all-in-one`; Pages: https://mattamior.github.io/holo-card/all-in-one/

## Shipped (this checkpoint)
1. **Tilt black seam (L5):** Root cause = preserve-3d foreshortening holes past `.layer--frame` paint (page/card showed as black between art and cream rim). Fix stack:
   - Yinglong `--bleed: 28px` + art/layers ~106% overscale; shallower `--z-bg/-28` / `--z-mid/-12`
   - L5 cream underlap: `.card` + `.card__rotator` + frame/win fills `#ebe9e2`; win overlaps matte ~4px
   - L5 `.layer--frame { transform: scale(1.02) }` so foreshortened edge still covers
   - Rim laser `soft-light` (was hard-light crush→black); keep thin cream ~1.25% + laser; L1–4 untouched
2. **Footer (Principal markup):** Left `NO.1`…`NO.5` (list order); center 出处 only (e.g. `山海经·大荒东经`); right ★ = `data-lv`; **removed** empty `.card__foot-pill`. Grid `1fr auto 1fr`.
3. WebGL `js/textures.js` foot draw aligned to NO / src / stars.

## Verified
- Geometry cover L/R under ±11°; seam metric max_gap=0 (user bug attachment max_gap=9).
- Evidence: `.agnir/evidence/yinglong-l5-tilt-no-black-edge-left.png`, `...-right.png`, `yinglong-l5-footer-no-pill.png`
