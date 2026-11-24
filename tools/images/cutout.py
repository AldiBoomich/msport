"""Cut a car out of a photo (rembg, BiRefNet) and write an RGBA PNG plus a preview on the studio grey.

Usage: python cutout.py <out_dir> <photo>[@x0,y0,x1,y1] [...]
Run with the tools venv: "C:/Users/aaldi/Local Sites/msport/.venv/Scripts/python" -I cutout.py ...
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from rembg import new_session, remove
from scipy import ndimage

MODEL = "birefnet-general"


def keep_largest(cut: Image.Image) -> Image.Image:
    """Keep only the biggest object of the mask (drops a van or a second car caught next to ours)."""
    alpha = np.asarray(cut.getchannel("A"))
    labels, count = ndimage.label(alpha > 32)
    if count < 2:
        return cut
    sizes = ndimage.sum(np.ones_like(labels), labels, range(1, count + 1))
    keep = ndimage.binary_dilation(labels == (int(np.argmax(sizes)) + 1), iterations=3)
    out = cut.copy()
    out.putalpha(Image.fromarray(np.where(keep, alpha, 0).astype(np.uint8)))
    return out


def main() -> None:
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    session = new_session(MODEL)
    for arg in sys.argv[2:]:
        # "photo.jpg@x0,y0,x1,y1" crops the photo (fractions) before the cut, to leave out a neighbour car
        name, _, box = arg.partition("@")
        src = Path(name)
        img = Image.open(src).convert("RGB")
        if box:
            x0, y0, x1, y1 = map(float, box.split(","))
            img = img.crop((round(x0 * img.width), round(y0 * img.height), round(x1 * img.width), round(y1 * img.height)))
        cut = remove(img, session=session, post_process_mask=True)
        cut = keep_largest(cut)
        bbox = cut.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
        if bbox:
            pad = 24
            cut = cut.crop((max(0, bbox[0] - pad), max(0, bbox[1] - pad), min(cut.width, bbox[2] + pad), min(cut.height, bbox[3] + pad)))
        cut.save(out / (src.stem + ".png"))
        prev = Image.new("RGB", cut.size, (231, 232, 234))
        prev.paste(cut, mask=cut.getchannel("A"))
        prev.thumbnail((1400, 1400))
        prev.save(out / (src.stem + "-preview.jpg"), quality=85)
        print("cut", src.name, cut.size)


if __name__ == "__main__":
    main()
