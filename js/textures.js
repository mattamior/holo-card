/* =========================================================
   程序化卡面：全部用 canvas 绘制 / 逐像素计算，无外部图片
   输出（均为“纹理朝向”：第 0 行 = 卡片底边，与 UV v=0 对齐）：
     map      卡面颜色（CanvasTexture，sRGB）
     normal   法线贴图（DataTexture，线性）：卡框压纹、插画窗口内凹、标题凸印、蚀刻纹
     foil     箔面遮罩（DataTexture，线性）：
                R = 箔面强度（同时驱动 metalness / roughness / iridescenceMap）
                G = 薄膜厚度扰动（iridescenceThicknessMap）
                B = 亮片密度
   所有遮罩都用带羽化的 SDF 解析计算，边缘是平滑过渡，不会出现硬直线或接缝。
   ========================================================= */

export const TW = 1024;                 // 卡面纹理宽
export const TH = Math.round(TW * 88 / 63); // 1430，标准 TCG 比例
const MW = 256, MH = Math.round(MW * 88 / 63); // 遮罩分辨率（遮罩本身很平滑，低分辨率足够）

// 版式（单位：卡面纹理像素，沿用 CSS 版的比例：内边距 5.5%、插画 46%）
const PAD = 56;
export const LAYOUT = {
  art:   { x: PAD, y: 140, w: TW - PAD * 2, h: 606, r: 10 },
  panel: { x: PAD, y: 797, w: TW - PAD * 2, h: 513, r: 10 },
  card:  { x: 0, y: 0, w: TW, h: TH, r: TW * 0.045 },
};

const FONT = 'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif';

/* ---------------- 卡面定义（与汇总页 CSS 模式同样的四张卡、同样的配色） ----------------
   layered：插画窗口不是画在卡面上，而是由 holo.js 用模板缓冲（stencil）开出“窗口”，
            窗口里是有真实深度的远景 / 中景平面，前面再浮一层角色 / 徽记与粒子（SVG 光栅化而来）。
     foil     远景层上的箔面：'rainbow' / 'sparkle' / null（null = 插画哑光）
     breakout true = 角色超出卡框上沿（破框）；false = 徽记浮在窗口正前方 */
export const CARDS = {
  dragon: {
    name: '霜晶龙', hp: 'HP 120',
    move: '冰棱吐息 · 60',
    text: '令对手的下一回合无法撤退。彩虹镭射只在极光夜空里流动，龙头探出卡框。',
    foot: ['DR-001 · Rainbow Holo', '★★'],
    frame: [160, [[0, '#eef1f6'], [1, '#a7b1c2']]],
    artBg: (ctx, a) => linear(ctx, 180, a, [[0, '#0a1230'], [0.55, '#1d3566'], [1, '#3f73a6']]),
    panel: 'rgba(255,255,255,.82)', ink: '#1b1b22', ring: 'rgba(0,0,0,.35)',
    symbol: drawSnowflake,
    // 只闪插画：卡框不带箔（箔光全部在远景层上）
    foil: (m) => ({ r: m.frame * 0.12, b: 0 }),
    etch: 'lattice',
    layered: { foil: 'rainbow', breakout: false },
  },
  fox: {
    name: '焰尾狐', hp: 'HP 90',
    move: '流星焰 · 40×',
    text: '掷 3 次硬币，每次正面造成 40 点伤害。亮片只在晚霞里闪，狐耳探出卡框。',
    foot: ['FX-002 · Sparkle Foil', '★★★'],
    frame: [160, [[0, '#3b2a5c'], [1, '#120c22']]],
    artBg: (ctx, a) => linear(ctx, 180, a, [[0, '#241046'], [0.45, '#7a2a78'], [0.75, '#e0606a'], [1, '#f6b46a']]),
    panel: 'rgba(18,12,36,.84)', ink: '#f2eaff', ring: 'rgba(255,190,140,.35)',
    symbol: drawStars,
    foil: (m) => ({ r: 0, b: 0 }),
    etch: 'lattice',
    layered: { foil: 'sparkle', breakout: false },
  },
  star: {
    name: '星尘狐', hp: 'HP 90',
    move: '流星雨 · 40×',
    text: '亮片只在卡缘一圈闪，插画保持哑光；星辰徽记浮在窗口前方。',
    foot: ['SF-003 · Sparkle Border', '★★'],
    frame: [160, [[0, '#3b2a5c'], [1, '#120c22']]],
    artBg: (ctx, a) => radial(ctx, a, 0.3, 0.3, [[0, '#ff9ad5'], [0.45, '#7a3cff'], [1, '#1a0b3d']]),
    panel: 'rgba(18,12,36,.82)', ink: '#f2eaff', ring: 'rgba(200,170,255,.3)',
    symbol: drawStars,
    // 只闪边框：箔面与亮片都只在卡框
    foil: (m) => ({ r: m.frame * 0.9, b: m.frame * 1.0 }),
    etch: 'none',
    layered: { foil: null, breakout: false },
  },
  sun: {
    name: '金曜狮王', hp: 'HP 250',
    move: '王者咆哮 · 200',
    text: '反闪：卡框与文字区是拉丝金箔，插画保持哑光；烈日徽记浮在窗口前方。',
    foot: ['LN-004 · Reverse Gold', '★★★'],
    frame: [160, [[0, '#d9b45a'], [0.45, '#8a6420'], [0.7, '#e3c77a'], [1, '#7a5616']]],
    artBg: (ctx, a) => linear(ctx, 160, a, [[0, '#3a2a10'], [0.5, '#a57a28'], [1, '#2a1d08']]),
    panel: 'rgba(255,247,222,.86)', ink: '#1b1b22', ring: 'rgba(60,40,8,.4)',
    symbol: drawSun,
    foil: (m) => ({ r: m.frame * 1.0 + m.panel * 0.4, b: m.frame * 0.3 }),
    etch: 'brushed',
    layered: { foil: null, breakout: false },
  },
};

/* ---------------- 小工具 ---------------- */
function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
/** CSS linear-gradient(deg) 在矩形 a 内的等价 canvas 渐变 */
function linear(ctx, deg, a, stops) {
  const t = deg * Math.PI / 180, dx = Math.sin(t), dy = -Math.cos(t);
  const len = Math.abs(a.w * dx) + Math.abs(a.h * dy);
  const cx = a.x + a.w / 2, cy = a.y + a.h / 2;
  const g = ctx.createLinearGradient(cx - dx * len / 2, cy - dy * len / 2, cx + dx * len / 2, cy + dy * len / 2);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  ctx.fillStyle = g; ctx.fillRect(a.x, a.y, a.w, a.h);
}
/** CSS radial-gradient(circle at fx fy, ... farthest-corner) */
function radial(ctx, a, fx, fy, stops) {
  const cx = a.x + a.w * fx, cy = a.y + a.h * fy;
  const R = Math.hypot(Math.max(fx, 1 - fx) * a.w, Math.max(fy, 1 - fy) * a.h);
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  ctx.fillStyle = g; ctx.fillRect(a.x, a.y, a.w, a.h);
}
/** 轻微噪点抖动：消除 8 位渐变色带（色带本身就是一圈圈“硬边”） */
function dither(ctx, w, h, amt = 3) {
  const img = ctx.getImageData(0, 0, w, h), d = img.data;
  let s = 1234567;
  for (let i = 0; i < d.length; i += 4) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const n = ((s >> 8) % 1000) / 1000 - 0.5;
    d[i] += n * amt; d[i + 1] += n * amt; d[i + 2] += n * amt;
  }
  ctx.putImageData(img, 0, 0);
}
function wrapText(ctx, text, x, y, maxW, lh) {
  let line = '';
  for (const ch of text) {
    if (ctx.measureText(line + ch).width > maxW && line) { ctx.fillText(line, x, y); y += lh; line = ch.trim() ? ch : ''; }
    else line += ch;
  }
  if (line) ctx.fillText(line, x, y);
}
/** 可分离盒式模糊（3 次 ≈ 高斯），用于把高度图里的台阶变成平滑斜面 */
function blur(src, w, h, r, passes = 3) {
  let a = src, b = new Float32Array(w * h);
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < h; y++) {           // 横向
      let acc = 0; const row = y * w;
      for (let i = -r; i <= r; i++) acc += a[row + Math.min(w - 1, Math.max(0, i))];
      for (let x = 0; x < w; x++) {
        b[row + x] = acc / (2 * r + 1);
        acc += a[row + Math.min(w - 1, x + r + 1)] - a[row + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < w; x++) {           // 纵向
      let acc = 0;
      for (let i = -r; i <= r; i++) acc += b[Math.min(h - 1, Math.max(0, i)) * w + x];
      for (let y = 0; y < h; y++) {
        a[y * w + x] = acc / (2 * r + 1);
        acc += b[Math.min(h - 1, y + r + 1) * w + x] - b[Math.max(0, y - r) * w + x];
      }
    }
  }
  return a;
}
const smooth = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
/** 圆角矩形 SDF（内部为负） */
function sdRect(px, py, a) {
  const hx = a.w / 2, hy = a.h / 2;
  const qx = Math.abs(px - a.x - hx) - hx + a.r, qy = Math.abs(py - a.y - hy) - hy + a.r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - a.r;
}
/** 平滑值噪声（五次插值的哈希格点，仅用于装饰点位 / 拉丝细节） */
function makeNoise(seed) {
  const hash = (x, y) => {
    let n = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed, 2246822519);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  };
  const q = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), u = q(x - xi), v = q(y - yi);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}
/** 无格点的平滑场（正弦域扭曲）：用于薄膜厚度等“大面积渐变”，保证没有任何方块 / 直边 */
function warpField(x, y, s) {
  const a = Math.sin(x / 170 + 1.3 * Math.sin(y / 230 + s));
  const b = Math.sin(y / 140 + 0.9 * Math.sin(x / 190 + 2 + s));
  const c = Math.sin((x + y) / 310 + 1.7 * Math.sin((x - y) / 260 + s * 0.7));
  return 0.5 + 0.2 * a + 0.18 * b + 0.12 * c;    // 0.0 ~ 1.0
}

/* ---------------- 插画图案（与 CSS 版 SVG 相同的路径） ---------------- */
function symbolFrame(ctx, a, fn) {
  const s = a.w * 0.62 / 100;   // SVG viewBox 100 → 插画宽度 62%
  ctx.save();
  ctx.translate(a.x + a.w / 2 - 50 * s, a.y + a.h / 2 - 50 * s);
  ctx.scale(s, s);
  ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 6 * s; ctx.shadowOffsetY = 4 * s;
  fn(ctx);
  ctx.restore();
}
function drawSnowflake(ctx, a) {
  // 背景里的远景小冰晶（很淡）
  ctx.save(); ctx.globalAlpha = 0.18; ctx.strokeStyle = '#dff6ff'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  const nz = makeNoise(7);
  for (let i = 0; i < 14; i++) {
    const x = a.x + a.w * nz(i * 3.1, 0.5), y = a.y + a.h * nz(0.5, i * 2.7), r = 10 + 18 * nz(i, i);
    for (let k = 0; k < 3; k++) { const t = k * Math.PI / 3; ctx.beginPath(); ctx.moveTo(x - Math.cos(t) * r, y - Math.sin(t) * r); ctx.lineTo(x + Math.cos(t) * r, y + Math.sin(t) * r); ctx.stroke(); }
  }
  ctx.restore();
  symbolFrame(ctx, a, (c) => {
    c.strokeStyle = '#e8f8ff'; c.lineWidth = 5; c.lineCap = 'round';
    c.stroke(new Path2D('M50 8v84M14 29l72 42M14 71l72-42'));
    c.stroke(new Path2D('M50 20l-9-9M50 20l9-9M50 80l-9 9M50 80l9 9M24 35l-12 3M24 35l-3-12M76 65l12-3M76 65l3 12M24 65l-3 12M24 65l-12-3M76 35l3-12M76 35l12 3'));
    c.fillStyle = '#bfefff'; c.beginPath(); c.arc(50, 50, 9, 0, Math.PI * 2); c.fill();
  });
}
function drawStars(ctx, a) {
  ctx.save();
  const nz = makeNoise(3);
  for (let i = 0; i < 60; i++) {   // 远处星点
    const x = a.x + a.w * nz(i * 1.7, 3.3), y = a.y + a.h * nz(9.1, i * 1.3), r = 1.5 + 3 * nz(i, 1);
    ctx.fillStyle = `rgba(255,240,255,${0.25 + 0.5 * nz(1, i)})`; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  }
  ctx.restore();
  symbolFrame(ctx, a, (c) => {
    c.fillStyle = '#fff6d8'; c.fill(new Path2D('M50 4 C54 38 62 46 96 50 C62 54 54 62 50 96 C46 62 38 54 4 50 C38 46 46 38 50 4Z'));
    c.fillStyle = '#ffd1f0'; c.fill(new Path2D('M80 14 C81 22 84 24 92 25 C84 26 81 28 80 36 C79 28 76 26 68 25 C76 24 79 22 80 14Z'));
    c.fillStyle = '#cfe7ff'; c.beginPath(); c.arc(22, 78, 4, 0, 7); c.fill();
  });
}
function drawSun(ctx, a) {
  symbolFrame(ctx, a, (c) => {
    c.fillStyle = '#ffe9a6';
    c.beginPath(); c.arc(50, 50, 20, 0, 7); c.fill();
    const ray = new Path2D('M50 4l5 18h-10z');
    for (let k = 0; k < 8; k++) { c.save(); c.translate(50, 50); c.rotate(k * Math.PI / 4); c.translate(-50, -50); c.fill(ray); c.restore(); }
    c.shadowColor = 'transparent';
    c.fillStyle = '#b0801f'; c.beginPath(); c.arc(50, 50, 12, 0, 7); c.fill();
  });
}

/* ---------------- 正面颜色 ---------------- */
function drawFront(def, flat) {
  const cv = document.createElement('canvas'); cv.width = TW; cv.height = TH;
  const ctx = cv.getContext('2d', { willReadFrequently: true });   // CPU 画布：稍后要逐像素读回（抖动），也避免个别 GPU 画布实现丢失大面积渐变
  const { art, panel } = LAYOUT;
  // 卡框底色：铺满整张纹理（圆角由几何体裁出，纹理不留透明边，避免边缘出现黑线）
  linear(ctx, def.frame[0], { x: 0, y: 0, w: TW, h: TH }, def.frame[1]);
  // 标题
  ctx.fillStyle = def.ink; ctx.textBaseline = 'alphabetic';
  ctx.font = `800 56px ${FONT}`; ctx.fillText(def.name, PAD + 18, 118);
  ctx.font = `700 40px ${FONT}`; ctx.textAlign = 'right'; ctx.fillText(def.hp, TW - PAD - 18, 116); ctx.textAlign = 'left';
  // 插画窗口
  ctx.save(); rrect(ctx, art.x, art.y, art.w, art.h, art.r); ctx.clip();
  if (flat) ctx.drawImage(flat, art.x, art.y, art.w, art.h);   // 分层卡：窗口里先画一份“压平”的远景 + 中景（极端角度时远景淡出后的兜底）
  else { def.artBg(ctx, art); def.symbol(ctx, art); }
  ctx.restore();
  ctx.save(); ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.lineWidth = 11;
  rrect(ctx, art.x + 5.5, art.y + 5.5, art.w - 11, art.h - 11, art.r); ctx.stroke(); ctx.restore();
  // 技能面板
  ctx.fillStyle = def.panel; rrect(ctx, panel.x, panel.y, panel.w, panel.h, panel.r); ctx.fill();
  ctx.fillStyle = def.ink;
  const px = panel.x + 64;
  ctx.font = `800 46px ${FONT}`; ctx.fillText(def.move, px, panel.y + 96);
  ctx.font = `400 40px ${FONT}`; wrapText(ctx, def.text, px, panel.y + 170, panel.w - 128, 64);
  // 页脚
  ctx.globalAlpha = 0.75; ctx.font = `500 32px ${FONT}`;
  ctx.fillText(def.foot[0], PAD + 8, TH - PAD - 10);
  ctx.textAlign = 'right'; ctx.fillText(def.foot[1], TW - PAD - 8, TH - PAD - 10);
  ctx.globalAlpha = 1; ctx.textAlign = 'left';
  dither(ctx, TW, TH, 3);
  return cv;
}

/* ---------------- 卡背（所有卡共用） ---------------- */
function drawBack() {
  const cv = document.createElement('canvas'); cv.width = TW; cv.height = TH;
  const ctx = cv.getContext('2d', { willReadFrequently: true });   // CPU 画布：稍后要逐像素读回（抖动），也避免个别 GPU 画布实现丢失大面积渐变
  const cx = TW / 2, cy = TH / 2;
  radial(ctx, { x: 0, y: 0, w: TW, h: TH }, 0.5, 0.5, [[0, '#33388a'], [0.55, '#191c4f'], [1, '#0b0c24']]);
  // 放射细线 + 同心环（低对比，做出印刷底纹）
  ctx.save(); ctx.translate(cx, cy);
  ctx.strokeStyle = 'rgba(160,170,255,.07)'; ctx.lineWidth = 3;
  for (let k = 0; k < 72; k++) { ctx.rotate(Math.PI / 36); ctx.beginPath(); ctx.moveTo(0, 120); ctx.lineTo(0, 900); ctx.stroke(); }
  for (let r = 300; r < 900; r += 38) { ctx.strokeStyle = `rgba(160,170,255,${0.09 - r / 12000})`; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.stroke(); }
  ctx.restore();
  // 内框
  ctx.strokeStyle = 'rgba(243,217,138,.85)'; ctx.lineWidth = 10; rrect(ctx, 46, 46, TW - 92, TH - 92, 30); ctx.stroke();
  ctx.strokeStyle = 'rgba(243,217,138,.35)'; ctx.lineWidth = 4; rrect(ctx, 70, 70, TW - 140, TH - 140, 20); ctx.stroke();
  // 中央徽记：光环 + 八芒星
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 300);
  g.addColorStop(0, 'rgba(255,230,170,.35)'); g.addColorStop(0.6, 'rgba(255,230,170,.08)'); g.addColorStop(1, 'rgba(255,230,170,0)');
  ctx.fillStyle = g; ctx.fillRect(cx - 300, cy - 300, 600, 600);
  ctx.strokeStyle = '#f3d98a'; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(cx, cy, 210, 0, 7); ctx.stroke();
  ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, cy, 238, 0, 7); ctx.stroke();
  ctx.save(); ctx.translate(cx - 175, cy - 175); ctx.scale(3.5, 3.5);
  ctx.fillStyle = '#f7e2a0';
  ctx.fill(new Path2D('M50 4 C54 38 62 46 96 50 C62 54 54 62 50 96 C46 62 38 54 4 50 C38 46 46 38 50 4Z'));
  ctx.translate(50, 50); ctx.rotate(Math.PI / 4); ctx.scale(0.62, 0.62); ctx.translate(-50, -50);
  ctx.fillStyle = 'rgba(247,226,160,.8)';
  ctx.fill(new Path2D('M50 4 C54 38 62 46 96 50 C62 54 54 62 50 96 C46 62 38 54 4 50 C38 46 46 38 50 4Z'));
  ctx.restore();
  ctx.fillStyle = '#f3d98a'; ctx.textAlign = 'center';
  ctx.font = `800 88px ${FONT}`; ctx.fillText('HOLO CARD', cx, cy + 380);
  ctx.font = `600 44px ${FONT}`; ctx.globalAlpha = 0.7; ctx.fillText('全 息 闪 卡', cx, cy - 300);
  ctx.globalAlpha = 1;
  dither(ctx, TW, TH, 3);
  return cv;
}

/* ---------------- 区域权重（带羽化，单位：纹理像素） ---------------- */
function regions(x, y, feather) {
  const { art, panel } = LAYOUT;
  const a = smooth(feather, -feather, sdRect(x, y, art));
  const p = smooth(feather, -feather, sdRect(x, y, panel));
  return { art: a, panel: p, frame: Math.max(0, 1 - a - p) };
}

/** 箔面遮罩 DataTexture 数据（RGBA8，纹理朝向） */
function buildFoil(fn, seed, isBack = false) {
  const data = new Uint8Array(MW * MH * 4);
  const sx = TW / MW;
  for (let j = 0; j < MH; j++) {
    const y = (MH - 1 - j + 0.5) * sx;           // 翻转：第 0 行 = 卡片底边
    for (let i = 0; i < MW; i++) {
      const x = (i + 0.5) * sx;
      let r, b;
      if (isBack) {
        const d = Math.hypot(x - TW / 2, y - TH / 2);
        const emblem = smooth(300, 200, d);
        const border = Math.max(0, 1 - Math.abs(sdRect(x, y, { x: 46, y: 46, w: TW - 92, h: TH - 92, r: 30 })) / 22);
        r = emblem * 0.85 + border * border * 0.6; b = emblem * 0.5;
      } else {
        ({ r, b } = fn(regions(x, y, 14)));
      }
      const g = warpField(x, y, seed * 0.37);
      const o = (j * MW + i) * 4;
      data[o] = Math.round(Math.min(1, r) * 255);
      data[o + 1] = Math.round(Math.min(1, g) * 255);
      data[o + 2] = Math.round(Math.min(1, b) * 255);
      data[o + 3] = 255;
    }
  }
  return { data, width: MW, height: MH };
}

/** 法线贴图：canvas 画出高度（凸印文字、窗口内凹）→ 模糊成斜面 → 叠加解析蚀刻纹 → Sobel 求法线 */
function buildNormal(def, isBack = false) {
  const W = TW, H = TH;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, W, H);
  if (isBack) {
    ctx.strokeStyle = '#c0c0c0'; ctx.lineWidth = 12; rrect(ctx, 46, 46, W - 92, H - 92, 30); ctx.stroke();
    ctx.lineWidth = 14; ctx.beginPath(); ctx.arc(W / 2, H / 2, 210, 0, 7); ctx.stroke();
    ctx.fillStyle = '#b0b0b0'; ctx.textAlign = 'center'; ctx.font = `800 88px ${FONT}`; ctx.fillText('HOLO CARD', W / 2, H / 2 + 380);
  } else {
    const { art, panel } = LAYOUT;
    ctx.fillStyle = '#505050'; rrect(ctx, art.x, art.y, art.w, art.h, art.r); ctx.fill();     // 插画窗口内凹
    ctx.fillStyle = '#6a6a6a'; rrect(ctx, panel.x, panel.y, panel.w, panel.h, panel.r); ctx.fill(); // 面板略凹
    ctx.fillStyle = '#c8c8c8';                                                                  // 标题凸印
    ctx.font = `800 56px ${FONT}`; ctx.fillText(def.name, PAD + 18, 118);
    ctx.font = `700 40px ${FONT}`; ctx.textAlign = 'right'; ctx.fillText(def.hp, W - PAD - 18, 116);
  }
  const src = ctx.getImageData(0, 0, W, H).data;
  let h = new Float32Array(W * H);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) h[j * W + i] = src[((H - 1 - j) * W + i) * 4] / 255;
  h = blur(h, W, H, 3, 3);                       // 台阶 → 约 20px 宽的柔和斜面
  // 解析蚀刻纹（只在箔区，幅度随区域权重平滑衰减）
  const nz = makeNoise(11);
  if (!isBack && def.etch !== 'none') {
    for (let j = 0; j < H; j++) {
      const y = H - 1 - j;
      for (let i = 0; i < W; i++) {
        const m = regions(i, y, 18);
        let e = 0;
        if (def.etch === 'ripple') {             // 插画窗口：以冰晶为中心的同心水波纹（波长 ~12px，不会混叠）
          const { art } = LAYOUT;
          const d = Math.hypot(i - (art.x + art.w / 2), y - (art.y + art.h / 2));
          e = m.art * 0.010 * Math.sin(d / 12 * 6.2832 / 1.0 + nz(i / 80, y / 80) * 3);
        } else if (def.etch === 'lattice') {     // 卡框 / 面板：斜向菱格压纹（正弦脊线，截面是平滑的波，没有台阶）
          const u = (i + y) / 46, v = (i - y) / 46;
          const ridge = Math.pow(Math.abs(Math.cos(Math.PI * u)), 18) + Math.pow(Math.abs(Math.cos(Math.PI * v)), 18);
          e = (m.frame + m.panel * 0.35) * 0.006 * ridge;
        } else if (def.etch === 'brushed') {     // 卡框 / 面板：横向拉丝（纵向高频、横向低频，轻微起伏）
          const yy = y + nz(i / 300, y / 300) * 20;
          e = (m.frame + m.panel * 0.6) * 0.012 * (nz(i / 220, yy / 1.6) - 0.5);
        }
        h[j * W + i] += e;
      }
    }
  }
  const data = new Uint8Array(W * H * 4), k = isBack ? 6 : 7;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const l = h[j * W + Math.max(0, i - 1)], r = h[j * W + Math.min(W - 1, i + 1)];
    const d = h[Math.max(0, j - 1) * W + i], u = h[Math.min(H - 1, j + 1) * W + i];
    let nx = -(r - l) * k, ny = -(u - d) * k, nzv = 1;
    const len = Math.hypot(nx, ny, nzv); nx /= len; ny /= len; nzv /= len;
    const o = (j * W + i) * 4;
    data[o] = Math.round((nx * 0.5 + 0.5) * 255);
    data[o + 1] = Math.round((ny * 0.5 + 0.5) * 255);
    data[o + 2] = Math.round((nzv * 0.5 + 0.5) * 255);
    data[o + 3] = 255;
  }
  return { data, width: W, height: H };
}

const cache = new Map();
/** 生成（并缓存）某张卡的全部贴图原始数据 */
export function buildCard(key, flat) {
  if (!cache.has(key)) {
    const def = CARDS[key];
    cache.set(key, { map: drawFront(def, flat), normal: buildNormal(def), foil: buildFoil(def.foil, key.length * 17) });
  }
  return cache.get(key);
}
let backCache;
export function buildBack() {
  backCache ??= { map: drawBack(), normal: buildNormal(null, true), foil: buildFoil(null, 5, true) };
  return backCache;
}

/** 卡片下方的柔和投影（alpha 渐隐，无硬边） */
export function buildShadow() {
  const S = 128, pad = 32, data = new Uint8Array(S * S * 4);
  let a = new Float32Array(S * S);
  const box = { x: pad, y: pad * 0.8, w: S - pad * 2, h: S - pad * 1.6, r: 6 };
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) a[j * S + i] = sdRect(i, j, box) < 0 ? 1 : 0;
  a = blur(a, S, S, 8, 3);
  for (let p = 0; p < S * S; p++) { data[p * 4 + 3] = Math.round(a[p] * 255); }
  return { data, width: S, height: S };
}

/** 页面背景：与 CSS 版相同的顶部椭圆渐变 + 抖动 */
export function drawBackground(w, h) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d', { willReadFrequently: true });   // CPU 画布：稍后要逐像素读回（抖动），也避免个别 GPU 画布实现丢失大面积渐变
  ctx.save(); ctx.translate(w / 2, 0); ctx.scale(w / 2, h);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1.15);
  g.addColorStop(0, '#2a2440'); g.addColorStop(0.6, '#121019'); g.addColorStop(1, '#0a0910');
  ctx.fillStyle = g; ctx.fillRect(-1, 0, 2, 1); ctx.restore();
  dither(ctx, w, h, 2.5);
  return cv;
}

/* =========================================================
   分层卡：SVG → canvas 光栅化（feature/all-in-one）
   SVG 直接取自汇总页 CSS 模式里的同一份内联 SVG（单一来源），保证两种模式画面一致。
   所有边缘都做柔和处理：远景 / 中景四周 alpha 渐隐，角色底部渐隐，投影用高斯模糊。
   ========================================================= */
/** 把一段 SVG 源码画到 w×h 的 canvas 上。viewBox 可改写（给角色四周留出投影 / 犄角的空间） */
export async function rasterSvg(svg, w, h, { viewBox, under, shadow } = {}) {
  let src = svg.replace(/<svg\b([^>]*)>/, (m, attrs) => {
    attrs = attrs.replace(/\s(width|height)="[^"]*"/g, '');
    if (viewBox) attrs = attrs.replace(/viewBox="[^"]*"/, `viewBox="${viewBox}"`);
    if (!/xmlns=/.test(attrs)) attrs += ' xmlns="http://www.w3.org/2000/svg"';
    return `<svg${attrs} width="${w}" height="${h}">`;
  });
  const img = new Image();
  img.decoding = 'async';
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src);
  await img.decode();
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  if (under) under(ctx, { x: 0, y: 0, w, h });
  ctx.save();   // 投影只作用在这一次 drawImage（之后的渐隐 / 合成不能再带投影）
  if (shadow) { ctx.shadowColor = shadow.color; ctx.shadowBlur = shadow.blur; ctx.shadowOffsetY = shadow.y; }
  ctx.drawImage(img, 0, 0, w, h);
  ctx.restore();
  return cv;
}
/** 四周 alpha 渐隐：从边缘（alpha 0）向内 fx / fy 像素内平滑升到 1。横纵两遍相乘，角上也是柔的 */
export function fadeEdges(cv, fx, fy = fx) {
  const ctx = cv.getContext('2d'), { width: w, height: h } = cv;
  const ramp = (g, f, len) => {
    const N = 10;   // 多段色标近似 smoothstep：渐隐没有“起点线”
    for (let k = 0; k <= N; k++) {
      const t = k / N, a = `rgba(0,0,0,${(t * t * (3 - 2 * t)).toFixed(3)})`;
      g.addColorStop(Math.min(0.5, t * f / len), a);
      g.addColorStop(Math.max(0.5, 1 - t * f / len), a);
    }
  };
  ctx.save(); ctx.globalCompositeOperation = 'destination-in';
  const gx = ctx.createLinearGradient(0, 0, w, 0); ramp(gx, fx, w);
  ctx.fillStyle = gx; ctx.fillRect(0, 0, w, h);
  const gy = ctx.createLinearGradient(0, 0, 0, h); ramp(gy, fy, h);
  ctx.fillStyle = gy; ctx.fillRect(0, 0, w, h);
  ctx.restore();
  return cv;
}
/** 底部渐隐（角色下沿融进中景）：最下面 zero 像素全透明，再往上 len 像素内平滑升到 1（与 CSS 版 --char-fade 相同的作用） */
export function fadeBottom(cv, zero, len) {
  const ctx = cv.getContext('2d'), { width: w, height: h } = cv;
  ctx.save(); ctx.globalCompositeOperation = 'destination-in';
  const g = ctx.createLinearGradient(0, h - zero, 0, h - zero - len);
  const N = 10;
  for (let k = 0; k <= N; k++) { const t = k / N, s = t * t * (3 - 2 * t); g.addColorStop(t, `rgba(0,0,0,${s.toFixed(3)})`); }
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.restore();
  return cv;
}
/** 插画窗口的内阴影 + 描边（叠在窗口内容上方，做出“窗口凹进卡里”的感觉） */
export function buildWindowShade(def, w, h, pxPerCssPx) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d'), k = pxPerCssPx, r = 3 * k;
  const inset = (blur, oy, color) => {
    // 经典技巧：把“外框减去窗口”的形状画到画布外，只把它的投影偏移回来 → 得到柔和的内阴影
    ctx.save();
    ctx.shadowColor = color; ctx.shadowBlur = blur; ctx.shadowOffsetX = 10000; ctx.shadowOffsetY = oy;
    ctx.beginPath();
    ctx.rect(-10000 - w, -h, w * 3, h * 3);
    rrect(ctx, -10000, 0, w, h, r);
    ctx.fill('evenodd');
    ctx.restore();
  };
  inset(14 * k, 6 * k, 'rgba(0,0,0,.45)');
  inset(22 * k, 0, 'rgba(0,0,0,.25)');
  ctx.strokeStyle = def.ring; ctx.lineWidth = 3 * k;
  rrect(ctx, 1.5 * k, 1.5 * k, w - 3 * k, h - 3 * k, r); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1 * k;
  rrect(ctx, 3.5 * k, 3.5 * k, w - 7 * k, h - 7 * k, r); ctx.stroke();
  return cv;
}
/** 远景层的箔面遮罩（整层都是箔；G = 薄膜厚度扰动，B = 亮片密度） */
export function buildLayerFoil(kind, seed = 3) {
  const S = 128, data = new Uint8Array(S * S * 4);
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const o = (j * S + i) * 4;
    data[o] = 255;
    data[o + 1] = Math.round(Math.min(1, warpField(i * 8, j * 8, seed)) * 255);
    data[o + 2] = kind === 'sparkle' ? 255 : 115;
    data[o + 3] = 255;
  }
  return { data, width: S, height: S };
}
