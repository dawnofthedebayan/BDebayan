"""
Generates stand-in artwork for the "off the clock" carousel so the layout is
real before you add covers. Replace the files in art/ with your own images —
same filenames, any aspect ratio, the card handles it.

    python3 make_art_placeholders.py
"""
from PIL import Image, ImageDraw, ImageFont
import math, os, random

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "art")
os.makedirs(OUT, exist_ok=True)

PHOS = (52, 226, 192)
VIOLET = (124, 107, 240)
AMBER = (242, 164, 78)
MUTED = (110, 119, 151)


def font(sz, bold=False):
    base = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono"
    p = base + ("-Bold.ttf" if bold else ".ttf")
    return ImageFont.truetype(p, sz) if os.path.exists(p) else ImageFont.load_default()


def make(name, w, h, title, sub, tint, seed):
    rnd = random.Random(seed)
    img = Image.new("RGB", (w, h), (9, 11, 20))
    d = ImageDraw.Draw(img)

    # soft radial wash in the item's tint
    cx, cy = w * 0.5, h * 0.4
    for i in range(150, 0, -1):
        t = i / 150.0
        r = int(max(w, h) * 0.85 * t)
        col = tuple(int(9 + (tint[k] - 9) * (1 - t) * 0.5) for k in range(3))
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col)

    # constellation, same motif as the rest of the site
    pts = [(rnd.uniform(0.06, 0.94) * w, rnd.uniform(0.06, 0.94) * h) for _ in range(26)]
    for i, a in enumerate(pts):
        for b in pts[i + 1:]:
            if math.dist(a, b) < max(w, h) * 0.22:
                d.line([a, b], fill=(38, 52, 84), width=1)
    for i, p in enumerate(pts):
        c = VIOLET if i % 5 == 0 else PHOS
        r = 4 if i % 4 == 0 else 2
        d.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=c)

    # label plate
    pad = int(w * 0.07)
    plate_h = int(h * 0.30)
    d.rectangle([0, h - plate_h, w, h], fill=(7, 9, 16))
    d.line([0, h - plate_h, w, h - plate_h], fill=(34, 40, 64), width=2)

    f_small = font(int(w * 0.032))
    f_title = font(int(w * 0.062), True)
    f_sub = font(int(w * 0.034))

    d.text((pad, h - plate_h + int(h * 0.045)), "PLACEHOLDER ARTWORK", font=f_small, fill=AMBER)

    y = h - plate_h + int(h * 0.10)
    for line in title:
        d.text((pad, y), line, font=f_title, fill=(233, 236, 248))
        y += int(w * 0.078)
    d.text((pad, y + int(h * 0.012)), sub, font=f_sub, fill=MUTED)
    d.text((pad, h - int(h * 0.055)), "replace with art/" + name, font=f_small, fill=(70, 78, 104))

    img.save(os.path.join(OUT, name), quality=88, optimize=True)
    print("wrote", name, img.size)


# squares for records, 2:3 for posters and jackets
make("revolver.jpg", 1200, 1200, ["REVOLVER"], "The Beatles · 1966", (16, 40, 52), 11)
make("lateralus.jpg", 1200, 1200, ["LATERALUS"], "Tool · 2001", (30, 20, 52), 22)
make("arrival.jpg", 1000, 1500, ["ARRIVAL"], "Villeneuve · 2016", (12, 34, 46), 33)
make("john-and-paul.jpg", 1000, 1500, ["JOHN &", "PAUL"], "Ian Leslie · 2025", (44, 26, 22), 44)
