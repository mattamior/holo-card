# Decisions — holo-card

Updated: 2026-10-12

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

