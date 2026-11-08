"""Generates the OLT Core Manager launcher icons for the Android project.

Run:  python make_icons.py
Writes legacy + adaptive icons into android/app/src/main/res/mipmap-*.
"""

import os
from PIL import Image, ImageDraw, ImageFilter

RES = os.path.join("android", "app", "src", "main", "res")

# Bolt path from the splash screen SVG, expressed in a 120x120 viewBox
BOLT = [(68, 20), (36, 68), (57, 68), (49, 100), (82, 50), (60, 50)]
RING_R = 45

LEGACY = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
ADAPTIVE = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}

BG_INNER = (22, 32, 46)
BG_OUTER = (7, 10, 15)
BOLT_FILL = (124, 196, 255)
RING_STROKE = (79, 156, 249)


def scale_points(points, factor, offset):
    return [(x * factor + offset, y * factor + offset) for x, y in points]


def draw_art(canvas, art_box, with_background):
    """Renders the icon at `canvas` px square. `art_box` is the size in px that the
    120x120 design box is scaled into."""
    image = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    if with_background:
        background = Image.new("RGBA", (canvas, canvas), BG_OUTER + (255,))
        glow = ImageDraw.Draw(background)
        for step in range(canvas // 2, 0, -6):
            t = step / (canvas // 2)
            color = tuple(
                int(BG_INNER[i] + (BG_OUTER[i] - BG_INNER[i]) * t) for i in range(3)
            )
            radius = int(step)
            glow.ellipse(
                [canvas // 2 - radius, canvas // 2 - radius, canvas // 2 + radius, canvas // 2 + radius],
                fill=color + (255,),
            )
        image = Image.alpha_composite(background, image)
        draw = ImageDraw.Draw(image)

    factor = art_box / 120
    offset = (canvas - art_box) / 2

    # soft halo behind the mark
    halo = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    ImageDraw.Draw(halo).polygon(scale_points(BOLT, factor, offset), fill=(79, 156, 249, 150))
    halo = halo.filter(ImageFilter.GaussianBlur(canvas / 28))
    image = Image.alpha_composite(image, halo)

    draw = ImageDraw.Draw(image)
    ring_radius = RING_R * factor
    center = (canvas / 2, canvas / 2)
    draw.ellipse(
        [center[0] - ring_radius, center[1] - ring_radius, center[0] + ring_radius, center[1] + ring_radius],
        outline=RING_STROKE + (170,),
        width=max(1, int(canvas / 110)),
    )
    draw.polygon(scale_points(BOLT, factor, offset), fill=BOLT_FILL + (255,))
    return image


def circular_mask(image):
    canvas = image.size[0]
    mask = Image.new("L", (canvas, canvas), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, canvas - 1, canvas - 1], fill=255)
    out = image.copy()
    out.putalpha(mask)
    return out


def write(image, folder, name):
    path = os.path.join(RES, folder, name)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    image.save(path)
    print("wrote", path)


def main():
    for density, size in LEGACY.items():
        folder = f"mipmap-{density}"
        art = size * 0.74
        icon = draw_art(size * 4, art * 4, True).resize((size, size), Image.LANCZOS)
        write(icon, folder, "ic_launcher.png")
        write(circular_mask(icon), folder, "ic_launcher_round.png")

    for density, size in ADAPTIVE.items():
        folder = f"mipmap-{density}"
        # 108dp canvas, art kept inside the ~66dp safe zone
        foreground = draw_art(size * 4, size * 4 * 0.58, False)
        write(foreground.resize((size, size), Image.LANCZOS), folder, "ic_launcher_foreground.png")


if __name__ == "__main__":
    main()
