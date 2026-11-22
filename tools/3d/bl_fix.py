"""
Mesh repairs that a path tracer needs and the site's rasteriser hides (shared by bl_compare.py and the model prep).

- buried_faces(): faces of one part lying on or just under another part's surface (Mona's black trim runs
  under the paint along the sides). three.js draws the paint in front by depth and nothing shows; Cycles hits
  the trim where it pokes through by a fraction of a millimetre: black blotches. They are removed.
- lift_back_layers(): bl_prepare.py keeps doubled panels as *_back objects; lifted 0.5 mm so the two layers
  never coincide (a ray would skip both).
"""
import bpy, bmesh
from mathutils.bvhtree import BVHTree


def role(o):
    """'trim_black_back.003' -> 'trim_black'; 'rim_LF' -> 'rim'."""
    n = o.name.split('.')[0].replace('_back', '')
    for suf in ('_LF', '_RF', '_LB', '_RB'):
        if n.endswith(suf):
            n = n[: -len(suf)]
    return n


def buried_faces(objs, cover=('paint',), parts=('trim_black', 'plastic', 'underbody', 'chrome'), tol=0.004, corner_tol=0.012, dot=0.8):
    """Delete faces of `parts` lying on a `cover` surface: the centre within `tol` metres of it (either side)
    with a near-parallel normal, every corner within `corner_tol` (big faces on a curved panel drift off at the
    corners). Measured on Mona's model: the doubled trim sheets sit at -2…+2 mm from the paint, ~2 m² in all;
    real trim parts stand off the paint or meet it at an angle. Returns the number of faces removed."""
    dg = bpy.context.evaluated_depsgraph_get()
    covers = [o for o in objs if role(o) in cover]
    trees = []
    for o in covers:
        bm = bmesh.new(); bm.from_mesh(o.data); bm.transform(o.matrix_world)
        trees.append(BVHTree.FromBMesh(bm)); bm.free()
    removed = 0
    for o in objs:
        if role(o) not in parts:
            continue
        bm = bmesh.new(); bm.from_mesh(o.data); bm.faces.ensure_lookup_table(); bm.normal_update()
        mw = o.matrix_world; nm = mw.to_3x3().inverted().transposed()
        kill = []
        for f in bm.faces:
            n = (nm @ f.normal).normalized()
            pts = [mw @ f.calc_center_median()] + [mw @ v.co for v in f.verts]
            ok = True
            for k, p in enumerate(pts):
                best = None
                for t in trees:
                    loc, nrm, idx, d = t.find_nearest(p, tol if k == 0 else corner_tol)
                    if loc is not None and (best is None or d < best[1]):
                        best = (nrm, d)
                if best is None or (k == 0 and abs(n.dot(best[0])) < dot):
                    ok = False
                    break
            if ok:
                kill.append(f)
        if kill:
            bmesh.ops.delete(bm, geom=kill, context='FACES')
            bm.to_mesh(o.data); removed += len(kill)
            print('BURIED', o.name, len(kill), 'faces removed')
        bm.free()
    return removed


def lift_back_layers(objs, dist=0.0005):
    for o in objs:
        if '_back' in o.name:
            bm = bmesh.new(); bm.from_mesh(o.data); bm.normal_update()
            k = dist / max(1e-6, o.matrix_world.to_scale().x)
            for v in bm.verts:
                v.co += v.normal * k
            bm.to_mesh(o.data); bm.free()
