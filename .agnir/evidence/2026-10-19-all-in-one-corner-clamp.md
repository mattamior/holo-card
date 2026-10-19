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

## Limits and status

- Headless geometry and screenshots only; final hand-feel judgement belongs to the Principal.
- Committed locally on `main`; push/deployment pending authorization.
