#!/usr/bin/env python3
"""
bake_hero.py — turn the 580-frame head-rotation shoot into two small sprite
atlases the site can actually ship.

photos/frame_*.png is ~400 MB of 1080x1080 PNGs. None of that goes on the web.
This script picks a handful of frames spaced evenly *by head angle* (not by
time — he moves through the circle at a very uneven speed, lingering on the
right for a third of the take) and packs them into a single WebP grid.

    python3 tools/bake_hero.py

Inputs
    photos/frame_%06d.png      the shoot
    tools/hero_pose.json       per-frame head angle, see analyse_hero_pose.py

Outputs (assets/hero/)
    gaze-72.webp   72 poses @ 384px, 5.0 deg apart   — fine pointers
    gaze-36.webp   36 poses @ 224px, 10.0 deg apart  — touch / scroll variant
    gaze-poster.*  the resting pose on its own, for first paint and no-JS
    gaze.js        window.HERO_GAZE — what hero.js reads
    gaze.json      the same thing plus provenance (which frame is in which cell)

Only needs Pillow. Re-run it after a re-shoot; hero.js reads every number it
needs out of gaze.js, so nothing in the JS has to change.
"""

import json
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PHOTOS = os.path.join(ROOT, 'photos')
OUT = os.path.join(ROOT, 'assets', 'hero')

# (runtime key, name, pose count, tile px, grid columns, webp quality)
#
# 384px is a shade over the 304px the well is ever drawn at, which keeps it
# honest on retina without pushing the decoded sheet past ~40 MB. The touch
# sheet is half the poses at two-thirds the size — scrolling never resolves
# finely enough to notice.
VARIANTS = [
    ('fine', 'gaze-72', 72, 384, 9, 78),
    ('coarse', 'gaze-36', 36, 224, 6, 70),
]
POSTER_PX = 320


def load_pose():
    with open(os.path.join(ROOT, 'tools', 'hero_pose.json')) as fh:
        return json.load(fh)


def pick(angles, count):
    """Frame indices whose head angle is closest to `count` even steps.

    `angles` is strictly decreasing over exactly one revolution, so a linear
    scan of targets gives a distinct, correctly ordered frame per slot.
    """
    start = angles[0]
    step = 360.0 / count
    frames = []
    for k in range(count):
        target = start - step * k
        best, best_err = 0, 1e9
        for i, a in enumerate(angles):
            err = abs(a - target)
            if err < best_err:
                best, best_err = i, err
        frames.append(best)
    return frames, start, step


def frame_path(i):
    return os.path.join(PHOTOS, 'frame_%06d.png' % i)


def build(name, count, tile, cols, quality, angles):
    frames, start, step = pick(angles, count)
    rows = -(-count // cols)
    sheet = Image.new('RGB', (cols * tile, rows * tile), (255, 255, 255))
    for k, f in enumerate(frames):
        src = Image.open(frame_path(f)).convert('RGB')
        # The head swings across most of the 1080 square over the take, so
        # there is no crop that stays clear of it — resize the whole frame.
        src = src.resize((tile, tile), Image.LANCZOS)
        sheet.paste(src, ((k % cols) * tile, (k // cols) * tile))
    path = os.path.join(OUT, name + '.webp')
    sheet.save(path, 'WEBP', quality=quality, method=6)
    kb = os.path.getsize(path) / 1024.0
    print('%-10s %2dx%-2d  %4dpx  %6.1f KB' % (name, cols, rows, tile, kb))
    return dict(src='assets/hero/%s.webp' % name, count=count, cols=cols,
                rows=rows, tile=tile, startAngle=round(start, 3),
                step=round(step, 4), frames=frames, bytes=os.path.getsize(path))


def main():
    if not os.path.isdir(PHOTOS):
        sys.exit('no photos/ directory — nothing to bake')
    os.makedirs(OUT, exist_ok=True)
    angles = load_pose()['angle']

    built = {}
    for key, name, count, tile, cols, quality in VARIANTS:
        built[key] = build(name, count, tile, cols, quality, angles)

    # resting pose — the frame the sequence opens on, him looking up
    rest = Image.open(frame_path(0)).convert('RGB').resize(
        (POSTER_PX, POSTER_PX), Image.LANCZOS)
    rest.save(os.path.join(OUT, 'gaze-poster.webp'), 'WEBP', quality=80, method=6)
    rest.save(os.path.join(OUT, 'gaze-poster.jpg'), 'JPEG', quality=82,
              optimize=True, progressive=True)

    runtime = {k: {kk: vv for kk, vv in v.items() if kk not in ('frames', 'bytes')}
               for k, v in built.items()}
    runtime['poster'] = 'assets/hero/gaze-poster.webp'
    runtime['posterFallback'] = 'assets/hero/gaze-poster.jpg'

    # The easter-egg pose is a 650 KB PNG in photos/. Nobody should download
    # that to see a wink — shrink it to match a sheet cell.
    egg = os.path.join(PHOTOS, 'egg.png')
    if os.path.exists(egg):
        tile = VARIANTS[0][3]
        Image.open(egg).convert('RGB').resize((tile, tile), Image.LANCZOS).save(
            os.path.join(OUT, 'egg.webp'), 'WEBP', quality=80, method=6)
        runtime['egg'] = 'assets/hero/egg.webp'
        print('%-10s %19dpx  %6.1f KB' % ('egg', tile,
              os.path.getsize(os.path.join(OUT, 'egg.webp')) / 1024.0))

    with open(os.path.join(OUT, 'gaze.js'), 'w') as fh:
        fh.write('/* Generated by tools/bake_hero.py — do not edit by hand.\n'
                 '   startAngle is the head angle in cell 0, step is how many\n'
                 '   degrees each following cell advances. Screen degrees:\n'
                 '   -90 up, 180 screen-left, +90 down, 0 screen-right. */\n')
        fh.write('window.HERO_GAZE = ' + json.dumps(runtime, indent=1) + ';\n')

    with open(os.path.join(OUT, 'gaze.json'), 'w') as fh:
        json.dump(dict(runtime, provenance={k: v['frames'] for k, v in built.items()}),
                  fh, indent=1)

    total = sum(v['bytes'] for v in built.values())
    print('total atlas payload: %.1f KB' % (total / 1024.0))


if __name__ == '__main__':
    main()
