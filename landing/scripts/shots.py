"""App-Aufnahmen (PNG aus mockups/landing-shots.spec.ts) → WebP für die Website.

Aufruf: python3 landing/scripts/shots.py <eingang> landing/public/app
Ergebnis: <ziel>/<sprache>/<name>-<light|dark>.webp, 618 × 1372 (Telefonrahmen 309 × 686, doppelte Dichte).
"""
import os, sys
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
n = 0
for locale in sorted(os.listdir(src)):
    for theme in ('light', 'dark'):
        d = os.path.join(src, locale, theme)
        if not os.path.isdir(d):
            continue
        os.makedirs(os.path.join(dst, locale), exist_ok=True)
        for f in sorted(os.listdir(d)):
            if not f.endswith('.png'):
                continue
            im = Image.open(os.path.join(d, f)).convert('RGB').resize((618, 1372), Image.LANCZOS)
            im.save(os.path.join(dst, locale, f'{f[:-4]}-{theme}.webp'), quality=78, method=6)
            n += 1
print(n, 'Bilder')
