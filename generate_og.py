"""Generate OG-Image for KREIS (WhatsApp/iMessage/Twitter preview)."""
from PIL import Image, ImageDraw, ImageFont
import os

W, H = 1200, 630
BG = (10, 10, 10)
ACCENT = (167, 139, 250)
TEXT = (245, 245, 245)
TEXT_DIM = (154, 154, 154)

img = Image.new("RGB", (W, H), BG)
draw = ImageDraw.Draw(img)

# Big ring logo, left-center
logo_cx, logo_cy, logo_r, ring = 240, H // 2, 130, 14
draw.ellipse(
    (logo_cx - logo_r, logo_cy - logo_r, logo_cx + logo_r, logo_cy + logo_r),
    outline=ACCENT, width=ring,
)

def load_font(size: int):
    for path in (
        "/System/Library/Fonts/HelveticaNeue.ttc",
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/Library/Fonts/Arial.ttf",
    ):
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()

font_title = load_font(200)
font_tag = load_font(44)
font_url = load_font(28)

# Title "KREIS"
title_x = 430
title_y = H // 2 - 160
draw.text((title_x, title_y), "KREIS", fill=TEXT, font=font_title)

# Tagline directly below, accent color
draw.text((title_x + 6, title_y + 230), "für enge Menschen", fill=ACCENT, font=font_tag)

# Footer URL (bottom-left)
draw.text((80, H - 60), "1gassner.github.io/kreis", fill=TEXT_DIM, font=font_url)

here = os.path.dirname(__file__)
out = os.path.join(here, "og.png")
img.save(out, "PNG", optimize=True)
print(f"Saved: {out} ({os.path.getsize(out)} bytes)")


# --- Icons (PWA + Apple Touch) ---
def make_icon(size: int, filename: str, rounded_corner: bool = False):
    ic = Image.new("RGBA", (size, size), (10, 10, 10, 255))
    icd = ImageDraw.Draw(ic)
    pad = size // 8
    stroke = max(4, size // 20)
    icd.ellipse((pad, pad, size - pad, size - pad), outline=ACCENT, width=stroke)
    if rounded_corner:
        # Clip to rounded square (iOS adds its own rounding, but apple-touch-icon
        # looks cleaner if the background isn't fully black at the corners)
        pass
    path = os.path.join(here, filename)
    ic.save(path, "PNG", optimize=True)
    print(f"Saved: {path} ({os.path.getsize(path)} bytes)")


make_icon(192, "icon-192.png")
make_icon(512, "icon-512.png")
make_icon(180, "apple-touch-icon.png", rounded_corner=True)
