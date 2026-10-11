/* =========================================================
   开卡包（feature/all-in-one）
   流程：卡包（箔面反光，跟随指针 / 体感微微倾斜）
       → 撕包：沿包顶虚线划过，留下发光轨迹；划过足够宽度后包头撕开飞出（也可以点「撕开卡包」按钮）
       → 抽出：5 张卡从开口滑出，叠成一摞
       → 翻牌：点击 / 左右滑动（或键盘 ← → Enter 空格）逐张翻面
       → 稀有度演出：普通直接翻；稀有加一道光束；传说（最稀有）先遮黑 → 震动 → 光束 + 粒子迸发 + 泛光 → 卡放大落定
       → 结果页：本包 5 张，点任一张放大，用现有闪卡交互查看；「再开一包」「返回」
   动画：Web Animations API；粒子 / 撕包轨迹：Canvas 2D（只在有粒子时跑帧）
   减少动态效果：全部改成淡入淡出，无震动、无粒子迸发、无屏幕抖动
   音效：WebAudio 程序化生成（无音频文件），默认关闭
   种子：#pack=任意字符串 → 可复现的抽卡结果；测试用 seed-legend / seed-legend-lion / seed-rare / seed-common / seed-all
   ========================================================= */

/* ---------------- 稀有度与概率 ---------------- */
export const RARITY = {
  c:  { name: '普通', label: '普通 C' },
  r:  { name: '稀有', label: '稀有 R' },
  ur: { name: '传说', label: '传说 UR · 最稀有' },
};
/** 每包 5 张：第 1–4 张按 slot 概率；第 5 张保底「稀有」以上 */
export const ODDS = {
  slot: { c: 0.78, r: 0.18, ur: 0.04 },
  last: { r: 0.80, ur: 0.20 },
};
/** 普通卡：简化卡面（不带箔），程序化 SVG 小图标 */
const COMMONS = [
  { id: 'moss', name: '苔团团', hp: 50, move: '缠绕 · 10', text: '下回合对手的撤退费用 +1。',
    frame: 'linear-gradient(160deg,#cfe3b8,#7f9d64)', art: 'linear-gradient(180deg,#264a2c,#5e8c4a)', panel: 'rgba(255,255,255,.84)', ink: '#1b1b22',
    svg: '<g fill="#a9e07a" stroke="#1d3a1f" stroke-width="3"><path d="M160 70c40 10 58 44 46 82-30 6-62-6-74-34-6-16 4-42 28-48z"/><path d="M160 70c-34 18-44 52-30 80" fill="none"/></g><g fill="#e7ffd0" opacity=".6"><circle cx="96" cy="80" r="3"/><circle cx="232" cy="96" r="2.5"/><circle cx="214" cy="60" r="2"/></g>' },
  { id: 'bubble', name: '泡泡鱼', hp: 60, move: '水花 · 20', text: '投掷 1 次硬币，正面时对手陷入睡眠。',
    frame: 'linear-gradient(160deg,#cfe9f6,#6aa3c4)', art: 'linear-gradient(180deg,#0e2e57,#2c76a8)', panel: 'rgba(255,255,255,.84)', ink: '#1b1b22',
    svg: '<g stroke="#0d2340" stroke-width="3"><path d="M110 130c20-34 80-34 100 0-20 34-80 34-100 0z" fill="#ffb36b"/><path d="M210 130l30-22v44z" fill="#ff9450"/><circle cx="134" cy="124" r="5" fill="#0d2340"/></g><g fill="none" stroke="#bfe8ff" stroke-width="2.5" opacity=".75"><circle cx="96" cy="86" r="9"/><circle cx="80" cy="60" r="6"/><circle cx="104" cy="44" r="4"/></g>' },
  { id: 'pebble', name: '石壳虫', hp: 70, move: '硬化 · 0', text: '下回合本卡受到的伤害 −20。',
    frame: 'linear-gradient(160deg,#ddd4c6,#8f8270)', art: 'linear-gradient(180deg,#3a3128,#76664f)', panel: 'rgba(255,255,255,.84)', ink: '#1b1b22',
    svg: '<g stroke="#241c14" stroke-width="3"><path d="M110 150c0-40 30-66 50-66s50 26 50 66z" fill="#b9a68a"/><path d="M160 84v66M130 98l14 52M190 98l-14 52" fill="none" opacity=".6"/><path d="M110 150h100" fill="none"/></g><g fill="#241c14"><circle cx="128" cy="162" r="4"/><circle cx="192" cy="162" r="4"/></g>' },
  { id: 'chime', name: '风铃雀', hp: 50, move: '疾风 · 20', text: '本回合可以额外撤退一次。',
    frame: 'linear-gradient(160deg,#d3f0ea,#6fb2a4)', art: 'linear-gradient(180deg,#123c45,#4f9aa0)', panel: 'rgba(255,255,255,.84)', ink: '#1b1b22',
    svg: '<g stroke="#0f2b30" stroke-width="3"><path d="M126 140c0-30 22-50 46-50 18 0 30 12 30 28 0 26-30 44-60 44z" fill="#f2f7c8"/><path d="M200 112l26-8-20 18z" fill="#ffc35a"/><path d="M140 136c-16 6-34 2-46-10 18-2 32-2 46 10z" fill="#9fe3d6"/><circle cx="182" cy="110" r="4" fill="#0f2b30"/></g><g fill="none" stroke="#dffaf4" stroke-width="2.5" opacity=".7" stroke-linecap="round"><path d="M70 80c20-8 40-8 60 0M76 100c14-6 28-6 42 0"/></g>' },
  { id: 'shroom', name: '菇菇灯', hp: 60, move: '孢子光 · 10', text: '恢复本卡 20 点 HP。',
    frame: 'linear-gradient(160deg,#f6dccf,#c08a76)', art: 'linear-gradient(180deg,#2a1636,#6b3a5c)', panel: 'rgba(255,255,255,.84)', ink: '#1b1b22',
    svg: '<g stroke="#2a1020" stroke-width="3"><path d="M146 168v-36h28v36z" fill="#fff1dc"/><path d="M110 134c0-34 24-56 50-56s50 22 50 56z" fill="#ff7a8a"/></g><g fill="#fff1dc"><circle cx="140" cy="108" r="7"/><circle cx="176" cy="100" r="9"/><circle cx="192" cy="124" r="5"/></g><g fill="#ffd9f0" opacity=".55"><circle cx="90" cy="70" r="2.5"/><circle cx="236" cy="82" r="3"/></g>' },
  { id: 'glow', name: '萤尾虫', hp: 40, move: '微光 · 10', text: '查看对手牌库顶的 1 张牌。',
    frame: 'linear-gradient(160deg,#e9f0c4,#9aab5a)', art: 'linear-gradient(180deg,#101a2e,#283c4e)', panel: 'rgba(255,255,255,.84)', ink: '#1b1b22',
    svg: '<defs><radialGradient id="cg"><stop offset="0" stop-color="#fbffb0"/><stop offset=".5" stop-color="#e8ff7a" stop-opacity=".5"/><stop offset="1" stop-color="#e8ff7a" stop-opacity="0"/></radialGradient></defs><circle cx="190" cy="140" r="40" fill="url(#cg)"/><g stroke="#151a10" stroke-width="3"><ellipse cx="160" cy="122" rx="26" ry="16" fill="#6b5a3a"/><ellipse cx="188" cy="138" rx="14" ry="12" fill="#f4ff9a"/><path d="M146 108c-8-14-20-18-30-16M150 106c-2-14 4-22 12-26" fill="none"/></g><g fill="#fbffb0" opacity=".7"><circle cx="90" cy="90" r="2.5"/><circle cx="110" cy="170" r="2"/><circle cx="240" cy="80" r="2.5"/></g>' },
];
const POOL = { ur: ['fox', 'lion'], r: ['dragon', 'stardust'], c: COMMONS.map(c => c.id) };
const NAMES = { dragon: '霜晶龙', fox: '焰尾狐', stardust: '星尘狐', lion: '金曜狮王', ...Object.fromEntries(COMMONS.map(c => [c.id, c.name])) };
const TIER_RANK = { c: 0, r: 1, ur: 2 };
/** 测试 / 演示用的固定种子：强制某些格子的稀有度（卡由种子内的随机数决定） */
const FORCED = {
  'seed-legend':      { tiers: ['c', 'c', 'c', 'r', 'ur'], last: 'fox' },
  'seed-legend-lion': { tiers: ['c', 'c', 'c', 'r', 'ur'], last: 'lion' },
  'seed-rare':        { tiers: ['c', 'c', 'c', 'c', 'r'] },
  'seed-common':      { tiers: ['c', 'c', 'c', 'c', 'c'] },
  'seed-all':         { tiers: ['c', 'r', 'r', 'ur', 'ur'] },
};

/* ---------------- 可复现随机数 ---------------- */
function rngFrom(seed) {
  let h = 1779033703 ^ seed.length;                     // 字符串 → 32 位种子
  for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = h >>> 0;
  return () => {                                         // mulberry32
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const randomSeed = () => Math.random().toString(36).slice(2, 8);

/** 抽 5 张：不重复；某档抽完了就降一档。返回按揭晓顺序（普通 → 稀有 → 传说）排好的数组 */
export function drawPack(seed) {
  const rnd = rngFrom(seed), forced = FORCED[seed], used = new Set(), out = [];
  const roll = (odds) => { let x = rnd(); for (const t of ['ur', 'r', 'c']) { if (odds[t] && (x -= odds[t]) < 0) return t; } return 'c'; };
  for (let i = 0; i < 5; i++) {
    let tier = forced ? forced.tiers[i] : roll(i === 4 ? ODDS.last : ODDS.slot);
    let key = null;
    for (;;) {
      const left = POOL[tier].filter(k => !used.has(k));
      if (forced?.last && i === 4 && tier === 'ur') key = forced.last;
      else if (left.length) key = left[Math.floor(rnd() * left.length)];
      if (key) break;
      tier = tier === 'ur' ? 'r' : 'c';
    }
    used.add(key); out.push({ key, tier });
  }
  return out.map((c, i) => ({ ...c, i })).sort((a, b) => TIER_RANK[a.tier] - TIER_RANK[b.tier] || a.i - b.i);
}

/* ---------------- 小工具 ---------------- */
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };
const anim = (node, kf, opt) => node.animate(kf, { fill: 'forwards', ...opt }).finished.catch(() => {});
/** 高级卡演出主题色：传说两张各有主题（焰尾狐 火焰橙 / 金曜狮王 太阳金），稀有统一蓝紫 */
const THEME = {
  fox:  { ray: '255,170,90',  g1: '#ff7a2e', g2: '#ffc46b', g3: '#fff2d6', leak: '255,150,80',
          parts: ['rgba(255,140,60,0.95)', 'rgba(255,214,120,0.95)', 'rgba(255,250,235,0.95)', 'rgba(255,96,60,0.9)'],
          dust: ['rgba(255,200,120,0.9)', 'rgba(255,236,190,0.9)', 'rgba(255,150,80,0.85)'],
          flare: ['rgba(255,170,90,1)', 'rgba(255,214,150,1)'], ring: ['rgba(255,190,120,1)', 'rgba(255,240,210,1)', 'rgba(255,130,70,1)'] },
  lion: { ray: '255,222,130', g1: '#d99a12', g2: '#ffe27a', g3: '#fffbe8', leak: '255,214,110',
          parts: ['rgba(255,214,90,0.95)', 'rgba(255,248,214,0.95)', 'rgba(255,190,60,0.9)', 'rgba(255,255,255,0.9)'],
          dust: ['rgba(255,226,140,0.9)', 'rgba(255,248,214,0.9)', 'rgba(255,200,90,0.85)'],
          flare: ['rgba(255,214,110,1)', 'rgba(255,240,190,1)'], ring: ['rgba(255,226,140,1)', 'rgba(255,252,235,1)', 'rgba(255,190,80,1)'] },
  rare: { ray: '170,190,255', leak: '140,160,255',
          parts: ['rgba(170,200,255,0.95)', 'rgba(205,170,255,0.95)', 'rgba(240,245,255,0.95)', 'rgba(140,220,255,0.9)'],
          ring: ['rgba(170,195,255,1)', 'rgba(215,190,255,1)'] },
};
const STAR = 'M50 4 C54 38 62 46 96 50 C62 54 54 62 50 96 C46 62 38 54 4 50 C38 46 46 38 50 4Z';

/* ---------------- 音效（WebAudio 程序化生成，默认关闭） ---------------- */
const SOUND_KEY = 'holo-card:all-in-one:sound';
const sound = {
  on: false, ctx: null, master: null,
  init() {
    if (this.ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.gain.value = 0.22; this.master.connect(this.ctx.destination);
    return true;
  },
  noise(dur) {
    const c = this.ctx, b = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = c.createBufferSource(); s.buffer = b; return s;
  },
  env(g, t, a, peak, decay) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + decay); },
  tone(freq, t, dur, type = 'sine', peak = 0.4) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = freq; this.env(g, t, 0.01, peak, dur);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + dur + 0.05);
  },
  play(name) {
    if (!this.on || !this.ctx) return;
    const c = this.ctx, t = c.currentTime + 0.01;
    if (c.state === 'suspended') c.resume();
    if (name === 'tear') {            // 撕纸：带通噪声，中心频率下滑
      const n = this.noise(0.35), f = c.createBiquadFilter(), g = c.createGain();
      f.type = 'bandpass'; f.Q.value = 0.9; f.frequency.setValueAtTime(3200, t); f.frequency.exponentialRampToValueAtTime(700, t + 0.3);
      this.env(g, t, 0.015, 0.9, 0.3); n.connect(f).connect(g).connect(this.master); n.start(t);
    } else if (name === 'flip' || name === 'whoosh') {   // 翻牌：短促的高通噪声
      const n = this.noise(0.16), f = c.createBiquadFilter(), g = c.createGain();
      f.type = 'highpass'; f.frequency.value = name === 'flip' ? 2400 : 900;
      this.env(g, t, 0.01, name === 'flip' ? 0.5 : 0.35, 0.13); n.connect(f).connect(g).connect(this.master); n.start(t);
    } else if (name === 'rare') {     // 稀有：两声铃音
      this.tone(988, t, 0.6, 'sine', 0.3); this.tone(1480, t + 0.09, 0.8, 'sine', 0.22);
    } else if (name === 'riser') {    // 传说前奏：低通噪声上扫
      const n = this.noise(1.0), f = c.createBiquadFilter(), g = c.createGain();
      f.type = 'lowpass'; f.Q.value = 6; f.frequency.setValueAtTime(260, t); f.frequency.exponentialRampToValueAtTime(3600, t + 0.9);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.85); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
      n.connect(f).connect(g).connect(this.master); n.start(t);
    } else if (name === 'charge') {   // 传说蓄力（约 1.5 s）：次低频正弦上滑 + 低通噪声慢慢打开
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(38, t); o.frequency.exponentialRampToValueAtTime(96, t + 1.45);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.7, t + 1.35); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.55);
      o.connect(g).connect(this.master); o.start(t); o.stop(t + 1.6);
      const n = this.noise(1.6), f = c.createBiquadFilter(), g2 = c.createGain();
      f.type = 'lowpass'; f.Q.value = 5; f.frequency.setValueAtTime(180, t); f.frequency.exponentialRampToValueAtTime(2600, t + 1.45);
      g2.gain.setValueAtTime(0.0001, t); g2.gain.exponentialRampToValueAtTime(0.35, t + 1.4); g2.gain.exponentialRampToValueAtTime(0.0001, t + 1.55);
      n.connect(f).connect(g2).connect(this.master); n.start(t);
    } else if (name === 'boom') {     // 爆发：低频冲击 + 一口短促的噪声
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(36, t + 0.5);
      this.env(g, t, 0.006, 0.95, 0.9); o.connect(g).connect(this.master); o.start(t); o.stop(t + 1);
      const n = this.noise(0.6), f = c.createBiquadFilter(), g2 = c.createGain();
      f.type = 'lowpass'; f.frequency.setValueAtTime(5000, t); f.frequency.exponentialRampToValueAtTime(400, t + 0.5);
      this.env(g2, t, 0.004, 0.5, 0.5); n.connect(f).connect(g2).connect(this.master); n.start(t);
    } else if (name === 'title') {    // 字样入场：一串上行的铃音
      [1568, 1976, 2349, 2637, 3136].forEach((fq, i) => this.tone(fq, t + i * 0.06, 0.9, 'sine', 0.09));
    } else if (name === 'shimmer') {  // 稀有冲击波：柔和的高频气声
      const n = this.noise(0.7), f = c.createBiquadFilter(), g = c.createGain();
      f.type = 'bandpass'; f.Q.value = 1.4; f.frequency.setValueAtTime(5200, t); f.frequency.exponentialRampToValueAtTime(2200, t + 0.6);
      this.env(g, t, 0.02, 0.28, 0.6); n.connect(f).connect(g).connect(this.master); n.start(t);
    } else if (name === 'legend') {   // 传说：大三和弦 + 高八度闪光
      [523.25, 659.25, 783.99, 1046.5].forEach((fq, i) => { this.tone(fq, t + i * 0.035, 1.6, 'triangle', 0.18); this.tone(fq * 2.003, t + i * 0.035, 1.1, 'sine', 0.06); });
    }
  },
};
try { sound.on = localStorage.getItem(SOUND_KEY) === '1'; } catch { /* 忽略 */ }
const buzz = (p) => { try { navigator.vibrate?.(p); } catch { /* 部分浏览器在无手势时抛错 */ } };

/* ---------------- 粒子 / 轨迹 / 冲击波 / 镜头光斑（Canvas 2D） ----------------
   全部用预渲染的柔边精灵（径向渐变 / 逐像素 smoothstep），叠加模式 lighter，任何一层都没有硬边。
   只在有东西要画时跑 rAF；页面隐藏时浏览器自动暂停 rAF。
   粒子数按屏幕面积 / DPR 自适应（base），运行中再按实测帧时间降级（adapt）。 */
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function createFx(canvas) {
  const ctx = canvas.getContext('2d');
  let W = 1, H = 1, dpr = 1, raf = 0, last = 0, base = 1, adapt = 1, ema = 16.7, sinceAdj = 0;
  const parts = [], trail = [], rings = [], flares = [], emitters = new Map();
  const TRAIL_MS = 900;   // 轨迹余辉时长
  const stats = { frames: 0, sum: 0, worst: 0, peak: 0, list: [], cost: [] };
  const sprites = {};
  const rgb = (c) => c.match(/[\d.]+/g).map(Number);
  const make = (key, s, fn) => {
    if (sprites[key]) return sprites[key];
    const c = document.createElement('canvas'); c.width = c.height = s; fn(c.getContext('2d'), s);
    return (sprites[key] = c);
  };
  /** 柔光点：白芯 + 彩色 + 渐隐到 0 */
  const dot = (color) => make('d' + color, 64, (g, s) => {
    const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2), [R, G, B, A = 1] = rgb(color);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.18, `rgba(${R},${G},${B},${A})`);
    r.addColorStop(0.5, `rgba(${R},${G},${B},0.25)`); r.addColorStop(1, `rgba(${R},${G},${B},0)`);
    g.fillStyle = r; g.fillRect(0, 0, s, s);
  });
  /** 逐像素精灵（alpha 由函数给出，边缘 smoothstep 到 0） */
  const pix = (key, s, color, fn) => make(key + color, s, (g) => {
    const [R, G, B] = rgb(color), im = g.createImageData(s, s), d = im.data;
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const u = (x + 0.5) / s * 2 - 1, v = (y + 0.5) / s * 2 - 1, [a, w] = fn(u, v), i = (y * s + x) * 4;
      d[i] = R + (255 - R) * w; d[i + 1] = G + (255 - G) * w; d[i + 2] = B + (255 - B) * w; d[i + 3] = Math.round(255 * Math.min(1, a));
    }
    g.putImageData(im, 0, 0);
  });
  /** 水晶 / 光片：细长菱形，芯偏白，外沿羽化 + 一圈很淡的光晕 */
  const shard = (color) => pix('s', 48, color, (u, v) => {
    const k = Math.abs(u) / 0.36 + Math.abs(v) / 0.92;
    return [(1 - smooth(0.55, 1, k)) * 0.95 + Math.exp(-(u * u + v * v) * 6) * 0.3, (1 - smooth(0, 0.7, k)) * 0.75];
  });
  /** 四芒星闪光：高斯芯 + 两条高斯截面的光芒，整体在边缘前衰减完 */
  const star = (color) => pix('t', 64, color, (u, v) => {
    const r2 = u * u + v * v, edge = 1 - smooth(0.6, 1, Math.sqrt(r2));
    const a = Math.exp(-r2 * 22) + 0.7 * Math.exp(-Math.abs(u) * 5) * Math.exp(-v * v * 260) + 0.7 * Math.exp(-Math.abs(v) * 5) * Math.exp(-u * u * 260);
    return [a * edge, Math.exp(-r2 * 30)];
  });
  /** 冲击波环：中空，环的内外两侧都是长渐变 */
  const ring = (color) => make('r' + color, 256, (g, s) => {
    const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2), [R, G, B] = rgb(color), c = (a) => `rgba(${R},${G},${B},${a})`;
    r.addColorStop(0, c(0)); r.addColorStop(0.55, c(0)); r.addColorStop(0.7, c(0.12)); r.addColorStop(0.8, c(0.5)); r.addColorStop(0.86, c(0.62));
    r.addColorStop(0.91, c(0.36)); r.addColorStop(0.96, c(0.08)); r.addColorStop(1, c(0));
    g.fillStyle = r; g.fillRect(0, 0, s, s);
  });

  const resize = () => {
    W = canvas.clientWidth || 1; H = canvas.clientHeight || 1;
    const small = Math.min(W, H) < 520;
    dpr = Math.min(small ? 1.5 : 2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    // 粒子预算：按屏幕面积开方缩放（360×740 ≈ 0.57），高 DPR 手机再打 8 折
    base = Math.min(1, Math.max(0.42, Math.sqrt(W * H / (1280 * 800)))) * ((window.devicePixelRatio || 1) > 2.5 ? 0.8 : 1);
  };
  const q = () => base * adapt;
  const cap = () => Math.round(700 * base);

  function drawParticle(p, now) {
    const k = p.life / p.max;
    let a = Math.min(1, k * 1.6) * p.a * Math.min(1, (p.max - p.life) / (p.fadeIn || 0.0001));
    if (p.home) a *= Math.min(1, Math.max(0, (Math.hypot(p.home.x - p.x, p.home.y - p.y) - p.home.kill) / 50));
    if (p.tw) a *= 0.7 + 0.3 * Math.sin(now / 1000 * p.tw + p.ph);
    if (a <= 0.003) return;
    const sz = p.size * (p.shrink ? 0.55 + 0.45 * k : 1);
    ctx.globalAlpha = Math.min(1, a);
    if (p.kind === 'streak') {
      const sp = Math.hypot(p.vx, p.vy), L = Math.min(sz * 7, Math.max(sz, sp * p.tail));
      const c = p.vx / (sp || 1), s = p.vy / (sp || 1);
      ctx.setTransform(dpr * c, dpr * s, -dpr * s, dpr * c, dpr * p.x, dpr * p.y);
      ctx.drawImage(dot(p.color), -L + sz / 2, -sz / 2, L, sz);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    } else if (p.kind === 'shard') {
      const c = Math.cos(p.rot), s = Math.sin(p.rot);
      ctx.globalAlpha = Math.min(1, a * (0.35 + 0.65 * Math.abs(Math.cos(p.rot * 1.7))));   // 翻转时闪一下
      ctx.setTransform(dpr * c, dpr * s, -dpr * s, dpr * c, dpr * p.x, dpr * p.y);
      ctx.drawImage(shard(p.color), -sz / 2, -sz / 2, sz, sz);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    } else {
      ctx.drawImage(p.kind === 'star' ? star(p.color) : dot(p.color), p.x - sz / 2, p.y - sz / 2, sz, sz);
    }
  }

  const frame = (now) => {
    raf = 0;
    const c0 = performance.now();
    const raw = now - last; last = now;
    const dt = Math.min(0.05, raw / 1000 || 0.016);
    if (raw > 0 && raw < 250) {                                   // 帧时间统计 + 自适应降级
      stats.frames++; stats.sum += raw; stats.worst = Math.max(stats.worst, raw);
      if (stats.list.length < 4000) stats.list.push(raw);
      ema = ema * 0.92 + raw * 0.08;
      if (++sinceAdj > 40 && ema > 24 && adapt > 0.4) { adapt = Math.max(0.4, adapt * 0.8); sinceAdj = 0; }
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    // 发射器（蓄力吸入、飘落光尘……）
    for (const [, e] of emitters) {
      e.t += dt;
      e.acc += (typeof e.rate === 'function' ? e.rate(e.t) : e.rate) * q() * dt;
      while (e.acc >= 1) { e.acc--; if (parts.length < cap()) parts.push(e.spawn(W, H)); }
    }
    // 撕包轨迹
    const t = performance.now();
    while (trail.length && t - trail[0].t > TRAIL_MS) trail.shift();
    for (let i = 1; i < trail.length; i++) {
      const a = trail[i - 1], b = trail[i], k = 1 - (t - b.t) / TRAIL_MS;
      const d = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(1, Math.ceil(d / 5));
      for (let j = 0; j < n; j++) {
        const x = a.x + (b.x - a.x) * j / n, y = a.y + (b.y - a.y) * j / n, sz = 40 * (0.45 + 0.55 * k);
        ctx.globalAlpha = 0.42 * k ** 1.6; ctx.drawImage(dot('rgba(200,170,255,0.9)'), x - sz / 2, y - sz / 2, sz, sz);
        ctx.globalAlpha = 0.75 * k ** 1.6; ctx.drawImage(dot('rgba(255,240,210,0.95)'), x - sz / 5, y - sz / 5, sz / 2.5, sz / 2.5);
      }
    }
    // 冲击波
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      if (r.delay > 0) { r.delay -= dt; continue; }
      r.life -= dt; if (r.life <= 0) { rings.splice(i, 1); continue; }
      const k = 1 - r.life / r.max, e = 1 - (1 - k) ** 3, R = r.r0 + (r.r1 - r.r0) * e;
      ctx.globalAlpha = r.a * (1 - k) ** 1.3 * Math.min(1, k * 12);
      ctx.drawImage(ring(r.color), r.x - R, r.y - R, R * 2, R * 2);
    }
    // 镜头光斑：横向拉长的柔光（变形镜头感）+ 一串柔和的鬼影
    for (let i = flares.length - 1; i >= 0; i--) {
      const f = flares[i];
      f.life -= dt; if (f.life <= 0) { flares.splice(i, 1); continue; }
      const k = 1 - f.life / f.max, fade = Math.min(1, k * 8) * (1 - k) ** 1.6;
      // 横向椭圆光晕（高宽比 ≈ 1:6，故意做胖，避免出现一条细直的亮线）
      const m = Math.min(W, H), sw = m * (0.9 + 0.35 * k), sh = m * 0.15;
      ctx.globalAlpha = 0.32 * fade; ctx.drawImage(dot(f.colors[0]), f.x - sw / 2, f.y - sh / 2, sw, sh);
      const bs = Math.min(W, H) * 0.5; ctx.globalAlpha = 0.45 * fade; ctx.drawImage(dot(f.colors[1]), f.x - bs / 2, f.y - bs / 2, bs, bs);
      for (const [d, s, ci, a] of f.ghosts) {
        const gx = f.x + f.dx * d * (1 + k * 0.15), gy = f.y + f.dy * d * (1 + k * 0.15);
        ctx.globalAlpha = a * fade; ctx.drawImage(ring(f.colors[ci]), gx - s, gy - s, s * 2, s * 2);
        ctx.globalAlpha = a * 0.5 * fade; ctx.drawImage(dot(f.colors[ci]), gx - s * 0.8, gy - s * 0.8, s * 1.6, s * 1.6);
      }
    }
    // 粒子
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      if (p.home) {                                     // 吸入：朝目标加速，进到卡缘就消失
        const dx = p.home.x - p.x, dy = p.home.y - p.y, d = Math.hypot(dx, dy) || 1;
        if (d < p.home.kill) { parts.splice(i, 1); continue; }
        p.vx += dx / d * p.home.acc * dt; p.vy += dy / d * p.home.acc * dt;
      }
      const dr = Math.pow(p.drag, dt * 60);
      p.vx *= dr; p.vy = p.vy * dr + p.g * dt;
      if (p.sway) p.vx += Math.sin(now / 1000 * p.swf + p.ph) * p.sway * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.vr) p.rot += p.vr * dt;
      drawParticle(p, now);
    }
    stats.peak = Math.max(stats.peak, parts.length);
    if (stats.cost.length < 4000) stats.cost.push(performance.now() - c0);   // 本帧画粒子花的主线程时间
    ctx.globalAlpha = 1;
    if (parts.length || trail.length || rings.length || flares.length || emitters.size) raf = requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, W, H);
  };
  const kick = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  const R = (a, b) => a + Math.random() * (b - a);
  const pick = (arr, i) => arr[i % arr.length];
  return {
    resize,
    get scale() { return q(); },
    trailPoint(x, y) { trail.push({ x, y, t: performance.now() }); kick(); },
    /** 迸发：kind = dot | streak（带拖尾）| shard（水晶片）| star（四芒星） */
    burst(x, y, { count = 120, speed = [180, 620], colors, spread = Math.PI * 2, dir = -Math.PI / 2, size = [5, 16], life = [0.8, 1.7], g = 140,
      kind = 'dot', drag = [0.955, 0.975], tail = 0.06, twinkle = true, spin = 0, r0 = 0 } = {}) {
      const n = Math.round(count * q());
      colors ??= ['rgba(255,226,150,0.95)', 'rgba(255,255,255,0.95)', 'rgba(255,170,210,0.9)', 'rgba(190,170,255,0.9)'];
      for (let i = 0; i < n && parts.length < cap(); i++) {
        const ang = dir + (Math.random() - 0.5) * spread, sp = R(speed[0], speed[1]), max = R(life[0], life[1]), rr = R(0, r0);
        parts.push({ kind, x: x + Math.cos(ang) * rr, y: y + Math.sin(ang) * rr, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, g, drag: R(drag[0], drag[1]),
          size: R(size[0], size[1]), color: pick(colors, i), life: max, max, a: R(0.55, 0.95), tail, shrink: true,
          tw: twinkle ? R(6, 16) : 0, ph: R(0, 6.3), rot: R(0, 6.3), vr: spin ? R(-spin, spin) : 0 });
      }
      kick();
    },
    /** 冲击波环（柔边） */
    ring(x, y, { r0 = 20, r1 = 400, life = 0.9, color = 'rgba(255,230,170,1)', a = 0.8, delay = 0 } = {}) {
      rings.push({ x, y, r0, r1, life, max: life, color, a, delay: delay / 1000 }); kick();
    },
    /** 镜头光斑 */
    flare(x, y, colors, life = 1.5) {
      const ang = -0.6, s = Math.min(W, H);
      flares.push({ x, y, life, max: life, colors, dx: Math.cos(ang) * s * 0.18, dy: Math.sin(ang) * s * 0.18,
        ghosts: [[-1.6, s * 0.05, 1, 0.16], [-0.9, s * 0.025, 0, 0.2], [1.1, s * 0.035, 0, 0.18], [1.9, s * 0.07, 1, 0.12], [2.6, s * 0.03, 0, 0.14]] });
      kick();
    },
    /** 持续发射器：rate = 每秒个数（或随时间变化的函数），spawn(W,H) 返回一个粒子 */
    emit(name, rate, spawn) { emitters.set(name, { rate, spawn, acc: 0, t: 0 }); kick(); },
    stopEmit(name) { emitters.delete(name); },
    /** 蓄力吸入粒子：从卡片周围一圈生成，朝 (x,y) 加速 */
    inward(x, y, { r = [160, 300], kill = 60, colors, size = [3, 7], acc = 900, kind = 'streak' } = {}) {
      return () => {
        const ang = Math.random() * Math.PI * 2, rr = R(r[0], r[1]), sp = R(10, 60);
        return { kind, x: x + Math.cos(ang) * rr, y: y + Math.sin(ang) * rr, vx: -Math.sin(ang) * sp, vy: Math.cos(ang) * sp, g: 0, drag: 0.985,
          size: R(size[0], size[1]), color: pick(colors, Math.floor(Math.random() * 9)), life: 2.2, max: 2.2, a: R(0.5, 0.9), tail: 0.05, fadeIn: 0.25,
          home: { x, y, kill, acc } };
      };
    },
    /** 飘落的光尘 */
    dust(colors) {
      return (w, h) => {
        const max = R(5, 8);
        return { kind: Math.random() < 0.3 ? 'star' : 'dot', x: R(0, w), y: R(-20, h * 0.45), vx: R(-8, 8), vy: R(14, 38), g: 0, drag: 1,
          size: R(3, 8), color: pick(colors, Math.floor(Math.random() * 9)), life: max, max, a: R(0.35, 0.75), fadeIn: 1.2,
          tw: R(2, 5), ph: R(0, 6.3), sway: R(4, 10), swf: R(0.6, 1.4) };
      };
    },
    /** 收尾：剩下的粒子在 sec 秒内淡出（不突然消失），之后循环自然停止 */
    fadeOut(sec = 0.6) { for (const p of parts) if (p.life > sec) { p.max = p.max * sec / p.life; p.life = sec; } emitters.clear(); },
    /** 预热精灵（逐像素生成的那几种第一次用时要几十毫秒，提前在空闲时做掉） */
    warm(colors) { for (const c of colors) { dot(c); shard(c); star(c); ring(c); } },
    clear() { parts.length = 0; trail.length = 0; rings.length = 0; flares.length = 0; emitters.clear(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); },
    get busy() { return !!raf; },
    get running() { return !!raf; },
    stats() {
      const l = stats.list.slice().sort((a, b) => a - b), p = (x) => l.length ? +l[Math.min(l.length - 1, Math.floor(l.length * x))].toFixed(1) : 0;
      const cs = stats.cost.slice().sort((a, b) => a - b), cp = (x) => cs.length ? +cs[Math.min(cs.length - 1, Math.floor(cs.length * x))].toFixed(2) : 0;
      return { drawMsP50: cp(0.5), drawMsP95: cp(0.95), drawMsMax: cs.length ? +cs[cs.length - 1].toFixed(2) : 0, frames: stats.frames, avgFps: stats.frames ? +(1000 / (stats.sum / stats.frames)).toFixed(1) : 0, p50Ms: p(0.5), p95Ms: p(0.95), worstMs: +stats.worst.toFixed(1),
        peakParticles: stats.peak, base: +base.toFixed(2), adapt: +adapt.toFixed(2), dpr };
    },
    resetStats() { stats.frames = 0; stats.sum = 0; stats.worst = 0; stats.peak = 0; stats.list = []; stats.cost = []; },
  };
}

/* =========================================================
   覆盖层
   ========================================================= */
export function createPack(host) {
  const { reduceMotion, Spring } = host;
  const RM = () => reduceMotion.matches;
  let uid = 0;

  /* ----- DOM ----- */
  const root = el('div', 'pk');
  root.hidden = true;
  root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', '开卡包');
  root.innerHTML = `
    <div class="pk__bg"></div>
    <div class="pk__dim"></div>
    <div class="pk__rays"></div>
    <div class="pk__rays pk__rays--b"></div>
    <div class="pk__beam"></div>
    <div class="pk__stage"></div>
    <canvas class="pk__fx" aria-hidden="true"></canvas>
    <div class="pk__glow"></div>
    <div class="pk__flash"></div>
    <div class="pk__title" aria-hidden="true"></div>
    <div class="pk__badge" aria-hidden="true"></div>
    <div class="pk__bar">
      <button type="button" class="pk__back">← 返回</button>
      <button type="button" class="pk__sound" aria-pressed="false">音效：关</button>
    </div>
    <p class="pk__hint" aria-live="polite"></p>
    <div class="pk__actions"></div>
    <section class="pk__result" hidden aria-label="本包结果"></section>
    <div class="pk__zoom" hidden role="dialog" aria-label="放大查看"></div>`;
  document.body.appendChild(root);
  const $ = (s) => root.querySelector(s);
  const stage = $('.pk__stage'), hint = $('.pk__hint'), actions = $('.pk__actions'), result = $('.pk__result'), zoom = $('.pk__zoom');
  const dim = $('.pk__dim'), beam = $('.pk__beam'), rays = $('.pk__rays'), raysB = $('.pk__rays--b'), glow = $('.pk__glow'), badge = $('.pk__badge');
  const flash = $('.pk__flash'), title = $('.pk__title');
  const fx = createFx($('.pk__fx'));
  const soundBtn = $('.pk__sound');
  const syncSound = () => { soundBtn.textContent = '音效：' + (sound.on ? '开' : '关'); soundBtn.setAttribute('aria-pressed', String(sound.on)); };
  syncSound();
  soundBtn.addEventListener('click', () => {
    sound.on = !sound.on;
    if (sound.on && !sound.init()) { sound.on = false; host.toast('当前浏览器不支持 WebAudio'); }
    try { localStorage.setItem(SOUND_KEY, sound.on ? '1' : '0'); } catch { /* 忽略 */ }
    if (sound.on) sound.play('flip');
    syncSound();
  });
  $('.pk__back').addEventListener('click', () => close());
  window.addEventListener('resize', () => { if (!root.hidden) fx.resize(); });
  // 只有用键盘操作时才显示卡堆的焦点光晕
  root.addEventListener('pointerdown', () => root.classList.remove('kbd'), true);
  root.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' || e.key === 'Enter' || e.key === ' ' || e.key.startsWith('Arrow')) root.classList.add('kbd');
    if (e.key === 'Escape') { e.preventDefault(); if (!zoom.hidden) closeZoom(); else close(); }
  });

  /* ----- 状态 ----- */
  let state = 'idle', seed = '', pulls = [], cards = [], idx = 0, busy = false, run = 0, lastFocus = null;

  /* ----- 卡面 ----- */
  /** 复制页面上的 CSS 卡：SVG 里的 id 全部加后缀，避免与原卡重复（原卡在 WebGL 模式下是 display:none，引用会失效） */
  function cloneCard(key) {
    const tpl = host.templates[key];
    let html = tpl.outerHTML;
    const n = ++uid;
    for (const id of new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]))) {
      const nid = `${id}-pk${n}`;
      html = html.replaceAll(`id="${id}"`, `id="${nid}"`).replaceAll(`url(#${id})`, `url(#${nid})`).replaceAll(`href="#${id}"`, `href="#${nid}"`);
    }
    const t = document.createElement('template'); t.innerHTML = html;
    const c = t.content.firstElementChild;
    c.removeAttribute('style'); c.classList.remove('is-off');
    return c;
  }
  function commonCard(id) {
    const c = COMMONS.find(x => x.id === id), n = ++uid;
    const svg = c.svg.replaceAll('id="cg"', `id="cg-${n}"`).replaceAll('url(#cg)', `url(#cg-${n})`);
    const t = document.createElement('template');
    t.innerHTML = `<div class="card card--common" data-card="common" data-effect="none" data-mask="none" data-break="none"
      style="--frame:${c.frame};--art-bg:${c.art};--panel:${c.panel};--ink:${c.ink};--win-fill:#111">
      <div class="card__rotator">
        <div class="layer layer--shadow"></div>
        <div class="layer layer--edge"></div>
        <div class="layer layer--frame">
          <div class="win"><div class="win__bg"><svg viewBox="0 0 320 260" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${svg}</svg></div></div>
          <div class="glare"></div><div class="card__rim"></div>
        </div>
        <div class="layer layer--text">
          <div class="card__head"><span>${c.name}</span><small>HP ${c.hp}</small></div>
          <div class="card__body"><b>${c.move}</b>${c.text}</div>
          <div class="card__foot"><span>All-in-one · Common</span><span>普通 ●</span></div>
        </div>
      </div></div>`;
    return t.content.firstElementChild;
  }
  const makeFace = (p) => (p.tier === 'c' ? commonCard(p.key) : cloneCard(p.key));
  const backHTML = `<div class="pk-back"><svg viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="40" fill="none" stroke="#f3d98a" stroke-width="2.4"/><circle cx="50" cy="50" r="45" fill="none" stroke="#f3d98a" stroke-width=".9" opacity=".7"/>
      <path d="${STAR}" fill="#f7e2a0" transform="translate(14 14) scale(.72)"/>
      <path d="${STAR}" fill="rgba(247,226,160,.75)" transform="rotate(45 50 50) translate(27 27) scale(.46)"/></svg>
      <b>HOLO CARD</b><div class="pk-sheen"></div></div>`;

  /* ----- 卡包 ----- */
  const TEAR_Y = 15;   // 撕口位置（包高 %）
  /** 锯齿封口 + 撕口折线（两半共用同一条撕口，拼起来严丝合缝） */
  function packClips(rnd) {
    const zig = (y0, dir) => { const pts = []; for (let i = 0; i <= 24; i++) pts.push(`${(i / 24 * 100).toFixed(2)}% ${(y0 + (i % 2 ? dir * 1.6 : 0)).toFixed(2)}%`); return pts; };
    const tear = []; for (let i = 0; i <= 28; i++) tear.push([i / 28 * 100, TEAR_Y + (i % 2 ? 0.9 : -0.6) + (rnd() - 0.5) * 1.2]);
    const top = [...zig(0, 1), ...tear.slice().reverse().map(([x, y]) => `${x.toFixed(2)}% ${y.toFixed(2)}%`)];
    const body = [...tear.map(([x, y]) => `${x.toFixed(2)}% ${y.toFixed(2)}%`), ...zig(100, -1).reverse()];
    return { top: `polygon(${top.join(',')})`, body: `polygon(${body.join(',')})` };
  }
  const packArt = `<div class="pk-art">
      <div class="pk-art__title"><b>全息闪卡</b><span>HOLO CARD</span></div>
      <svg class="pk-art__emblem" viewBox="0 0 100 100" aria-hidden="true">
        <defs><radialGradient id="pk-halo"><stop offset="0" stop-color="#fff2c4" stop-opacity=".5"/><stop offset="1" stop-color="#fff2c4" stop-opacity="0"/></radialGradient></defs>
        <circle cx="50" cy="50" r="48" fill="url(#pk-halo)"/>
        <circle cx="50" cy="50" r="33" fill="none" stroke="#f3d98a" stroke-width="1.6" opacity=".85"/>
        <path d="${STAR}" fill="#f7e2a0" transform="translate(20 20) scale(.6)"/>
        <path d="${STAR}" fill="rgba(255,214,240,.8)" transform="rotate(45 50 50) translate(31 31) scale(.38)"/>
      </svg>
      <div class="pk-art__foot">汇总版 · 第 1 弹<br><i>每包 5 张</i></div>
      <div class="pk-art__foil"></div><div class="pk-art__glare"></div>
    </div>`;
  let pack = null;
  function buildPack() {
    const rnd = rngFrom(seed + ':pack'), clips = packClips(rnd);
    const p = el('div', 'pk-pack');
    p.style.setProperty('--tear-y', TEAR_Y);
    p.innerHTML = `<div class="pk-pack__tilt">
        <div class="pk-pack__half pk-pack__half--body"><div class="pk-pack__clip" style="clip-path:${clips.body}">${packArt}</div></div>
        <div class="pk-pack__half pk-pack__half--top"><div class="pk-pack__clip" style="clip-path:${clips.top}">${packArt.replace('id="pk-halo"', 'id="pk-halo2"').replace('url(#pk-halo)', 'url(#pk-halo2)')}</div></div>
        <div class="pk-pack__tear"></div>
      </div>`;
    p.setAttribute('role', 'button'); p.setAttribute('tabindex', '0'); p.setAttribute('aria-label', '卡包：按回车撕开');
    stage.appendChild(p);
    // 跟随指针的微倾斜 + 箔面反光（弹簧，与卡片同一手感；静止后停帧）
    const sp = new Spring({ rx: 0, ry: 0, px: 50, py: 50, o: 0.35 }, host.CONFIG.follow);
    let raf = 0, last = 0;
    const render = () => { for (const k of ['rx', 'ry', 'px', 'py', 'o']) p.style.setProperty('--' + k, sp.value[k].toFixed(2)); };
    const loop = (now) => { const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now; const m = sp.step(dt); render(); raf = m ? requestAnimationFrame(loop) : 0; };
    const kick = () => { if (RM()) { sp.jump(); render(); return; } if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); } };
    pack = { el: p, top: p.querySelector('.pk-pack__half--top'), body: p.querySelector('.pk-pack__half--body'), tear: p.querySelector('.pk-pack__tear'),
      aim(px, py) { const k = RM() ? 0 : 1; sp.set({ rx: -(px - 50) / 50 * 9 * k, ry: (py - 50) / 50 * 7 * k, px, py, o: 1 }, host.CONFIG.follow); kick(); },
      rest() { sp.set({ rx: 0, ry: 0, px: 50, py: 50, o: 0.35 }, host.CONFIG.settle); kick(); },
      stop() { cancelAnimationFrame(raf); raf = 0; } };
    p.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tearOpen(); } });
    return pack;
  }

  /* ----- 撕包手势：在撕口附近按住横向划过 ----- */
  let stroke = null;
  stage.addEventListener('pointerdown', (e) => {
    if (state !== 'pack') return;
    const r = stage.getBoundingClientRect();
    stroke = { id: e.pointerId, min: Infinity, max: -Infinity, r };
    try { stage.setPointerCapture(e.pointerId); } catch { /* 忽略 */ }
    onStroke(e);
  });
  stage.addEventListener('pointermove', (e) => {
    if (state !== 'pack') return;
    const r = stage.getBoundingClientRect();
    if (!stroke && e.pointerType === 'mouse') pack?.aim(((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100);
    if (stroke && e.pointerId === stroke.id) onStroke(e);
  });
  const endStroke = (e) => {
    if (!stroke || e.pointerId !== stroke.id) return;
    const prog = (stroke.max - stroke.min) / stroke.r.width;
    stroke = null;
    if (state === 'pack' && prog > 0.12) setHint('再划长一点：从包的一侧划到另一侧');
  };
  stage.addEventListener('pointerup', endStroke);
  stage.addEventListener('pointercancel', endStroke);
  stage.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && !stroke && state === 'pack') pack?.rest(); });
  function onStroke(e) {
    const r = stroke.r, x = e.clientX - r.left, y = e.clientY - r.top;
    const host2 = root.getBoundingClientRect();
    fx.trailPoint(e.clientX - host2.left, e.clientY - host2.top);
    pack?.aim((x / r.width) * 100, (y / r.height) * 100);
    // 撕口带：撕口上下各 9% 包高，再给手指留 18px 余量
    const band = r.height * 0.09 + 18, ty = r.height * TEAR_Y / 100;
    if (Math.abs(y - ty) <= band && x >= -20 && x <= r.width + 20) {
      stroke.min = Math.min(stroke.min, x); stroke.max = Math.max(stroke.max, x);
      if ((stroke.max - stroke.min) / r.width >= 0.7) { stroke = null; tearOpen(); }
    }
  }

  /* ----- 流程 ----- */
  function setHint(t) { hint.textContent = t; }
  function setActions(list) {
    actions.innerHTML = '';
    for (const [label, fn, cls] of list) { const b = el('button', cls || '', label); b.type = 'button'; b.addEventListener('click', fn); actions.appendChild(b); }
    return actions.querySelector('button');
  }
  function resetScene() {
    run++;
    stage.innerHTML = ''; result.hidden = true; result.innerHTML = ''; closeZoom(true);
    clearShow(); clearOmen(); perf = null;
    for (const n of [dim, beam, rays, raysB, glow, flash, badge]) { n.getAnimations().forEach(a => a.cancel()); n.style.opacity = 0; }
    rays.classList.remove('spin'); raysB.classList.remove('spin');
    fx.clear(); fx.resetStats(); stroke = null; pack?.stop(); pack = null; cards = []; idx = 0; busy = false;
    stage.hidden = false; hint.hidden = false; actions.hidden = false;
  }

  function open(s) {
    seed = (s && String(s).trim()) || randomSeed();
    pulls = drawPack(seed);
    if (root.hidden) {
      lastFocus = document.activeElement;
      root.hidden = false;
      host.setOpen(true, s ? seed : '');
      if (!RM()) anim(root, [{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: 'ease-out' });
    } else host.setOpen(true, s ? seed : '');
    fx.resize();
    resetScene();
    state = 'pack';
    buildPack();
    if (!RM()) anim(pack.el, [{ transform: 'translateY(40px) scale(.92)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 520, easing: 'cubic-bezier(.2,.9,.3,1.15)' });
    setHint('沿卡包顶部的光点虚线划开（从一侧划到另一侧）');
    const first = setActions([['撕开卡包', () => tearOpen(), 'primary']]);
    first.focus({ preventScroll: true });
  }

  async function close() {
    if (root.hidden) return;
    const my = ++run;
    closeZoom(true);
    if (!RM()) await anim(root, [{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: 'ease-in' });
    if (my !== run) return;
    root.getAnimations().forEach(a => a.cancel());
    resetScene();
    state = 'idle';
    root.hidden = true;
    host.setOpen(false);
    lastFocus?.focus?.({ preventScroll: true });
  }

  async function tearOpen() {
    if (state !== 'pack') return;
    state = 'tearing';
    const my = run;
    sound.play('tear'); if (!RM()) buzz(12);
    setHint(''); setActions([]);
    pack.tear.remove(); pack.stop();
    const rr = root.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    if (RM()) {
      await anim(pack.top, [{ opacity: 1 }, { opacity: 0 }], { duration: 250 });
    } else {
      // 撕口迸出一小串火花（柔光点），包头向右上方飞出并旋转
      fx.burst(sr.left - rr.left + sr.width / 2, sr.top - rr.top + sr.height * TEAR_Y / 100,
        { count: 36, speed: [120, 380], spread: Math.PI * 0.9, size: [4, 10], life: [0.4, 0.9], g: 260,
          colors: ['rgba(255,236,190,0.95)', 'rgba(210,190,255,0.9)'] });
      anim(pack.body, [{ transform: 'none' }, { transform: 'translateY(5px)' }, { transform: 'none' }], { duration: 300, easing: 'ease-out' });
      await anim(pack.top, [
        { transform: 'none', opacity: 1 },
        { transform: 'translate(8%, -10%) rotate(6deg)', opacity: 1, offset: 0.25 },
        { transform: 'translate(70%, -120%) rotate(28deg)', opacity: 0 },
      ], { duration: 720, easing: 'cubic-bezier(.3,.6,.4,1)' });
    }
    if (my !== run) return;
    pack.top.remove();
    await drawCards(my);
  }

  /** 5 张卡从开口滑出 → 卡包落下淡出 → 卡叠成一摞 */
  async function drawCards(my) {
    state = 'draw';
    const stack = el('div', 'pk__stack');
    stack.setAttribute('tabindex', '0'); stack.setAttribute('role', 'button');
    stage.insertBefore(stack, pack.el);   // 卡在包身后面：从开口“探出来”
    const ch = () => stage.clientWidth / 1.12 * 88 / 63;   // 卡高（px）
    // 揭晓顺序 = pulls 顺序；第 0 张在最上面 → 倒序插入
    cards = pulls.map((p, i) => {
      const c = el('div', 'pk-card');
      c.innerHTML = `<div class="pk-card__flip"><div class="pk-face pk-face--back">${backHTML}</div><div class="pk-face pk-face--front" hidden></div></div>`;
      c.style.zIndex = String(10 - i);
      return { ...p, el: c, flip: c.firstElementChild, back: c.querySelector('.pk-face--back'), front: c.querySelector('.pk-face--front'), flipped: false };
    });
    for (const c of cards.slice().reverse()) stack.appendChild(c.el);
    const rest = (i) => `translate(${(i - 2) * 1.5}px, ${i * 2.5}px) rotate(${(i - 2) * 1.4}deg)`;
    if (RM()) {
      cards.forEach((c, i) => { c.el.style.transform = rest(i); });
      pack.el.remove();
      await anim(stack, [{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
    } else {
      const h = ch();
      sound.play('whoosh');
      // 起点：卡藏在包身里（顶边在撕口下方）
      const start = h * 0.62;
      await Promise.all(cards.map((c, i) => anim(c.el, [
        { transform: `translateY(${start}px)` },
        { transform: `translateY(${-h * 0.18 - i * 6}px) rotate(${(i - 2) * 2.5}deg)` },
      ], { duration: 620, delay: (4 - i) * 70, easing: 'cubic-bezier(.25,.8,.35,1)' })));
      if (my !== run) return;
      anim(pack.el, [{ transform: 'none', opacity: 1 }, { transform: 'translateY(55%) scale(.96)', opacity: 0 }], { duration: 480, easing: 'cubic-bezier(.5,0,.75,0)' });
      await Promise.all(cards.map((c, i) => anim(c.el, [
        { transform: `translateY(${-h * 0.18 - i * 6}px) rotate(${(i - 2) * 2.5}deg)` },
        { transform: rest(i) },
      ], { duration: 560, delay: 160 + i * 40, easing: 'cubic-bezier(.2,.9,.3,1.1)' })));
      pack.el.remove();
    }
    if (my !== run) return;
    for (const [i, c] of cards.entries()) { c.el.getAnimations().forEach(a => a.cancel()); c.el.style.transform = rest(i); }
    state = 'reveal';
    // 翻牌手势：点击 = 向右翻；左右滑动 = 朝滑动方向翻
    let down = null;
    stack.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId }; });
    stack.addEventListener('pointerup', (e) => {
      if (!down || e.pointerId !== down.id) return;
      const dx = e.clientX - down.x, dy = e.clientY - down.y; down = null;
      if (Math.abs(dx) > 36 && Math.abs(dx) > Math.abs(dy)) advance(dx > 0 ? 1 : -1);
      else if (Math.hypot(dx, dy) < 12) advance(1);
    });
    stack.addEventListener('pointercancel', () => { down = null; });
    stack.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') { e.preventDefault(); advance(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); advance(-1); }
    });
    stack.focus({ preventScroll: true });
    updateRevealUi();
    // 本包有高级卡时，趁空闲把演出要用的粒子精灵先画好，避免翻牌瞬间卡一下
    const themes = [...new Set(pulls.filter(p => p.tier !== 'c').map(p => (p.tier === 'r' ? THEME.rare : THEME[p.key] || THEME.lion)))];
    if (themes.length) (window.requestIdleCallback || setTimeout)(() => themes.forEach(t => fx.warm([...t.parts, ...t.ring, ...(t.dust || []), ...(t.flare || [])])));
  }

  function updateRevealUi() {
    const c = cards[idx];
    if (state === 'reveal') setOmen(c && !c.flipped ? c : null);
    const n = `${idx + 1} / ${cards.length}`;
    setHint(c && !c.flipped ? `点击或左右滑动翻牌 · ${n}` : idx < cards.length - 1 ? `点击或滑动收下这张，翻下一张 · ${n}` : '点击查看本包全部 5 张');
    $('.pk__stack')?.setAttribute('aria-label', c && !c.flipped ? `第 ${idx + 1} 张，按回车翻牌` : '按回车继续');
    setActions(state === 'reveal' ? [['全部翻开', () => skipToResult()]] : []);
  }

  async function advance(dir) {
    if (state === 'reveal' && busy && perf) { skipLegend(); return; }   // 传说演出中再点 = 加速到展示状态
    if (state !== 'reveal' || busy) return;
    const c = cards[idx]; if (!c) return;
    busy = true; root.classList.add('is-busy');
    const my = run;
    try {
      if (!c.flipped) await reveal(c, dir, my);
      else {
        await dismiss(c, dir);
        idx++;
        if (idx >= cards.length) { await showResult(my); return; }
      }
    } finally { if (my === run) { busy = false; root.classList.remove('is-busy'); if (state === 'reveal') updateRevealUi(); } }
  }

  /* ----- 翻牌前预兆：最上面那张未翻的卡，按稀有度渗出边缘光；传说卡还会轻颤 + 周围光粒被吸进去 ----- */
  let omenCard = null;
  function setOmen(c) {
    if (omenCard === c) return;
    clearOmen();
    if (!c || c.flipped || c.tier === 'c') return;
    omenCard = c;
    c.el.dataset.omen = c.tier;
    if (RM()) return;                                           // 减少动态效果：只保留静态边缘光
    if (c.tier === 'ur') {
      const { x, y, w, h } = cardCenter(c), th = THEME[c.key] || THEME.lion;
      fx.emit('omen', 7, fx.inward(x, y, { r: [w * 0.85, w * 1.35], kill: Math.min(w, h) * 0.52, acc: 160, size: [3, 6], kind: 'dot', colors: th.dust }));
    }
  }
  function clearOmen() {
    fx.stopEmit('omen');
    if (omenCard) delete omenCard.el.dataset.omen;
    omenCard = null;
  }
  function cardCenter(c) {
    const rr = root.getBoundingClientRect(), cr = c.el.getBoundingClientRect();
    return { x: cr.left - rr.left + cr.width / 2, y: cr.top - rr.top + cr.height / 2, w: cr.width, h: cr.height };
  }

  /* ----- 展示状态（传说卡落定后）：光芒慢转、光尘飘落、卡片小幅摇摆展示镭射；收下 / 跳到结果页时统一清理 ----- */
  let show = null;
  function clearShow() {
    if (show) { show.stop = true; show = null; }
    fx.stopEmit('dust'); fx.stopEmit('charge'); fx.fadeOut(0.6);
    scriptAnims(title).forEach(a => a.cancel()); title.style.opacity = 0; title.innerHTML = '';
    root.classList.remove('pk--show');
  }
  /** 卡面小幅摇摆：写克隆卡自己的 CSS 变量（和悬停同一套光泽计算），直到收下 */
  function sway(card, ctl) {
    if (!card.classList.contains('card')) return;
    const t0 = performance.now(), s = card.style;
    const step = (now) => {
      if (ctl.stop || !card.isConnected) return;
      const t = (now - t0) / 1000, ramp = Math.min(1, t / 1.2);
      const rx = Math.sin(t * 1.25) * 7 * ramp, ry = Math.sin(t * 0.83 + 0.6) * 4.5 * ramp;
      const px = 50 - rx / 7 * 34, py = 50 + ry / 4.5 * 26;
      s.setProperty('--rx', rx.toFixed(2)); s.setProperty('--ry', ry.toFixed(2));
      s.setProperty('--px', px.toFixed(1)); s.setProperty('--py', py.toFixed(1));
      s.setProperty('--o', (0.42 + 0.18 * Math.abs(Math.sin(t * 1.25))).toFixed(3));
      s.setProperty('--tilt', (Math.abs(rx) / 7 * 0.5).toFixed(3));
      s.setProperty('--dist', Math.min(1, Math.hypot(px - 50, py - 50) / 50).toFixed(3));
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  /** 卡面扫光：一条很宽的柔光带斜着扫过（梯度多段色标，没有边） */
  function sweep(c, ms, color = '255,255,255') {
    if (RM()) return Promise.resolve();
    const w = el('div', 'pk-sweep'); w.style.setProperty('--sw', color);
    const band = el('i'); w.appendChild(band); c.front.appendChild(w);
    return anim(band, [{ transform: 'translateX(-110%) skewX(-14deg)' }, { transform: 'translateX(110%) skewX(-14deg)' }], { duration: ms, easing: 'cubic-bezier(.45,.05,.35,1)' })
      .then(() => w.remove());
  }
  /** LEGENDARY 字样：逐字带模糊入场，之后一道流光循环扫过 */
  function showTitle(c, instant) {
    const th = THEME[c.key] || THEME.lion;
    title.innerHTML = `<b>${[...'LEGENDARY'].map((ch, i) => `<span style="--i:${i}">${ch}</span>`).join('')}</b><small>传说 · ${NAMES[c.key]}</small>`;
    setStyleVars(title, { '--g1': th.g1, '--g2': th.g2, '--g3': th.g3 });
    title.style.opacity = 1;
    if (instant || RM()) { if (RM()) anim(title, [{ opacity: 0 }, { opacity: 1 }], { duration: 400 }); return Promise.resolve(); }
    const spans = [...title.querySelectorAll('span')];
    const done = spans.map((n, i) => anim(n, [
      { opacity: 0, transform: 'translateY(10px) scale(1.5)', filter: 'blur(8px)' },
      { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 560, delay: i * 55, easing: 'cubic-bezier(.2,.8,.3,1)' }));
    done.push(anim(title.querySelector('small'), [{ opacity: 0, letterSpacing: '.9em' }, { opacity: 1, letterSpacing: '.35em' }], { duration: 700, delay: 380, easing: 'ease-out' }));
    return Promise.all(done);
  }
  function setTheme(th) {
    setStyleVars(root, { '--ray': th.ray, '--leak': th.leak });
  }

  /** 翻一张：先转到侧面（90°）→ 换成正面 → 从另一侧转回来。不依赖 backface-visibility（嵌套 3D 时各浏览器表现不一） */
  async function reveal(c, dir, my) {
    // 传说卡蓄力期间保留卡背的金色边缘光（翻到侧面时再撤掉），其余直接撤
    if (c.tier === 'ur' && !RM()) { fx.stopEmit('omen'); omenCard = null; } else clearOmen();
    const face = makeFace(c);
    c.front.appendChild(face);
    if (RM()) {
      // 减少动态效果：正反面交叉淡入淡出 + 静态光晕；无震动、无闪白、无粒子
      if (c.tier !== 'c') {
        setTheme(c.tier === 'ur' ? (THEME[c.key] || THEME.lion) : THEME.rare);
        const leak = el('div', 'pk-leak'); c.el.insertBefore(leak, c.el.firstChild);
        leak.style.transform = 'translate(-50%,-50%) scale(1.15)';
        anim(leak, [{ opacity: 0 }, { opacity: c.tier === 'ur' ? 0.8 : 0.6 }], { duration: 480 });
      }
      c.front.hidden = false;
      await Promise.all([anim(c.front, [{ opacity: 0 }, { opacity: 1 }], { duration: 480 }), anim(c.back, [{ opacity: 1 }, { opacity: 0 }], { duration: 480 })]);
      c.back.hidden = true; c.flipped = true;
      if (c.tier === 'ur') { anim(dim, [{ opacity: 0 }, { opacity: 0.5 }], { duration: 400 }); showTitle(c); } else showBadge(c);
      return;
    }
    if (c.tier === 'ur') return revealLegend(c, dir, my, face);
    if (c.tier === 'r') return revealRare(c, dir, my, face);
    sound.play('flip');
    await flipHalves(c, dir, 170, 230, [1, 1.04]);
    anim(c.flip, [{ transform: 'scale(1.04)' }, { transform: 'scale(1)' }], { duration: 220 * 1.6, easing: 'ease-out' });
    showBadge(c);
  }

  /* 稀有：光柱 → 翻到侧面那一刻放出两圈冲击波 + 水晶光片 → 落定后扫光 */
  async function revealRare(c, dir, my, face) {
    const th = THEME.rare, { x, y, w } = cardCenter(c);
    setTheme(th);
    sound.play('flip');
    setStyleVars(beam, { '--beam-core': 'rgba(225,235,255,.5)', '--beam-mid': 'rgba(150,160,255,.18)' });
    anim(beam, [{ opacity: 0, transform: 'translate(-50%,-50%) scaleX(.2)' }, { opacity: 0.9, transform: 'translate(-50%,-50%) scaleX(.85)', offset: 0.35 }, { opacity: 0.5, transform: 'translate(-50%,-50%) scaleX(.75)' }],
      { duration: 1400, easing: 'ease-out' });
    const leak = el('div', 'pk-leak'); c.el.insertBefore(leak, c.el.firstChild);
    anim(leak, [{ opacity: 0.4, transform: 'translate(-50%,-50%) scale(.85)' }, { opacity: 0.75, transform: 'translate(-50%,-50%) scale(1)' }], { duration: 700, easing: 'ease-out' });   // 从预兆光晕的亮度接上，不闪断
    buzz(20);
    const t1 = 180 * FLIP_SLOW, t2 = 260 * FLIP_SLOW;
    await anim(c.flip, [{ transform: 'rotateY(0deg) scale(1)' }, { transform: `rotateY(${90 * dir}deg) scale(1.07)` }], { duration: t1, easing: 'cubic-bezier(.5,0,1,.6)' });
    if (my !== run) return;
    c.back.hidden = true; c.front.hidden = false; c.flipped = true;
    // 冲击波 + 光片
    sound.play('shimmer'); sound.play('rare'); buzz([14, 40, 22]);
    fx.ring(x, y, { r0: w * 0.3, r1: w * 1.9, life: 1.0, color: th.ring[0], a: 0.7 });
    fx.ring(x, y, { r0: w * 0.2, r1: w * 1.35, life: 0.85, color: th.ring[1], a: 0.5, delay: 120 });
    fx.burst(x, y, { kind: 'shard', count: 46, speed: [160, 520], size: [18, 36], life: [0.8, 1.5], g: 120, spin: 7, colors: th.parts, r0: w * 0.25, twinkle: false });
    fx.burst(x, y, { kind: 'star', count: 26, speed: [60, 260], size: [10, 20], life: [0.9, 1.6], g: -10, colors: th.parts, r0: w * 0.3 });
    await anim(c.flip, [{ transform: `rotateY(${-90 * dir}deg) scale(1.07)` }, { transform: 'rotateY(0deg) scale(1.06)' }], { duration: t2, easing: 'cubic-bezier(0,.4,.4,1)' });
    if (my !== run) return;
    anim(c.flip, [{ transform: 'scale(1.06)' }, { transform: 'scale(1)' }], { duration: 480, easing: 'ease-out' });
    anim(leak, [{ opacity: 0.75 }, { opacity: 0.45 }], { duration: 900, easing: 'ease-out' });
    showBadge(c);
    sheen(face, 1100);
    await sweep(c, 820, '225,235,255');
  }

  /* 传说：① 蓄力（压暗、吸入光粒、颤动渐强、低频音效 / 震动渐强）
          ② 爆发（短暂柔和闪白、三层冲击波、双层旋转放射光芒、双色拖尾粒子带重力、光晕 + 镜头光斑）
          ③ 翻面同时放大到 1.3 → 慢慢回落到 1.08 并带一点 Z 向旋转
          ④ LEGENDARY 字样逐字入场 + 流光   ⑤ 展示：光芒慢转、光尘飘落、卡片摇摆展示镭射，直到收下
     演出期间再点一下 = 跳到展示状态 */
  const LEGEND = { charge: 1500, flip1: 150, flip2: 260, settle: 1100, titleAt: 2650 };
  let perf = null;
  async function revealLegend(c, dir, my, face) {
    const th = THEME[c.key] || THEME.lion, P = { skip: false, timers: new Set() };
    perf = P;
    const wait = (ms) => new Promise(res => { if (P.skip) return res(); const t = setTimeout(() => { P.timers.delete(t); res(); }, ms); P.timers.add(t); P.wakers = (P.wakers || []).concat(res); });
    const dead = () => my !== run || P.skip || perf !== P;
    setTheme(th);
    const { x, y, w, h } = cardCenter(c);
    setStyleVars(beam, { '--beam-core': `rgba(${th.ray},.55)`, '--beam-mid': `rgba(${th.leak},.2)` });
    const leak = el('div', 'pk-leak'); c.el.insertBefore(leak, c.el.firstChild); P.leak = leak;
    const ctl = { stop: false }; show = ctl;
    const t0 = performance.now();

    // ① 蓄力
    sound.play('charge');
    buzz([8, 120, 10, 90, 14, 70, 18, 50, 24, 34, 30, 22, 40]);
    anim(dim, [{ opacity: 0 }, { opacity: 1 }], { duration: 480, easing: 'ease-out' });
    anim(leak, [{ opacity: 0.45, transform: 'translate(-50%,-50%) scale(.8)' }, { opacity: 0.95, transform: 'translate(-50%,-50%) scale(1.05)' }], { duration: LEGEND.charge, easing: 'cubic-bezier(.6,0,.9,.5)' });
    const C = LEGEND.charge / 1000;
    fx.emit('charge', (t) => 30 + 170 * Math.min(1, t / C) ** 2, fx.inward(x, y, { r: [w * 0.9, w * 1.9], kill: Math.min(w, h) * 0.5, acc: 1300, size: [3, 7], colors: th.parts }));
    const shake = [], N = 22;
    for (let i = 0; i <= N; i++) { const a = 0.4 + (i / N) ** 1.6 * 4.2; shake.push({ transform: `translate(${(i % 2 ? 1 : -1) * a}px, ${((i * 7) % 3 - 1) * a * 0.5}px) rotate(${(i % 2 ? -1 : 1) * a * 0.14}deg)` }); }
    shake.push({ transform: 'none' });
    await anim(c.flip, shake, { duration: LEGEND.charge, easing: 'linear', fill: 'none' });
    fx.stopEmit('charge');
    if (dead()) return finishLegend(c, face, th, my, P);

    // ② 爆发
    sound.play('boom'); sound.play('legend'); buzz(140);
    anim(flash, [{ opacity: 0 }, { opacity: 0.62, offset: 0.14 }, { opacity: 0 }], { duration: 460, easing: 'ease-out', fill: 'none' });
    fx.ring(x, y, { r0: w * 0.35, r1: Math.max(innerWidth, innerHeight) * 0.75, life: 1.1, color: th.ring[1], a: 0.55 });
    fx.ring(x, y, { r0: w * 0.3, r1: w * 2.6, life: 1.0, color: th.ring[0], a: 0.6, delay: 110 });
    fx.ring(x, y, { r0: w * 0.25, r1: w * 1.7, life: 0.9, color: th.ring[2], a: 0.5, delay: 240 });
    fx.flare(x, y - h * 0.08, th.flare, 1.7);
    fx.burst(x, y, { kind: 'streak', count: 170, speed: [320, 900], size: [4, 9], life: [0.9, 1.9], g: 380, drag: [0.94, 0.965], tail: 0.07, colors: th.parts, r0: w * 0.2 });
    fx.burst(x, y, { kind: 'star', count: 44, speed: [80, 320], size: [12, 26], life: [1.2, 2.2], g: -25, colors: th.parts, r0: w * 0.3 });
    anim(glow, [{ opacity: 0 }, { opacity: 0.75, offset: 0.2 }, { opacity: 0.18 }], { duration: 1500, easing: 'ease-out' });
    anim(beam, [{ opacity: 0, transform: 'translate(-50%,-50%) scaleX(.15)' }, { opacity: 1, transform: 'translate(-50%,-50%) scaleX(1)' }], { duration: 560, easing: 'cubic-bezier(.2,.8,.3,1)' });
    rays.classList.add('spin'); raysB.classList.add('spin');
    anim(rays, [{ opacity: 0 }, { opacity: 1 }], { duration: 900, easing: 'ease-out' });
    anim(raysB, [{ opacity: 0 }, { opacity: 0.8 }], { duration: 1200, easing: 'ease-out' });
    anim(leak, [{ opacity: 0.9, transform: 'translate(-50%,-50%) scale(1)' }, { opacity: 0.65, transform: 'translate(-50%,-50%) scale(1.3)' }], { duration: 1000, easing: 'ease-out' });
    root.classList.add('pk--show');

    // ③ 翻面 + 放大，回落时带一点 Z 向旋转
    await anim(c.flip, [{ transform: 'rotateY(0deg) scale(1)' }, { transform: `rotateY(${90 * dir}deg) scale(1.2)` }], { duration: LEGEND.flip1 * FLIP_SLOW, easing: 'cubic-bezier(.5,0,1,.6)' });
    c.back.hidden = true; c.front.hidden = false; c.flipped = true; delete c.el.dataset.omen;
    if (dead()) return finishLegend(c, face, th, my, P);
    await anim(c.flip, [{ transform: `rotateY(${-90 * dir}deg) scale(1.2)` }, { transform: `rotateY(0deg) scale(1.3) rotate(${dir * -2.5}deg)` }], { duration: LEGEND.flip2 * FLIP_SLOW, easing: 'cubic-bezier(0,.4,.4,1)' });
    if (dead()) return finishLegend(c, face, th, my, P);
    fx.emit('dust', 16, fx.dust(th.dust));
    sheen(face, 1400);
    const settle = anim(c.flip, [{ transform: `scale(1.3) rotate(${dir * -2.5}deg)` }, { transform: `scale(1.06) rotate(${dir * 0.6}deg)`, offset: 0.7 }, { transform: 'scale(1.08) rotate(0deg)' }],
      { duration: LEGEND.settle, easing: 'cubic-bezier(.3,.7,.3,1)' });
    anim(dim, [{ opacity: 1 }, { opacity: 0.62 }], { duration: 1000, easing: 'ease-out' });
    // ④ 字样
    await wait(Math.max(0, LEGEND.titleAt - (performance.now() - t0)));
    if (dead()) return finishLegend(c, face, th, my, P);
    sound.play('title'); buzz([24, 60, 24]);
    const titleIn = showTitle(c);
    await settle;
    if (dead()) return finishLegend(c, face, th, my, P);
    sweep(c, 900, '255,246,220');
    await titleIn;
    return finishLegend(c, face, th, my, P);
  }
  /** 收尾（正常结束或点击跳过都走这里）：所有东西直接放到「展示」状态 */
  function finishLegend(c, face, th, my, P) {
    if (my !== run || perf !== P) return;
    perf = null;
    P.timers.forEach(clearTimeout);
    if (!P.skip) { startShow(c, face, th); return; }
    // 跳过：停掉进行中的动画，直接给终态
    fx.stopEmit('charge');
    for (const n of [c.flip, dim, beam, rays, raysB, glow, flash, P.leak]) n?.getAnimations().forEach(a => a.cancel());
    c.back.hidden = true; c.front.hidden = false; c.flipped = true; delete c.el.dataset.omen;
    c.flip.style.transform = 'scale(1.08)';
    dim.style.opacity = 0.62; beam.style.opacity = 0.7; beam.style.transform = 'translate(-50%,-50%) scaleX(1)';
    rays.style.opacity = 1; raysB.style.opacity = 0.8; glow.style.opacity = 0.18; flash.style.opacity = 0;
    if (P.leak) { P.leak.style.opacity = 0.65; P.leak.style.transform = 'translate(-50%,-50%) scale(1.3)'; }
    rays.classList.add('spin'); raysB.classList.add('spin'); root.classList.add('pk--show');
    if (!title.innerHTML) showTitle(c, true);
    else scriptAnims(title).forEach(a => a.finish());
    face.style.setProperty('--o', '.45');
    startShow(c, face, th);
  }
  function startShow(c, face, th) {
    if (!show) show = { stop: false };
    fx.emit('dust', 16, fx.dust(th.dust));
    P_leakBreath(c);
    sway(face, show);
  }
  function P_leakBreath(c) {
    const leak = c.el.querySelector('.pk-leak');
    if (!leak || RM()) return;
    leak.getAnimations().forEach(a => a.cancel());
    leak.style.transform = 'translate(-50%,-50%) scale(1.3)';
    leak.classList.add('breathe');                       // CSS 呼吸（只动 opacity）
  }
  /** 演出中再点一下：唤醒所有等待、把进行中的动画直接跑完，序列自己走到 finishLegend 的跳过分支 */
  function skipLegend() {
    const P = perf; if (!P || P.skip) return;
    P.skip = true; (P.wakers || []).forEach(r => r());
    cards[idx]?.flip.getAnimations().forEach(a => a.finish());
    scriptAnims(title).forEach(a => a.finish());
  }
  /** 只取脚本创建的动画（字样上的 CSS 流光是无限循环，不能 finish） */
  const scriptAnims = (n) => n.getAnimations({ subtree: true }).filter(a => !(window.CSSAnimation && a instanceof CSSAnimation));

  // 翻牌节奏：数值越大翻得越慢（1 = 原速）。用户反馈原速太快，调到 2.2 倍时长
  const FLIP_SLOW = 2.2;
  async function flipHalves(c, dir, t1, t2, [s0, s1]) {
    t1 *= FLIP_SLOW; t2 *= FLIP_SLOW;
    const mid = (s0 + s1) / 2 + 0.04;
    await anim(c.flip, [{ transform: `rotateY(0deg) scale(${s0})` }, { transform: `rotateY(${90 * dir}deg) scale(${mid})` }], { duration: t1, easing: 'cubic-bezier(.5,0,1,.6)' });
    c.back.hidden = true; c.front.hidden = false; c.flipped = true;
    await anim(c.flip, [{ transform: `rotateY(${-90 * dir}deg) scale(${mid})` }, { transform: `rotateY(0deg) scale(${s1})` }], { duration: t2, easing: 'cubic-bezier(0,.4,.4,1)' });
  }
  function setStyleVars(n, vars) { for (const k in vars) n.style.setProperty(k, vars[k]); }
  function showBadge(c) {
    badge.dataset.r = c.tier;
    badge.textContent = `${RARITY[c.tier].label} · ${NAMES[c.key]}`;
    badge.getAnimations().forEach(a => a.cancel());
    if (RM()) { badge.style.opacity = 1; return; }
    anim(badge, [{ opacity: 0, transform: 'translate(-50%, 6px)' }, { opacity: 1, transform: 'translate(-50%, 0)' }], { duration: 320, easing: 'ease-out' });
  }
  /** 揭晓后让卡面的箔光扫过一次（写卡片自己的 CSS 变量；结束后停在柔和的静止状态） */
  function sheen(card, ms) {
    if (RM() || !card.classList.contains('card')) return;
    const t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / ms), e = t * t * (3 - 2 * t);
      const px = 12 + 76 * e, py = 30 + 30 * Math.sin(e * Math.PI);
      const o = 0.3 + 0.55 * Math.sin(e * Math.PI);
      const s = card.style;
      s.setProperty('--px', px.toFixed(1)); s.setProperty('--py', py.toFixed(1)); s.setProperty('--o', o.toFixed(3));
      s.setProperty('--rx', (-(px - 50) / 50 * 6).toFixed(2)); s.setProperty('--ry', ((py - 50) / 50 * 4).toFixed(2));
      s.setProperty('--tilt', (Math.abs(px - 50) / 50 * 0.5).toFixed(3));
      s.setProperty('--dist', (Math.min(1, Math.hypot(px - 50, py - 50) / 50)).toFixed(3));
      if (t < 1 && card.isConnected) requestAnimationFrame(step);
      else for (const k of ['--rx', '--ry', '--tilt']) s.setProperty(k, '0');
    };
    requestAnimationFrame(step);
  }
  async function dismiss(c, dir) {
    badge.getAnimations().forEach(a => a.cancel()); badge.style.opacity = 0;
    const fades = [];
    if (title.innerHTML) fades.push(anim(title, [{ opacity: 1 }, { opacity: 0 }], { duration: RM() ? 200 : 320 }).then(() => clearShow()));
    else clearShow();
    for (const n of [beam, rays, raysB, dim, glow]) if (+getComputedStyle(n).opacity > 0.01) fades.push(anim(n, [{ opacity: getComputedStyle(n).opacity }, { opacity: 0 }], { duration: RM() ? 200 : 380 }));
    sound.play('whoosh');
    if (RM()) await anim(c.el, [{ opacity: 1 }, { opacity: 0 }], { duration: 220 });
    else await anim(c.el, [{ transform: c.el.style.transform, opacity: 1 }, { transform: `translate(${dir * 75}vw, -4vh) rotate(${dir * 16}deg)`, opacity: 0 }], { duration: 520, easing: 'cubic-bezier(.4,0,.8,.6)' });
    await Promise.all(fades);
    rays.classList.remove('spin'); raysB.classList.remove('spin');
    c.el.remove();
  }
  async function skipToResult() {
    if (state !== 'reveal') return;
    const my = run;
    busy = true;
    await showResult(my);
  }

  /* ----- 结果页 ----- */
  async function showResult(my) {
    if (my !== run) return;
    state = 'result';
    perf = null; clearShow(); clearOmen();
    for (const n of [beam, rays, raysB, dim, glow, flash, badge]) { n.getAnimations().forEach(a => a.cancel()); n.style.opacity = 0; }
    rays.classList.remove('spin'); raysB.classList.remove('spin');
    stage.hidden = true; hint.hidden = true; actions.hidden = true;
    const best = pulls.reduce((m, p) => Math.max(m, TIER_RANK[p.tier]), 0);
    const counts = { c: 0, r: 0, ur: 0 }; pulls.forEach(p => counts[p.tier]++);
    result.innerHTML = `<h2>${best === 2 ? '✦ 抽到传说！' : best === 1 ? '本包收获' : '本包收获'}</h2>
      <p class="sub">传说 ${counts.ur} · 稀有 ${counts.r} · 普通 ${counts.c}　｜　种子 <code>${escapeHtml(seed)}</code>（地址栏加 #pack=${escapeHtml(seed)} 可复现）</p>
      <div class="pk-grid"></div>
      <div class="row"><button type="button" class="primary pk-again">再开一包</button><button type="button" class="pk-home">返回卡牌页</button></div>`;
    const grid = result.querySelector('.pk-grid');
    // 结果页按原抽取顺序摆放，最稀有的放中间更显眼
    const order = pulls.slice().sort((a, b) => a.i - b.i);
    for (const p of order) {
      const cell = el('div', 'pk-cell');
      cell.dataset.r = p.tier;
      if (p.tier !== 'c') {   // 常驻柔光 + 几颗慢慢闪的微光（纯 CSS，减少动态效果时静止）
        const aura = el('div', 'pk-aura', p.tier === 'ur' ? '<i></i><i></i><i></i><i></i><i></i>' : '<i></i><i></i><i></i>');
        if (p.tier === 'ur') aura.style.setProperty('--leak', (THEME[p.key] || THEME.lion).leak);
        cell.aura = aura;
      }
      const btn = el('button', 'pk-cell__btn'); btn.type = 'button';
      btn.setAttribute('aria-label', `放大查看 ${NAMES[p.key]}（${RARITY[p.tier].name}）`);
      if (cell.aura) btn.appendChild(cell.aura);
      btn.appendChild(makeFace(p));
      btn.addEventListener('click', () => openZoom(p, btn));
      const tag = el('span', 'pk-tag', `${RARITY[p.tier].name} · ${NAMES[p.key]}`); tag.dataset.r = p.tier;
      cell.append(btn, tag); grid.appendChild(cell);
    }
    result.querySelector('.pk-again').addEventListener('click', () => open());
    result.querySelector('.pk-home').addEventListener('click', () => close());
    result.hidden = false;
    if (!RM()) {
      [...grid.children].forEach((n, i) => anim(n, [{ opacity: 0, transform: 'translateY(16px) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: 60 * i, easing: 'cubic-bezier(.2,.9,.3,1.1)' }));
    }
    result.querySelector('.pk-again').focus({ preventScroll: true });
    busy = false; root.classList.remove('is-busy');
  }
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

  /* ----- 放大查看（CSS 卡：现有的倾斜 / 光泽 / 体感交互；WebGL 模式下的四张闪卡：主画布临时搬过来） ----- */
  let zoomCard = null, zoomRestore = null, zoomFrom = null;
  async function openZoom(p, from) {
    zoomFrom = from;
    zoom.innerHTML = '';
    const box = el('div', 'pk__zoom-box');
    const cap = el('p', '', '');
    const bar = el('div', 'row');
    const closeBtn = el('button', '', '关闭'); closeBtn.type = 'button'; closeBtn.addEventListener('click', () => closeZoom());
    bar.appendChild(closeBtn);
    zoom.append(box, cap, bar);
    zoom.hidden = false;
    let usedGl = false;
    if (p.tier !== 'c' && host.mode === 'webgl' && host.glReady) {
      box.classList.add('gl');
      cap.textContent = `${NAMES[p.key]} · WebGL 渲染：悬停倾斜 · 拖动旋转 · 双击翻面`;
      zoomRestore = await host.glZoom(p.key, box);
      usedGl = !!zoomRestore;
    }
    if (!usedGl) {
      box.classList.remove('gl');
      const c = makeFace(p);
      box.appendChild(c);
      zoomCard = host.setupCard(c);
      host.registerCard(zoomCard);
      cap.textContent = `${NAMES[p.key]} · ${RARITY[p.tier].name}${p.tier === 'c' ? '（普通卡：简化卡面，不带箔）' : ''}：悬停 / 拖动倾斜${host.mode === 'webgl' && p.tier === 'c' ? ' · 普通卡没有 WebGL 版本' : ''}`;
    }
    if (!RM()) anim(zoom, [{ opacity: 0 }, { opacity: 1 }], { duration: 200 });
    closeBtn.focus({ preventScroll: true });
  }
  function closeZoom(silent) {
    if (zoom.hidden) return;
    if (zoomCard) { host.unregisterCard(zoomCard); zoomCard = null; }
    if (zoomRestore) { zoomRestore(); zoomRestore = null; }
    zoom.hidden = true; zoom.innerHTML = '';
    if (!silent) zoomFrom?.focus({ preventScroll: true });
  }

  // 焦点留在对话框里（Tab 循环）
  root.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const f = [...root.querySelectorAll('button, [tabindex="0"]')].filter(n => n.offsetParent !== null && !n.closest('[hidden]'));
    if (!f.length) return;
    const i = f.indexOf(document.activeElement);
    if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
  });

  return {
    open, close, tear: () => tearOpen(), next: (d = 1) => advance(d), skip: () => skipToResult(),
    get state() { return state; }, get pulls() { return pulls; }, get seed() { return seed; }, get busy() { return busy; },
    get index() { return idx; },
    get performing() { return !!perf; },
    fxStats: () => fx.stats(), resetFxStats: () => fx.resetStats(), get fxRunning() { return fx.running; },
  };
}
