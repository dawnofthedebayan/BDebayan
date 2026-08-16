#!/usr/bin/env python3
"""
analyse_hero_pose.py — work out which way his head is pointing in every frame.

This is the slow, one-off half of the hero pipeline. It writes
tools/hero_pose.json, which tools/bake_hero.py then uses to sample frames
evenly by angle. You only need to re-run this after a new shoot.

    pip install mediapipe opencv-python numpy
    python3 tools/analyse_hero_pose.py

How the angle is derived
    MediaPipe FaceMesh gives 468 3D landmarks. Taking the two outer eye
    corners and the chin as a triangle and crossing its edges gives the face
    plane normal in camera space; negating its x/y gives the direction the
    face points in *screen* coordinates (y down). Euler angles out of
    solvePnP were tried first and are useless here — the poses are extreme
    enough that the yaw/pitch decomposition flips sign around profile.

    Roughly 35 frames near full left profile get no detection at all. Their
    angle is linearly interpolated; the head is moving smoothly and at an
    even rate on both sides of that gap, so the error is under a degree.

    The result is smoothed, unwrapped, and forced strictly monotonic. The
    revolution turns out to complete at frame 430; frames 431-579 are him
    holding the up-look, and are dropped.

Convention: -90 = looking up, 180 = screen-left, +90 = down, 0 = screen-right.
"""

import glob
import json
import os
import sys

import cv2
import numpy as np

try:
    import mediapipe as mp
except ImportError:
    sys.exit('needs mediapipe: pip install mediapipe opencv-python numpy')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PHOTOS = os.path.join(ROOT, 'photos')
SMOOTH = 7          # frames; just enough to kill landmark jitter
WORK_PX = 256       # landmarks are scale-invariant, so analyse small and fast

L_EYE, R_EYE, CHIN = 33, 263, 152


def normals():
    mesh = mp.solutions.face_mesh.FaceMesh(
        static_image_mode=True, max_num_faces=1, refine_landmarks=True,
        min_detection_confidence=0.15)
    out = []
    for path in sorted(glob.glob(os.path.join(PHOTOS, 'frame_*.png'))):
        img = cv2.imread(path)
        img = cv2.resize(img, (WORK_PX, WORK_PX), interpolation=cv2.INTER_AREA)
        res = mesh.process(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
        if not res.multi_face_landmarks:
            out.append(None)
            continue
        lm = res.multi_face_landmarks[0].landmark
        pt = lambda i: np.array([lm[i].x, lm[i].y, lm[i].z])
        a, b, c = pt(L_EYE), pt(R_EYE), pt(CHIN)
        n = np.cross(b - a, c - a)
        out.append(n / np.linalg.norm(n))
    return out


def main():
    raw = normals()
    n = len(raw)
    missing = [i for i, v in enumerate(raw) if v is None]
    print('%d frames, %d without a detection' % (n, len(missing)))

    idx = np.arange(n)
    comp = []
    for axis in (0, 1):
        col = np.array([v[axis] if v is not None else np.nan for v in raw])
        good = ~np.isnan(col)
        comp.append(np.interp(idx, idx[good], col[good]))

    def smooth(a):
        k = SMOOTH
        pad = np.pad(a, (k // 2, k // 2), mode='edge')
        return np.convolve(pad, np.ones(k) / k, mode='valid')

    dx, dy = -smooth(comp[0]), -smooth(comp[1])      # screen-space facing
    ang = np.degrees(np.unwrap(np.arctan2(dy, dx)))

    end = next(i for i in range(1, n) if abs(ang[i] - ang[0]) >= 360)
    seg = ang[:end + 1].copy()
    for i in range(1, len(seg)):                     # kill sub-degree wobble
        seg[i] = min(seg[i], seg[i - 1] - 1e-4)
    print('one revolution spans frames 0..%d (%.1f deg)' % (end, seg[-1] - seg[0]))

    with open(os.path.join(ROOT, 'tools', 'hero_pose.json'), 'w') as fh:
        json.dump({
            'note': ('Per-frame head-pointing angle for photos/frame_*.png, in '
                     'screen-space degrees (atan2(dy,dx) with y pointing down, so '
                     '-90 = looking up, 180 = looking screen-left, +90 = looking '
                     'down, 0 = looking screen-right). Unwrapped and forced '
                     'strictly monotonic, so index 0..revolutionEnd is exactly one '
                     'clockwise-from-his-POV revolution. Derived by '
                     'tools/analyse_hero_pose.py; frames after revolutionEnd are a '
                     'static hold.'),
            'sourceFrames': n,
            'revolutionEnd': int(end),
            'angle': [round(float(v), 3) for v in seg],
        }, fh)
    print('wrote tools/hero_pose.json')


if __name__ == '__main__':
    main()
