# Current State — holo-card (all-in-one)

Updated: 2026-10-12 (Asia/Shanghai) — 列表→单卡预览 UX（对齐山海经图鉴）

## Project
Web holographic trading-card effects (zero-deps CSS + optional WebGL). Canonical work lives on branch `feature/all-in-one`; Pages preview: https://mattamior.github.io/holo-card/all-in-one/

## Shipped recently
- **UX:** Default load is a cinematic **card list grid** (static thumbs); click opens **single-card holo detail** with level/FX sidebar. Back / Esc return to list. Deep link `#lv=N&focus=slug` preserved. Pack opener available on list bar; pack flow unchanged.
- **Yinglong L3 option C:** `assets/yinglong/layers/` stacked PNGs + CSS mane/wing/glow motion at L3+ (`body.yl-layers-ready`); L1–L2 keep static `art.jpg`. region_warp packs stay quarantined / anim empty.
- **Align:** 霜晶龙/焰尾狐/星尘狐/金曜狮王 L3=主体动、L4=环境动. Breakout off; foil = tilt strip sweep.

## Repo layout notes
- Source of truth for published all-in-one: this git repo (`mattamior/holo-card`, branch `feature/all-in-one`).
- `/workspace/aio` is a build/worktree helper only — not a separate Agnir Project.
