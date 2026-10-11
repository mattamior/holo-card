# vendor

- `three-holo.min.js`：three.js **r186**（MIT，见 `LICENSE-three.txt`）的摇树精简版，只包含本项目用到的类（WebGLRenderer、MeshPhysicalMaterial、PMREMGenerator、RoomEnvironment、EffectComposer / RenderPass / UnrealBloomPass / OutputPass 等）。约 585 KB，gzip 后约 147 KB。
- 放进仓库而不是走 CDN：GitHub Pages 子路径下纯静态可用，国内访问不依赖 unpkg / jsdelivr。
- 重新生成（一次性 vendoring，不是网站的构建步骤）：
  ```bash
  npm i -D three@0.186.1 esbuild
  node vendor/build-three.mjs
  ```
  需要新类时，把名字加到 `build-three.mjs` 的导出列表里再运行一次。
