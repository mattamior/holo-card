# Current State — holo-card (all-in-one)

Updated: 2026-10-12 (Asia/Shanghai) — footer NO./等缀 + L5 rim half-again + rim laser

## Project
Branch `feature/all-in-one`; Pages: https://mattamior.github.io/holo-card/all-in-one/

## Shipped (this checkpoint)
1. **底栏（Principal 红标）：** 左 `NO. 出处`；右 `{id} 等缀 ★…`。应龙 `YL-001 等缀 ★★★`；其余四卡同左栏 + `00n/004 等缀 ★…`。未改 lore。
2. **L5 细框再细一半：** `--win-l/.0125`、`--win-t/.011`（约 1.25% 边宽，原 ~2.5%）。珍珠/银奶油金属渐变（区别无边深底 `#141018`）；内缘深线保留。
3. **L5 框带独立镭射：** `.foil--frame` 在 L5 强制显示并用 `--mask-rim-l5`∩条带 mask 限制在奶油环；`hard-light` 倾斜驱动；`.card.no-rim` / L1–4 `.no-foil` 隐藏。插画 `.foil--art` 不变。

## Verified (local CDP)
- L5 yinglong：left/right inset 1.25%，foot=`NO. 出处 YL-001 等缀 ★★★`，foil--frame `display:block` + hard-light。Evidence: `.agnir/evidence/yinglong-l5-foot-thin-rim-2026-10-12.png`, rim laser tilt `.agnir/evidence/yinglong-l5-rim-laser-tilt-2026-10-12.png`.
- L1 yinglong：`no-rim`，frameBg `#141018`，foil--frame `none`，同脚注文案。Evidence: `.agnir/evidence/yinglong-l1-norim-foot-2026-10-12.png`.
