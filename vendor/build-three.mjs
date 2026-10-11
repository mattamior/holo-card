// 一次性 vendoring 脚本（不是网站的构建步骤）：从 npm 的 three 包里只摇树打包本项目用到的类，
// 输出 vendor/three-holo.min.js。网站本身直接用静态文件，无需运行此脚本。
// 用法：npm i -D three@0.186.1 esbuild && node vendor/build-three.mjs
import { build } from 'esbuild';
await build({
  stdin: {
    contents: `
export { WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, Shape, ShapeGeometry, ExtrudeGeometry, PlaneGeometry,
  MeshPhysicalMaterial, MeshBasicMaterial, CanvasTexture, DataTexture, Vector2, Vector3, Quaternion, Color,
  PMREMGenerator, SRGBColorSpace, NoColorSpace, LinearFilter, LinearMipmapLinearFilter, HalfFloatType,
  NeutralToneMapping, WebGLRenderTarget, DirectionalLight, Float32BufferAttribute, MathUtils, SphereGeometry, ShaderMaterial, BackSide, REVISION } from 'three';
export { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
export { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
export { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
export { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
export { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
`,
    resolveDir: process.cwd(), loader: 'js',
  },
  bundle: true, minify: true, format: 'esm', target: 'es2020',
  legalComments: 'inline',
  banner: { js: '/* three.js r186 (MIT, https://github.com/mrdoob/three.js) — tree-shaken subset for holo-card. See vendor/LICENSE-three.txt */' },
  outfile: 'vendor/three-holo.min.js',
});
console.log('ok');
