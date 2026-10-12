# Current State — holo-card (all-in-one)

Updated: 2026-10-12 (Asia/Shanghai) — unbreak a30dee8 cream-ghost / broken tilt silhouette

## Project
Branch `feature/all-in-one`; Pages: https://mattamior.github.io/holo-card/all-in-one/

## Shipped (this checkpoint)
1. **Unbreak a30dee8 tilt regression:** Principal「你改崩了」— cream `#ebe9e2` painted on `.card` / `.card__rotator`, `.layer--frame { scale(1.02) }`, win 4px cream overlap, and cream `--art-bg`/`--win-fill` caused asymmetrical cream ghost / double-frame under preserve-3d tilt.
2. **Dial-back (kept footer):** Reverted card/rotator cream fills; removed frame `scale(1.02)`; win flush to matte (no cream box-shadow/overlap); restore dark `--art-bg: #2a2e36` (no cream win-fill). Kept opaque cream **only** inside clipped `.layer--frame` matte + lighter inner-line + hard-light rim laser.
3. **Black-seam without ghost:** Yinglong `--bleed: 10px` + shallower `--z-bg/-28` `--z-mid/-12` + art/layers ~103% overscale (was 106%/28px bleed). L5 thin cream ~1.25% + rim laser; L1–4 no-rim; corners ~3%/2%.
4. **Footer unchanged (Principal markup):** Left `NO.n`; center 出处; right ★=`data-lv`; no pill.

## Verified
- CSS: card/rotator bg transparent; frame transform identity; win dark fill; foot `NO.1 山海经·大荒东经` + stars.
- Evidence: `.agnir/evidence/yinglong-l5-unbreak-left.png`, `yinglong-l5-unbreak-right.png` — no cream ghost slab; no black matte-join seam.
