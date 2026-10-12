# Current State — holo-card (all-in-one)

Updated: 2026-10-12 (Asia/Shanghai) — no-rim top radius clip + HoK L5 cream thin frame

## Project
Branch `feature/all-in-one`; Pages: https://mattamior.github.io/holo-card/all-in-one/

## Shipped (this checkpoint)
1. **无边版顶角裁切（Principal 红框）：** `.layer--frame` 增加 `clip-path: inset(0 round var(--card-radius))`（preserve-3d 下单靠 overflow+radius 不可靠）。`.card.no-rim .win` / `.layer--char` 顶角设为卡片椭圆半径减 inset，底边贴描述带保持直角。
2. **L5 细框对齐王者：** 整卡均匀奶油外框 `--win-l/.025`（约 2.5% 边宽），`--frame` 米白渐变（非脏香槟厚块）；`layer--frame::after` 内缘深线；插画窗/描述区内半径略紧；脚注色落入底框奶油带。
3. **仍有效：** L1–4 无奶油衬底 + 无窗环；应龙 L3 未挖空；每卡独立等级；L5 镭射。

## Verified (local headless)
- L1 yinglong：`no-rim`，winTL ≈ 23×22px 椭圆；顶左亮像素 x 随 y 递减（圆角曲线，无直角戳出）。Evidence: `.agnir/evidence/yinglong-l1-norim-radius-2026-10-12.jpg`.
- L5 yinglong：左奶油带宽 ≈ 2.5% 卡宽；frame 米白渐变；内缘深线 + 底脚在框带内。Evidence: `.agnir/evidence/yinglong-l5-cream-thin-2026-10-12.jpg`.
