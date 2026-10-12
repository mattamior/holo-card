# Current State — holo-card (all-in-one)

Updated: 2026-10-12 (Asia/Shanghai) — full-card face laser (not win-clipped rainbow)

## Project
Branch `feature/all-in-one`; Pages: https://mattamior.github.io/holo-card/all-in-one/

## Shipped (this checkpoint)
1. **Full-card face foil (Principal「整个无边卡的镭射光」):** Moved `.foil--art` out of `.win__bg` into `.layer--foil` (`--z-foil: 14`, clipped to `--card-radius`) covering art + desc + foot. No longer trapped in illustration window.
2. **Laser look, not rainbow sticker:** Killed e96ae6e `color-dodge` + opaque rainbow band. Face foil parent uses `mix-blend-mode: normal` / `opacity: 1` so `::before` (screen specular sweep) and `::after` (soft-light low-sat metal iridescence) composite against the card. Soft pastel `--band: 9%` on shared `.foil` base for rim only.
3. **Rim laser unchanged in role:** L5 `.foil--frame` + `--mask-rim-l5` stays thin-cream-ring only; L1–4 `.no-rim` hides frame foil.
4. **Baseline intact:** No cream on `.card`/`.card__rotator`, no `scale(1.02)` frame, Yinglong `--bleed: 10px`; footer `NO.n` / centered 出处 / ★.

## Verified
- Diag: `.foil--art` parent `layer layer--foil`, `artInWin=false`, height > win; L5 rim `.foil--frame` display block; L4 no-rim + foil forced shows full-card layer.
- Foil on/off pixel delta: desc region brightens (~+12–18 RGB) under tilt sheen — continuous across face.
- Evidence: `.agnir/evidence/yinglong-fullcard-foil-l5-tilt.png`, `yinglong-fullcard-foil-l4-norim-tilt.png`, `yinglong-fullcard-foil-geom-diag.png`.
