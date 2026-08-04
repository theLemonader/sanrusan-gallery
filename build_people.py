#!/usr/bin/env python3
"""Crop square B&W portraits for the SANRUSAN site + prepare the space photo."""

from pathlib import Path
from PIL import Image, ImageOps

BASE = Path("/Users/san/sanrusan")
OUT = BASE / "people"
OUT.mkdir(exist_ok=True)

# (source, output, face_cx_frac, face_cy_frac, crop_frac_of_min_dim)
# face_c*_frac  = where the face sits in the source, as a fraction of w/h
# crop_frac     = size of the square crop relative to the shorter side
PORTRAITS = [
    ("SAN_2415.png",                  "anton-san.jpg",      0.44, 0.44, 0.60),
    ("SAN_2433.png",                  "valentin-rusan.jpg", 0.50, 0.38, 0.74),
    ("people_src/advisor_0.jpeg",     "dragos-epure.jpg",   0.50, 0.50, 1.00),
    ("PHOTO-2026-07-17-16-54-47.jpg", "teodora-burz.jpg",   0.42, 0.36, 0.62),
    ("PHOTO-2026-07-17-16-58-56.jpg", "cristina-corban.jpg",0.52, 0.34, 0.72),
]

SIZE = 640  # output square, retina-friendly at ~320 css px


def crop_square(src, out, cx, cy, frac):
    im = Image.open(BASE / src)
    im = ImageOps.exif_transpose(im).convert("RGB")
    w, h = im.size
    side = int(min(w, h) * frac)

    x = int(w * cx) - side // 2
    y = int(h * cy) - side // 2
    # keep inside bounds
    x = max(0, min(x, w - side))
    y = max(0, min(y, h - side))

    im = im.crop((x, y, x + side, y + side))
    im = im.resize((SIZE, SIZE), Image.LANCZOS)
    im = ImageOps.grayscale(im).convert("RGB")   # black & white
    im.save(OUT / out, "JPEG", quality=88, optimize=True)
    print(f"  {out:24} from {src}  ({w}x{h} -> {side}px square)")


def prepare_space():
    im = Image.open(BASE / "poza spatiu sanrusan.png")
    im = ImageOps.exif_transpose(im).convert("RGB")
    im.thumbnail((1800, 1800), Image.LANCZOS)
    im = ImageOps.grayscale(im).convert("RGB")
    im.save(OUT / "space.jpg", "JPEG", quality=86, optimize=True)
    print(f"  space.jpg                from poza spatiu sanrusan.png {im.size}")


if __name__ == "__main__":
    print("Building portraits…")
    for args in PORTRAITS:
        crop_square(*args)
    prepare_space()
    print(f"\nDone -> {OUT}")
