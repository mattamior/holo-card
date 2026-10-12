#!/usr/bin/env python3
"""Rebuild 应龙卡面素材：默认保留整幅横图（窗内 object-fit:contain 用）。"""
from __future__ import annotations
import hashlib, json, os
from pathlib import Path
from PIL import Image

SRC = Path(os.environ.get('YINGLONG_SRC', '/workspace/shanhaijing-style-lock-dragon.jpg'))
OUT = Path(os.environ.get('YINGLONG_OUT', '/workspace/holo-card-repo/assets/yinglong'))
TARGET_W = int(os.environ.get('YINGLONG_W', '960'))

def main():
    raw = SRC.read_bytes()
    hsh = hashlib.sha256(raw).hexdigest()
    src = Image.open(SRC).convert('RGB')
    w, h = src.size
    tw = TARGET_W
    th = int(round(h * tw / w))
    art = src.resize((tw, th), Image.Resampling.LANCZOS)
    OUT.mkdir(parents=True, exist_ok=True)
    art.save(OUT / 'art.jpg', quality=90, optimize=True)
    src.save(OUT / 'source.jpg', quality=92)
    # optional cutout from a centered tall crop (not used when breakout off)
    try:
        from rembg import remove, new_session
        aspect = 63 / 88
        cw = int(round(h * aspect))
        left = max(0, min(w - cw, int(w * 0.52) - cw // 2))
        crop = src.crop((left, 0, left + cw, h)).resize((int(round(880 * aspect)), 880), Image.Resampling.LANCZOS)
        try:
            session = new_session('u2net')
        except Exception:
            session = new_session()
        cut = remove(crop, session=session)
        cut.save(OUT / 'char.png', optimize=True)
        method = 'rembg-portrait-optional'
    except Exception as e:
        method = f'skip-char:{type(e).__name__}'
    meta = {
        'source_hash': hsh, 'source': str(SRC),
        'art_size': list(art.size), 'art_mode': 'full-landscape-contain',
        'name': '应龙', 'rarity': 'ur', 'cutout': method,
        'card_blurb': '有翼之龙。助黄帝杀蚩尤与夸父，处南极；旱时仿其形，乃得大雨。',
        'card_source_line': '《山海经·大荒东经》 / 《大荒北经》',
    }
    (OUT / 'meta.json').write_text(json.dumps(meta, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(meta, ensure_ascii=False))

if __name__ == '__main__':
    main()
