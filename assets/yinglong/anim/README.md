# 应龙 L3 序列帧约定（美术投放）

同步：`python3 /workspace/aio/sync-yinglong-anim.py`（`--watch` 监视到货）

拷贝目标：
- `holo-card` → `assets/yinglong/anim/`
- `shanhaijing-gallery` → `assets/creatures/yinglong/anim/`

## 方式 A：逐帧（推荐）
```
f01.jpg … fNN.jpg
meta.json
```

`meta.json` 两种写法均可：

```json
{ "frames": ["f01.jpg","f02.jpg","f03.jpg"], "fps": 8, "size": [768, 1024] }
```

```json
{ "frames": 12, "fps": 8, "size": [960, 540] }
```

无 meta 时：从 `f01.jpg` 起连续探测，默认 8fps。

## 方式 B：Sprite sheet
需要 `sheet.webp|png|jpg` + meta 含 `frames`（数量）、`cols`、`rows`、`fps`。

## 产品侧
- **holo L3 (`anim`)**：序列帧循环；关掉扭曲叠层假动效；无帧则静帧 `art.jpg`。
- **holo L4 (`rarity`)**：云雾/金尘/神性光带等环境层。
- **gallery 详情**：同一套 `anim` 可播放。
