# Current State — holo-card (all-in-one)

Updated: 2026-10-12 (Asia/Shanghai) — L5 face foil restored + rim laser retune

## Project
Branch `feature/all-in-one`; Pages: https://mattamior.github.io/holo-card/all-in-one/

## Shipped (this checkpoint)
1. **Face foil restored (Principal「卡面的镭射光怎么还没加上去」):** `.foil--art` was present but gated visually — `mix-blend-mode: color` on cream/gold Yinglong art read as almost invisible. Not `.no-foil` / not `display:none`. Switched rainbow art to `color-dodge` + dimmed brightness/contrast/saturate; boosted `::after` overlay rainbow sweep; L5 ensures `display:block` + higher tilt opacity. Foil stays inside `.win` clip.
2. **Rim laser retune (「边框镭射再调整」):** L5 `.foil--frame` + `--mask-rim-l5` — blend `hard-light`→`overlay` (less white-only wash on cream), higher `--far`/band, saturate/contrast up, opacity floor raised. Thin cream ~1.25% unchanged.
3. **Baseline intact:** No cream on `.card`/`.card__rotator`, no `scale(1.02)` frame, Yinglong `--bleed: 10px`; footer `NO.n` / centered 出处 / ★; L1–4 no-rim.

## Verified
- Diag: L5 yinglong `noFoil=false`; `.foil--art` display block, color-dodge, opacity~0.9 under tilt; `.foil--frame` display block, overlay.
- Evidence: `.agnir/evidence/yinglong-l5-face-rim-laser-tilt-a.png`, `yinglong-l5-face-rim-laser-tilt-b.png` — visible face rainbow + rim rainbow under tilt.
