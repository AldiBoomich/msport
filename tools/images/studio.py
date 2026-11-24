"""Studio finish for a car cut-out (after cutout.py): clean edge, smoked glass, plate removal, optional fade of a cut
end into the dark, and a baked floor shadow (soft pool under the body + dense contact shadows under the tyres), so the
car stands on the backdrop like in a studio shot instead of floating.

Usage: python studio.py <recipe.json> [--debug]
Recipe: {"src_dir": "...", "out_dir": "...", "items": [{
    "src": "car.png", "out": "car-studio",
    "glass": [[[x, y], ...], ...],      polygons in % of the cut-out; darkened to smoked glass
    "plate": [[x, y], ...],             polygon in %; filled with the colour around it
    "fade_left": 0.0,                   0…1: part of the width (from the left) that falls off into the dark
    "shadow": 1.0,                      shadow strength
    "contacts": [[x, y], ...]           optional tyre contact points in %; found automatically when missing
}]}
--debug writes <out>-debug.jpg with the polygons and contact points drawn on the car.
Output: <out>.png (RGBA, canvas padded at the bottom and the sides for the shadow) and <out>.json (where the
source cut-out sits on the new canvas, for moving hotspot coordinates).
Run with the tools venv: "C:/Users/aaldi/Local Sites/msport/.venv/Scripts/python" -I studio.py recipe.json
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage
from scipy.signal import find_peaks

SMOKE = np.array([16, 17, 20], dtype=np.float32)  # smoked-glass tone (near --c-night)


def poly_mask(size, poly, feather):
    w, h = size
    m = Image.new("L", size, 0)
    ImageDraw.Draw(m).polygon([(x * w / 100, y * h / 100) for x, y in poly], fill=255)
    if feather:
        m = m.filter(ImageFilter.GaussianBlur(feather))
    return np.asarray(m, dtype=np.float32) / 255


def decontaminate(rgb, a):
    """Edge pixels take the colour of the solid car just inside them (no fringe of the old background)."""
    solid = ndimage.binary_erosion(a > 0.98, iterations=2).astype(np.float32)
    num = np.stack([ndimage.gaussian_filter(rgb[..., c] * solid, 3) for c in range(3)], -1)
    den = ndimage.gaussian_filter(solid, 3)[..., None]
    inner = num / np.maximum(den, 1e-4)
    edge = ((a > 0.02) & (a < 0.98)) | ((a > 0.02) & (solid < 0.5))
    k = np.where(edge[..., None] & (den > 0.02), 1.0, 0.0)
    out = rgb * (1 - k) + inner * k
    a = np.clip((a - 0.08) / 0.92, 0, 1)  # choke the alpha a touch
    return out, a


def bottom_profile(a):
    h = a.shape[0]
    solid = a > 0.5
    has = solid.any(0)
    yb = np.where(has, h - 1 - np.argmax(solid[::-1], 0), -1)
    return yb, has


def find_contacts(yb, has, w, h):
    xs = np.where(has)[0]
    y = ndimage.uniform_filter1d(yb[xs].astype(float), max(3, w // 200))
    peaks, _ = find_peaks(y, prominence=h * 0.012, distance=w * 0.12)
    # Tyres touch the floor at the lowest points: keep peaks near the lowest part of the car.
    keep = [p for p in peaks if y[p] > y.max() - h * 0.22]
    return [(int(xs[p]), int(y[p])) for p in keep]


def main():
    recipe = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    debug = "--debug" in sys.argv
    src_dir, out_dir = Path(recipe["src_dir"]), Path(recipe["out_dir"])
    out_dir.mkdir(parents=True, exist_ok=True)
    for it in recipe["items"]:
        im = Image.open(src_dir / it["src"]).convert("RGBA")
        w, h = im.size
        arr = np.asarray(im, dtype=np.float32)
        rgb, a = arr[..., :3], arr[..., 3] / 255

        rgb, a = decontaminate(rgb, a)

        # Smoked glass: keep a little of what is behind (reflections, seats), most of it goes to a dark tint.
        for poly in it.get("glass", []):
            m = poly_mask((w, h), poly, 2.5)[..., None]
            smoked = SMOKE + (rgb - SMOKE) * 0.17
            rgb = rgb * (1 - m) + smoked * m

        if it.get("plate"):
            m = poly_mask((w, h), it["plate"], 1.5)
            ring = (poly_mask((w, h), it["plate"], 18) > 0.02) & (m < 0.02) & (a > 0.9)
            colour = np.median(rgb[ring], 0)
            rgb = rgb * (1 - m[..., None]) + colour * m[..., None]

        fade = float(it.get("fade_left", 0))
        if fade:
            x = np.arange(w) / w
            k = np.clip(x / fade, 0, 1)
            k = k * k * (3 - 2 * k)  # smoothstep
            rgb = rgb * (0.45 + 0.55 * k)[None, :, None]
            k2 = np.clip(x / (fade * 0.8), 0, 1)
            a = a * (k2 * k2 * (3 - 2 * k2))[None, :]

        # Floor shadow on a padded canvas.
        pad_b, pad_x = int(h * 0.14), int(w * 0.10)
        W, H = w + 2 * pad_x, h + pad_b
        A = np.zeros((H, W), np.float32)
        A[:h, pad_x:pad_x + w] = a
        yb, has = bottom_profile(A)
        strength = float(it.get("shadow", 1.0))

        pool = np.zeros((H, W), np.float32)
        lift = int(h * 0.10)
        for x in np.where(has)[0]:
            pool[max(0, yb[x] - lift):yb[x] + int(h * 0.012), x] = 1
        wide = ndimage.gaussian_filter(pool, (h * 0.022, w * 0.035))
        tight = ndimage.gaussian_filter(pool, (h * 0.006, w * 0.010))

        contacts = it.get("contacts")
        if contacts:
            pts = [(int(cx * w / 100) + pad_x, int(cy * h / 100)) for cx, cy in contacts]
        else:
            pts = [(x, y) for x, y in find_contacts(yb, has, W, H)]
        cont = Image.new("L", (W, H), 0)
        d = ImageDraw.Draw(cont)
        rx, ry = w * 0.045, h * 0.014
        for cx, cy in pts:
            d.ellipse([cx - rx, cy - ry * 0.6, cx + rx, cy + ry], fill=255)
        cont = ndimage.gaussian_filter(np.asarray(cont, np.float32) / 255, (h * 0.006, w * 0.010))

        shadow = np.clip(wide * 0.55 + tight * 0.35 + cont * 0.9, 0, 0.92) * strength
        if fade:
            xs = np.arange(W) - pad_x
            shadow *= np.clip(xs / (w * fade), 0, 1)[None, :]

        RGB = np.zeros((H, W, 3), np.float32)
        RGB[:h, pad_x:pad_x + w] = rgb
        # Car over shadow: out_a = a + s(1-a); colour premultiplied (shadow is black).
        out_a = A + shadow * (1 - A)
        out_rgb = RGB * (A / np.maximum(out_a, 1e-4))[..., None]
        out = np.dstack([np.clip(out_rgb, 0, 255), np.clip(out_a * 255, 0, 255)]).astype(np.uint8)
        # Trim empty margins (keep a little air).
        ys, xs = np.where(out[..., 3] > 3)
        m = 8
        y0, x0 = max(0, ys.min() - m), max(0, xs.min() - m)
        out = out[y0:ys.max() + m, x0:xs.max() + m]
        target = out_dir / (it["out"] + ".png")
        # Where the old cut-out sits on the new canvas (to move hotspot coordinates): new = (old * size + offset) / new size.
        (out_dir / (it["out"] + ".json")).write_text(json.dumps(
            {"src_w": w, "src_h": h, "offset_x": int(pad_x - x0), "offset_y": int(-y0), "w": int(out.shape[1]), "h": int(out.shape[0])}))
        Image.fromarray(out, "RGBA").save(target)
        print(f"{target.name}: {out.shape[1]}x{out.shape[0]}, contacts {[(round((x - pad_x) * 100 / w, 1), round(y * 100 / h, 1)) for x, y in pts]}")

        if debug:
            dbg = Image.new("RGBA", (w, h), (200, 200, 200, 255))
            dbg.alpha_composite(im)
            dd = ImageDraw.Draw(dbg)
            for poly in it.get("glass", []) + ([it["plate"]] if it.get("plate") else []):
                dd.line([(x * w / 100, y * h / 100) for x, y in poly + [poly[0]]], fill=(255, 0, 0, 255), width=max(2, w // 600))
            for cx, cy in pts:
                dd.ellipse([cx - pad_x - 12, cy - 12, cx - pad_x + 12, cy + 12], outline=(0, 160, 255, 255), width=4)
            dbg.convert("RGB").resize((1600, int(h * 1600 / w))).save(out_dir / (it["out"] + "-debug.jpg"), quality=85)


if __name__ == "__main__":
    main()
