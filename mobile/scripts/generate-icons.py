#!/usr/bin/env python3
"""Generate Smart Menu mobile raster brand assets — Phase 6 «Warm Culinary
Editorial» identity (P6-2-c2), the mobile twin of the web
scripts/r152-regen-brand.mjs brand mark.

Outputs (same sizes/formats/paths as the retired Madarek set — zero app.json
or import changes anywhere):
  - icon.png           1024x1024 RGBA — terracotta plate on TRANSPARENT bg.
  - adaptive-icon.png  1024x1024 RGBA — cream #FBF7F0 bg + terracotta plate
                       (Android adaptive fg + the expo-splash-screen image;
                       app.json pins backgroundColor #FBF7F0 for both).
  - favicon.png        48x48 RGBA     — terracotta plate on transparent bg.

The mark is the brand menu-mark (the same geometry the web r152 script
draws): a rounded-square TERRACOTTA plate (#C2452D -> #8A2B1D diagonal
gradient, mirroring the web .qr-corner / --btn-primary pair, radius = 22% of
the box) carrying the CONSTANT cream glyph #FBF7F0 (5.0:1 on the metal):
three course lines + the order dot. Replaces the retired Madarek night+gold
"S" marks (night #070B16 / gold #E9B44C / void #05070F — banned hexes now).

Pure Pillow (no system font dependency — the glyph is geometry, not a
letter, so the output is bit-reproducible on any machine).

Usage: python3 scripts/generate-icons.py
"""
from PIL import Image, ImageDraw
import os

OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "images")
os.makedirs(OUT, exist_ok=True)

# ── the culinary palette (colors.ts SSOT values) ─────────────────────────────
TERRACOTTA = (194, 69, 45, 255)     # #C2452D — --primary
TERRACOTTA_DEEP = (138, 43, 29, 255)  # #8A2B1D — --accent-strong
CREAM = (251, 247, 240, 255)        # #FBF7F0 — --background (the page ground)
CREAM_BG = (251, 247, 240, 255)     # adaptive/splash ground (app.json pin)

PLATE_RADIUS_RATIO = 0.22           # the .qr-corner law: 22% of the box
PAD_RATIO = 0.15                    # same content pad the old marks shipped


def lerp(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def diagonal_gradient(size, c_from, c_to):
    """Smooth diagonal (top-left -> bottom-right) gradient, t=(x+y)/(w+h)."""
    small = 128  # compute small, upscale bilinear — smooth and cheap
    grad = Image.new("RGB", (small, small))
    px = grad.load()
    for y in range(small):
        for x in range(small):
            t = (x + y) / (2 * small - 2)
            px[x, y] = lerp(c_from, c_to, t)
    return grad.resize((size, size), Image.BILINEAR)


def capsule(draw, x0, y0, x1, y1, width, fill):
    """A line with round caps (the web stroke-linecap=round twin)."""
    r = width / 2.0
    draw.line([(x0, y0), (x1, y1)], fill=fill, width=int(round(width)))
    for (cx, cy) in [(x0, y0), (x1, y1)]:
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=fill)


def brand_mark(size, bg=None):
    """The culinary menu-mark at `size`x`size` (bg=None → transparent)."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0) if bg is None else bg)
    pad = int(size * PAD_RATIO)
    box = (pad, pad, size - pad, size - pad)
    bw = box[2] - box[0]

    # 1. the terracotta plate: gradient clipped to the rounded square.
    plate = diagonal_gradient(bw, TERRACOTTA[:3], TERRACOTTA_DEEP[:3]).convert("RGBA")
    mask = Image.new("L", (bw, bw), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [0, 0, bw, bw], radius=int(bw * PLATE_RADIUS_RATIO), fill=255)
    img.paste(plate, (box[0], box[1]), mask)

    # 2. the cream glyph — three course lines + the order dot (web r152
    #    geometry: 100-unit space → 24/34→76/34 · 24/50→76/50 · 24/66→58/66
    #    · dot at (72,66) r=26 · stroke 40/512).
    d = ImageDraw.Draw(img)
    u = lambda v: box[0] + (v / 100.0) * bw          # 100-unit → plate space
    stroke = (40 / 512.0) * bw
    capsule(d, u(24), u(34), u(76), u(34), stroke, CREAM)
    capsule(d, u(24), u(50), u(76), u(50), stroke, CREAM)
    capsule(d, u(24), u(66), u(58), u(66), stroke, CREAM)
    r_dot = (26 / 512.0) * bw
    d.ellipse([u(72) - r_dot, u(66) - r_dot, u(72) + r_dot, u(66) + r_dot], fill=CREAM)
    return img


def sample(img, points, label):
    px = img.convert("RGB")
    out = []
    for (x, y) in points:
        out.append(px.getpixel((int(x), int(y))))
    print(f"  {label}: {out}")
    return out


def main():
    icon = brand_mark(1024)
    icon.save(os.path.join(OUT, "icon.png"))

    adaptive = brand_mark(1024, bg=CREAM_BG)
    adaptive.save(os.path.join(OUT, "adaptive-icon.png"))

    favicon = brand_mark(48)
    favicon.save(os.path.join(OUT, "favicon.png"))

    print("Wrote icon.png (1024), adaptive-icon.png (1024), favicon.png (48) to", OUT)

    # ── pixel-true verification (the brief's gate): the grounds must be
    # cream/terracotta, NEVER the retired Madarek night #070B16 (7,11,22).
    # Plate-only samples avoid the cream glyph (lines at u=34/50/66, x 24..76).
    print("pixel verification (corner · corner · glyph-mid · plate-only ×2):")
    s = 1024
    pts = [(2, 2), (s - 3, 2), (s // 2, s // 2), (s // 2, int(s * 0.22)), (int(s * 0.25), int(s * 0.35))]
    ic = sample(icon, pts, "icon.png       (transparent corners, cream glyph, terracotta plate)")
    ad = sample(adaptive, pts, "adaptive-icon  (cream corners, cream glyph, terracotta plate)")
    fv = sample(favicon, [(1, 1), (46, 46), (24, 24), (11, 10), (10, 18)], "favicon.png")

    bad = (7, 11, 22)
    assert ad[0] == CREAM_BG[:3] and ad[1] == CREAM_BG[:3], f"adaptive corners must be cream, got {ad[:2]}"
    assert ic[2] == CREAM[:3], f"icon glyph-mid must be cream, got {ic[2]}"
    for p in (ic[3], ic[4]):
        # terracotta ramp span: #8A2B1D (138,43,29) → #C2452D (194,69,45)
        assert 137 <= p[0] <= 195 and 42 <= p[1] <= 70 and 28 <= p[2] <= 46, \
            f"plate pixel must sit on the terracotta ramp, got {p}"
    assert bad not in (ic + ad + fv), "retired Madarek night #070B16 pixel found"
    print("✓ pixel-true: grounds are cream/terracotta — no #070B16 anywhere")


if __name__ == "__main__":
    main()
