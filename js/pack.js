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
    } else if (name === 'legend') {   // 传说：大三和弦 + 高八度闪光
      [523.25, 659.25, 783.99, 1046.5].forEach((fq, i) => { this.tone(fq, t + i * 0.035, 1.6, 'triangle', 0.18); this.tone(fq * 2.003, t + i * 0.035, 1.1, 'sine', 0.06); });
    }
  },
};
try { sound.on = localStorage.getItem(SOUND_KEY) === '1'; } catch { /* 忽略 */ }
const buzz = (p) => { try { navigator.vibrate?.(p); } catch { /* 部分浏览器在无手势时抛错 */ } };

/* ---------------- 粒子 / 轨迹（Canvas 2D） ---------------- */
function createFx(canvas) {
  const ctx = canvas.getContext('2d');
  let W = 1, H = 1, dpr = 1, raf = 0, last = 0;
  const parts = [], trail = [];
  const TRAIL_MS = 900;   // 轨迹余辉时长
  const sprites = {};
  /** 预渲染柔光点：径向渐变，边缘透明 → 叠加后没有任何硬边 */
  const sprite = (color) => {
    if (sprites[color]) return sprites[color];
    const s = 64, c = document.createElement('canvas'); c.width = c.height = s;
    const g = c.getContext('2d'), r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.18, color); r.addColorStop(0.5, color.replace(/[\d.]+\)$/, '0.25)')); r.addColorStop(1, color.replace(/[\d.]+\)$/, '0)'));
    g.fillStyle = r; g.fillRect(0, 0, s, s);
    return (sprites[color] = c);
  };
  const resize = () => {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  };
  const frame = (now) => {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    // 撕包轨迹：沿路径每隔几像素盖一个柔光点，越旧越淡
    const t = performance.now();
    while (trail.length && t - trail[0].t > TRAIL_MS) trail.shift();
    for (let i = 1; i < trail.length; i++) {
      const a = trail[i - 1], b = trail[i], age = (t - b.t) / TRAIL_MS, k = 1 - age;
      const d = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(1, Math.ceil(d / 5));
      for (let j = 0; j < n; j++) {
        const x = a.x + (b.x - a.x) * j / n, y = a.y + (b.y - a.y) * j / n, sz = 40 * (0.45 + 0.55 * k);
        ctx.globalAlpha = 0.42 * k ** 1.6;
        ctx.drawImage(sprite('rgba(200,170,255,0.9)'), x - sz / 2, y - sz / 2, sz, sz);
        ctx.globalAlpha = 0.75 * k ** 1.6;
        ctx.drawImage(sprite('rgba(255,240,210,0.95)'), x - sz / 5, y - sz / 5, sz / 2.5, sz / 2.5);
      }
    }
    // 粒子
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      p.vx *= Math.pow(p.drag, dt * 60); p.vy = p.vy * Math.pow(p.drag, dt * 60) + p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      const k = p.life / p.max, a = Math.min(1, k * 1.6) * p.a;
      const tw = 0.75 + 0.25 * Math.sin(now / 1000 * p.tw + p.ph);
      const sz = p.size * (0.6 + 0.4 * k) * tw;
      ctx.globalAlpha = a;
      ctx.drawImage(sprite(p.color), p.x - sz / 2, p.y - sz / 2, sz, sz);
    }
    ctx.globalAlpha = 1;
    if (parts.length || trail.length) raf = requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, W, H);
  };
  const kick = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  const mobile = () => Math.min(W, H) < 520;
  return {
    resize,
    trailPoint(x, y) { trail.push({ x, y, t: performance.now() }); kick(); },
    /** 迸发：从 (x,y) 向四周 */
    burst(x, y, { count = 120, speed = [180, 620], colors, spread = Math.PI * 2, dir = -Math.PI / 2, size = [5, 16], life = [0.8, 1.7], g = 140 } = {}) {
      const n = Math.round(count * (mobile() ? 0.55 : 1));
      colors ??= ['rgba(255,226,150,0.95)', 'rgba(255,255,255,0.95)', 'rgba(255,170,210,0.9)', 'rgba(190,170,255,0.9)'];
      for (let i = 0; i < n; i++) {
        const ang = dir + (Math.random() - 0.5) * spread, sp = speed[0] + Math.random() * (speed[1] - speed[0]);
        const max = life[0] + Math.random() * (life[1] - life[0]);
        parts.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, g, drag: 0.955 + Math.random() * 0.02,
          size: size[0] + Math.random() * (size[1] - size[0]), color: colors[i % colors.length],
          life: max, max, a: 0.55 + Math.random() * 0.4, tw: 6 + Math.random() * 10, ph: Math.random() * 6 });
      }
      kick();
    },
    clear() { parts.length = 0; trail.length = 0; ctx.clearRect(0, 0, canvas.width, canvas.height); },
    get busy() { return !!raf; },
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
    <div class="pk__beam"></div>
    <div class="pk__stage"></div>
    <canvas class="pk__fx" aria-hidden="true"></canvas>
    <div class="pk__glow"></div>
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
  const dim = $('.pk__dim'), beam = $('.pk__beam'), rays = $('.pk__rays'), glow = $('.pk__glow'), badge = $('.pk__badge');
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
  root.addEventListener('keydown', (e) => {
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
    for (const n of [dim, beam, rays, glow, badge]) { n.getAnimations().forEach(a => a.cancel()); n.style.opacity = 0; }
    rays.classList.remove('spin');
    fx.clear(); stroke = null; pack?.stop(); pack = null; cards = []; idx = 0; busy = false;
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
  }

  function updateRevealUi() {
    const c = cards[idx];
    const n = `${idx + 1} / ${cards.length}`;
    setHint(c && !c.flipped ? `点击或左右滑动翻牌 · ${n}` : idx < cards.length - 1 ? `点击或滑动收下这张，翻下一张 · ${n}` : '点击查看本包全部 5 张');
    $('.pk__stack')?.setAttribute('aria-label', c && !c.flipped ? `第 ${idx + 1} 张，按回车翻牌` : '按回车继续');
    setActions(state === 'reveal' ? [['全部翻开', () => skipToResult()]] : []);
  }

  async function advance(dir) {
    if (state !== 'reveal' || busy) return;
    const c = cards[idx]; if (!c) return;
    busy = true;
    const my = run;
    try {
      if (!c.flipped) await reveal(c, dir, my);
      else {
        await dismiss(c, dir);
        idx++;
        if (idx >= cards.length) { await showResult(my); return; }
      }
    } finally { if (my === run) { busy = false; if (state === 'reveal') updateRevealUi(); } }
  }

  /** 翻一张：先转到侧面（90°）→ 换成正面 → 从另一侧转回来。不依赖 backface-visibility（嵌套 3D 时各浏览器表现不一） */
  async function reveal(c, dir, my) {
    const face = makeFace(c);
    c.front.appendChild(face);
    const rr = root.getBoundingClientRect(), cr = c.el.getBoundingClientRect();
    const cx = cr.left - rr.left + cr.width / 2, cy = cr.top - rr.top + cr.height / 2;
    if (RM()) {
      // 减少动态效果：正反面交叉淡入淡出；无震动、无粒子
      c.front.hidden = false;
      await Promise.all([anim(c.front, [{ opacity: 0 }, { opacity: 1 }], { duration: 480 }), anim(c.back, [{ opacity: 1 }, { opacity: 0 }], { duration: 480 })]);
      c.back.hidden = true; c.flipped = true;
      showBadge(c);
      if (c.tier === 'ur') anim(beam, [{ opacity: 0 }, { opacity: 0.45 }], { duration: 400 });
      return;
    }
    if (c.tier === 'ur') {
      // ① 遮黑 → ② 震动（越来越强）+ 卡后漏光 → ③ 光束 + 迸发 + 泛光 + 翻面放大 → ④ 落定
      sound.play('riser');
      setStyleVars(beam, { '--beam-core': 'rgba(255,240,205,.62)', '--beam-mid': 'rgba(255,190,140,.22)' });
      await anim(dim, [{ opacity: 0 }, { opacity: 1 }], { duration: 380, easing: 'ease-out' });
      if (my !== run) return;
      const leak = el('div', 'pk-leak'); c.el.insertBefore(leak, c.el.firstChild);
      anim(leak, [{ opacity: 0, transform: 'translate(-50%,-50%) scale(.55)' }, { opacity: 0.85, transform: 'translate(-50%,-50%) scale(.95)' }], { duration: 900, easing: 'ease-in' });
      buzz([18, 50, 22, 40, 28, 30, 40]);
      const shake = [];
      for (let i = 0; i <= 16; i++) { const a = 1.5 + i * 0.45; shake.push({ transform: `translate(${(i % 2 ? 1 : -1) * a}px, ${((i * 7) % 3 - 1) * a * 0.5}px) rotate(${(i % 2 ? -1 : 1) * a * 0.12}deg)` }); }
      shake.push({ transform: 'none' });
      await anim(c.flip, shake, { duration: 900, easing: 'linear', fill: 'none' });
      if (my !== run) return;
      sound.play('legend'); buzz(90);
      fx.burst(cx, cy, { count: 150, speed: [220, 760], life: [0.9, 1.9] });
      fx.burst(cx, cy, { count: 40, speed: [60, 220], size: [8, 20], life: [1.2, 2.2], g: -20, colors: ['rgba(255,236,190,0.8)', 'rgba(255,255,255,0.8)'] });
      anim(glow, [{ opacity: 0 }, { opacity: 0.8, offset: 0.25 }, { opacity: 0 }], { duration: 1100, easing: 'ease-out', fill: 'none' });
      anim(beam, [{ opacity: 0, transform: 'translate(-50%,-50%) scaleX(.15)' }, { opacity: 1, transform: 'translate(-50%,-50%) scaleX(1)' }], { duration: 520, easing: 'cubic-bezier(.2,.8,.3,1)' });
      rays.classList.add('spin');
      anim(rays, [{ opacity: 0 }, { opacity: 1 }], { duration: 900, easing: 'ease-out' });
      anim(leak, [{ opacity: 0.85, transform: 'translate(-50%,-50%) scale(.95)' }, { opacity: 0.55, transform: 'translate(-50%,-50%) scale(1.25)' }], { duration: 900, easing: 'ease-out' });
      await flipHalves(c, dir, 150, 260, [1, 1.24]);
      await anim(c.flip, [{ transform: 'scale(1.24)' }, { transform: 'scale(.97)', offset: 0.6 }, { transform: 'scale(1)' }], { duration: 620 * 1.4, easing: 'cubic-bezier(.3,.7,.3,1)' });
      if (my !== run) return;
      showBadge(c);
      sheen(face, 1400);
      anim(dim, [{ opacity: 1 }, { opacity: 0.55 }], { duration: 900, easing: 'ease-out' });
      return;
    }
    if (c.tier === 'r') {
      sound.play('flip');
      setStyleVars(beam, { '--beam-core': 'rgba(225,240,255,.5)', '--beam-mid': 'rgba(150,180,255,.18)' });
      anim(beam, [{ opacity: 0, transform: 'translate(-50%,-50%) scaleX(.2)' }, { opacity: 0.9, transform: 'translate(-50%,-50%) scaleX(.85)', offset: 0.35 }, { opacity: 0.55, transform: 'translate(-50%,-50%) scaleX(.75)' }],
        { duration: 1100, easing: 'ease-out' });
      buzz(20);
      await flipHalves(c, dir, 180, 260, [1, 1.06]);
      anim(c.flip, [{ transform: 'scale(1.06)' }, { transform: 'scale(1)' }], { duration: 300 * 1.6, easing: 'ease-out' });
      sound.play('rare');
      showBadge(c);
      sheen(face, 1100);
      return;
    }
    sound.play('flip');
    await flipHalves(c, dir, 170, 230, [1, 1.04]);
    anim(c.flip, [{ transform: 'scale(1.04)' }, { transform: 'scale(1)' }], { duration: 220 * 1.6, easing: 'ease-out' });
    showBadge(c);
  }
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
    for (const n of [beam, rays, dim]) if (+getComputedStyle(n).opacity > 0.01) fades.push(anim(n, [{ opacity: getComputedStyle(n).opacity }, { opacity: 0 }], { duration: RM() ? 200 : 380 }));
    sound.play('whoosh');
    if (RM()) await anim(c.el, [{ opacity: 1 }, { opacity: 0 }], { duration: 220 });
    else await anim(c.el, [{ transform: c.el.style.transform, opacity: 1 }, { transform: `translate(${dir * 75}vw, -4vh) rotate(${dir * 16}deg)`, opacity: 0 }], { duration: 520, easing: 'cubic-bezier(.4,0,.8,.6)' });
    await Promise.all(fades);
    rays.classList.remove('spin');
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
    for (const n of [beam, rays, dim, badge]) { n.getAnimations().forEach(a => a.cancel()); n.style.opacity = 0; }
    rays.classList.remove('spin');
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
      const btn = el('button', 'pk-cell__btn'); btn.type = 'button';
      btn.setAttribute('aria-label', `放大查看 ${NAMES[p.key]}（${RARITY[p.tier].name}）`);
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
    busy = false;
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
  };
}
