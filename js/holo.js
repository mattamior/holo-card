/* =========================================================
   WebGL 旗舰版全息闪卡
   卡片 = 有厚度的圆角薄片：正面 / 背面 / 侧边三块网格
   正反面：MeshPhysicalMaterial（iridescence + clearcoat + normalMap）+ onBeforeCompile 注入
           ① 视角驱动彩虹（切线空间视线方向 → 余弦色板）
           ② 程序化亮片（每颗亮片随机法线，只有半程向量对准时才闪）
           ③ 箔面遮罩同时改 metalness / roughness / 颜色
           ④ 菲涅尔边缘光（随倾斜角增强，沿卡缘柔和渐隐）
   后处理：RenderPass → UnrealBloomPass（高阈值，只让亮片和箔面高光溢出）→ OutputPass
   渲染按需进行：弹簧静止、页面隐藏时不渲染。

   feature/all-in-one 改动（嵌入汇总页，同页切换 CSS / WebGL）：
     · 画布不再固定铺满窗口：尺寸取画布自身的 CSS 盒子（ResizeObserver），指针坐标换算到画布内
     · setActive(false) 时完全停止渲染与交互（切回 CSS 模式 / 画布滚出视口时）
     · setGyro / clearGyro：陀螺仪驱动倾斜（指针优先，与 CSS 模式同一套规则）
     · setEffects：与控制面板同步开关镭射 / 压纹 / 边缘光 / 高光
   ========================================================= */
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, Shape, ShapeGeometry, ExtrudeGeometry, PlaneGeometry,
  MeshPhysicalMaterial, MeshBasicMaterial, CanvasTexture, DataTexture, Vector2, Vector3, Quaternion, Color,
  PMREMGenerator, SRGBColorSpace, NoColorSpace, LinearFilter, LinearMipmapLinearFilter, HalfFloatType,
  NeutralToneMapping, WebGLRenderTarget, DirectionalLight, Float32BufferAttribute, MathUtils,
  SphereGeometry, ShaderMaterial, BackSide, RoomEnvironment, EffectComposer, RenderPass, UnrealBloomPass, OutputPass,
} from 'three';
import { CARDS, buildCard, buildBack, buildShadow, drawBackground } from './textures.js';

/* ---------------- 可调参数 ---------------- */
export const CONFIG = {
  // 手感：与 CSS 主版完全一致
  maxTilt: 14,                               // 悬停最大倾斜角（度）
  follow: { stiffness: 260, damping: 30 },   // 跟手
  settle: { stiffness: 140, damping: 22 },   // 回正（约 0.6s，几乎不过冲）
  fade:   { stiffness: 220, damping: 32 },   // 悬停强度淡入淡出
  hoverScale: 0.03,                          // 悬停放大
  dragDegPerPx: 0.45,                        // 拖动旋转灵敏度（度 / 像素）
  dragMaxPitch: 28,                          // 拖动时上下最大俯仰
  // 卡片几何（世界单位，宽 2.5 ≈ 63mm）
  width: 2.5, thickness: 0.03, radius: 0.112,
  // 画面
  maxDPR: 2,
  fov: 30,
  fill: 0.66,                                // 卡片高度占视口高度比例
  exposure: 1.0,
  env: 'studio',                             // 'studio'：程序化柔光棚（全部高斯光斑，反射里没有任何直边）；'room'：three 自带 RoomEnvironment（方形灯箱，镜面上会映出直边）
  envIntensity: 1.0,
  envBlur: 0.03,                             // PMREM 预模糊
  bloom: { strength: 0.28, radius: 0.5, threshold: 0.92 },  // 克制：只有亮片与箔面最亮处溢出
  clearcoat: 0.6,                            // 覆膜光泽（「高光」开关关掉时为 0）
  pointerPriorityMs: 400,                    // 指针刚离开的这段时间内忽略陀螺仪（避免打架）
  // 共享的着色器参数（每张卡还可以覆盖，见 CARD_LOOK）
  rimColor: new Color(0.75, 0.82, 1.0),
  sparkleLight: new Vector3(-0.45, 0.6, 1.0), // 亮片“虚拟光源”方向（世界空间）
};

/** 每张卡的材质外观 */
const CARD_LOOK = {
  frost: { rainbow: 1.0, holoEmit: 0.85, foilTint: [0.92, 0.96, 1.0], foilMetal: 0.75, foilRough: 0.30, foilCover: 0.55,
           baseRough: 0.48, sparkle: 3.0, sparkleDensity: 52, bandFreq: 1.3, viewFreq: 1.6,
           iridescence: 0.6, iriRange: [180, 620], normalScale: 0.7, anisotropy: 0, rim: 0.28 },
  star:  { rainbow: 0.45, holoEmit: 0.22, foilTint: [1.0, 0.86, 1.0], foilMetal: 0.65, foilRough: 0.36, foilCover: 0.35,
           baseRough: 0.5, sparkle: 9.0, sparkleDensity: 52, bandFreq: 1.0, viewFreq: 1.3,
           iridescence: 0.45, iriRange: [250, 700], normalScale: 0.6, anisotropy: 0, rim: 0.28 },
  sun:   { rainbow: 0.12, holoEmit: 0.12, foilTint: [1.0, 0.80, 0.42], foilMetal: 0.95, foilRough: 0.32, foilCover: 0.55,
           baseRough: 0.55, sparkle: 3.0, sparkleDensity: 52, bandFreq: 0.8, viewFreq: 1.1,
           iridescence: 0.35, iriRange: [300, 500], normalScale: 0.8, anisotropy: 0.55, rim: 0.28 },
  back:  { rainbow: 0.7, holoEmit: 0.18, foilTint: [1.0, 0.88, 0.6], foilMetal: 0.85, foilRough: 0.3, foilCover: 0.6,
           baseRough: 0.5, sparkle: 3.0, sparkleDensity: 52, bandFreq: 1.0, viewFreq: 1.4,
           iridescence: 0.7, iriRange: [200, 600], normalScale: 0.7, anisotropy: 0, rim: 0.3 },
};

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const DEG = Math.PI / 180;

/* ---------------- 弹簧（与 CSS 版同一实现：按真实时间、固定子步长积分） ---------------- */
class Spring {
  constructor(init, params) {
    this.value = { ...init }; this.target = { ...init };
    this.vel = Object.fromEntries(Object.keys(init).map(k => [k, 0]));
    this.params = params;
  }
  set(target, params) { Object.assign(this.target, target); if (params) this.params = params; }
  jump() { Object.assign(this.value, this.target); for (const k in this.vel) this.vel[k] = 0; }
  step(dt) {
    const { stiffness: k, damping: c } = this.params;
    const h = 1 / 240;
    for (let t = 0; t < dt; t += h) {
      const s = Math.min(h, dt - t);
      for (const key in this.value) {
        const a = k * (this.target[key] - this.value[key]) - c * this.vel[key];
        this.vel[key] += a * s;
        this.value[key] += this.vel[key] * s;
      }
    }
    let moving = false;
    for (const key in this.value) {
      if (Math.abs(this.vel[key]) > 0.01 || Math.abs(this.target[key] - this.value[key]) > 0.01) moving = true;
      else { this.value[key] = this.target[key]; this.vel[key] = 0; }
    }
    return moving;
  }
}

/* ---------------- 着色器注入 ---------------- */
const FRAG_HEAD = /* glsl */`
uniform sampler2D uFoilMap;
uniform vec3 uCamLocal, uLightLocal, uFoilTint, uRimColor;
uniform vec2 uShift, uCardSize;
uniform float uRainbow, uHoloEmit, uFoilMetal, uFoilRough, uFoilCover, uSparkle, uSparkleDensity,
              uBandFreq, uViewFreq, uRim, uTilt, uSpin, uCardRadius;
varying vec2 vCardUv;
varying vec3 vLocalPos;

float hh12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec3 hh32(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yxz + 33.33); return fract((p3.xxy + p3.yzz) * p3.zyx); }
// 无格点平滑场（正弦域扭曲）：给彩虹相位加有机起伏，没有方块、没有直边
float warp(vec2 p) {
  return 0.5 + 0.25 * sin(p.x * 6.1 + 1.4 * sin(p.y * 4.3 + 1.0))
             + 0.25 * sin(p.y * 5.3 + 1.2 * sin(p.x * 3.7 + 2.3));
}
// 余弦色板：连续、周期无断点 → 彩虹没有接缝
vec3 holoPalette(float t) {
  vec3 c = 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.33, 0.67)));
  return mix(c, vec3(1.0), 0.12);
}
// 单层亮片：亮片完全落在自己的格子内（中心 0.3~0.7，半径 ≤0.28），所以格子边界处恒为 0，无接缝
float sparkleLayer(vec2 p, vec3 H, float spread, float sharp, float keep) {
  vec2 cell = floor(p), f = fract(p);
  vec3 r1 = hh32(cell), r2 = hh32(cell + 17.31);
  vec2 c = 0.3 + 0.4 * r1.xy;
  float rad = mix(0.14, 0.28, r1.z);
  float d = length(f - c) / rad;
  float shape = 1.0 - smoothstep(0.0, 1.0, d); shape *= shape;
  vec3 nf = normalize(vec3((r2.xy * 2.0 - 1.0) * spread, 1.0));
  float g = pow(max(dot(nf, H), 0.0), sharp);
  return shape * g * step(keep, r2.z);
}
float sdCard(vec2 uv) {
  vec2 p = (uv - 0.5) * uCardSize, b = uCardSize * 0.5;
  vec2 q = abs(p) - b + uCardRadius;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uCardRadius;
}
`;

function patchCardMaterial(mat, uniforms) {
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vCardUv;\nvarying vec3 vLocalPos;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvCardUv = uv;\nvLocalPos = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + FRAG_HEAD)
      // ① 颜色：箔区混入视角彩虹，并按插画亮度生成“自发光”的镭射流光
      .replace('#include <map_fragment>', /* glsl */`#include <map_fragment>
        vec4 foilS = texture2D(uFoilMap, vCardUv);
        float foil = foilS.r;
        vec3 Vl = normalize(uCamLocal - vLocalPos);              // 物体（=切线）空间视线方向
        vec2 tv = Vl.xy / max(Vl.z, 0.3) + uShift;               // 视线斜率：卡片倾斜时连续变化
        float nz = warp(vCardUv * vec2(1.0, 1.4)) + 0.4 * warp(vCardUv * vec2(2.3, 3.1) + 1.7);
        float phase = dot(vCardUv - 0.5, vec2(0.55, 0.85)) * uBandFreq + dot(tv, vec2(1.6, 1.1)) * uViewFreq + nz * 0.22;
        vec3 rainbow = holoPalette(phase);
        float sweep = 0.5 + 0.5 * cos(6.28318 * (dot(tv, vec2(0.9, 0.6)) * 0.9 + dot(vCardUv, vec2(0.6, 0.4)) * 1.1 + nz * 0.35));
        sweep = sweep * sweep * (3.0 - 2.0 * sweep);
        sweep *= sweep;                                            // 光带更集中：亮带之间留出暗部，流动感更明显
        vec3 foilCol = mix(uFoilTint, uFoilTint * rainbow * 1.25, uRainbow);
        float artLum = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
        // 油墨印在箔上：箔色只按插画亮度透出来，暗部保持油墨颜色（保住插画对比度）
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * mix(vec3(1.0), foilCol * 1.3, 0.75) * (0.55 + 0.45 * artLum), foil * uFoilCover);
        vec3 holoAdd = foilCol * foil * uHoloEmit * (0.12 + 0.88 * sweep) * (0.45 + 0.55 * sqrt(artLum));
      `)
      // ③ 箔区：更金属、更光滑
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, uFoilRough, foil);')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, uFoilMetal, foil);')
      // ② 亮片 + ④ 菲涅尔边缘光（都写进自发光，便于 bloom 溢出）
      .replace('#include <emissivemap_fragment>', /* glsl */`#include <emissivemap_fragment>
        vec3 Ls = normalize(uLightLocal);
        vec3 Hs = normalize(Vl + Ls + vec3(uShift, 0.0));
        vec2 sp = vCardUv * vec2(1.0, uCardSize.y / uCardSize.x) * uSparkleDensity;
        float spark = sparkleLayer(sp, Hs, 0.30, 140.0, 0.30)
                    + 1.2 * sparkleLayer(sp * 0.5 + 11.7, Hs, 0.26, 220.0, 0.50);
        vec3 sparkCol = mix(vec3(1.0), holoPalette(phase * 1.7 + 0.2), 0.35);
        totalEmissiveRadiance += holoAdd + sparkCol * spark * foilS.b * uSparkle * (1.0 + 0.8 * uSpin);
        float edgeBand = 1.0 - smoothstep(0.0, 0.11, -sdCard(vCardUv));   // 卡缘 0.11 单位内平滑衰减
        float fres = smoothstep(0.02, 0.45, length(Vl.xy));                // 视线越斜越亮
        totalEmissiveRadiance += uRimColor * uRim * edgeBand * edgeBand * fres * (0.1 + 0.9 * uTilt);
      `);
  };
  mat.customProgramCacheKey = () => 'holo-card-face';
}

function patchEdgeMaterial(mat, uniforms) {
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uRimColor;\nuniform float uRim, uTilt;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float fr = 1.0 - abs(dot(normalize(normal), normalize(vViewPosition)));
        totalEmissiveRadiance += uRimColor * uRim * pow(fr, 4.0) * (0.1 + 0.9 * uTilt);`);
  };
  mat.customProgramCacheKey = () => 'holo-card-edge';
}

/* ---------------- 几何 ---------------- */
function roundedShape(w, h, r) {
  const s = new Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0);
  s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2);
  s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
  s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
  return s;
}
function faceGeometry(shape, w, h) {
  const g = new ShapeGeometry(shape, 24);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + 0.5, p.getY(i) / h + 0.5);
  // 平面 + 线性 UV：法线、切线处处恒定，直接写入解析值。
  // （computeTangents 在耳切法产生的细长 / 退化三角形上会算出错误切线，法线贴图就会沿三角形边出现硬直线）
  const n = new Float32Array(p.count * 3), t = new Float32Array(p.count * 4);
  for (let i = 0; i < p.count; i++) { n[i * 3 + 2] = 1; t[i * 4] = 1; t[i * 4 + 3] = 1; }
  g.setAttribute('normal', new Float32BufferAttribute(n, 3));
  g.setAttribute('tangent', new Float32BufferAttribute(t, 4));
  return g;
}

/* ---------------- 程序化柔光棚环境 ----------------
   一个内表面着色的大球：暗色渐变底 + 若干高斯光斑 / 柔光条。全部是平滑函数，
   所以卡面（尤其覆膜、金属箔）倒映出来的高光边缘永远是渐隐的，不会出现硬直线。
   卡片正对镜头时，镜面反射方向 ≈ +Z（镜头身后），光斑分布在 +Z 周围 20°~45°，
   倾斜 ±14° 时反射方向扫过 ±28°，高光就会从卡面上滑过。 */
function studioEnvironment() {
  const scene = new Scene();
  const mat = new ShaderMaterial({
    side: BackSide, depthWrite: false,
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: /* glsl */`
      varying vec3 vDir;
      float lobe(vec3 d, vec3 c, float w) { return exp((dot(d, normalize(c)) - 1.0) / w); }
      void main() {
        vec3 d = normalize(vDir);
        vec3 col = mix(vec3(0.07, 0.06, 0.09), vec3(0.24, 0.22, 0.30), smoothstep(-0.6, 0.9, d.y));
        col += vec3(0.55, 0.53, 0.62) * lobe(d, vec3(0.0, 0.25, 1.0), 0.35);             // 正前方大面积柔光（正对时箔面也有底亮度）
        col += vec3(1.00, 0.97, 0.92) * 2.4 * lobe(d, vec3(-0.45, 0.55, 0.70), 0.05);   // 左上主光（柔光箱）
        col += vec3(0.62, 0.74, 1.00) * 1.3 * lobe(d, vec3(0.65, 0.10, 0.75), 0.08);    // 右侧冷色补光
        col += vec3(1.00, 0.70, 0.85) * 0.8 * lobe(d, vec3(0.10, -0.60, 0.80), 0.10);   // 下方暖粉反光
        // 顶部横向柔光条：横向用很宽的高斯，两端同样渐隐
        col += vec3(0.95, 0.95, 1.0) * 0.7 * exp(-pow((d.y - 0.78) / 0.10, 2.0)) * smoothstep(-0.2, 0.6, d.z);
        col += vec3(0.5, 0.45, 0.8) * 0.35 * lobe(d, vec3(0.0, 0.2, -1.0), 0.5);        // 背后环境光（照亮侧边）
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  scene.add(new Mesh(new SphereGeometry(10, 64, 32), mat));
  return scene;
}

/* ---------------- 主程序 ---------------- */
export function start({ canvas, onReady, initialCard = 'frost', embedded = false, effects = {} }) {
  // 特效开关（与汇总页控制面板同步）：镭射 / 压纹 / 边缘光 / 高光
  const fx = { foil: true, etch: true, rim: true, glare: true, ...effects };
  let active = true;           // false：不渲染、不响应指针（CSS 模式下或画布不可见时）
  let inView = true;           // 画布是否在视口里（IntersectionObserver）
  const W = CONFIG.width, H = W * 88 / 63, T = CONFIG.thickness;
  // 嵌入模式：画布透明，直接透出页面背景（不画背景图，也就没有“画布的边”）
  const renderer = new WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', alpha: embedded, premultipliedAlpha: true });
  if (embedded) renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, CONFIG.maxDPR));
  renderer.toneMapping = NeutralToneMapping;          // 保色：卡面颜色几乎不被压暗/偏色
  renderer.toneMappingExposure = CONFIG.exposure;
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  const scene = new Scene();
  const camera = new PerspectiveCamera(CONFIG.fov, 1, 0.1, 100);
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(CONFIG.env === 'room' ? new RoomEnvironment() : studioEnvironment(), CONFIG.envBlur).texture;
  scene.environmentIntensity = CONFIG.envIntensity;
  pmrem.dispose();

  // 两盏方向光：主光给面上的柔和高光，背后的轮廓光照亮卡片侧边
  const key = new DirectionalLight(0xffffff, 0.5); key.position.set(-2, 3, 5); scene.add(key);
  const rim = new DirectionalLight(0xbfd0ff, 1.0); rim.position.set(3, 1.5, -4); scene.add(rim);

  /* ----- 卡片 ----- */
  const shape = roundedShape(W, H, CONFIG.radius);
  const tex = (d, srgb) => {
    const t = d instanceof HTMLCanvasElement ? new CanvasTexture(d) : new DataTexture(d.data, d.width, d.height);
    t.colorSpace = srgb ? SRGBColorSpace : NoColorSpace;
    t.generateMipmaps = true; t.minFilter = LinearMipmapLinearFilter; t.magFilter = LinearFilter;
    t.anisotropy = Math.min(8, maxAniso);
    t.needsUpdate = true;
    return t;
  };
  const shared = {   // 正反面与侧边共享的 uniform（同一对象引用）
    uRimColor: { value: CONFIG.rimColor }, uTilt: { value: 0 }, uSpin: { value: 0 },
    uShift: { value: new Vector2() }, uCardSize: { value: new Vector2(W, H) }, uCardRadius: { value: CONFIG.radius },
  };
  const makeFaceUniforms = () => ({
    ...shared,
    uFoilMap: { value: null }, uCamLocal: { value: new Vector3() }, uLightLocal: { value: new Vector3() },
    uFoilTint: { value: new Color() }, uRainbow: { value: 1 }, uHoloEmit: { value: 0.3 }, uFoilMetal: { value: 0.8 },
    uFoilRough: { value: 0.3 }, uFoilCover: { value: 0.5 }, uSparkle: { value: 1 }, uSparkleDensity: { value: 120 },
    uBandFreq: { value: 1 }, uViewFreq: { value: 1.5 }, uRim: { value: 0.5 },
  });
  const makeFace = () => {
    const u = makeFaceUniforms();
    const m = new MeshPhysicalMaterial({
      roughness: 0.5, metalness: 0.0,
      clearcoat: CONFIG.clearcoat, clearcoatRoughness: 0.28,      // 覆膜：柔和的整体光泽
      iridescence: 1.0, iridescenceIOR: 1.6,
      specularIntensity: 0.5,
    });
    patchCardMaterial(m, u);
    return { m, u };
  };
  const front = makeFace(), back = makeFace();
  const applyLook = (face, look, texs) => {
    const { m, u } = face;
    face.look = look; face.texs = texs;           // 记下来：开关特效时按同一套外观重新套用
    const F = fx.foil ? 1 : 0;
    m.map = texs.map; m.normalMap = texs.normal; m.iridescenceMap = texs.foil; m.iridescenceThicknessMap = texs.foil;
    const ns = fx.etch ? look.normalScale : 0;    // 压纹 = 法线贴图（卡框压纹、窗口内凹、凸印标题、蚀刻纹）
    m.normalScale.set(ns, ns);
    m.roughness = look.baseRough;
    m.iridescence = look.iridescence * F; m.iridescenceThicknessRange = look.iriRange;
    m.anisotropy = fx.foil ? look.anisotropy : 0; m.anisotropyMap = null;
    m.clearcoat = fx.glare ? CONFIG.clearcoat : 0; // 高光 = 覆膜反光 + Bloom
    m.needsUpdate = true;
    u.uFoilMap.value = texs.foil;
    u.uFoilTint.value.setRGB(...look.foilTint);
    for (const [k, n] of [['uRainbow', 'rainbow'], ['uHoloEmit', 'holoEmit'], ['uFoilMetal', 'foilMetal'], ['uFoilRough', 'foilRough'],
      ['uFoilCover', 'foilCover'], ['uSparkle', 'sparkle'], ['uSparkleDensity', 'sparkleDensity'], ['uBandFreq', 'bandFreq'],
      ['uViewFreq', 'viewFreq'], ['uRim', 'rim']]) u[k].value = look[n];
    if (!fx.foil) {   // 关镭射：箔区退化成普通卡面（无彩虹、无亮片、不金属）
      u.uHoloEmit.value = 0; u.uSparkle.value = 0; u.uFoilCover.value = 0;
      u.uFoilMetal.value = 0; u.uFoilRough.value = look.baseRough;
    }
    if (!fx.rim) u.uRim.value = 0;
  };

  const frontGeo = faceGeometry(shape, W, H);
  const backGeo = faceGeometry(shape, W, H);
  backGeo.rotateY(Math.PI);                         // 背面朝 -Z；UV 在旋转前写入，所以从背后看不是镜像
  const frontMesh = new Mesh(frontGeo, front.m); frontMesh.position.z = T / 2;
  const backMesh = new Mesh(backGeo, back.m); backMesh.position.z = -T / 2;

  // 侧边：纸 / 黑芯 / 纸 三层，用顶点色做平滑过渡
  const edgeGeo = new ExtrudeGeometry(shape, { depth: T, bevelEnabled: false, curveSegments: 24, steps: 6 });
  edgeGeo.translate(0, 0, -T / 2);
  {
    const p = edgeGeo.attributes.position, col = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const z = (p.getZ(i) + T / 2) / T, core = Math.exp(-Math.pow((z - 0.5) / 0.16, 2));
      const v = 0.9 - 0.78 * core;
      col[i * 3] = v; col[i * 3 + 1] = v; col[i * 3 + 2] = v * 0.98;
    }
    edgeGeo.setAttribute('color', new Float32BufferAttribute(col, 3));
  }
  const edgeUniforms = { uRimColor: shared.uRimColor, uTilt: shared.uTilt, uRim: { value: 0.35 } };
  const edgeMat = new MeshPhysicalMaterial({ vertexColors: true, roughness: 0.55, clearcoat: 0.6, clearcoatRoughness: 0.3 });
  patchEdgeMaterial(edgeMat, edgeUniforms);
  const capHidden = new MeshBasicMaterial({ visible: false }); // 挤出体的上下盖由正反面网格代替
  const edgeMesh = new Mesh(edgeGeo, [capHidden, edgeMat]);

  const flipGroup = new Group();   // 拖动 / 翻面旋转（内层）
  flipGroup.add(frontMesh, backMesh, edgeMesh);
  const tiltGroup = new Group();   // 悬停倾斜（外层，始终在屏幕坐标系里倾斜，翻到背面手感也一致）
  tiltGroup.add(flipGroup);
  scene.add(tiltGroup);

  // 柔和投影
  const shadowTex = tex(buildShadow(), false);
  const shadowMat = new MeshBasicMaterial({ color: 0x000000, alphaMap: shadowTex, transparent: true, opacity: 0.55, depthWrite: false });
  shadowTex.generateMipmaps = false; shadowTex.minFilter = LinearFilter;
  // alphaMap 读 G 通道：把 alpha 拷进 RGB
  { const d = shadowTex.image.data; for (let i = 0; i < d.length; i += 4) d[i] = d[i + 1] = d[i + 2] = d[i + 3]; }
  // 放在卡片任何姿态都碰不到的深度（卡片绕中心旋转时最远约 2.2 单位），否则会和卡面相交出一条直线
  const SHADOW_Z = -2.6;
  const shadow = new Mesh(new PlaneGeometry(W * 2.3, H * 2.1), shadowMat);
  shadow.position.set(0, -0.2, SHADOW_Z);
  scene.add(shadow);

  // 每个面每帧更新：相机位置 / 亮片光源方向 → 该网格的局部坐标
  const q = new Quaternion(), lightW = CONFIG.sparkleLight.clone().normalize();
  for (const [mesh, face] of [[frontMesh, front], [backMesh, back]]) {
    mesh.onBeforeRender = (_r, _s, cam) => {
      mesh.worldToLocal(face.u.uCamLocal.value.copy(cam.position));
      mesh.getWorldQuaternion(q).invert();
      face.u.uLightLocal.value.copy(lightW).applyQuaternion(q);
    };
  }

  const backTex = (() => { const b = buildBack(); return { map: tex(b.map, true), normal: tex(b.normal, false), foil: tex(b.foil, false) }; })();
  applyLook(back, CARD_LOOK.back, backTex);
  const texCache = {};
  let current = null;
  const setCard = (key) => {
    if (!CARDS[key] || key === current) return;
    current = key;
    if (!texCache[key]) { const b = buildCard(key); texCache[key] = { map: tex(b.map, true), normal: tex(b.normal, false), foil: tex(b.foil, false) }; }
    applyLook(front, CARD_LOOK[key], texCache[key]);
    requestRender();
  };

  /* ----- 背景 + 后处理 ----- */
  let bgTex = null;
  const composer = new EffectComposer(renderer, new WebGLRenderTarget(1, 1, { type: HalfFloatType, samples: 4 })); // 4×MSAA：圆角卡缘无锯齿
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new Vector2(256, 256), CONFIG.bloom.strength, CONFIG.bloom.radius, CONFIG.bloom.threshold);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  /* ----- 布局 ----- */
  const rest = { x: 0, y: 0, w: 1, h: 1 };     // 卡片静止时在屏幕上的矩形（用来算指针位置，和 CSS 版一样不随倾斜变化）
  const resize = () => {
    // 嵌入模式：按画布自己的 CSS 尺寸；独立页（旧行为）：铺满窗口
    const w = Math.max(1, embedded ? canvas.clientWidth : window.innerWidth);
    const h = Math.max(1, embedded ? canvas.clientHeight : window.innerHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, CONFIG.maxDPR);
    renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
    composer.setPixelRatio(dpr); composer.setSize(w, h);
    camera.aspect = w / h;
    const tanH = Math.tan(CONFIG.fov * DEG / 2);
    const dist = Math.max(H / (2 * tanH * CONFIG.fill), W / (2 * tanH * camera.aspect * 0.78));
    camera.position.set(0, 0, dist); camera.lookAt(0, 0, 0); camera.updateProjectionMatrix();
    const v = new Vector3();
    const proj = (x, y) => { v.set(x, y, 0).project(camera); return [(v.x + 1) / 2 * w, (1 - v.y) / 2 * h]; };
    const [x0, y0] = proj(-W / 2, H / 2), [x1, y1] = proj(W / 2, -H / 2);
    Object.assign(rest, { x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
    if (!embedded) {
      bgTex?.dispose();
      bgTex = new CanvasTexture(drawBackground(Math.max(64, Math.round(w / 3)), Math.max(64, Math.round(h / 3))));
      bgTex.colorSpace = SRGBColorSpace; scene.background = bgTex;
    }
    requestRender();
  };

  /* ----- 动画状态 ----- */
  const tilt = new Spring({ x: 0, y: 0 }, CONFIG.follow);       // 悬停倾斜（度）
  const flip = new Spring({ x: 0, y: 0 }, CONFIG.settle);       // 拖动 / 翻面（度）
  const glow = new Spring({ o: 0 }, CONFIG.fade);               // 悬停强度
  let raf = 0, last = 0, dragging = false, frames = 0, spin = 0;

  const draw = () => {
    tiltGroup.rotation.set(tilt.value.x * DEG, tilt.value.y * DEG, 0);
    flipGroup.rotation.set(flip.value.x * DEG, flip.value.y * DEG, 0, 'XYZ');   // 先绕 Y 翻转、再俯仰：翻到背面后上下拖动方向不反
    const o = MathUtils.clamp(glow.value.o, 0, 1);
    tiltGroup.scale.setScalar(1 + o * CONFIG.hoverScale);
    const tiltAmt = Math.min(1, Math.hypot(tilt.value.x, tilt.value.y, flip.value.x) / CONFIG.maxTilt);
    shared.uTilt.value = Math.max(tiltAmt, Math.abs(Math.sin(flip.value.y * DEG)));
    shared.uSpin.value = spin;
    shadow.position.x = -tilt.value.y * 0.02; shadow.position.y = -0.2 + tilt.value.x * 0.016;
    shadow.scale.x = 0.25 + 0.75 * Math.abs(Math.cos(flip.value.y * DEG));
    composer.render();
    frames++;
  };
  const loop = (now) => {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    const a = tilt.step(dt), b = flip.step(dt), c = glow.step(dt);
    const angVel = Math.hypot(tilt.vel.x, tilt.vel.y, flip.vel.x, flip.vel.y);   // 度/秒
    spin += (Math.min(1, angVel / 240) - spin) * Math.min(1, dt * 10);
    const busy = a || b || c || dragging || spin > 0.01;
    if (!busy) spin = 0;
    draw();
    if (busy) schedule();                    // 静止后不再请求下一帧 → GPU 空闲
  };
  const schedule = () => { if (!raf && !document.hidden && active && inView) { last = performance.now(); raf = requestAnimationFrame(loop); } };
  function requestRender() { if (reduceMotion.matches) { tilt.jump(); flip.jump(); glow.jump(); } schedule(); }

  /* ----- 交互 ----- */
  const shift = shared.uShift.value;
  // 指针坐标换算到画布内（嵌入模式下画布不在窗口左上角，且会随页面滚动）
  const loc = (e) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const inRest = (e, m = 0) => { const [x, y] = loc(e); return x >= rest.x - m && x <= rest.x + rest.w + m && y >= rest.y - m && y <= rest.y + rest.h + m; };
  let gyroPose = null, lastPointerAt = 0;   // 陀螺仪目标姿态（度，three 坐标：x 俯仰 / y 偏航）
  const hover = (e) => {
    lastPointerAt = performance.now();
    const [lx, ly] = loc(e);
    const px = MathUtils.clamp((lx - rest.x) / rest.w, 0, 1), py = MathUtils.clamp((ly - rest.y) / rest.h, 0, 1);
    if (reduceMotion.matches) {
      // 减少动态效果：卡片不动，只让光（彩虹相位 / 亮片角度）随指针变化
      shift.set((px - 0.5) * 0.5, (0.5 - py) * 0.5);
      requestRender(); return;
    }
    // 与 CSS 版一致：指针所在一侧抬向观众
    tilt.set({ y: -(px - 0.5) * 2 * CONFIG.maxTilt, x: -(py - 0.5) * 2 * CONFIG.maxTilt }, CONFIG.follow);
    glow.set({ o: 1 });
    requestRender();
  };
  const leave = () => {
    lastPointerAt = performance.now();
    if (gyroPose && !reduceMotion.matches) { tilt.set(gyroPose, CONFIG.settle); glow.set({ o: 1 }); requestRender(); return; }  // 体感开着：回到体感姿态而不是归零
    tilt.set({ x: 0, y: 0 }, CONFIG.settle); glow.set({ o: 0 });
    if (reduceMotion.matches) shift.set(0, 0);
    requestRender();
  };
  const snapFace = (bias = 0) => {
    const y = flip.target.y + bias;
    flip.set({ x: 0, y: Math.round(y / 180) * 180 }, CONFIG.settle);
    requestRender();
  };
  const flipOver = () => { flip.set({ x: 0, y: Math.round(flip.target.y / 180) * 180 + 180 }, CONFIG.settle); requestRender(); };

  let press = null, over = false;
  canvas.addEventListener('pointerdown', (e) => {
    if (!active || !inRest(e, 12)) return;
    press = { id: e.pointerId, x: e.clientX, y: e.clientY, fy: flip.target.y, fx: flip.target.x, t: performance.now(), vx: 0, lx: e.clientX, lt: performance.now(), moved: false };
    try { canvas.setPointerCapture(e.pointerId); } catch { /* 合成事件等没有活动指针时忽略 */ }
    if (e.pointerType !== 'mouse') { dragging = true; tilt.set({ x: 0, y: 0 }, CONFIG.settle); glow.set({ o: 1 }); }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (press && e.pointerId === press.id) {
      const dx = e.clientX - press.x, dy = e.clientY - press.y;
      if (!press.moved && Math.hypot(dx, dy) > 4) {
        press.moved = true; dragging = true;
        tilt.set({ x: 0, y: 0 }, CONFIG.settle);   // 拖动时由拖动接管，悬停倾斜回零
        canvas.classList.add('dragging');
      }
      if (press.moved) {
        const now = performance.now(), dtp = Math.max(1, now - press.lt);
        press.vx = 0.7 * press.vx + 0.3 * ((e.clientX - press.lx) / dtp * 1000); press.lx = e.clientX; press.lt = now;
        const pitch = MathUtils.clamp(press.fx + dy * CONFIG.dragDegPerPx * 0.6, -CONFIG.dragMaxPitch, CONFIG.dragMaxPitch);
        flip.set({ y: press.fy + dx * CONFIG.dragDegPerPx, x: pitch }, CONFIG.follow);
        if (reduceMotion.matches) flip.jump();
        schedule();
      }
      return;
    }
    if (!active) return;
    const inside = inRest(e);
    if (inside) { over = true; hover(e); canvas.style.cursor = 'grab'; }
    else if (over) { over = false; leave(); canvas.style.cursor = ''; }
  });
  const release = (e) => {
    if (!press || e.pointerId !== press.id) return;
    const wasDrag = press.moved, vx = press.vx;
    press = null; dragging = false; canvas.classList.remove('dragging');
    if (wasDrag || e.pointerType !== 'mouse') {
      // 甩动：按松手速度预测落点，再吸附到最近的正面 / 背面
      snapFace(MathUtils.clamp(vx * 0.12 * CONFIG.dragDegPerPx, -120, 120));
      glow.set({ o: 0 });
    }
    if (e.pointerType === 'mouse' && inRest(e)) hover(e); else leave();
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('pointerleave', (e) => { if (!press && e.pointerType === 'mouse') { over = false; leave(); } });
  canvas.addEventListener('dblclick', (e) => { if (inRest(e)) flipOver(); });
  let lastTap = 0;
  canvas.addEventListener('pointerup', (e) => {   // 触屏双击翻面
    if (e.pointerType === 'mouse' || !inRest(e)) return;
    const now = performance.now(); if (now - lastTap < 300) { flipOver(); lastTap = 0; } else lastTap = now;
  });

  document.addEventListener('visibilitychange', () => { if (!document.hidden) requestRender(); else if (raf) { cancelAnimationFrame(raf); raf = 0; } });
  if (embedded && 'ResizeObserver' in window) {
    // 画布尺寸变化（窗口缩放、横竖屏、面板展开）都在这里处理；隐藏时尺寸为 0，跳过
    new ResizeObserver(() => { if (active && canvas.clientWidth > 0) resize(); }).observe(canvas);
  } else window.addEventListener('resize', resize);
  if (embedded && 'IntersectionObserver' in window) {
    // 画布滚出视口：停止渲染（省电），回来时补一帧
    new IntersectionObserver(([en]) => {
      inView = en.isIntersecting;
      if (!inView && raf) { cancelAnimationFrame(raf); raf = 0; } else if (inView) requestRender();
    }).observe(canvas);
  }
  reduceMotion.addEventListener?.('change', () => { leave(); });
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); onReady?.({ lost: true }); });

  setCard(initialCard);
  resize();
  draw();

  /** 开 / 关：关掉时停止渲染；打开时按当前尺寸重算并补一帧 */
  const setActive = (on) => {
    active = !!on;
    if (!active) {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      press = null; over = false; dragging = false; canvas.classList.remove('dragging');
      tilt.set({ x: 0, y: 0 }); glow.set({ o: 0 }); tilt.jump(); glow.jump();
    } else { resize(); requestRender(); }
  };
  /** 陀螺仪姿态（度，CSS 约定：rx = rotateY，ry = rotateX）。指针在卡上或刚离开时忽略，指针优先 */
  const setGyro = (rx, ry) => {
    if (reduceMotion.matches) return;
    gyroPose = { x: -ry, y: rx };       // CSS rotateX(+) 下沿靠近观众 = three rotation.x(−)
    if (!active || press || over || performance.now() - lastPointerAt < CONFIG.pointerPriorityMs) return;
    tilt.set(gyroPose, CONFIG.follow); glow.set({ o: 1 }); requestRender();
  };
  const clearGyro = () => { gyroPose = null; if (!press && !over) leave(); };
  /** 特效开关：{ foil, etch, rim, glare }，缺省的键保持原值 */
  const setEffects = (next = {}) => {
    Object.assign(fx, next);
    for (const face of [front, back]) if (face.look) applyLook(face, face.look, face.texs);
    edgeUniforms.uRim.value = fx.rim ? 0.35 : 0;
    bloom.enabled = !!fx.glare;
    requestRender();
  };
  setEffects();

  const api = {
    setCard, flipOver, setActive, setGyro, clearGyro, setEffects, renderer, CONFIG, CARD_LOOK,
    get effects() { return { ...fx }; }, get current() { return current; },
    debug: { front, back, edgeMat, bloom, scene, draw },
    get frames() { return frames; }, get rendering() { return !!raf; },
    /** 调试 / 截图用：直接摆姿势（度） */
    pose(tx = 0, ty = 0, fy = 0, fx = 0) { tilt.set({ x: tx, y: ty }); flip.set({ x: fx, y: fy }); glow.set({ o: tx || ty ? 1 : 0 }); tilt.jump(); flip.jump(); glow.jump(); draw(); },
  };
  onReady?.(api);
  return api;
}
