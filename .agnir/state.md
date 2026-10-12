# Current State — holo-card (all-in-one)

Updated: 2026-10-12 (Asia/Shanghai)

## Project
Web holographic trading-card effects (zero-deps CSS + optional WebGL). Canonical work lives on branch `feature/all-in-one`; Pages preview: https://mattamior.github.io/holo-card/all-in-one/

## Shipped recently
- **应龙 (Yinglong)** legendary card: art + copy grounded in 《山海经·大荒东经》/《大荒北经》 (no invented lore).
- Illustration window uses **landscape 4:3** `object-fit: contain` (not forced vertical crop).
- **No breakout** — parallax / foil / motion stay inside the frame.
- Foil reflection is **tilt/angle-driven strip sweep** (fixed light), not a mouse-following spot.
- Level model: L3 = subject motion via sequence frames; L4 = environment FX; L5 stacks foil + rare light.
- Yinglong L3 currently plays art-expert **region_warp** 8-frame loop @10fps under `assets/.../yinglong/anim/` (identity-locked bake; not generative per-frame).
- Description panel filled with multi-sentence classic excerpts (user asked to reduce empty whitespace by adding text, not shrinking the panel further).

## Repo layout notes
- Source of truth for published all-in-one: this git repo (`mattamior/holo-card`, branch `feature/all-in-one`).
- `/workspace/aio` is a build/worktree helper only — not a separate Agnir Project.
