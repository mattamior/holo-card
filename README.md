# Holo Card 全息闪卡

零依赖的网页全息闪卡特效：鼠标悬停或手指拖动时卡片 3D 倾斜，高光与镭射随指针流动，移开后平滑回正。

**在线预览（版本总览）：** https://mattamior.github.io/holo-card/

![预览](screenshots/shot-hover.png)

## 多版本在线预览
每个升级版本都保留为一个独立分支，部署后对应线上一个路径。各版本页右上角有「⇄ 版本」悬浮按钮，可以随时切换（手机上收成一个小圆钮）。

| 路径 | 版本 | 分支 |
|---|---|---|
| [`/`](https://mattamior.github.io/holo-card/) | 版本总览首页 | 由 `main` 上的构建脚本生成 |
| [`/classic/`](https://mattamior.github.io/holo-card/classic/) | 经典 CSS 版（本分支） | [`main`](https://github.com/mattamior/holo-card/tree/main) |
| [`/gyro/`](https://mattamior.github.io/holo-card/gyro/) | 陀螺仪体感 | [`feature/gyro`](https://github.com/mattamior/holo-card/tree/feature/gyro) |
| [`/foil-mask/`](https://mattamior.github.io/holo-card/foil-mask/) | 局部镭射 + 蚀刻压纹 | [`feature/foil-mask`](https://github.com/mattamior/holo-card/tree/feature/foil-mask) |
| [`/parallax/`](https://mattamior.github.io/holo-card/parallax/) | 多层视差 · 角色破框 | [`feature/parallax`](https://github.com/mattamior/holo-card/tree/feature/parallax) |
| [`/webgl/`](https://mattamior.github.io/holo-card/webgl/) | WebGL 旗舰版 | [`feature/webgl`](https://github.com/mattamior/holo-card/tree/feature/webgl) |

### 自动部署
Pages 的发布来源是 GitHub Actions（workflow：[`.github/workflows/pages.yml`](.github/workflows/pages.yml)）。

- **改 `main`**：push 后直接在 `main` 上构建并部署。
- **改任意 `feature/*` 分支**：push 后，该分支上的同一份 workflow 会在 `main` 上触发一次部署（`workflow_dispatch`），由 `main` 统一组装。所以每个 feature 分支上也都放了这份 workflow 文件（只有这一个文件，效果代码没动）；从 `main` 或现有 feature 分支切出的新分支会自动带上它。
- **新增分支**：推送一个新的 `feature/<名字>` 分支（根目录有 `index.html`），下次部署会自动出现在 `/<名字>/` 和首页上；想要自定义标题、说明和缩略图，在 [`.github/pages/versions.json`](.github/pages/versions.json) 里登记。
- **手动重新部署**：Actions 页面选「Pages 多版本预览站」→ Run workflow（分支选 `main`），或 `gh workflow run pages.yml --ref main`。

组装脚本 [`.github/pages/build.mjs`](.github/pages/build.mjs) 用 `git archive` 导出每个分支的静态文件（不拷 `.github/`、`qa/`、`node_modules` 等），生成首页，并在部署时给每个版本页注入版本切换导航。分支源码本身不会被修改。本地预览整站：`node .github/pages/build.mjs _site`，然后用任意静态服务器打开 `_site`。

## 三种效果
1. **彩虹镭射**：彩虹条纹 + 扫描线，只出现在插画窗口，四边羽化。
2. **闪光星点**：柔边亮片与四芒星，只在指针附近闪烁。
3. **金属拉丝**：纯 CSS 拉丝纹理 + 随指针滑动的金色反光带。

## 原理
指针位置经弹簧缓动后写入 CSS 变量，CSS 用这些变量驱动 `rotateX/Y` 倾斜、`radial-gradient` 高光，以及 `repeating-linear-gradient` + `color-dodge` 混合的镭射层。支持触摸（Pointer Events），并尊重 `prefers-reduced-motion`。

## 使用
直接用浏览器打开 `index.html` 即可。尺寸、透视、色板、光泽强度等都是文件开头的 CSS 变量；倾斜角度与弹簧手感在脚本的 `CONFIG` 里调整。

## Agnir Project Instructions

本项目用 Agnir 维护跨会话的项目连续性。激活与项目操作说明见 [AGNIR.md](AGNIR.md)。

此节仅作为旧版激活路径的兼容定位入口，不重复 Agnir 的完整流程。

## 致谢
思路参考 [simeydotme/pokemon-cards-css](https://github.com/simeydotme/pokemon-cards-css)。卡面均为 CSS 与内联 SVG 绘制，无外部图片素材。
