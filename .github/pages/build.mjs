#!/usr/bin/env node
/**
 * 组装多版本预览站（GitHub Actions 里运行；本地也能跑：node .github/pages/build.mjs _site）
 *
 *   /            版本总览首页（本脚本生成）
 *   /classic/    main 分支
 *   /<route>/    各 feature 分支（versions.json 里登记的 + 自动发现的其它 feature/* 分支）
 *
 * 每个版本用 `git archive` 导出该分支的已跟踪文件（只有静态文件，不跑构建），
 * 再删掉 qa/、node_modules、.github 等非站点文件，然后往 HTML 里注入悬浮的「版本切换」导航。
 * 分支源码本身不被修改。需要完整的远程分支引用（actions/checkout 的 fetch-depth: 0）。
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(process.argv[2] || '_site');
const cfg = JSON.parse(fs.readFileSync(path.join(here, 'versions.json'), 'utf8'));
const REPO = process.env.GITHUB_REPOSITORY || cfg.repo;

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1 << 28 }).trim();
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// 优先用远程分支（CI 上 checkout 的就是它们）；本地调试时回退到同名本地分支。
// 本地预览尚未推送的提交时设 PAGES_LOCAL_REFS=1，改为本地分支优先。
const preferLocal = process.env.PAGES_LOCAL_REFS === '1';
function resolveRef(branch) {
  const refs = preferLocal
    ? [`refs/heads/${branch}`, `refs/remotes/origin/${branch}`]
    : [`refs/remotes/origin/${branch}`, `refs/heads/${branch}`];
  for (const ref of refs) {
    try { git('rev-parse', '--verify', '--quiet', ref + '^{commit}'); return ref; } catch {}
  }
  return null;
}

// ---- 版本列表：登记的 + 自动发现的 feature/* 分支 ----
const versions = cfg.versions.map((v) => ({ ...v }));
const known = new Set(versions.map((v) => v.branch));
const remoteFeatures = git('for-each-ref', '--format=%(refname)', 'refs/remotes/origin/feature/')
  .split('\n').filter(Boolean).map((r) => r.replace('refs/remotes/origin/', ''));
for (const branch of remoteFeatures.sort()) {
  if (known.has(branch)) continue;
  const route = branch.replace(/^feature\//, '').toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  // 路由已被显式登记（例如汇总版已迁到 main、同一分支仍保留）时不再生成重复版本，
  // 否则会冒出 /v-all-in-one-6/ 这类重复入口。
  if (!route || versions.some((v) => v.route === route)) {
    console.log(`↷ 跳过自动发现 ${branch}：/${route || '?'}/ 已由 versions.json 显式占用`);
    continue;
  }
  versions.push({ route, branch, title: branch.replace(/^feature\//, ''), short: route, desc: `自动发现的分支 ${branch}。`, auto: true });
}

// ---- 导出每个版本 ----
const EXCLUDE_TOP = ['.github', '.gitignore', '.gitattributes', '.vscode', '.idea', 'qa', 'node_modules', 'package.json', 'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock'];
const EXCLUDE_ANY = ['node_modules', '.DS_Store'];
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

function rmAny(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (EXCLUDE_ANY.includes(e.name)) fs.rmSync(p, { recursive: true, force: true });
    else if (e.isDirectory()) rmAny(p);
  }
}
function listFiles(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? listFiles(p, base) : [path.relative(base, p)];
  });
}

const built = [];
for (const v of versions) {
  const ref = resolveRef(v.branch);
  if (!ref) { console.warn(`⚠ 跳过 ${v.route}：找不到分支 ${v.branch}`); continue; }
  const dir = path.join(out, v.route);
  fs.mkdirSync(dir, { recursive: true });
  const tar = execFileSync('git', ['archive', '--format=tar', ref], { maxBuffer: 1 << 30 });
  execFileSync('tar', ['-x', '-C', dir], { input: tar });
  for (const name of EXCLUDE_TOP) fs.rmSync(path.join(dir, name), { recursive: true, force: true });
  rmAny(dir);
  if (!fs.existsSync(path.join(dir, 'index.html'))) { console.warn(`⚠ 跳过 ${v.route}：分支 ${v.branch} 根目录没有 index.html`); fs.rmSync(dir, { recursive: true, force: true }); continue; }

  const [sha, date, subject] = git('log', '-1', '--format=%h%x00%cI%x00%s', ref).split('\0');
  v.sha = sha; v.date = date; v.subject = subject;
  if (!v.thumb || !fs.existsSync(path.join(dir, v.thumb))) {
    const shots = fs.existsSync(path.join(dir, 'screenshots')) ? fs.readdirSync(path.join(dir, 'screenshots')).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)).sort() : [];
    v.thumb = shots.length ? `screenshots/${shots[0]}` : null;
  }
  built.push(v);
  console.log(`✓ /${v.route}/  ←  ${v.branch} @ ${sha}  (${subject})`);
}

// ---- 悬浮「版本切换」导航（注入到每个版本的 HTML） ----
function navHtml(current, prefix) {
  const items = built.map((v) => {
    const cur = v.route === current.route;
    return `<a href="${prefix}${v.route}/"${cur ? ' aria-current="page"' : ''}><b>${esc(v.title)}</b><span>${esc(v.branch)}</span></a>`;
  }).join('');
  const src = `https://github.com/${REPO}/tree/${encodeURI(current.branch)}`;
  return `
<!-- ===== 版本切换导航：由 .github/pages/build.mjs 在部署时注入，分支源码里没有 ===== -->
<style>
#hcv-nav{position:fixed;top:max(10px,env(safe-area-inset-top));right:max(10px,env(safe-area-inset-right));z-index:2147483000;
  font:500 12px/1.3 system-ui,-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;color:#e8e8f0;letter-spacing:normal;text-align:left;
  -webkit-tap-highlight-color:transparent;touch-action:manipulation}
#hcv-nav *{box-sizing:border-box}
#hcv-nav>summary{list-style:none;cursor:pointer;user-select:none;-webkit-user-select:none;display:flex;align-items:center;gap:6px;
  height:34px;padding:0 12px 0 10px;border-radius:999px;background:rgba(22,19,36,.72);border:1px solid rgba(255,255,255,.16);
  box-shadow:0 4px 16px rgba(0,0,0,.35);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);opacity:.82;transition:opacity .2s,background .2s}
#hcv-nav>summary::-webkit-details-marker{display:none}
#hcv-nav>summary:hover,#hcv-nav[open]>summary,#hcv-nav>summary:focus-visible{opacity:1;background:rgba(40,34,64,.9)}
#hcv-nav>summary:focus-visible{outline:2px solid #b9a8ff;outline-offset:2px}
#hcv-nav .hcv-ico{font-size:14px;line-height:1}
#hcv-nav .hcv-cur{opacity:.7;max-width:9em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#hcv-nav .hcv-panel{position:absolute;top:calc(100% + 6px);right:0;width:max-content;min-width:200px;max-width:min(260px,calc(100vw - 20px));
  max-height:calc(100vh - 70px);overflow:auto;padding:6px;border-radius:12px;background:rgba(22,19,36,.94);border:1px solid rgba(255,255,255,.14);
  box-shadow:0 10px 30px rgba(0,0,0,.5);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
#hcv-nav a{display:block;padding:7px 10px;border-radius:8px;color:inherit;text-decoration:none}
#hcv-nav a span{display:block;font-size:10.5px;opacity:.5;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;margin-top:2px}
#hcv-nav a b{font-weight:600}
#hcv-nav a:hover,#hcv-nav a:focus-visible{background:rgba(255,255,255,.08);outline:none}
#hcv-nav a[aria-current="page"]{background:rgba(180,160,255,.2);box-shadow:inset 0 0 0 1px rgba(200,185,255,.4)}
#hcv-nav .hcv-sep{height:1px;margin:5px 4px;background:rgba(255,255,255,.1)}
#hcv-nav .hcv-foot{display:flex;gap:2px}
#hcv-nav .hcv-foot a{flex:1;text-align:center;font-size:11.5px;opacity:.8}
@media (max-width:640px){#hcv-nav .hcv-label,#hcv-nav .hcv-cur{display:none}#hcv-nav>summary{width:34px;padding:0;justify-content:center}}
@media print{#hcv-nav{display:none}}
</style>
<details id="hcv-nav">
<summary title="切换版本" aria-label="切换版本（当前：${esc(current.title)}）"><span class="hcv-ico" aria-hidden="true">⇄</span><span class="hcv-label">版本</span><span class="hcv-cur">${esc(current.short || current.title)}</span></summary>
<nav class="hcv-panel" aria-label="版本切换">${items}<div class="hcv-sep"></div><div class="hcv-foot"><a href="${prefix}">全部版本</a><a href="${esc(src)}" target="_blank" rel="noopener">本分支源码 ↗</a></div></nav>
</details>
<script>
(function(){var d=document.getElementById('hcv-nav');if(!d)return;
document.addEventListener('click',function(e){if(d.open&&!d.contains(e.target))d.open=false;});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&d.open){d.open=false;d.querySelector('summary').focus();}});})();
</script>
<!-- ===== /版本切换导航 ===== -->
`;
}

let injected = 0;
for (const v of built) {
  const dir = path.join(out, v.route);
  for (const rel of listFiles(dir).filter((f) => /\.html?$/i.test(f))) {
    const file = path.join(dir, rel);
    let html = fs.readFileSync(file, 'utf8');
    const depth = rel.split(path.sep).length; // index.html → 1 → "../"
    // 页面自己没有 favicon 时补一个站点级的（只加 <link>，不动页面内容）
    const h = html.toLowerCase().indexOf('</head>');
    if (h >= 0 && !/rel=["']?(shortcut )?icon/i.test(html)) html = html.slice(0, h) + `<link rel="icon" href="${'../'.repeat(depth)}favicon.svg" type="image/svg+xml" />\n` + html.slice(h);
    const i = html.toLowerCase().lastIndexOf('</body>');
    if (i < 0) continue;
    fs.writeFileSync(file, html.slice(0, i) + navHtml(v, '../'.repeat(depth)) + html.slice(i));
    injected++;
  }
}

// ---- 首页 ----
const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(new Date(iso).getTime() + 8 * 3600e3); // 北京时间
  return d.toISOString().slice(0, 16).replace('T', ' ') + ' (UTC+8)';
};
const cards = built.map((v, i) => `
    <article class="v">
      <a class="thumb" href="${v.route}/" aria-label="打开 ${esc(v.title)} 预览">${v.thumb
        ? `<img src="${v.route}/${esc(v.thumb)}" alt="${esc(v.title)} 效果截图" loading="${i < 3 ? 'eager' : 'lazy'}" decoding="async"${v.thumbStyle ? ` style="${esc(v.thumbStyle)}"` : ''}>`
        : '<span class="noimg">暂无截图</span>'}</a>
      <div class="body">
        <h2><a href="${v.route}/">${esc(v.title)}</a></h2>
        <p>${esc(v.desc)}</p>
        <div class="meta"><code>/${esc(v.route)}/</code> · 分支 <a href="https://github.com/${REPO}/tree/${encodeURI(v.branch)}" target="_blank" rel="noopener"><code>${esc(v.branch)}</code></a></div>
        <div class="meta dim">最新提交 <a href="https://github.com/${REPO}/commit/${v.sha}" target="_blank" rel="noopener"><code>${v.sha}</code></a> · ${esc(fmtDate(v.date))}</div>
        <div class="act"><a class="btn pri" href="${v.route}/">打开预览</a><a class="btn" href="https://github.com/${REPO}/tree/${encodeURI(v.branch)}" target="_blank" rel="noopener">查看分支 ↗</a></div>
      </div>
    </article>`).join('');

const builtAt = fmtDate(new Date().toISOString());
const home = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>全息闪卡 Holo Card · 版本预览</title>
<link rel="icon" href="favicon.svg" type="image/svg+xml" />
<meta name="description" content="网页全息闪卡特效的各个版本：经典 CSS、陀螺仪、局部镭射、多层视差、WebGL 旗舰版。" />
<style>
* { box-sizing: border-box; }
html { scrollbar-gutter: stable; background: #0a0910; }
html, body { margin: 0; }
body {
  font-family: system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
  color: #e8e8f0;
  /* 与各版本页同一套暗色渐变；不用 fixed（iOS 不支持，长页面也不会露底） */
  background: radial-gradient(ellipse 120% 900px at 50% 0%, #2a2440 0%, #121019 60%, #0a0910 100%) no-repeat;
  min-height: 100vh;
  padding: 40px 16px 56px;
}
a { color: #c9b8ff; }
header, main, footer { max-width: 1120px; margin: 0 auto; }
header { text-align: center; margin-bottom: 30px; }
h1 { font-size: 24px; font-weight: 600; letter-spacing: .05em; margin: 0 0 8px; }
header p { margin: 0 auto; opacity: .6; font-size: 13.5px; line-height: 1.6; max-width: 40em; }
main { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
.v {
  display: flex; flex-direction: column; overflow: hidden;
  background: linear-gradient(180deg, rgba(255,255,255,.055), rgba(255,255,255,.025));
  border: 1px solid rgba(255,255,255,.1); border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0,0,0,.35);
  transition: transform .25s ease, border-color .25s ease, box-shadow .25s ease;
}
.v:hover { transform: translateY(-3px); border-color: rgba(200,185,255,.35); box-shadow: 0 16px 40px rgba(0,0,0,.45), 0 0 24px rgba(170,150,255,.12); }
.thumb { display: block; aspect-ratio: 16 / 10; background: #0d0b14; overflow: hidden; position: relative; }
.thumb img { width: 100%; height: 100%; object-fit: cover; object-position: 50% 30%; display: block; transition: transform .4s ease; }
.v:hover .thumb img { transform: scale(1.03); }
.thumb::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, transparent 65%, rgba(10,9,16,.55)); pointer-events: none; }
.noimg { display: grid; place-items: center; height: 100%; opacity: .4; font-size: 13px; }
.body { padding: 16px 18px 18px; display: flex; flex-direction: column; gap: 8px; flex: 1; }
h2 { margin: 0; font-size: 17px; font-weight: 600; }
h2 a { color: inherit; text-decoration: none; }
.body p { margin: 0; font-size: 13px; line-height: 1.6; opacity: .72; flex: 1; }
.meta { font-size: 12px; opacity: .75; }
.meta.dim { opacity: .5; }
.meta a { text-decoration: none; }
code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 11.5px; background: rgba(255,255,255,.07); padding: 1px 5px; border-radius: 5px; }
.act { display: flex; gap: 8px; margin-top: 6px; }
.btn {
  font-size: 13px; color: #e8e8f0; text-decoration: none; text-align: center;
  background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.14);
  border-radius: 999px; padding: 7px 14px; transition: background .2s, border-color .2s;
}
.btn:hover { background: rgba(255,255,255,.13); }
.btn.pri { background: rgba(180,160,255,.25); border-color: rgba(200,185,255,.55); }
.btn.pri:hover { background: rgba(180,160,255,.35); }
footer { margin-top: 36px; text-align: center; font-size: 12px; line-height: 1.8; opacity: .5; }
@media (prefers-reduced-motion: reduce) { .v, .thumb img { transition: none; } .v:hover { transform: none; } .v:hover .thumb img { transform: none; } }
</style>
</head>
<body>
<header>
  <h1>全息闪卡 Holo Card · 版本预览</h1>
  <p>每个版本对应仓库里的一个独立分支，点卡片进入在线预览；预览页右上角的「⇄ 版本」按钮可以随时切换。</p>
</header>
<main>${cards}
</main>
<footer>
  源码：<a href="https://github.com/${REPO}" target="_blank" rel="noopener">github.com/${REPO}</a> ·
  推送 main 或任意 <code>feature/*</code> 分支后自动重新部署 · 本次构建 ${esc(builtAt)}<br>
  思路参考 <a href="https://github.com/simeydotme/pokemon-cards-css" target="_blank" rel="noopener">simeydotme/pokemon-cards-css</a>
</footer>
</body>
</html>
`;
fs.writeFileSync(path.join(out, 'index.html'), home);

// favicon（避免浏览器请求 /favicon.ico 得到 404 控制台报错）
fs.writeFileSync(path.join(out, 'favicon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b45ef0"/><stop offset=".35" stop-color="#3fbde8"/><stop offset=".65" stop-color="#4ce0a0"/><stop offset="1" stop-color="#e8dc4a"/></linearGradient></defs><rect x="12" y="4" width="40" height="56" rx="5" fill="url(#g)"/><rect x="17" y="10" width="30" height="24" rx="2" fill="#1b1830" opacity=".55"/><path d="M32 14l2.6 6.4L41 23l-6.4 2.6L32 32l-2.6-6.4L23 23l6.4-2.6z" fill="#fff"/></svg>\n`);

// 404：把找不到的路径带回首页（相对站点根目录 /<repo>/）
fs.writeFileSync(path.join(out, '404.html'), `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>页面不存在 · Holo Card</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;color:#e8e8f0;background:radial-gradient(ellipse at 50% 0%,#2a2440 0%,#121019 60%,#0a0910 100%) fixed;text-align:center}a{color:#c9b8ff}</style></head>
<body><div><h1 style="font-weight:600;font-size:22px">这个页面不存在</h1><p style="opacity:.7"><a id="home" href="/${REPO.split('/')[1]}/">返回版本总览</a></p></div></body></html>
`);

console.log(`\n站点已生成：${out}（${built.length} 个版本，注入导航 ${injected} 个页面）`);
