# Yinglong L3 layers (option C / 拆层)

Source: `../art.jpg` upscaled to **960×720** (4:3, matched to art.jpg). All layers same size, top-left aligned — stack with `position:absolute; inset:0`.

| file | role | suggested CSS motion |
|------|------|----------------------|
| `00_body.png` | opaque base (full card) | subtle idle breathe |
| `01_mane.png` | mane / whiskers (semi) | translateX ±1.5–2px sine, 3–4s |
| `02_wingtips.png` | bright wing feathers | translateY ±1.5px + slight rotate ±0.4deg |
| `03_eyeglow.png` | warm eye glow | opacity 0.7–1.0 pulse |
| `04_light.png` | soft god-ray highlights | opacity 0.5–0.85 slow |

Stack order (bottom→top): 00 → 04 → 02 → 01 → 03.

Masks are automatic luminance/ROI extracts from the still — not hand-painted. If a layer is too thick/thin, ask 美术专家 to refine.

Do **not** use region_warp anim/ for L3 while this path is active.

## L3 motion
- `00_body` / `.yl-l-body`: subtle idle breathe/sway (CSS)
- mane / wingtips / eyeglow / light: light motion (small translate; overlays are semi-transparent)

## Anti-ghost (no body punch)
Do **not** punch mane/wingtip holes out of `00_body.png`. A punch made those regions transparent; semi-transparent overlays could not cover them, so head/neck/wing showed dark jagged voids (Principal regression). Body was restored from pre-punch `6f5c863`.

Anti-ghost instead:
1. When `.yl-layers` is shown, keep static `art.jpg` / sprite sheet `visibility:hidden` + opacity 0 (never both opaque with the layer stack).
2. Keep mane/wingtip CSS translate small so any double-edge from opaque body + overlay stays subtle.
