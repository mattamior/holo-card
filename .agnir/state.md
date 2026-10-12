# Current State — holo-card (all-in-one)

Updated: 2026-10-12 (Asia/Shanghai) — real无框/细框 via frame matte + win insets (not just .card__rim)

## Project
Branch `feature/all-in-one`; Pages: https://mattamior.github.io/holo-card/all-in-one/

## Shipped (this checkpoint)
1. **真·无框 / 细框（修错靶）：** 厚奶油/金边来自 `.layer--frame` 衬底（`--win-l/t/w/h` 留白 ~4%）+ `.win::after` 3px 环，不是 `.card__rim` 高光。
   - **L1–4 (`.card.no-rim`)**：`--win-*` ≈ 1% 贴边；`--frame` / `.layer--frame` 改为深色 `#141018`（吞掉香槟渐变）；隐藏 `.win::after` 与 frame 纹理；继续隐藏 `.card__rim` + `.layer--edge`。
   - **L5 (`data-lv="5"` 无 `.no-rim`)**：`--win-l: .015`（左右合计 ~3% 奶油衬底）；`.win::after` 收为 1px；保留细 rim。
2. **LEVEL_INFO 文案**与实机一致（真无边框 / 细边框约 1.5% 衬底）。
3. **仍有效：** 应龙 L3 未挖空躯体；L5 镭射；每卡独立等级。

## Verified (local headless)
- L1 yinglong：`no-rim`，side matte ~1.0%，frame `rgb(20,16,24)`，`win::after` display none；像素无奶油带。
- L5 yinglong：side matte ~1.5% 奶油渐变，`win::after` 1px；明显细于旧 4% 厚框。
- 混合列表：yinglong@3 无框；dragon@5 细框。
- Evidence: `.agnir/evidence/yinglong-l1-norim-matte-2026-10-12.png`, `yinglong-l5-thin-matte-2026-10-12.png`, `mixed-l3-norim-l5-thin-2026-10-12.png`.
