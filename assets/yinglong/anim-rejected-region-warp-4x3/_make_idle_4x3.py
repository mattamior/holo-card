#!/usr/bin/env python3
"""Bake Yinglong L3 4:3 region_warp idle from art.jpg — identity locked."""
from __future__ import annotations

import json
import shutil
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, map_coordinates

ART = Path("/workspace/holo-card-repo/assets/yinglong/art.jpg")
OUT = Path("/workspace/holo-card-repo/assets/yinglong/anim")
MIRRORS = [
    Path("/workspace/shanhaijing-gallery-assets/creatures/yinglong/anim"),
    Path("/workspace/shanhaijing-gallery/assets/creatures/yinglong/anim"),
]
N = 10
FPS = 10
W, H = 1280, 960  # 4:3


def soft_ellipse(h, w, cy, cx, ry, rx, soft=0.35):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float64)
    ny = (yy - cy) / max(ry, 1.0)
    nx = (xx - cx) / max(rx, 1.0)
    d = np.sqrt(ny * ny + nx * nx)
    m = np.clip(1.0 - (d - 1.0) / soft, 0.0, 1.0)
    m = np.where(d <= 1.0, 1.0, m)
    return m


def remap(img, dx, dy):
    h, w = img.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float64)
    sy = np.clip(yy + dy, 0, h - 1)
    sx = np.clip(xx + dx, 0, w - 1)
    out = np.empty_like(img)
    for c in range(3):
        out[:, :, c] = map_coordinates(
            img[:, :, c].astype(np.float64),
            [sy, sx],
            order=1,
            mode="nearest",
        )
    return np.clip(out, 0, 255).astype(np.uint8)


def eye_glow(img, amount, eye_mask):
    out = img.astype(np.float64)
    r, g, b = out[:, :, 0], out[:, :, 1], out[:, :, 2]
    warm = (
        (r > 150)
        & (g > 85)
        & (b < 160)
        & (r > g * 0.85)
        & ((r - b) > 35)
        & (eye_mask > 0.15)
    )
    strength = eye_mask * warm.astype(np.float64)
    lum = (0.3 * r + 0.59 * g + 0.11 * b) / 255.0
    strength = strength * (0.4 + 0.6 * np.clip(lum, 0, 1))
    factor = 1.0 + amount * strength
    out[:, :, 0] = np.clip(r * factor, 0, 255)
    out[:, :, 1] = np.clip(g * (1.0 + amount * 0.85 * strength), 0, 255)
    out[:, :, 2] = np.clip(b * (1.0 + amount * 0.35 * strength), 0, 255)
    return out.astype(np.uint8)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    raw = Image.open(ART).convert("RGB")
    assert raw.size == (960, 720), raw.size
    src_img = raw.resize((W, H), Image.Resampling.LANCZOS)
    src = np.array(src_img)
    assert src.shape == (H, W, 3), src.shape

    # Masks tuned for this 4:3 landscape crop (coords in 1280×960)
    # Scale reference: art 960×720 → ×4/3
    breath = soft_ellipse(H, W, cy=600, cx=560, ry=240, rx=230, soft=0.45)
    breath = gaussian_filter(breath, sigma=20)

    mane = soft_ellipse(H, W, cy=220, cx=460, ry=190, rx=270, soft=0.5)
    whisk = soft_ellipse(H, W, cy=300, cx=300, ry=110, rx=140, soft=0.55)
    mane = np.clip(mane + 0.85 * whisk, 0, 1)
    mane = gaussian_filter(mane, sigma=14)

    wing_r = soft_ellipse(H, W, cy=430, cx=980, ry=220, rx=200, soft=0.5)
    wing_u = soft_ellipse(H, W, cy=300, cx=840, ry=150, rx=210, soft=0.55)
    wing = np.clip(0.9 * wing_r + 0.7 * wing_u, 0, 1)
    wing = gaussian_filter(wing, sigma=16)

    # Eyes at ~ (260,145) and (296,142) in 960 space → ×4/3
    eye_l = soft_ellipse(H, W, cy=193, cx=347, ry=30, rx=38, soft=0.7)
    eye_r = soft_ellipse(H, W, cy=189, cx=395, ry=34, rx=42, soft=0.7)
    eyes = np.clip(eye_l + eye_r, 0, 1)
    eyes = gaussian_filter(eyes, sigma=3.5)

    dbg = OUT / "_debug_masks.jpg"
    dbg_img = np.zeros((H, W, 3), dtype=np.uint8)
    dbg_img[:, :, 0] = (np.clip(wing, 0, 1) * 255).astype(np.uint8)
    dbg_img[:, :, 1] = (np.clip(breath, 0, 1) * 255).astype(np.uint8)
    dbg_img[:, :, 2] = (np.clip(mane, 0, 1) * 255).astype(np.uint8)
    e = (np.clip(eyes, 0, 1) * 255).astype(np.uint8)
    dbg_img = np.maximum(dbg_img, np.stack([e, e, e], axis=-1) // 2)
    Image.fromarray(dbg_img).save(dbg, quality=85)

    frames = []
    peak_motion = 0.0
    for i in range(N):
        t = 2.0 * np.pi * i / N
        breath_amp = 0.012  # ~1.2% vertical
        mane_amp = 4.5  # px horizontal
        wing_amp = 3.0  # px
        eye_amp = 0.06  # ±6% brightness

        s_breath = np.sin(t)
        s_mane = np.sin(t)  # phase A
        s_wing = np.sin(t + 0.5 * np.pi)  # phase B
        s_eye = np.sin(t + 0.25 * np.pi)

        cy_b = 600.0
        scale = 1.0 + breath_amp * s_breath
        yy = np.arange(H, dtype=np.float64)[:, None]
        dy_breath = (yy - cy_b) * (1.0 - 1.0 / scale) * breath
        cx_b = 560.0
        xx = np.arange(W, dtype=np.float64)[None, :]
        dx_breath = (xx - cx_b) * (1.0 - 1.0 / (1.0 + 0.4 * breath_amp * s_breath)) * breath

        dx_mane = (-mane_amp * s_mane) * mane
        dy_mane = (1.2 * np.sin(t + 0.3)) * mane

        dy_wing = (-wing_amp * s_wing) * wing
        dx_wing = (0.6 * wing_amp * s_wing) * wing

        dx = dx_breath + dx_mane + dx_wing
        dy = dy_breath + dy_mane + dy_wing
        dx = gaussian_filter(dx, sigma=1.5)
        dy = gaussian_filter(dy, sigma=1.5)

        mag = np.sqrt(dx * dx + dy * dy)
        peak_motion = max(peak_motion, float(mag.max()))

        frame = remap(src, dx, dy)
        frame = eye_glow(frame, eye_amp * s_eye, eyes)
        frames.append(frame)

        path = OUT / f"f{i+1:02d}.jpg"
        Image.fromarray(frame).save(path, quality=92, optimize=True)
        print(f"wrote {path.name} peak_field={mag.max():.3f}px eye_amt={eye_amp*s_eye:+.4f}")

    sheet = np.concatenate(frames, axis=1)
    sheet_path = OUT / "sheet.jpg"
    Image.fromarray(sheet).save(sheet_path, quality=85, optimize=True)

    f01 = frames[0].astype(np.float64)
    f10 = frames[-1].astype(np.float64)
    mad_01_10 = float(np.mean(np.abs(f01 - f10)))
    diffs = []
    for i in range(N):
        a = frames[i].astype(np.float64)
        b = frames[(i + 1) % N].astype(np.float64)
        diffs.append(float(np.mean(np.abs(a - b))))
    mean_step = float(np.mean(diffs))
    max_step = float(np.max(diffs))

    sizes_ok = all(fr.shape == (H, W, 3) for fr in frames)
    for i, fr in enumerate(frames):
        assert fr.shape == (H, W, 3), (i, fr.shape)

    meta = {
        "frames": [f"f{i:02d}.jpg" for i in range(1, N + 1)],
        "fps": FPS,
        "loop": True,
        "size": [W, H],
        "aspect": "4:3",
        "method": "region_warp_from_art",
        "source": "../art.jpg",
        "note": "idle: breath, mane/whiskers, wing tips, soft eye glow; identity locked",
        "qa": {
            "mean_abs_diff_f01_f10": round(mad_01_10, 4),
            "peak_motion_px": round(peak_motion, 4),
            "mean_step_mad": round(mean_step, 4),
            "max_step_mad": round(max_step, 4),
            "all_1280x960": sizes_ok,
        },
    }
    meta_path = OUT / "meta.json"
    meta_path.write_text(json.dumps(meta, indent=2, ensure_ascii=False) + "\n")

    readme = OUT / "README.md"
    readme.write_text(
        "# Yinglong L3 anim (4:3 region_warp)\n\n"
        "- Source: `../art.jpg` (960×720) upscaled LANCZOS → 1280×960\n"
        "- Method: `region_warp_from_art` (breath / mane / wing tips / eye glow)\n"
        "- 10 frames @ 10fps seamless sine loop\n"
        "- Old vertical frames: `../anim-bak-vertical/`\n"
    )

    # Mirror deliverables (frames + meta + sheet; skip debug/script optional copy)
    deliver = [f"f{i:02d}.jpg" for i in range(1, N + 1)] + ["sheet.jpg", "meta.json", "README.md"]
    for mirror in MIRRORS:
        mirror.mkdir(parents=True, exist_ok=True)
        # remove old vertical leftover frames beyond f10 if any
        for old in mirror.glob("f*.jpg"):
            old.unlink()
        for name in deliver:
            shutil.copy2(OUT / name, mirror / name)
        # also copy bake script + debug for gallery-assets
        if "gallery-assets" in str(mirror):
            shutil.copy2(Path(__file__), mirror / "_make_idle_4x3.py")
            if dbg.exists():
                shutil.copy2(dbg, mirror / "_debug_masks.jpg")
        print(f"mirrored → {mirror}")

    print(json.dumps(meta["qa"], indent=2))
    print("sheet", sheet_path, sheet.shape)
    print("OUT", OUT)
    print("done")


if __name__ == "__main__":
    main()
