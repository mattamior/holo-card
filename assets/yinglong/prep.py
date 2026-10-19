#!/usr/bin/env python3
"""Rebuild 应龙卡面素材：16:9 源图裁为 4:3，输出 960×720 铺满闪卡插画窗。"""
from __future__ import annotations
import hashlib, json, os
from pathlib import Path
from PIL import Image

SRC = Path(os.environ.get('YINGLONG_SRC', '/workspace/shanhaijing-style-lock-dragon.jpg'))
OUT = Path(os.environ.get('YINGLONG_OUT', '/workspace/holo-card-repo/assets/yinglong'))
TARGET_W = int(os.environ.get('YINGLONG_W', '960'))
TARGET_H = int(os.environ.get('YINGLONG_H', '720'))  # 4:3
# Horizontal focal bias in [0,1]; 0.5 = center. Slight right keeps wing tips.
FOCAL_X = float(os.environ.get('YINGLONG_FOCAL_X', '0.52'))


def crop_rect(w: int, h: int, aspect: float, focal_x: float) -> tuple[int, int, int, int]:
    """Return (left, top, right, bottom) crop box on source for target aspect."""
    cur = w / h
    if abs(cur - aspect) < 1e-3:
        return 0, 0, w, h
    if cur > aspect:
        tw = int(round(h * aspect))
        left = int(round(focal_x * w - tw / 2))
        left = max(0, min(w - tw, left))
        return left, 0, left + tw, h
    th = int(round(w / aspect))
    top = max(0, min(h - th, (h - th) // 2))
    return 0, top, w, top + th


def main():
    raw = SRC.read_bytes()
    hsh = hashlib.sha256(raw).hexdigest()
    src = Image.open(SRC).convert('RGB')
    w, h = src.size
    aspect = TARGET_W / TARGET_H  # 4/3

    box = crop_rect(w, h, aspect, FOCAL_X)
    cropped = src.crop(box)
    art = cropped.resize((TARGET_W, TARGET_H), Image.Resampling.LANCZOS)

    OUT.mkdir(parents=True, exist_ok=True)
    art.save(OUT / 'art.jpg', quality=90, optimize=True)
    src.save(OUT / 'source.jpg', quality=92)

    method = 'skip-char'
    try:
        from rembg import remove, new_session
        port_aspect = 63 / 88
        pw = int(round(h * port_aspect))
        left = max(0, min(w - pw, int(w * 0.52) - pw // 2))
        crop = src.crop((left, 0, left + pw, h)).resize(
            (int(round(880 * port_aspect)), 880), Image.Resampling.LANCZOS
        )
        try:
            session = new_session('u2net')
        except Exception:
            session = new_session()
        cut = remove(crop, session=session)
        cut.save(OUT / 'char.png', optimize=True)
        method = 'rembg-portrait-optional'
    except Exception as e:
        method = f'skip-char:{type(e).__name__}'

    prev = {}
    meta_path = OUT / 'meta.json'
    if meta_path.exists():
        try:
            prev = json.loads(meta_path.read_text(encoding='utf-8'))
        except Exception:
            prev = {}

    meta = {
        'source_hash': hsh,
        'source': str(SRC),
        'crop_from_source': list(box),
        'focal_x': FOCAL_X,
        'art_size': list(art.size),
        'art_mode': 'landscape-4x3',
        'name': prev.get('name', '应龙'),
        'rarity': prev.get('rarity', 'ur'),
        'cutout': method if method.startswith('rembg') else prev.get('cutout', method),
        'card_blurb': prev.get(
            'card_blurb',
            '有翼之龙。助黄帝杀蚩尤与夸父，处南极；旱时仿其形，乃得大雨。',
        ),
        'card_source_line': prev.get(
            'card_source_line', '《山海经·大荒东经》 / 《大荒北经》'
        ),
        'note': '4:3 landscape fill for flash-card window (no letterbox)',
    }
    for k in ('guopu_note', 'art_note', 'copy_file'):
        if k in prev:
            meta[k] = prev[k]

    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(meta, ensure_ascii=False))


if __name__ == '__main__':
    main()
