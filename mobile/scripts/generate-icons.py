#!/usr/bin/env python3
"""Generate Smart Menu mobile app icons.

Outputs (1024x1024 PNGs):
  - icon.png           — amber rounded square on dark bg, white "S" letter.
  - adaptive-icon.png  — dark bg + amber rounded square (Android adaptive).
  - favicon.png        — small icon (48x48) for web bundling.
"""
from PIL import Image, ImageDraw, ImageFont
import os

OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "images")
os.makedirs(OUT, exist_ok=True)

BG_DARK = (1, 0, 0, 255)        # #010000
AMBER = (188, 71, 0, 255)       # #bc4700
WHITE = (255, 255, 255, 255)


def rounded_square(draw, box, radius, fill):
    """Draw a filled rounded square inside `box` (x0,y0,x1,y1)."""
    x0, y0, x1, y1 = box
    draw.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=fill)


def draw_icon(size, with_dark_bg=False, amber_radius_ratio=0.22):
    """Render the Smart-Menu icon at `size`x`size`."""
    img = Image.new("RGBA", (size, size), BG_DARK if with_dark_bg else (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    if with_dark_bg:
        draw.rectangle([0, 0, size, size], fill=BG_DARK)

    pad = int(size * 0.15)
    square_box = (pad, pad, size - pad, size - pad)
    rounded_square(draw, square_box, radius=int(size * amber_radius_ratio), fill=AMBER)

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

    draw.text((tx, ty), text, fill=WHITE, font=font)
    return img


def main():
    draw_icon(1024, with_dark_bg=False).save(os.path.join(OUT, "icon.png"))
    draw_icon(1024, with_dark_bg=True).save(os.path.join(OUT, "adaptive-icon.png"))
    draw_icon(48, with_dark_bg=False).save(os.path.join(OUT, "favicon.png"))
    print("Wrote icon.png, adaptive-icon.png, favicon.png to", OUT)


if __name__ == "__main__":
    main()
