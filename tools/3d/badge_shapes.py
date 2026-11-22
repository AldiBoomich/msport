"""
2D outlines of the M6 boot badge (BMW M style): three slanted stripes, an italic M and a squared italic 6.
Units: letter height = 1, x to the right, y up; every outline is a list of (x, y), counter-clockwise, and a
letter may have holes. Plain Python (no Blender), so the shapes can be previewed with PIL:
  python badge_shapes.py preview.png
"""
import math

SLANT = 0.40          # italic: x shift per unit height (letters and stripes alike)
STRIPE_SLANT = SLANT
STRIPE_W = 0.42       # horizontal width of one stripe
STRIPE_GAP = 0.035
GAP_M = 0.16          # stripes → M
GAP_6 = 0.14          # M → 6


def _inter(p, d, q, e):
    """Intersection of the lines p + t d and q + s e."""
    den = d[0] * e[1] - d[1] * e[0]
    t = ((q[0] - p[0]) * e[1] - (q[1] - p[1]) * e[0]) / den
    return (p[0] + t * d[0], p[1] + t * d[1])


def stripes(x0=0.0):
    out = []
    for i in range(3):
        a = x0 + i * (STRIPE_W + STRIPE_GAP)
        out.append([(a, 0), (a + STRIPE_W, 0), (a + STRIPE_W + STRIPE_SLANT, 1), (a + STRIPE_SLANT, 1)])
    return out


def letter_m(x0=0.0, wl=0.27, inner=1.0, wd=0.27, run=0.62, s=SLANT):
    """Italic M: legs of width wl, the right leg's inner edge `inner` to the right of the left leg's outer
    edge (at the baseline); diagonals of horizontal width wd falling `run` per unit height."""
    up = (s, 1.0)
    lo, li = (x0, 0), (x0 + wl, 0)                       # left leg outer / inner edge (at y = 0)
    ri, ro = (x0 + inner, 0), (x0 + inner + wl, 0)       # right leg inner / outer
    top_l = (x0 + s + wl + 0.12, 1)                      # left diagonal, upper edge, at the top
    top_r = (x0 + inner + s - 0.12, 1)                   # right diagonal, upper edge, at the top
    dl, dr = (run, -1.0), (-run, -1.0)
    notch = _inter(top_l, dl, top_r, dr)
    low_l, low_r = (top_l[0] - wd, 1), (top_r[0] + wd, 1)
    vtx = _inter(low_l, dl, low_r, dr)
    a = _inter(li, up, low_l, dl)                        # crotch, left leg / left diagonal
    b = _inter(ri, up, low_r, dr)
    pts = [lo, li, a, vtx, b, ri, ro, (ro[0] + s, 1), top_r, notch, top_l, (lo[0] + s, 1)]
    return [pts], max(p[0] for p in pts) - s


def _round_rect(x0, y0, x1, y1, r, n=8):
    pts = []
    for cx, cy, a0 in ((x1 - r, y0 + r, -90), (x1 - r, y1 - r, 0), (x0 + r, y1 - r, 90), (x0 + r, y0 + r, 180)):
        for k in range(n + 1):
            a = math.radians(a0 + 90 * k / n)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def _arc(cx, cy, r, a0, a1, n=8):
    return [(cx + r * math.cos(math.radians(a0 + (a1 - a0) * k / n)), cy + r * math.sin(math.radians(a0 + (a1 - a0) * k / n))) for k in range(n + 1)]


def letter_6(x0=0.0, w=0.92, st=0.25, sh=0.22, bowl=0.60, r=0.26, ri=0.07, s=SLANT):
    """Squared italic 6: outer rounded box, the opening on the upper right between the top bar and the bowl."""
    gap_lo, gap_hi = bowl, 1 - sh                        # the opening: right of the stem, between bowl and bar
    o = []
    o += _arc(x0 + w - r, r, r, -90, 0)                  # bottom right
    o += _arc(x0 + w - ri, gap_lo - ri, ri, 0, 90, 4)   # up the bowl's right side, round into the bowl top
    o += [(x0 + st, gap_lo), (x0 + st, gap_hi)]          # into the opening, up the stem
    o += _arc(x0 + w - ri, gap_hi + ri, ri, -90, 0, 4)   # out along the bar's underside
    rt = min(r, 1 - gap_hi - ri - 0.01)                  # the bar's end: no taller than the bar
    o += _arc(x0 + w - rt, 1 - rt, rt, 0, 90)            # top right
    o += _arc(x0 + r, 1 - r, r, 90, 180)                 # top left
    o += _arc(x0 + r, r, r, 180, 270)                    # bottom left
    hole = _round_rect(x0 + st, sh, x0 + w - st, gap_lo - sh * 0.95, 0.07)[::-1]
    shear = lambda P: [(x + s * y, y) for x, y in P]
    return [shear(o), shear(hole)], x0 + w


def badge():
    """{'stripes': [polys], 'M': [polys], '6': [polys]} and the total width (letter height = 1)."""
    st = stripes(0.0)
    xm = 2 * (STRIPE_W + STRIPE_GAP) + STRIPE_W + GAP_M
    m, xm1 = letter_m(xm)
    six, x6 = letter_6(xm1 + GAP_6)
    width = x6 + SLANT
    return {'stripes': st, 'M': m, '6': six}, width


if __name__ == '__main__':
    import sys
    from PIL import Image, ImageDraw
    shapes, width = badge()
    k, pad = 300, 40
    im = Image.new('RGB', (int(width * k) + 2 * pad, k + 2 * pad), (30, 32, 36))
    d = ImageDraw.Draw(im)
    tr = lambda P: [(pad + x * k, pad + (1 - y) * k) for x, y in P]
    cols = [(0, 150, 214), (40, 48, 135), (225, 38, 28)]
    for i, p in enumerate(shapes['stripes']):
        d.polygon(tr(p), fill=cols[i])
    for key in ('M', '6'):
        polys = shapes[key]
        d.polygon(tr(polys[0]), fill=(205, 208, 212))
        for h in polys[1:]:
            d.polygon(tr(h), fill=(30, 32, 36))
    im.save(sys.argv[1])
    print('width', round(width, 3))
