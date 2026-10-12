# Current State — holo-card (all-in-one)

Updated: 2026-10-12 (Asia/Shanghai) — L3 ghost fix + L5 foil + per-card levels + rim

## Project
Branch `feature/all-in-one`; Pages: https://mattamior.github.io/holo-card/all-in-one/

## Shipped (this checkpoint)
1. **L3 body idle + anti-ghost (Yinglong):** punched mane/wing holes in `00_body.png`; exclusive layers vs `art.jpg` (`visibility:hidden`); stronger body/mane/wing loops. Fox/dragon body amplitude raised.
2. **L5 rainbow foil:** soft-light + color layers, higher opacity under tilt (art-mask cards use `.foil--art`).
3. **Rim:** L1–4 `.card.no-rim` hides `.card__rim` + `.layer--edge`; L5 shows half-thin rim. Verified list+modal independently per card.
4. **Per-card levels:** `localStorage` map `holo-card:all-in-one:card-levels`; modal level UI applies to focused card only; switching cards restores that card’s level; list thumbs keep each card’s classes.
