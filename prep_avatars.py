# -*- coding: utf-8 -*-
"""Download real portrait photos and turn them into circular avatar PNGs."""
import os, ssl, urllib.request
from PIL import Image, ImageDraw, ImageOps
from io import BytesIO

OUT = r"c:\Users\PC\Desktop\wisdom-social\assets\avatars"
os.makedirs(OUT, exist_ok=True)

ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE

# mix of women/men portraits (randomuser.me — royalty free)
SRC = [
    ("women", 44), ("men", 32), ("women", 68), ("men", 75),
    ("women", 9),  ("men", 46), ("women", 33), ("men", 11),
    ("women", 57), ("men", 3),  ("women", 21), ("men", 85),
]
RING = (37, 99, 235)   # blue ring  #2563EB

def fetch(cat, idx):
    url = f"https://randomuser.me/api/portraits/{cat}/{idx}.jpg"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    return urllib.request.urlopen(req, context=ctx, timeout=30).read()

def circular(img, size=320, ring=RING, ring_w=14, white_w=10):
    img = ImageOps.fit(img.convert("RGB"), (size, size), Image.LANCZOS)
    # circular mask
    mask = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(mask)
    d.ellipse((0, 0, size, size), fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    # draw white ring then blue ring on top
    dd = ImageDraw.Draw(out)
    r = size - 1
    dd.ellipse((white_w//2, white_w//2, r - white_w//2, r - white_w//2),
               outline=(255, 255, 255, 255), width=white_w)
    off = white_w
    dd.ellipse((off, off, r - off, r - off), outline=ring + (255,), width=ring_w)
    return out

ok = 0
for i, (cat, idx) in enumerate(SRC):
    try:
        data = fetch(cat, idx)
        im = Image.open(BytesIO(data))
        av = circular(im)
        av.save(os.path.join(OUT, f"av{i:02d}.png"))
        ok += 1
    except Exception as e:
        print("FAIL", cat, idx, e)
print(f"Saved {ok}/{len(SRC)} avatars to {OUT}")
