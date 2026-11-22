"""
Side-by-side sheet: reference photo | render (bl_compare.py) | render laid over the photo at 50 %.
Optional close-ups: "crops" in refs.json, [x, y, w, h] as fractions of the frame, shown photo | render.

  python compare_sheet.py refs.json <render dir> <out.jpg> [--only b01,a07] [--width 1800] [--crops]
"""
import json, os, sys, argparse
from PIL import Image, ImageDraw

ap = argparse.ArgumentParser()
ap.add_argument('refs'); ap.add_argument('renders'); ap.add_argument('out')
ap.add_argument('--only', default=''); ap.add_argument('--width', type=int, default=1800)
ap.add_argument('--crops', action='store_true', help='add a row of close-ups per photo')
ap.add_argument('--bg', default='#808080', help='colour behind the transparent render')
a = ap.parse_args()
cfg = json.load(open(a.refs, encoding='utf-8'))
only = set(filter(None, a.only.split(',')))
GAP, LABEL = 6, 22
col = (a.width - 2 * GAP) // 3
rows = []
for ref in cfg['refs']:
    if only and ref['id'] not in only:
        continue
    rp = os.path.join(a.renders, ref['id'] + '.png')
    if not os.path.exists(rp):
        continue
    photo = Image.open(os.path.join(cfg['photos'], ref['file'])).convert('RGB')
    rend = Image.open(rp).convert('RGBA')
    photo = photo.resize(rend.size, Image.LANCZOS)
    flat = Image.new('RGBA', rend.size, a.bg); flat.alpha_composite(rend)
    over = photo.convert('RGBA'); ghost = rend.copy(); ghost.putalpha(ghost.getchannel('A').point(lambda v: v // 2)); over.alpha_composite(ghost)
    k = col / rend.width; h = round(rend.height * k)
    tiles = [im.convert('RGB').resize((col, h), Image.LANCZOS) for im in (photo, flat, over)]
    row = Image.new('RGB', (a.width, h + LABEL), (20, 23, 27))
    for i, t in enumerate(tiles):
        row.paste(t, (i * (col + GAP), LABEL))
    d = ImageDraw.Draw(row)
    d.text((4, 4), f"{ref['id']}  {'M6' if ref.get('m6') else 'not M6'}  {ref.get('what', '')}", fill=(230, 230, 230))
    rows.append(row)
    if a.crops:
        for c in ref.get('crops', []):
            x, y, w, hh = c['box']; W, H = rend.size
            box = (round(x * W), round(y * H), round((x + w) * W), round((y + hh) * H))
            pc = Image.open(os.path.join(cfg['photos'], ref['file'])).convert('RGB')
            pc = pc.crop(tuple(round(v * pc.width / W) if i % 2 == 0 else round(v * pc.height / H) for i, v in enumerate(box)))
            rc = flat.crop(box).convert('RGB')
            cw = (a.width - GAP) // 2; ch = round(cw * (box[3] - box[1]) / max(1, box[2] - box[0]))
            r2 = Image.new('RGB', (a.width, ch + LABEL), (20, 23, 27))
            r2.paste(pc.resize((cw, ch), Image.LANCZOS), (0, LABEL)); r2.paste(rc.resize((cw, ch), Image.LANCZOS), (cw + GAP, LABEL))
            ImageDraw.Draw(r2).text((4, 4), f"{ref['id']} close-up: {c['name']}", fill=(230, 230, 230))
            rows.append(r2)
sheet = Image.new('RGB', (a.width, sum(r.height + GAP for r in rows)), (20, 23, 27))
y = 0
for r in rows:
    sheet.paste(r, (0, y)); y += r.height + GAP
sheet.save(a.out, quality=88)
print('sheet', a.out, sheet.size)
