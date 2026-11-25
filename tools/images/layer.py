"""Cut a car out of a studio photo on the photo's own canvas (no trim), so the cut-out lies exactly over the photo: the
layer between them (the ghost badge of the profile chapter) then stands behind the car.

Usage: python layer.py <photo> <out.png> [--gain 2.2] [--crop x0,y0,x1,y1]
--gain lifts the shadows of the copy given to the matting model (a black car in a dark studio); the pixels are kept.
--crop (fractions) is applied to the result; crop the photo itself with the same box.
Run with the tools venv: "C:/Users/aaldi/Local Sites/msport/.venv/Scripts/python" -I layer.py ...
"""
import argparse
from pathlib import Path

import numpy as np
from PIL import Image
from rembg import new_session, remove
from scipy import ndimage


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("photo")
    ap.add_argument("out")
    ap.add_argument("--gain", type=float, default=2.2)
    ap.add_argument("--crop", default="")
    args = ap.parse_args()

    img = Image.open(args.photo).convert("RGB")
    lifted = np.asarray(img, dtype=np.float32) / 255
    lifted = np.clip(lifted ** (1 / args.gain), 0, 1)
    mask = remove(Image.fromarray((lifted * 255).astype(np.uint8)), session=new_session("birefnet-general"), only_mask=True)
    alpha = np.asarray(mask.convert("L"))
    labels, count = ndimage.label(alpha > 32)
    if count > 1:  # keep the car only
        sizes = ndimage.sum(np.ones_like(labels), labels, range(1, count + 1))
        keep = ndimage.binary_dilation(labels == (int(np.argmax(sizes)) + 1), iterations=3)
        alpha = np.where(keep, alpha, 0).astype(np.uint8)

    out = img.convert("RGBA")
    out.putalpha(Image.fromarray(alpha))
    if args.crop:
        x0, y0, x1, y1 = map(float, args.crop.split(","))
        out = out.crop((round(x0 * out.width), round(y0 * out.height), round(x1 * out.width), round(y1 * out.height)))
    out.save(Path(args.out))
    prev = Image.new("RGB", out.size, (200, 60, 60))
    prev.paste(out, mask=out.getchannel("A"))
    prev.thumbnail((1500, 1500))
    prev.save(Path(args.out).with_suffix(".preview.jpg"), quality=85)
    print("layer", args.out, out.size)


if __name__ == "__main__":
    main()
