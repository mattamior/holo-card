# Current State — holo-card (all-in-one)

Updated: 2026-10-12 (Asia/Shanghai) — 其它卡 L3/L4 对齐应龙标准

## Project
Web holographic trading-card effects (zero-deps CSS + optional WebGL). Canonical work lives on branch `feature/all-in-one`; Pages preview: https://mattamior.github.io/holo-card/all-in-one/

## Shipped recently
- **Align:** 霜晶龙/焰尾狐/星尘狐/金曜狮王 L3=主体动、L4=环境动（极光雪/夕阳/星云/日芒等从 anim 迁到 rarity）；应龙守卫与 lore 未动。审计：`/workspace/holo-l3l4-audit.md`。
- **Fix:** 应龙插画窗 4:3 铺满（prep 裁 16:9→4:3 + cover；L3 非 4:3 序列拒播）。证据：`.agnir/evidence/yinglong-4x3-fill-2026-10-12.png`。
- **应龙 (Yinglong)** legendary card: art + copy grounded in 《山海经·大荒东经》/《大荒北经》 (no invented lore).
- Illustration window is **landscape 4:3**; `art.jpg` is **960×720** (`landscape-4x3`) with `object-fit: cover` — fills window, no letterbox.
- **No breakout** — parallax / foil / motion stay inside the frame.
- Foil reflection is **tilt/angle-driven strip sweep** (fixed light), not a mouse-following spot.
- Level model: L3 = subject motion via sequence frames; L4 = environment FX; L5 stacks foil + rare light.
- Yinglong L3 **guarded**: current `anim/` frames are 3:4 region_warp — runtime keeps static 4:3 `art.jpg` until landscape 4:3 sequences arrive (no CSS warp overlays).
- Description panel filled with multi-sentence classic excerpts (user asked to reduce empty whitespace by adding text, not shrinking the panel further).

## Repo layout notes
- Source of truth for published all-in-one: this git repo (`mattamior/holo-card`, branch `feature/all-in-one`).
- `/workspace/aio` is a build/worktree helper only — not a separate Agnir Project.
