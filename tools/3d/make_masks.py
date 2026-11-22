"""
Car masks for the reference photos (bl_compare.py --fit matches the render's silhouette to them).

  pip install --user "rembg[cpu]"        (first run downloads the isnet-general-use model, ~180 MB)
  python make_masks.py <photos dir>       -> <photos dir>/../masks/<name>.png (white = car)

Check the masks with your own eyes: a reflection on a shiny floor or a second car in the frame can join the mask.
"""
import glob, os, sys
from PIL import Image
from rembg import remove, new_session

photos = sys.argv[1]
out_dir = os.path.join(os.path.dirname(os.path.abspath(photos.rstrip('/\\'))), 'masks')
os.makedirs(out_dir, exist_ok=True)
session = new_session('isnet-general-use')
for f in sorted(glob.glob(os.path.join(photos, '*.*'))):
    im = Image.open(f).convert('RGB')
    if max(im.size) > 1600:
        im.thumbnail((1600, 1600))
    m = remove(im, session=session, only_mask=True)
    out = os.path.join(out_dir, os.path.splitext(os.path.basename(f))[0] + '.png')
    m.save(out)
    print(out, m.size)
