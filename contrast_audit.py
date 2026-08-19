#!/usr/bin/env python3
"""WCAG 2.x contrast audit — light mode text on alt-section sunken background.
Ground truth bg: #f1f0f0 (pixel-sampled; oklch(0.93 0.004 0) at 60% over #fafafa).
Text tokens from src/app/globals.css .light block, parsed from oklch.
Stdlib only; oklch->sRGB via CSS Color 4 reference algorithm.
"""
import math, re

# ---------- oklch -> sRGB (CSS Color 4 spec algorithm) ----------
def oklch_to_srgb(L, C, h):
    h_rad = math.radians(h)
    a = C * math.cos(h_rad)
    b = C * math.sin(h_rad)
    l_ = L + 0.3963377774 * a + 0.2158037573 * b
    m_ = L - 0.1055613458 * a - 0.0638541728 * b
    s_ = L - 0.0894841775 * a - 1.2914855480 * b
    def cbrt(x): return math.copysign(abs(x) ** (1/3), x)
    l, m, s = l_**3, m_**3, s_**3
    r = +4.0767416621*l - 3.3077115913*m + 0.2309699292*s
    g = -1.2684380046*l + 2.6097574011*m - 0.3413193965*s
    b_ = -0.0041960863*l - 0.7034186147*m + 1.7076147010*s
    def lin_to_srgb(c):
        if c < 0: return 0.0
        if c >= 0.0031308: return 1.055 * (c ** (1/2.4)) - 0.055
        return 12.92 * c
    return tuple(round(lin_to_srgb(c) * 255) for c in (r, g, b_))

def parse_oklch(s):
    m = re.match(r"oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*/\s*([\d.]+))?\s*\)", s)
    L, C, h = float(m.group(1)), float(m.group(2)), float(m.group(3))
    alpha = float(m.group(4)) if m.group(4) else 1.0
    return L, C, h, alpha

# ---------- WCAG relative luminance & ratio ----------
def srgb_to_lin(c):
    c /= 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def luminance(hexrgb):
    r, g, b = hexrgb
    return 0.2126 * srgb_to_lin(r) + 0.7152 * srgb_to_lin(g) + 0.0722 * srgb_to_lin(b)

def ratio(a, b):
    la, lb = luminance(a), luminance(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)

def alpha_composite(fg_rgb, fg_a, bg_rgb):
    return tuple(round(fg_a * f + (1 - fg_a) * b) for f, b in zip(fg_rgb, bg_rgb))

# ---------- tokens (.light block, globals.css lines 180-251) ----------
BG = (0xF1, 0xF0, 0xF0)  # pixel-sampled effective sunken bg (#f1f0f0)

fg  = oklch_to_srgb(*parse_oklch("oklch(0.11 0 0)")[:3])
muted = oklch_to_srgb(*parse_oklch("oklch(0.48 0.01 0)")[:3])
orange = oklch_to_srgb(*parse_oklch("oklch(0.55 0.19 45)")[:3])
border = oklch_to_srgb(*parse_oklch("oklch(0.85 0.005 0)")[:3])

tiers = [
    ("foreground (near-black)",       fg,    1.0),
    ("muted-foreground",              muted, 1.0),
    ("muted-foreground/80",           muted, 0.8),
    ("muted-foreground/70",           muted, 0.7),   # SectionHeader subtitle
    ("muted-foreground/50",           muted, 0.5),
    ("orange (accent text, icons)",   orange, 1.0),
    ("border (non-text, for info)",   border, 1.0),
]

print(f"{'Text tier':<34}{'RGB on bg':<18}{'Ratio':>7}  AA 4.5:1")
print("-" * 70)
for name, rgb, alpha in tiers:
    eff = alpha_composite(rgb, alpha, BG)
    r = ratio(eff, BG)
    print(f"{name:<34}{str(eff):<18}{r:>6.2f}:1  {'PASS' if r >= 4.5 else 'FAIL'}")

print("\nBackground: #f1f0f0  L=%.4f" % luminance(BG))
for name, rgb, alpha in tiers:
    eff = alpha_composite(rgb, alpha, BG)
    print(f"  L({name}) = {luminance(eff):.4f}")

# ---------- StatsSection nuance: glass-strong card (white /0.8 over sunken) ----------
# .light --glass-bg-strong: oklch(1 0 0 / 0.8); card sits on the #f1f0f0 alt band
CARD_BG = alpha_composite((255, 255, 255), 0.8, BG)
print("\nStatsSection glass-strong card effective bg:", CARD_BG, "L=%.4f" % luminance(CARD_BG))
for name, rgb, alpha in [("muted/80", muted, 0.8), ("muted/50", muted, 0.5), ("muted", muted, 1.0)]:
    eff = alpha_composite(rgb, alpha, CARD_BG)
    print(f"  {name:<12} on card: {eff}  ratio {ratio(eff, CARD_BG):.2f}:1  "
          f"{'PASS' if ratio(eff, CARD_BG) >= 4.5 else 'FAIL'}")