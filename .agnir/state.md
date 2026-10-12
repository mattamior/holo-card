# Current State — holo-card (all-in-one)

Updated: 2026-10-12 (Asia/Shanghai) — 参考视频竖版布局：列表 + 弹窗（左卡右等级）

## Project
Web holographic trading-card effects (zero-deps CSS + optional WebGL). Branch `feature/all-in-one`; Pages: https://mattamior.github.io/holo-card/all-in-one/

## Shipped recently
- **UX + proportions:** Portrait **2:3** cards (not TCG 63:88 / not landscape 4:3 art). List tiles match ref (art + name overlay + desc band + rarity footer). Modal = blurred list behind, 「← 卡牌」header, ‹ › cycle, left holo + right levels 5→1. Art window ~62% height, `object-fit: cover` upper focus.
- Yinglong L3 option C layers still in portrait window; region_warp quarantined; L3 sequence guard now expects portrait frames.
- Pack / deep link `#lv=&focus=` kept.

## Screenshots
- `screenshots/ref-layout-list.png`
- `screenshots/ref-layout-modal-yinglong-l3.png`
