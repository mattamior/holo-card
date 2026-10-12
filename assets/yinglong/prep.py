#!/usr/bin/env python3
"""Rebuild 应龙 card assets from the locked plate. Swap-friendly."""
from __future__ import annotations
import hashlib, json, os, shutil, sys
from pathlib import Path
from PIL import Image

SRC = Path(os.environ.get('YINGLONG_SRC', '/workspace/shanhaijing-style-lock-dragon.jpg'))
OUT = Path(os.environ.get('YINGLONG_OUT', '/workspace/holo-card-repo/assets/yinglong'))
ASPECT = 63 / 88
TARGET_H = 880

def main():
    raw = SRC.read_bytes()
    hsh = hashlib.sha256(raw).hexdigest()
    src = Image.open(SRC).convert('RGB')
    w, h = src.size
    cw = int(round(h * ASPECT))
    cx = int(w * 0.52)
    left = max(0, min(w - cw, cx - cw // 2))
    crop = src.crop((left, 0, left + cw, h))
    tw = int(round(TARGET_H * ASPECT))
    art = crop.resize((tw, TARGET_H), Image.Resampling.LANCZOS)
    OUT.mkdir(parents=True, exist_ok=True)
    art.save(OUT / 'art.jpg', quality=90, optimize=True)
    src.save(OUT / 'source.jpg', quality=92)
    # rembg cutout (fallback: luminance matte)
    try:
        from rembg import remove, new_session
        try:
            session = new_session('u2net')
        except Exception:
            session = new_session()
        cut = remove(art, session=session)
        cut.save(OUT / 'char.png', optimize=True)
        cut.save(OUT / 'char-rembg.png', optimize=True)
        method = 'rembg'
    except Exception as e:
        import numpy as np
        from PIL import ImageFilter
        arr = np.asarray(art).astype('float32')
        lum = 0.2126*arr[:,:,0] + 0.7152*arr[:,:,1] + 0.0722*arr[:,:,2]
        alpha = ((lum - 55) / 110).clip(0, 1)
        a = Image.fromarray((alpha*255).astype('uint8'), 'L').filter(ImageFilter.GaussianBlur(2.2))
        rgba = art.convert('RGBA'); rgba.putalpha(a)
        rgba.save(OUT / 'char.png', optimize=True)
        method = f'luma:{type(e).__name__}'
    meta = {
        'source_hash': hsh, 'source': str(SRC), 'crop_left': left,
        'crop_size': list(crop.size), 'art_size': list(art.size),
        'name': '应龙', 'rarity': 'ur', 'cutout': method,
    }
    (OUT / 'meta.json').write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(meta, ensure_ascii=False))

if __name__ == '__main__':
    main()
