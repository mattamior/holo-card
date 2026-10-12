# Current State — holo-card (all-in-one)

Updated: 2026-10-12 (Asia/Shanghai) — L3 body punch reverted; rim hardened per-card

## Project
Branch `feature/all-in-one`; Pages: https://mattamior.github.io/holo-card/all-in-one/

## Shipped (this checkpoint)
1. **Yinglong L3 anti-ghost (punch reverted):** restored unpunched `assets/yinglong/layers/00_body.png` from `6f5c863` (zero transparent holes). Semi-transparent mane/wingtip overlays can no longer reveal dark voids. Softened mane/wing CSS translate; body idle breathe kept small. Mutual exclusion unchanged: when `.yl-layers` shown, `art.jpg` / sheet stay `visibility:hidden` + opacity 0.
2. **Rim L1–4 / L5:** `.card.no-rim` hides `.card__rim` + `.layer--edge` (display/visibility/opacity). L5 (`data-lv="5"` without `.no-rim`) forces thin rim visible; idle rim opacity slightly raised so the half-thin edge reads at rest. Classes on `.card` only — list + modal independent per card.
3. **Prior still in force:** L5 rainbow foil; per-card levels in `holo-card:all-in-one:card-levels`; no region_warp.

## Verified (local headless)
- Body alpha holes = 0; static stack head/neck/wing samples opaque cream (no dark punch voids).
- `#lv=3&focus=yinglong`: `no-rim`, rim/edge `display:none`, art hidden, layers on.
- Mixed: yinglong@3 rim none; dragon@5 rim `display:block` opacity ~0.55; `body` not `no-rim`.
- Evidence: `.agnir/evidence/yinglong-l3-*-2026-10-12.png`, `dragon-l5-*-2026-10-12.png`, `yinglong-l3-stack-unpunched-2026-10-12.png`.
