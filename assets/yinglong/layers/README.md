# Yinglong L3 layers (option C / 拆层)

Source: `../art.jpg` upscaled to **960×720** (4:3, matched to art.jpg). All layers same size, top-left aligned — stack with `position:absolute; inset:0`.

| file | role | suggested CSS motion |
|------|------|----------------------|
| `00_body.png` | opaque base (full card) | static |
| `01_mane.png` | mane / whiskers (semi) | translateX ±2–4px sine, 3–4s |
| `02_wingtips.png` | bright wing feathers | translateY ±2px + slight rotate ±0.4deg |
| `03_eyeglow.png` | warm eye glow | opacity 0.7–1.0 pulse |
| `04_light.png` | soft god-ray highlights | opacity 0.5–0.85 slow |

Stack order (bottom→top): 00 → 04 → 02 → 01 → 03.

Masks are automatic luminance/ROI extracts from the still — not hand-painted. If a layer is too thick/thin, ask 美术专家 to refine.

Do **not** use region_warp anim/ for L3 while this path is active.
