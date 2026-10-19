# Agnir Active Decisions

This file records durable decisions required to operate and evolve this Project safely. Superseded chronology remains available through Git history and `.agnir/evidence/`.

## Continuity identity

- Project identity is `urn:agnir:project:holo-card`; the single logical lineage is `urn:agnir:lineage:authoritative`.
- No VCS selector/binding extension is declared. Every branch checkout resolves the same Project identity and lineage, inheriting the continuity files from `main`; integrations reconcile continuity instead of maintaining per-branch lineages.
- `main` remains the authoritative branch for continuity and for the assembled preview site.

## All-in-one promotion and version routes

- On 2026-10-19 the 汇总版 (`feature/all-in-one`, `adf07cc`) was merged into `main`; `main` now ships the all-in-one page.
- The classic CSS demo was preserved by cutting `feature/classic` from `a42d348` before the merge, including the corner tilt fix.
- Routes: `/all-in-one/` → `main`; `/classic/` → `feature/classic`; `gyro` / `foil-mask` / `parallax` / `webgl` remain on their feature branches.
- `feature/all-in-one` stays as historical source but no longer owns a route. Auto-discovery skips a `feature/*` branch whose derived route is already explicitly registered, instead of inventing `v-*` duplicate routes.
- `.github/pages/build.mjs` and `versions.json` stay owned by `main`; the all-in-one branch had deleted them and that deletion was not accepted.
- `feature/all-in-one` had independently initialized Agnir with identity `urn:agnir:project:mattamior/holo-card` and a binding to `refs/heads/feature/all-in-one`. That identity and binding were **not** adopted: `main`'s identity and the binding-free model remain authoritative, and the branch's continuity/evidence is reconciliation input only.

## Preservation constraints

- The classic demo keeps its zero-dependency, single-file property on `feature/classic`.
- The 汇总版 may load its bundled `vendor/three-holo.min.js` only when the user switches to WebGL; CSS mode must not require it.
- Version variants remain isolated on their branches. The build script assembles them at deploy time; version code is not merged into `main` merely to appear on the site.
- Agnir changes must not rewrite unrelated README, project instructions, or Pages configuration.

## Installation provenance

- Installed from published stable release `v1.0.2` of `iorLab/agnir` at immutable revision `b5626394ec40a5cb7a28c01892acde07cc0adc8e`, declared as Core `1.0` / `repository-filesystem/1.0`.
- `AGNIR.md` is the canonical Executor-facing surface; `AGENTS.md` stays locator-only; the README `## Agnir Project Instructions` heading is a backward-compatible locator only.

## Checkpoint and repository operations

- Repository-context `commit` / `提交` / `提交代码` dispatches checkpoint evaluation before commit.
- `commit and push` / `提交推送` adds push plus destination-ref verification.
- Unchanged durable truth is a valid checkpoint no-op; no `.agnir/` mutation is manufactured for commits.
- No Project-defined pre-commit policy (linters, tests, build gates) is declared. The deploy workflow and local `node .github/pages/build.mjs` remain the verification paths.

## 汇总版开发决策（2026-10-12，feature/all-in-one，保留原文）

- **2026-10-12** — Breakout off for all cards; stereo/foil/motion stay in-frame.
- **2026-10-12** — Foil driven by card tilt / fixed light as strip sweep, not pointer-following hotspot.
- **2026-10-12** — L3 = subject/character loop; L4 = environment FX (aligned to reference capture).
- **2026-10-12** — ~~Card window uses landscape 4:3~~ **superseded**: portrait vertical cards per video ref.
- **2026-10-12** — Yinglong name/blurb must be verifiable against 《山海经》; white-gold avian wings are art direction, not scripture.
- **2026-10-12** — Agnir Core/profile `1.0` / `repository-filesystem/1.0` initialized from iorLab/agnir `v1.0.2` (`b5626394ec40a5cb7a28c01892acde07cc0adc8e`).
- **2026-10-12** — Card + art window are **portrait (2:3 / vertical)** matching Honor of Kings reference video; supersedes landscape 4:3 art-window lock. Source art may be landscape but is cover-cropped.
- **2026-10-12** — L3 subject motion must include subtle looping **body** idle (Yinglong `00_body` / `.yl-l-body`), not only hair/wings/eyes; amplitude very small; no region_warp.
- **2026-10-12** — Card levels are **per `data-card` id** (localStorage map), not a single global level. Modal level radios edit the focused card; list thumbs reflect each card’s saved level.
- **2026-10-12** — Yinglong L3: never show static `art.jpg` and `.yl-layers` both opaque (mutual exclusion). ~~Body PNG punched under mane/wingtips~~ **superseded / rejected**: punch caused visible dark holes through semi-transparent overlays; restored unpunched `00_body` from `6f5c863`; anti-ghost = hide art.jpg + small overlay translate.
- **2026-10-12** — ~~Rim: L1–4 hide `.card__rim` only~~ / ~~L5 ~1.5% champagne matte~~ **superseded**: (1) **L1–4 no-rim** art flush; frame `clip-path` + win top `border-radius` = card ellipse minus inset (fix square poke under preserve-3d). ~~(2) L5 cream ~2.5%~~ **superseded by half-again + rim laser**: L5 ~1.25% pearl/silver-cream, dark inset, foot `NO./等缀`, independent `--mask-rim-l5` laser.
- **2026-10-12** — Rim/foil/anim presets apply via **`.card.no-*`**, not only `body.no-*`, so L5 rim/foil can coexist with L3 cards in the same list.
- **2026-10-12** — Under `.card__rotator { transform-style: preserve-3d }`, rely on `clip-path: inset(0 round var(--card-radius))` on `.layer--frame` (and matching top radii on `.card.no-rim .win`) because `overflow:hidden` + `border-radius` alone can fail to clip art at top corners.
- **2026-10-12** — Footer copy HoK-style: left `NO. 出处`, right `{id} 等缀 ★…` (replace long 《山海经·…》 / any「等级」); lore body unchanged.
- **2026-10-12** — L5 cream rim **half again** vs prior ~2.5% → `--win-l/.0125` (~1.25%); pearl/silver-cream metallic (not `#141018` no-rim, not muddy champagne). Independent rim laser via L5 `.foil--frame` + `--mask-rim-l5` (hard-light); absent on L1–4 `.no-rim`/`.no-foil`.
- **2026-10-12** — ~~`--card-radius: 5% / 3.4%`~~ **superseded**: HoK-tighter **`3% / 2%`** (~3% width); no-rim win top radii use 0.03/0.02 minus inset; keep `clip-path` on `.layer--frame` in sync under preserve-3d.
- **2026-10-12** — ~~Footer left `NO. 出处` / right `{id} 等缀 ★…`~~ **superseded**: left **卡牌号+出处** (e.g. `YL-001 · 山海经·大荒东经`); center empty pill; right **星级** = flash-effect level (`data-lv` → 1–5 ★). Lore body unchanged.
- **2026-10-12** — Tilt black seam: not only parallax bleed; preserve-3d foreshortening leaves paint holes past `.layer--frame`. Durable fix = cream underlays + L5 frame `scale(1.02)` + win bleed/overscale; rim laser soft-light. Do not restore thick gold matte.
- **2026-10-12** — Footer: left `NO.n` (list order), center 出处 alone, right ★=`data-lv`; remove empty pill/capsule. Supersedes 卡牌号+出处 left-joined string.
- **2026-10-12** — Unbreak a30dee8: do **not** paint cream on `.card` / `.card__rotator` or `scale()` the whole `.layer--frame` to hide tilt seams — those protrude as ghost layers under preserve-3d. Opaque cream stays **inside** clipped L5 frame matte only. Prevent art/rim black seam via modest `--bleed` (~10px), shallower win z, and ~103% art overscale inside the win clip; keep dark `--art-bg` under art. Footer NO.n / centered 出处 / ★ kept. Supersedes “cream underlays + L5 frame scale(1.02)” durability claim from earlier same-day decision.
- **2026-10-12** — L5 face laser: rainbow `.foil--art` must use a luminance-aware blend (`color-dodge` + dimmed brightness), not `mix-blend-mode: color` alone — color on cream/gold Yinglong art is effectively invisible. Keep foil inside `.win`; L5 `display:block` when foil on. Rim laser: `overlay` (not hard-light+bright) so cream rim reads rainbow hues instead of washing white-only.
- **2026-10-12** — Face laser is **full-card** (`.layer--foil` > `.foil--art`, clip to `--card-radius`), not `.win`-clipped. Look = tilt-driven screen specular + soft-light low-sat iridescence; **reject** e96ae6e `color-dodge` rainbow sticker. Parent foil must stay `mix-blend-mode: normal` / `opacity: 1` so pseudo blends hit the card (including dark desc). L5 rim laser remains `.foil--frame` + `--mask-rim-l5` only. Foil still L5 preset-on (L1–4 presets omit foil; architecture works on 无边 when foil enabled).
