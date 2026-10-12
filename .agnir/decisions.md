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
- **2026-10-12** — Rim: L1–4 `.card.no-rim` (hide `.card__rim` + `.layer--edge`); L5 thin (~half) rim visible. Per-card via `.card` classes / `data-lv`, not body-only.
- **2026-10-12** — Rim/foil/anim presets apply via **`.card.no-*`**, not only `body.no-*`, so L5 rim/foil can coexist with L3 cards in the same list.
