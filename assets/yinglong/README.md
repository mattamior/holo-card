# 应龙卡面素材（可换图）

- `art.jpg` — 竖版窗口插画（63:88 裁切）
- `char.png` — 破框角色层（透明底）
- `source.jpg` — 当前锁定样张副本
- `meta.json` — 含 `source_hash`，便于核对是否最新

换图：覆盖 `source.jpg`（或设环境变量 `YINGLONG_SRC`）后运行：

```bash
YINGLONG_SRC=/path/to/new.jpg python3 assets/yinglong/prep.py
# 或仓库外：python3 /workspace/aio/yinglong-prep.py
```

预览：`yinglong.html` → `#lv=5&focus=yinglong`
