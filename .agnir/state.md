# Current State — holo-card (all-in-one)

Updated: 2026-10-12 (Asia/Shanghai) — 列表 + 弹窗全息预览（对齐山海经图鉴）

## Project
Web holographic trading-card effects (zero-deps CSS + optional WebGL). Canonical work lives on branch `feature/all-in-one`; Pages preview: https://mattamior.github.io/holo-card/all-in-one/

## Shipped recently
- **UX:** Default **card list grid**; click opens a **modal overlay** (list stays dimmed underneath) with the interactive holo + level/FX panel. Close via × / backdrop / Esc. Deep link `#lv=N&focus=slug` opens the modal on load. Pack opener on list bar; shell parks off-page until modal mounts it (FX DOM preserved).
- **Yinglong L3 option C:** layered PNGs + CSS motion at L3+; region_warp quarantined.
- Breakout off; foil = tilt strip sweep; L3 subject / L4 environment split.

## Repo layout notes
- Source of truth: `mattamior/holo-card` branch `feature/all-in-one`.
