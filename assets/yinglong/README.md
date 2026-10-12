# 应龙卡面素材

- `art.jpg` — 插画窗静帧 / 序列帧缺失时的降级图（**4:3 横版**，cover 铺满，无 letterbox）
- `char.png` — 破框角色层（汇总版应龙不破框，已隐藏）
- `source.jpg` / `prep.py` / `meta.json` — 裁切与核对
- `anim/` — **L3 动态画面**真序列帧或 sprite sheet（见 `anim/README.md`）

## L3 序列帧

投放目录（美术）：`/workspace/shanhaijing-gallery-assets/creatures/yinglong/anim/`

同步进本仓：

```bash
python3 /workspace/aio/sync-yinglong-anim.py
# 监视到货：python3 /workspace/aio/sync-yinglong-anim.py --watch
```

约定：`f01.jpg`…`fNN.jpg` 或 `sheet.webp` + `meta.json`（`frames`/`fps`/`cols`/`rows`/`size`）。

无序列帧时：L3 显示静帧 `art.jpg`，console 提示；**不用**扭曲叠层冒充动画。

## 换静帧

```bash
YINGLONG_SRC=/path/to/new.jpg python3 assets/yinglong/prep.py
```

预览：`#lv=3&focus=yinglong`（仅主体序列） / `#lv=4&focus=yinglong`（+ 环境） / `#lv=5&focus=yinglong`

## L3 option C — layered motion
Live path: `layers/` (00_body + mane/wingtips/eyeglow/light). CSS motion at L3+ only.
`anim/` stays empty / non-warp; rejected region_warp packs must not be re-enabled.

