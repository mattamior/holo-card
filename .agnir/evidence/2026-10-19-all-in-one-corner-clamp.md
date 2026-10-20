# 汇总版四角倾斜封顶（CSS + WebGL）

Date: 2026-10-19

## Authorization and scope

- The Principal clarified that the original "鼠标移动到卡片的四角时，卡片的形变有点过头了" report referred to the **汇总版 (all-in-one)**, not the classic page.
- Target: `main` — `index.html` (CSS mode, pointer + gyro) and `js/holo.js` (WebGL hover + gyro).
- The earlier classic fix (`a42d348`, `feature/classic`) remains in place; see `2026-10-19-corner-tilt-clamp.md`.

## Cause

Both modes limited `rx` and `ry` independently:

- CSS `CONFIG.maxTilt = 11` → corner `(11, 11)` = 15.25° combined (measured with a 2px inset).
- WebGL `CONFIG.maxTilt = 14` → corner `(14, 14)` = 19.8° combined.

The diagonal therefore exceeded the declared maximum by up to √2, and the perspective magnification at the near corner amplified it further.

## Change

- Added `limitTilt(rx, ry, max)`: scales the vector back to length `max` only when it exceeds the limit.
- CSS: applied in `onMove` before deriving the light UV, and in `mapOrientation` after the per-axis gyro clamp.
- WebGL: applied in `hover` before `tilt.set`, and in `setGyro` before storing `gyroPose`.
- Edge midpoints keep the full per-axis angle; no other constants changed.

## Measurements

CSS mode, headless Chrome 1400×1000, card 168×252:

| corner | before (rx, ry) | before combined | after (rx, ry) | after combined |
|---|---|---|---|---|
| TL | 10.74, -10.83 | 15.25° | 7.75, -7.81 | 11.00° |
| TR | -10.74, -10.83 | 15.25° | -7.75, -7.81 | 11.00° |
| BL | 10.74, 10.83 | 15.25° | 7.75, 7.81 | 11.00° |
| BR | -10.74, 10.83 | 15.25° | -7.75, 7.81 | 11.00° |
| L edge | 10.74, 0 | 10.74° | 10.74, 0 | 10.74° |
| B edge | 0, 10.83 | 10.83° | 0, 10.83 | 10.83° |

WebGL mode, headless Chrome 1200×900 with SwiftShader, `tiltGroup.rotation`:

| corner | after rotation.x, rotation.y | after combined |
|---|---|---|
| TL | 10.02°, 9.78° | 14.00° |
| TR | 10.02°, -9.78° | 14.00° |
| BL | -10.05°, 9.75° | 14.00° |
| BR | -10.05°, -9.75° | 14.00° |
| R edge | -0.04°, -13.27° | 13.27° |

WebGL before-fix was not measured in this session; the code allowed 14° per axis, i.e. up to 19.8° combined.

Other checks:

- Mobile CSS (390×844, card 132×198): corner 11.00° combined.
- Gyro mapping `mapOrientation(28, 28)`: 7.778° per axis (was 11° per axis = 15.56° combined).
- `prefers-reduced-motion: reduce`: `--rx`/`--ry` stay at 0.
- No page errors in either mode.

## Screenshots

- `2026-10-19-allo-corner-css-before.jpg` — top-left corner before the fix.
- `2026-10-19-allo-corner-css-after.jpg` — same corner after the fix.
- `2026-10-19-allo-corner-webgl-after.jpg` — WebGL mode top-left after the fix.

## Detail modal (follow-up, 2026-10-19)

The list fix was not enough in the clicked-card preview: the modal reuses the same `.card` element but CSS grows it to 380–620px (`--card-w` in `.holo-modal__card-host`), while `--persp` stayed 800. At 620×930 the 11° corner reached ~1.15× near-corner magnification; visually the top-left corner ballooned.

Fix: while a card is inside `.holo-modal__card-host`, scale **perspective only** by `modalWidth / listCardWidth`:

- `--persp = 800 × scale`
- layer depth stays the design value (`--depth: 1`)

A `ResizeObserver` keeps the perspective in sync on modal open, card switch, and viewport resize, and removes the inline `--persp` when the card returns to the list.

Measured:

- Desktop 1400×1000: list 168 → modal 620; `--persp 2952`; corner remains 11.00° combined; near-corner scale ≈1.037 (was ≈1.15).
- Modal resize 620→485: `--persp 2310`.
- Mobile 390×844: list 132 → modal 328; `--persp 1988`; corner 11.00°.
- Card switch (prev/next) reapplies; close removes the inline value and restores `--persp: 800`.
- No page errors.

A first implementation also scaled layer depth (`3.69×`). That exposed the fixed window bleed: at maximum tilt `.win__bg` fell ~3.4px short of the window edge, and scaling the bleed changed the art crop. Reverted to perspective only; depth stays `1` and the window background covers the window at both corners.

Screenshots:

- `2026-10-19-allo-modal-before.jpg`
- `2026-10-19-allo-modal-after.jpg`
- `2026-10-19-allo-modal-mobile-after.jpg`

## Push and deployment (2026-10-19)

- Committed and pushed on `main`: list clamp `35448f6`, modal perspective `9afd227`.

- `git push origin main` → `7e1164d..9afd227`; `git ls-remote` confirms `refs/heads/main = 9afd227b74beb1b7a2818972445fc78fb5aaa7e7`.
- Pages run `39231564748` (`main` @ `9afd227`) completed `success`.
- Live checks (`https://mattamior.github.io/holo-card/`): `/all-in-one/` contains `limitTilt` (×3) and `syncCardPerspective` (×4); `/all-in-one/js/holo.js` contains `limitTilt` (×3); `/classic/` still serves the classic page.
- Headless Chrome against the live page: list corner `--rx 7.75 / --ry -7.81` (11.00°, `--persp: 800`); modal card 620px with `--persp: 2952`, `--depth-scale: 3.6905`, corner `--rx 7.77 / --ry -7.79` (11.00°); no page errors.
- Screenshot: `/tmp/holo-test/live-modal-after.png` (temporary).

## Limits and status

- Headless geometry and screenshots only; final hand-feel judgement belongs to the Principal.
