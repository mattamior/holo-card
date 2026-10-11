# Holo Card 全息闪卡

零依赖的网页全息闪卡特效：鼠标悬停或手指拖动时卡片 3D 倾斜，高光与镭射随指针流动，移开后平滑回正。

**在线预览（版本总览）：** https://mattamior.github.io/holo-card/ · **本分支：** https://mattamior.github.io/holo-card/all-in-one/

> **当前分支：`feature/all-in-one`** —— 汇总版：把其他分支的全部特效合到一个页面里，带中文特效控制面板，并可一键切到 WebGL 渲染（四张卡都是真 3D 多层视差 + 角色破框），还能「开包」抽卡。基于 `main` 切出，其他分支未改动。

![汇总版](screenshots/all-in-one-desktop-chromium.png)

## feature/all-in-one：汇总版（全部特效）

一页里四张卡，每张都同时叠加：**箔面**（彩虹镭射 / 闪光星点 / 金属拉丝三选一）+ **局部 mask** + **蚀刻压纹** + **边缘光与纸张厚度** + **多层视差**（两张角色破框）+ **鼠标 / 触摸倾斜** + **陀螺仪体感**。

| 卡 | 箔面 | 局部 mask | 视差 |
|---|---|---|---|
| ① 霜晶龙 | 彩虹镭射 | 只闪插画（极光夜空） | 龙头破框 |
| ② 焰尾狐 | 闪光星点 | 只闪插画（晚霞） | 狐耳破框 |
| ③ 星尘狐 | 闪光星点 | 只闪边框（羽化环形遮罩） | 星辰徽记浮在窗口前 |
| ④ 金曜狮王 | 金属拉丝 | 反闪（卡框 + 文字区，插画哑光） | 烈日徽记浮在窗口前 |

**整合方式**（手工整合，不是 merge）
- 以 `feature/parallax` 的 3D 结构为骨架：`.card__rotator` 是唯一的 `preserve-3d` 容器，投影 / 纸张厚度 / 卡框 / 文字 / 角色 / 粒子都是它的直接子平面。
- `feature/foil-mask` 的箔层、蚀刻、高光、边缘光全部放进**卡框层平面内部**混合（mask / blend / filter 只压平卡框层自己，不影响层间景深）；文字层浮在所有光层之上，所以文字永远清晰。纸张厚度移到卡片背后单独一层。
- `feature/gyro` 的体感逻辑改成同时服务两种模式：CSS 模式驱动视口里的卡，WebGL 模式驱动 3D 卡（指针优先，松手后回到体感姿态）。
- `feature/webgl` 的 `js/holo.js`、`js/textures.js`、`vendor/three-holo.min.js` 带过来（three 子集未重新打包），`holo.js` 加了嵌入模式：画布按自身尺寸渲染、透明背景、`setActive` / `setGyro` / `setEffects` 接口，并扩展成四张卡的多层结构（见下）。

**特效控制面板**（标题下方，跟着页面排版，不浮在卡片上；手机上默认收起成一行摘要）
- 模式：CSS 模式 / WebGL 模式。WebGL 只在第一次切过去时才下载 three（gzip 约 147 KB）；没有 WebGL2 时弹出提示并留在 CSS 模式。地址加 `#webgl` 可直接打开 WebGL 模式。
- 开关：镭射、压纹、边缘光（含纸张厚度）、视差破框（关掉后各层贴回卡面、角色收回窗口）、高光、体感。WebGL 模式下同样生效（镭射 = 箔面 / 亮片 / 薄膜干涉，压纹 = 法线贴图，边缘光 = 菲涅尔卡缘，高光 = 覆膜反光 + Bloom）；视差破框在 WebGL 模式下同样可用（见下）。
- 开关状态记在 `localStorage`，「全部开启」一键恢复。体感需要用户点按钮授权，不记忆。

**克制与无硬边**
- 叠加后整体再收一档：彩虹最大不透明度 0.75、高光 0.45、蚀刻 0.12→0.42、边缘光 0.1→0.5。
- 边框环遮罩改成透明底 + 高斯羽化的 SVG 环（mask 按 alpha 取值，旧写法的黑色底其实不起遮罩作用），环的内沿在文字面板和插画窗口外就衰减完，箔光不会被面板直边截断。
- 自查方法同前：同一姿态下开 / 关光层（镭射、高光、边缘光）做差值图，排除关光图里本来就有的几何边缘后找长直线；Chromium / Firefox / WebKit × 4 张卡 × 9 个姿态。剩下的命中都在卡片轮廓上（边缘光本来就沿卡缘），或是文字面板挡住卡框光的位置，幅度很小。

**性能**
- 每张卡各自一个弹簧循环，只在弹簧还在动时运行：静止时没有任何卡在写样式，悬停时只有当前那张在更新。
- 卡片滚出视口时粒子动画暂停，体感也只驱动视口里的卡；切到 WebGL 时 CSS 卡片整个隐藏，切回 CSS 时 WebGL 停止渲染；WebGL 画布滚出视口或页面隐藏时同样停止。
- 尊重 `prefers-reduced-motion`：不倾斜、粒子不动、体感不可用，只保留光泽变化。

### WebGL 模式：多层视差 + 破框

![WebGL 破框倾斜](screenshots/all-in-one-webgl-breakout.png)

- 四张卡（霜晶龙、焰尾狐、星尘狐、金曜狮王）全部用 WebGL 渲染，和 CSS 模式一一对应。
- **插画窗口用模板缓冲（stencil）开洞**：卡面写 1，窗口遮罩写 2；远景、中景两个平面放在卡面**后方**（z = −0.55 / −0.25），只在 stencil = 2 的地方画，所以倾斜时能透过窗口看到真实的纵深位移，背面看不到任何漏光。
- **角色是浮在卡面前方的独立平面**（z = +0.32），透明 + 羽化边缘，头 / 耳朵超出卡框顶部；粒子层更靠前（z = +0.6）。各层按相机距离做缩放补偿（和 CSS 的 translateZ + scale 同一套算法），正面看时与平面构图完全重合。
- **箔面只作用在该闪的层**：霜晶龙的彩虹镭射在远景天空层、焰尾狐的亮片在晚霞层；角色、文字面板不闪。星尘狐只闪边框，金曜狮王是卡框 + 文字区反闪。
- 角色、远景、中景贴图都是把页面里现成的 SVG 光栅化到 canvas（没有新增图片资源），边缘用 smoothstep 渐变羽化，角色底部渐隐融进窗口。
- 「视差破框」开关在 WebGL 下可用：关掉后各层压回卡面（深度 ×0.02），角色用 stencil 裁回窗口内。
- 体感、拖动旋转、翻面、性能策略（静止停渲染、滚出视口停渲染）都保留；贴图按卡懒加载，切卡时才光栅化。

### 开包（抽卡动画）

![开包 · 最稀有演出](screenshots/all-in-one-pack-legend.png)

控制面板上的「✦ 开包（5 张）」按钮，CSS / WebGL 两种模式都能用；全屏覆盖层，结束后回到卡牌页（Esc 或「返回」随时退出）。

**怎么玩**
1. **撕包**：手指 / 鼠标沿卡包顶部的光点虚线从一侧划到另一侧（划过 ≥ 70% 宽度），会留下发光轨迹，包头沿锯齿撕口裂成两半飞走。不方便拖动时点「撕开卡包」按钮（键盘 Enter / 空格同样可以）。
2. **出卡**：5 张卡从包里滑出叠成一摞。
3. **翻牌**：点击或左右滑动翻开最上面一张（← → / Enter 也可以），再点一下让它飞走看下一张；「全部翻开」直接跳到结果页。
4. **结果页**：5 张卡一览，点任一张放大，用原有的倾斜 / 体感交互（WebGL 模式下稀有 / 传说卡用 WebGL 卡放大，普通卡用 CSS 卡）。「再开一包」/「返回卡牌页」。

**稀有度与概率**

| 稀有度 | 卡池 | 第 1–4 张 | 第 5 张（保底位） | 演出 |
|---|---|---|---|---|
| 普通 C | 6 张简化卡（苔团团、泡泡鱼、石壳虫、风铃雀、菇菇灯、萤尾虫），无箔面 | 78% | — | 普通翻面 |
| 稀有 R | 霜晶龙、星尘狐 | 18% | 80% | 翻面 + 柔光光柱 |
| 传说 UR | 焰尾狐、金曜狮王 | 4% | 20% | 压暗 → 震动 → 光柱 + 粒子迸发 + 辉光 → 卡片放大落定 |

每包至少 1 张稀有；每包出传说的概率约 32%。同一包内不重复，某档抽空时降一档。翻牌顺序按稀有度从低到高，传说永远压轴。

**测试种子**（地址栏加 `#pack=…`，WebGL 模式写成 `#webgl&pack=…`）
- `seed-legend`：必出传说焰尾狐（3 普通 + 霜晶龙 + 焰尾狐）
- `seed-legend-lion`：必出传说金曜狮王
- `seed-rare`：4 普通 + 1 稀有
- `seed-common`：5 张普通
- `seed-all`：1 普通 + 2 稀有 + 2 传说
- 其他任意字符串：按概率抽，但同一种子结果固定，可复现。

**实现**
- 卡包是程序化绘制的（CSS 渐变 + 箔面 + 锯齿压边），无版权素材；跟随指针轻微倾斜、箔光流动。
- 撕包：两半各用 `clip-path` 裁出，共享同一条锯齿撕口折线；动画用 WAAPI，没有引入 GSAP。
- 粒子 / 撕包轨迹：Canvas 2D 预渲染径向渐变光点（`lighter` 叠加），只在有粒子时跑 rAF；手机上粒子数 ×0.55。
- **无硬边**：光柱是椭圆径向渐变，放射光芒是平滑正弦轮廓的 conic 渐变再乘径向遮罩，辉光 / 轨迹都是径向渐变光点，任何一层都没有直线边缘。
- 支持的设备上传说出现时 `navigator.vibrate` 震动。
- **音效**：WebAudio 程序化合成（撕包、翻牌、稀有和弦、传说上扬 + 钟声），默认关闭，覆盖层左上角「音效」开关切换并记忆。
- `prefers-reduced-motion`：只做淡入淡出，没有震动、粒子迸发、放射光芒。
- 卡片克隆时 SVG 的 id 全部改成唯一值，避免和页面里的卡冲突。

![开包 · 手机 360px](screenshots/all-in-one-pack-mobile-360.png)

**取舍与已知问题**
- WebGL 下的粒子是静态光点（CSS 版会闪烁漂浮）。
- 普通卡只有 CSS 简化版，WebGL 模式放大普通卡时也用 CSS 卡。
- 角色是平面「立牌」：倾斜角度本身有上限（和 CSS 版一致），在这个范围内看不出薄片感，但它确实是一张平面，不是 3D 模型。
- 第一次切到 WebGL 时要光栅化 SVG 贴图，低端手机上切卡会有不到半秒的加载。
- 开包里的 3D 翻面用「两段 90° + 中途换面」实现，不依赖 `backface-visibility`（各浏览器表现更一致）。

**本地预览**：WebGL 模式用的是 ES 模块，需要静态服务器（例如 `python3 -m http.server` 后打开 http://localhost:8000/ ）；CSS 模式直接双击 `index.html` 也能用。

**自查截图**：`screenshots/all-in-one-*.png`（桌面三引擎、各角悬停、开关对比、体感、WebGL、WebGL 破框倾斜、360px 手机、无 WebGL2 降级；开包：撕包中 `pack-tearing`、堆叠 `pack-stack`、传说演出 `pack-legend`、结果页 `pack-result`、手机 `pack-mobile-360`）。

---

以下是各分支通用的说明。

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

## 致谢
思路参考 [simeydotme/pokemon-cards-css](https://github.com/simeydotme/pokemon-cards-css)。卡面均为 CSS 与内联 SVG 绘制，无外部图片素材。
