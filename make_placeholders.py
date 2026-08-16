"""
Generates the four placeholder hero photos so the swap mechanic is visible
before real photos exist. Delete this file once you have real ones.

    python3 make_placeholders.py
"""
from PIL import Image, ImageDraw, ImageFont
import math, os

W = H = 1600
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "photos")
os.makedirs(OUT, exist_ok=True)

BG1 = (14, 17, 32)
BG2 = (7, 8, 15)
PHOS = (52, 226, 192)
VIOLET = (124, 107, 240)
MUTED = (110, 119, 151)


def font(sz, bold=False):
    paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf" if bold
        else "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
    ]
    for p in paths:
        if os.path.exists(p):
            return ImageFont.truetype(p, sz)
    return ImageFont.load_default()


def gradient():
    img = Image.new("RGB", (W, H), BG2)
    d = ImageDraw.Draw(img)
    cx, cy = W * 0.5, H * 0.34
    for i in range(160, 0, -1):
        t = i / 160.0
        r = int(W * 0.95 * t)
        col = tuple(int(BG2[k] + (BG1[k] - BG2[k]) * (1 - t)) for k in range(3))
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col)
    return img


def head(d, gaze, wink=False):
    """gaze: -1 looks to viewer-left, 0 centre, +1 viewer-right."""
    shift = gaze * 46
    cx, cy = W * 0.5 + shift, H * 0.42
    rw, rh = 300, 372

    # shoulders
    d.ellipse([cx - 560, cy + 300, cx + 560, cy + 1000], outline=PHOS, width=6)
    # head
    d.ellipse([cx - rw, cy - rh, cx + rw, cy + rh], outline=PHOS, width=7)

    # eyes — shifted further than the head to sell the gaze direction
    ex = gaze * 40
    ey = cy - 60
    for side in (-1, 1):
        x = cx + side * 108 + ex
        if wink and side == 1:
            d.line([x - 34, ey, x + 34, ey], fill=PHOS, width=9)
        else:
            d.ellipse([x - 26, ey - 26, x + 26, ey + 26], fill=PHOS)
            d.ellipse([x - 52, ey - 40, x + 52, ey + 40], outline=(30, 120, 108), width=4)

    # mouth
    if wink:
        d.arc([cx - 96 + ex, cy + 60, cx + 96 + ex, cy + 210], 20, 160, fill=PHOS, width=9)
    else:
        d.arc([cx - 84 + ex, cy + 90, cx + 84 + ex, cy + 190], 25, 155, fill=MUTED, width=7)

    # a few graph nodes orbiting, so it reads as "root node"
    for i in range(9):
        a = i * (2 * math.pi / 9) + gaze * 0.25
        r = 620
        nx, ny = W * 0.5 + math.cos(a) * r, H * 0.44 + math.sin(a) * r
        col = VIOLET if i % 3 == 0 else PHOS
        d.ellipse([nx - 11, ny - 11, nx + 11, ny + 11], fill=col)
        d.line([W * 0.5, H * 0.44, nx, ny], fill=(38, 46, 74), width=2)


def make(name, gaze, caption, wink=False):
    img = gradient()
    d = ImageDraw.Draw(img)
    head(d, gaze, wink)

    f1, f2 = font(46, True), font(34)
    d.text((W / 2, H - 190), "PLACEHOLDER", font=f1, fill=PHOS, anchor="mm")
    d.text((W / 2, H - 130), caption, font=f2, fill=MUTED, anchor="mm")
    d.text((W / 2, H - 80), f"replace with photos/{name}.png", font=font(28), fill=(70, 78, 104), anchor="mm")

    img.save(os.path.join(OUT, f"{name}.png"), optimize=True)
    print("wrote", name + ".png")


make("center", 0, "neutral / default")
make("left", -1, "looking to viewer-LEFT")
make("right", 1, "looking to viewer-RIGHT")
make("egg", 0, "easter egg / distinct expression", wink=True)
