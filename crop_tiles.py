#!/usr/bin/env python3
"""
Detect the Instagram post grid and crop ONE representative tile.

Improved algorithm:
- The grid is the FIRST y position where all THREE columns (left, center, right)
  simultaneously have high pixel variance (i.e. three distinct photographs).
- This avoids false matches on bio text, highlight circles, action buttons.
- Min y = 1400 to skip past most fixed UI above the grid.
"""

import os
from pathlib import Path
from PIL import Image, ImageStat

BASE = Path("/Users/san/sanrusan/artisti")
OUT = BASE / "tiles"
OUT.mkdir(exist_ok=True)

W, H = 1290, 2796
TILE = 430  # 1290 / 3
COLS = [(0, TILE), (TILE, 2 * TILE), (2 * TILE, 3 * TILE)]  # left, center, right

# Force a specific tile (row, col) for an image
# Row is 1-indexed grid row; col 1=left, 2=center, 3=right
OVERRIDES = {}


def column_std(im_rgb, x1, x2, y, sample_stride=12) -> float:
    """Standard deviation of grayscale samples in a small strip at (x1..x2, y..y+30)."""
    g = im_rgb.convert("L")
    px = g.load()
    samples = []
    for yy in range(y, y + 30, 6):
        for xx in range(x1, x2, sample_stride):
            samples.append(px[xx, yy])
    if not samples:
        return 0.0
    mean = sum(samples) / len(samples)
    var = sum((s - mean) ** 2 for s in samples) / len(samples)
    return var ** 0.5


def find_grid_start_y(im_rgb: Image.Image) -> int:
    """Find the TOP of the post grid by walking UPward from a y position
    that is guaranteed to be inside the grid.

    The bottom 600px of the image is always inside the grid (since the grid
    extends to the bottom of the screen, and it's at least 1 row = 430px tall).

    Walking up from y=2200, the first time we encounter a LOW-variance row
    in all 3 columns simultaneously, we've crossed into the tab-bar / UI
    region. The grid starts just below that.
    """
    # Start from y=2200 (deep in grid) and walk up in steps of 8.
    last_grid_y = None
    for y in range(2200, 1000, -8):
        stds = [column_std(im_rgb, x1, x2, y) for (x1, x2) in COLS]
        photo_like = sum(1 for s in stds if s > 18)
        if photo_like >= 2:
            last_grid_y = y  # still inside grid
            continue
        # Hit a non-grid row (tab bar or gap). last_grid_y is the highest
        # confirmed photo position. Add a small buffer below to be safely
        # inside a tile.
        if last_grid_y is not None:
            return last_grid_y + 8
        break
    return last_grid_y if last_grid_y is not None else 1700


def crop_tile(src: Path, row: int = 1, col: int = 2):
    im = Image.open(src).convert("RGB")
    if im.size != (W, H):
        im = im.resize((W, H))
    grid_y = find_grid_start_y(im)
    x1, x2 = COLS[col - 1]
    y1 = grid_y + (row - 1) * TILE
    y2 = y1 + TILE
    # Don't go past image bottom
    y2 = min(y2, H)
    return im.crop((x1, y1, x2, y2)), grid_y


def main():
    files = sorted([f for f in os.listdir(BASE) if f.endswith(".PNG")])
    print(f"Cropping {len(files)} tiles…")
    for f in files:
        override = OVERRIDES.get(f, {})
        row = override.get("row", 1)
        col = override.get("col", 2)
        try:
            tile, grid_y = crop_tile(BASE / f, row=row, col=col)
            out_path = OUT / f.replace(".PNG", ".jpg")
            tile.save(out_path, "JPEG", quality=90, optimize=True)
            print(f"  {f}: grid_y={grid_y} -> {out_path.name}")
        except Exception as e:
            print(f"  {f}: ERROR {e}")

    print(f"\nDone. Tiles in {OUT}")


if __name__ == "__main__":
    main()
