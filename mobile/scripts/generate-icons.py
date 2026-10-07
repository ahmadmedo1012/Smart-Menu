#!/usr/bin/env python3
"""Generate Smart Menu mobile app icons (Madarek design system).

Outputs (1024x1024 PNGs):
  - icon.png           — gold rounded square on transparent bg, void-ink "S" letter.
  - adaptive-icon.png  — night bg + gold rounded square (Android adaptive).
  - favicon.png        — small icon (48x48) for web bundling.

Madarek palette: night ground #070B16, gold accent #E9B44C, void ink on
accent #05070F (dark --accent-fg — never white on gold).
"""
from PIL import Image, ImageDraw, ImageFont
import os

OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "images")
os.makedirs(OUT, exist_ok=True)

BG_NIGHT = (7, 11, 22, 255)      # #070B16 — Madarek night page ground
GOLD = (233, 180, 76, 255)       # #E9B44C — Madarek gold accent
ON_ACCENT = (5, 7, 15, 255)      # #05070F — void ink on gold


def rounded_square(draw, box, radius, fill):
    """Draw a filled rounded square inside `box` (x0,y0,x1,y1)."""
    x0, y0, x1, y1 = box
    draw.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=fill)


def draw_icon(size, with_night_bg=False, gold_radius_ratio=0.22):
    """Render the Smart-Menu icon at `size`x`size`."""
    img = Image.new("RGBA", (size, size), BG_NIGHT if with_night_bg else (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    if with_night_bg:
        draw.rectangle([0, 0, size, size], fill=BG_NIGHT)

    pad = int(size * 0.15)
    square_box = (pad, pad, size - pad, size - pad)
    rounded_square(draw, square_box, radius=int(size * gold_radius_ratio), fill=GOLD)

    font_size = int(size * 0.55)
    font = None
    for candidate in [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf",
    ]:
        if os.path.exists(candidate):
            try:
                font = ImageFont.truetype(candidate, font_size)
                break
            except Exception:
                continue
    if font is None:
        font = ImageFont.load_default()

    text = "S"
    try:
        bbox = draw.textbbox((0, 0), text, font=font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        tx = (size - tw) // 2 - bbox[0]
        ty = (size - th) // 2 - bbox[1] - int(size * 0.02)
    except AttributeError:
        tw, th = draw.textsize(text, font=font)
        tx = (size - tw) // 2
        ty = (size - th) // 2

    draw.text((tx, ty), text, fill=ON_ACCENT, font=font)
    return img


def main():
    draw_icon(1024, with_night_bg=False).save(os.path.join(OUT, "icon.png"))
    draw_icon(1024, with_night_bg=True).save(os.path.join(OUT, "adaptive-icon.png"))
    draw_icon(48, with_night_bg=False).save(os.path.join(OUT, "favicon.png"))
    print("Wrote icon.png, adaptive-icon.png, favicon.png to", OUT)


if __name__ == "__main__":
    main()
