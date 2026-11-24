"""Build the site photos from the source files: strip the BMW caption bar, crop, one colour grade, resize, WebP.

Usage: python build.py <recipe.json>
Recipe: {"src_dir": "...", "out_dir": "...", "items": [{"src": "bmw/P0024702.jpg", "out": "drive-smg",
          "crop": [x0, y0, x1, y1] (fractions of the image after the caption bar is removed, optional),
          "width": 2560, "bw": false, "alpha": false, "strip": true}]}
"strip": false keeps the photo whole (sources without the BMW caption bar, e.g. a dark studio shot).
Cut-outs (alpha: true) are RGBA PNGs from cutout.py; they keep their transparency.
Run with the tools venv: "C:/Users/aaldi/Local Sites/msport/.venv/Scripts/python" -I build.py recipe.json
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance


def strip_caption_bar(img: Image.Image) -> Image.Image:
    """BMW press JPEGs carry a dark caption band on the right (landscape) or at the bottom (portrait)."""
    a = np.asarray(img.convert("L"), dtype=np.float32)
    h, w = a.shape
    # The band is black with thin light text and rules: the median of a column (or row) inside it stays near black.
    # Short bright runs (a rule line) are skipped; the band ends where a long bright run (the photo) starts.
    landscape = w >= h
    med = np.median(a, axis=0 if landscape else 1)
    n = len(med)
    edge, bright = n, 0
    for i in range(n - 1, int(n * 0.7), -1):
        if med[i] < 28:
            edge, bright = i, 0
        else:
            bright += 1
            if bright > 40:
                break
    if edge >= n - 20:
        return img
    cut = max(1, edge - 6)
    return img.crop((0, 0, cut, h)) if landscape else img.crop((0, 0, w, cut))


def grade(img: Image.Image, bw: bool) -> Image.Image:
    """One look for every photo: neutral-cool, a little more contrast, saturation -10%."""
    rgb = img.convert("RGB")
    rgb = ImageEnhance.Contrast(rgb).enhance(1.06)
    rgb = ImageEnhance.Color(rgb).enhance(0.0 if bw else 0.9)
    arr = np.asarray(rgb, dtype=np.float32)
    if not bw:
        arr[..., 0] *= 0.985  # a touch cooler
        arr[..., 2] *= 1.015
    out = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    if img.mode == "RGBA":
        out.putalpha(img.getchannel("A"))
    return out


def main() -> None:
    recipe = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    src_dir, out_dir = Path(recipe["src_dir"]), Path(recipe["out_dir"])
    out_dir.mkdir(parents=True, exist_ok=True)
    for it in recipe["items"]:
        img = Image.open(src_dir / it["src"])
        alpha = it.get("alpha", False)
        if alpha:
            img = img.convert("RGBA")
        elif it.get("strip", True):
            img = strip_caption_bar(img.convert("RGB"))
        else:
            img = img.convert("RGB")
        if "crop" in it:
            x0, y0, x1, y1 = it["crop"]
            img = img.crop((round(x0 * img.width), round(y0 * img.height), round(x1 * img.width), round(y1 * img.height)))
        img = grade(img, it.get("bw", False))
        width = it.get("width", 2560)
        if img.width > width:
            img = img.resize((width, round(img.height * width / img.width)), Image.LANCZOS)
        target = out_dir / (it["out"] + ".webp")
        img.save(target, "WEBP", quality=82 if not alpha else 88, method=6)
        print(f"{target.name}: {img.width}x{img.height}, {target.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
