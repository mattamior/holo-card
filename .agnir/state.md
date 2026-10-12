# Current State — holo-card (all-in-one)

Updated: 2026-10-12 (Asia/Shanghai) — tighter corner radius + footer 卡牌号/出处 / pill / 星级

## Project
Branch `feature/all-in-one`; Pages: https://mattamior.github.io/holo-card/all-in-one/

## Shipped (this checkpoint)
1. **Corner radius:** `--card-radius` `5%/3.4%` → `3%/2%` (~3% of width, HoK-tighter rounded rect). `.layer--frame` `clip-path: inset(0 round var(--card-radius))` stays in sync. No-rim top win/char radii use `0.03` / `0.02` minus inset (no square poke).
2. **Footer (Principal red labels):** Left **卡牌号+出处** — Yinglong `YL-001 · 山海经·大荒东经`; dragon/fox/stardust/lion use `DR-001·冰棱吐息` / `FX-002·流星焰` / `SF-003·流星雨` / `LN-004·王者咆哮`. Center **empty pill**. Right **星级** = `data-lv` 1–5 ★ via CSS `::before` (not「等缀」). Removed literal `NO. 出处`.
3. WebGL `js/textures.js` foot strings aligned (id · effect name / stars).

## Verified (local CDP / puppeteer-core)
- L1 yinglong: `no-rim`, `--card-radius=3% / 2%`, clip sync, footId=`YL-001 · 山海经·大荒东经`, stars=`★`. Evidence: `.agnir/evidence/yinglong-l1-radius-foot-2026-10-12.png`
- L5 yinglong: rim on, same radius/clip, footId same, stars=`★★★★★`. Evidence: `.agnir/evidence/yinglong-l5-radius-foot-2026-10-12.png`
