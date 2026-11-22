"""
Build the M6 (E63) hero model for the Cycles stills and film from three Sketchfab sources (CC BY 4.0):

  elremo  "BMW 6 Series E63 Pre-LCI"            body, lamps, glass, interior, tyres, brakes (the best body)
  csmx    "BMW e63 m6 2010 rework (sort of)"     M6 parts: front bumper with the three intakes, rear bumper
                                                 with the diffuser and quad tips, M6 badges
  mona    m6-e63-v3-raw.glb (the site's model)   M6 wheels (Style 167 M double spoke)

  blender -b --factory-startup --python-exit-code 1 --python bl_build_m6.py -- \
      --elremo <scene.gltf> --csmx <scene.gltf> --mona <m6-e63-v3-raw.glb> --out <m6-e63-v4.blend> [--drop 0.03]

World: Blender z up, front = -y, car's left = +x, real scale (metres), wheels on z = 0, front axle at
y = -1.485, rear at y = +1.315 (the site's camera keys: three.js (x, y, z) = Blender (x, z, -y)).
Every part gets a role name (paint, chrome, glass, ...) and one material per role (bl_materials.py).
"""
import bpy, bmesh, sys, os, math, argparse
import numpy as np
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument('--elremo', required=True); ap.add_argument('--csmx', required=True); ap.add_argument('--mona', required=True)
ap.add_argument('--out', required=True)
ap.add_argument('--drop', type=float, default=0.03, help='lowering: the body comes down this far, the wheels stay')
ap.add_argument('--stage', type=int, default=99, help='debug: stop after this stage and save')
a = ap.parse_args(argv)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene


def log(*x):
    print('BUILD', *x, flush=True)


def coll(name):
    c = bpy.data.collections.new(name); sc.collection.children.link(c); return c


def import_flat(path, cname):
    """Import a glTF, bake every transform into the mesh, drop the empties; objects go to a new collection."""
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.abspath(path))
    bpy.context.view_layer.update()
    new = [o for o in bpy.data.objects if o not in before]
    c = coll(cname); out = []
    for o in new:
        if o.type != 'MESH':
            continue
        mw = o.matrix_world.copy()
        if o.data.users > 1:
            o.data = o.data.copy()
        o.parent = None; o.data.transform(mw); o.matrix_world = Matrix.Identity(4)
        for u in list(o.users_collection):
            u.objects.unlink(o)
        c.objects.link(o); out.append(o)
    for o in new:
        if o.type != 'MESH':
            bpy.data.objects.remove(o)
    log('imported', cname, len(out), 'meshes')
    return out


def alive(o):
    try:
        return o is not None and o.name in bpy.data.objects
    except ReferenceError:
        return False


def mat0(o):
    return o.data.materials[0].name if o.data.materials and o.data.materials[0] else ''


def join(objs, name):
    objs = [o for o in objs if alive(o)]
    if not objs:
        return None
    with bpy.context.temp_override(active_object=objs[0], selected_editable_objects=objs, selected_objects=objs):
        bpy.ops.object.join()
    o = objs[0]; o.name = name; o.data.name = name
    return o


def bvh(objs):
    bm = bmesh.new()
    for o in objs:
        bm.from_mesh(o.data)
    t = BVHTree.FromBMesh(bm); bm.free(); return t


def islands(bm):
    bm.faces.ensure_lookup_table(); seen = set(); out = []
    for f in bm.faces:
        if f.index in seen:
            continue
        stack = [f]; seen.add(f.index); comp = []
        while stack:
            g = stack.pop(); comp.append(g)
            for e in g.edges:
                for h in e.link_faces:
                    if h.index not in seen:
                        seen.add(h.index); stack.append(h)
        vs = {v for g in comp for v in g.verts}
        lo = Vector([min(v.co[i] for v in vs) for i in range(3)]); hi = Vector([max(v.co[i] for v in vs) for i in range(3)])
        out.append((comp, lo, hi))
    return out


def split_islands(o, rule, name):
    """Move the islands of o for which rule(lo, hi, faces) is true into a new object."""
    bm = bmesh.new(); bm.from_mesh(o.data)
    take = [f for comp, lo, hi in islands(bm) if rule(lo, hi, len(comp)) for f in comp]
    keep_idx = {f.index for f in take}
    bm2 = bmesh.new(); bm2.from_mesh(o.data); bm2.faces.ensure_lookup_table()
    bmesh.ops.delete(bm2, geom=[f for f in bm2.faces if f.index not in keep_idx], context='FACES')
    me = bpy.data.meshes.new(name); bm2.to_mesh(me); bm2.free()
    for m in o.data.materials:
        me.materials.append(m)
    bmesh.ops.delete(bm, geom=take, context='FACES'); bm.to_mesh(o.data); bm.free()
    n = bpy.data.objects.new(name, me); o.users_collection[0].objects.link(n)
    log('split', name, len(take), 'faces from', o.name)
    return n


# ---------------------------------------------------------------- 1. sources
E = import_flat(a.elremo, 'elremo')
C = import_flat(a.csmx, 'csmx')
M = import_flat(a.mona, 'mona')

# csmx onto elremo: rigid ICP on the shared body panels (doors, quarters, boot, wings): mean 7 mm
ICP = Matrix(((0.9999998519609824, 0.00038477411069292835, -0.00038474263569482825, 0.0032943827606504977),
              (-0.00038372498131602584, 0.9999962184613018, 0.002723199999844197, -0.06719097136878271),
              (0.0003857889976337985, -0.0027230519613435887, 0.9999962180702807, 0.11246644235235576),
              (0, 0, 0, 1)))
for o in C:
    o.data.transform(ICP)

if a.stage < 2:
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(a.out)); sys.exit(0)

# ---------------------------------------------------------------- 2. elremo body: cut out the 6 Series bumpers
def by_name(objs, *prefixes):
    return [o for o in objs if any(o.name.startswith(p) for p in prefixes)]

body = join(by_name(E, 'e63_body_Material #604'), 'paint_body')
E = [o for o in E if alive(o)]
old_front = split_islands(body, lambda lo, hi, n: hi.y < -1.69 and hi.z < 0.70, 'ref_front_bumper')
old_rear = split_islands(body, lambda lo, hi, n: lo.y > 1.50 and hi.z < 0.72, 'ref_rear_bumper')
# the roof panel: the big island plus the pieces the glTF export split off it (they stayed black paint, shards
# on the carbon): every island lying on top of the roof
roof = split_islands(body, lambda lo, hi, n: lo.z > 1.22 and -0.58 < lo.x and hi.x < 0.58 and lo.y > -0.3 and hi.y < 1.15, 'carbon_roof')
# the roof panel carries some flipped custom normals (black shards under the carbon's broad sheen): recomputed
bm = bmesh.new(); bm.from_mesh(roof.data); bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
for f in bm.faces:
    f.smooth = True
bm.to_mesh(roof.data); bm.free()
with bpy.context.temp_override(object=roof, active_object=roof, selected_objects=[roof], selected_editable_objects=[roof]):
    bpy.ops.mesh.customdata_custom_splitnormals_clear()
for o in (old_front, old_rear):
    o.hide_render = True; o.hide_viewport = True

# the 6 Series lower front (fog lamps, lower grille, skid plate) and rear (fog lamps, reflectors, exhaust)
drop_e = by_name(E, 'e63_fog', 'e63_lowgrill', 'e63_skidplate', 'e63_frontfoglightplastic', 'e63_frontcover',
                 'e63_LR_foglight', 'e63_RR_foglight', 'e63_R_foglight', 'e63_foglight_relieve', 'e63_exhaust')
# the 6 Series wheels (Style 101-like, chrome): the M6 wheels come from mona. Measure them first: centre,
# lip radius and outer face of each wheel, so the M6 rims sit exactly in the elremo tyres.
def quad(c):
    return ('L' if c.x > 0 else 'R') + ('F' if c.y < 0 else 'B')


def bbox(objs):
    pts = [v.co for o in objs for v in o.data.vertices]
    return (Vector([min(p[i] for p in pts) for i in range(3)]), Vector([max(p[i] for p in pts) for i in range(3)]))


old_rims = [o for o in E if mat0(o).startswith(('Material_744', 'Material_682'))]
WHEEL = {}
for o in old_rims:
    lo, hi = bbox([o]); WHEEL.setdefault(quad((lo + hi) / 2), []).append(o)
for q, objs in WHEEL.items():
    lo, hi = bbox(objs)
    WHEEL[q] = {'c': Vector((0, (lo.y + hi.y) / 2, (lo.z + hi.z) / 2)), 'r': (hi.z - lo.z) / 2,
                'face': hi.x if q[0] == 'L' else lo.x}
tyres = [o for o in E if mat0(o).startswith(('sidewall', 'tire'))]
for q in WHEEL:
    W = WHEEL[q]; rr = []
    for o in tyres:
        for v in o.data.vertices:
            if quad(v.co) == q and abs(v.co.x - W['face']) < 0.03:
                rr.append((Vector((0, v.co.y, v.co.z)) - W['c']).length)
    W['r_in'] = float(np.percentile(rr, 1)); W['r_out'] = max(rr)
    log('wheel', q, 'centre y %.4f z %.4f old rim r %.4f tyre r_in %.4f r_out %.4f face x %.4f' % (W['c'].y, W['c'].z, W['r'], W['r_in'], W['r_out'], W['face']))
drop_e += old_rims
for o in drop_e:
    log('drop elremo', o.name); bpy.data.objects.remove(o)
E = [o for o in E if alive(o)]

if a.stage < 3:
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(a.out)); sys.exit(0)

# ---------------------------------------------------------------- 3. csmx M6 parts onto the elremo body
# The donor bumpers are a few mm smaller than the elremo ones (the old bumper showed as a strip around them):
# each is scaled per axis onto the old bumper, using only its upper part (same shape on both cars: under the
# lamps, round the arches). Bending the whole surface onto the old bumper was tried and spoilt the M6 intakes.
def scale_fit(skin, parts, ref, zmin, steps=(0.03, 0.03, 0.015, 0.015, 0.008, 0.008, 0.008)):
    T = bvh([ref]); P = np.array([v.co[:] for v in skin.data.vertices]); sel = P[P[:, 2] > zmin]
    c = sel.mean(0); s = np.ones(3); t = np.zeros(3)
    for thr in steps:
        Q = (sel - c) * s + c + t; X = []; R = []
        for p, q in zip(sel, Q):
            loc, nrm, idx, d = T.find_nearest(Vector(q), thr)
            if loc is not None:
                X.append(p); R.append(loc[:])
        X = np.array(X) - c; R = np.array(R) - c
        for k in range(2):
            A = np.stack([X[:, k], np.ones(len(X))], 1); s[k], t[k] = np.linalg.lstsq(A, R[:, k], rcond=None)[0]
        t[2] = (R[:, 2] - X[:, 2]).mean()   # height: shift only (the band used is too low to scale from)
        res = np.linalg.norm((X * s + t) - R, axis=1)
        log('scale_fit', skin.name, 'pairs', len(X), 'scale', np.round(s, 4), 'shift', np.round(t, 4), 'res %.4f' % res.mean())
    for o in [skin] + parts:
        for v in o.data.vertices:
            v.co = Vector(((np.array(v.co[:]) - c) * s + c + t).tolist())


def cut_strips(objs, old, kept, zmin=0.45, far_old=0.010, near_kept=0.03):
    """Delete donor faces that lie away from the old bumper but next to a kept elremo panel or lamp: the game
    bumper wraps thin strips round the headlights and up to the bonnet edge, where elremo has its own wing,
    bonnet and lamp surfaces; they poke through as slivers."""
    To = bvh([old]); Tk = bvh(kept); n = 0
    for o in objs:
        bm = bmesh.new(); bm.from_mesh(o.data); kill = []
        for f in bm.faces:
            c = f.calc_center_median()
            if c.z < zmin:
                continue
            lo = To.find_nearest(c, far_old)
            lk = Tk.find_nearest(c, near_kept) if near_kept else (c,)
            if lo[0] is None and lk[0] is not None:
                kill.append(f)
        bmesh.ops.delete(bm, geom=kill, context='FACES'); bm.to_mesh(o.data); bm.free(); n += len(kill)
        log('cut_strips', o.name, len(kill), 'faces')


front_skin = join(by_name(C, 'bumperf_a_SUB0_body_paint'), 'paint_front_bumper')
front_parts = by_name(C, 'bumperf_a_SUB1', 'bumperf_a_SUB3', 'bumperf_a_SUB4', 'bumperf_a_SUB5', 'grille_a_SUB1',
                      'bumperfsidemarkers', 'glassbumperfsidemarkers', 'fenders_a_SUB3')
rear_skin = join(by_name(C, 'bumperr_a_SUB0_body_paint__0_body'), 'paint_rear_bumper')
rear_parts = by_name(C, 'bumperr_a_SUB0_body_paint__0_Material', 'bumperr_a_SUB1', 'bumperr_a_SUB2', 'bumperframer_a', 'hrom00')
front_parts = [o for o in front_parts if alive(o)]
scale_fit(front_skin, front_parts, old_front, 0.42)
scale_fit(rear_skin, rear_parts, old_rear, 0.45)
lamps = by_name(E, 'e63_headlights_cover', 'e63_body_Material #631', 'e63_kidneys', 'e63_brakelights_cover')
cut_strips([front_skin] + by_name(C, 'bumperf_a_SUB4', 'fenders_a_SUB3'), old_front, [body] + lamps)
# above the old bumper's top line nothing of the donor belongs (strips along the bonnet shut line)
cut_strips([front_skin] + by_name(C, 'bumperf_a_SUB4', 'fenders_a_SUB3'), old_front, [], zmin=0.60, far_old=0.008, near_kept=None)
cut_strips([rear_skin], old_rear, [body] + lamps, zmin=0.5)


def drop_crumbs(objs, max_faces=40, zmin=0.5):
    """The cuts leave a few jagged crumbs along the lamp edges: tiny islands high on the bumper go."""
    for o in objs:
        bm = bmesh.new(); bm.from_mesh(o.data)
        kill = [f for comp, lo, hi in islands(bm) if len(comp) <= max_faces and hi.z > zmin for f in comp]
        bmesh.ops.delete(bm, geom=kill, context='FACES'); bm.to_mesh(o.data); bm.free()
        log('crumbs', o.name, len(kill))


drop_crumbs([front_skin, rear_skin] + by_name(C, 'bumperf_a_SUB4', 'fenders_a_SUB3'))

if a.stage < 4:
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(a.out)); sys.exit(0)

# ---------------------------------------------------------------- 4. M6 wheels (mona) into the elremo tyres
# Scaled so the rim lip matches the old rim, lip flush with the old rim's outer face. The elremo centre caps
# (a real modelled roundel) move onto the M6 hub.
caps = [o for o in E if mat0(o).startswith(('Material_683', 'Material_684', 'Material_707', 'Material_720'))
        and abs(bbox([o])[0].x) > 0.7]
# The elremo tyres sit on ~22" rims (sidewall 6 cm); the M6 runs 19" (255/40, 285/35: ~9-10 cm). The tyre
# keeps its tread and outer radius, the sidewall is stretched down to a 19" bead (lettering included). The
# brakes, sized for the big rim, shrink about the axle so the caliper clears the 19" barrel.
R_IN, BRAKE_K = 0.2445, 0.82
brakes = [o for o in E if mat0(o).startswith(('Material_756', 'Material_646'))]
for q, W in WHEEL.items():
    for o in tyres:
        for v in o.data.vertices:
            if quad(v.co) != q:
                continue
            d = Vector((0, v.co.y, v.co.z)) - W['c']; r = d.length
            if r < W['r_out'] - 0.012 and r > 1e-6:
                r2 = R_IN + (r - W['r_in']) * (W['r_out'] - 0.012 - R_IN) / (W['r_out'] - 0.012 - W['r_in'])
                v.co = Vector((v.co.x, 0, 0)) + W['c'] + d * (r2 / r)
    for o in brakes:
        for v in o.data.vertices:
            if quad(v.co) == q:
                d = Vector((0, v.co.y, v.co.z)) - W['c']; v.co = Vector((v.co.x, 0, 0)) + W['c'] + d * BRAKE_K
log('tyres stretched to a 19" bead, brakes scaled', BRAKE_K)
rims = []
for o in M:
    n = o.name.split('.')[0]
    if not n.startswith(('rim_', 'rim_back_')):
        continue
    q = n[-2:].replace('B', 'B'); q = q[0] + ('F' if q[1] == 'F' else 'B')
    rims.append((q, o))
for q in ('LF', 'RF', 'LB', 'RB'):
    objs = [o for k, o in rims if k == q]
    main = [o for o in objs if not o.name.startswith('rim_back')]
    lo, hi = bbox(main)
    mc = Vector((hi.x if q[0] == 'L' else lo.x, (lo.y + hi.y) / 2, (lo.z + hi.z) / 2)); mr = (hi.z - lo.z) / 2
    W = WHEEL[q]; k = (R_IN + 0.004) / mr  # lip just over the stretched tyre's inner edge
    tgt = Vector((W['face'] - (0.001 if q[0] == 'L' else -0.001), W['c'].y, W['c'].z))
    for o in objs:
        for v in o.data.vertices:
            v.co = (v.co - mc) * k + tgt
    # hub face: the outermost rim vertex near the axis
    hub = [v.co for o in main for v in o.data.vertices if (Vector((0, v.co.y, v.co.z)) - Vector((0, tgt.y, tgt.z))).length < 0.04]
    hub_x = max(p.x for p in hub) if q[0] == 'L' else min(p.x for p in hub)
    mine = [o for o in caps if quad((bbox([o])[0] + bbox([o])[1]) / 2) == q]
    if mine:
        clo, chi = bbox(mine); cap_x = chi.x if q[0] == 'L' else clo.x
        dx = hub_x - cap_x + (0.002 if q[0] == 'L' else -0.002)
        for o in mine:
            for v in o.data.vertices:
                v.co.x += dx
    log('rim', q, 'scale %.4f' % k, 'hub x %.4f' % hub_x, 'caps', len(mine))
    for o in objs:
        o.name = 'rim_' + q + ('_back' if 'back' in o.name else '')

# ---------------------------------------------------------------- 5. badges: M6 on the boot, M on the gills
def onto(o, surf, lift=0.0006):
    """Press a flat badge onto a body surface (each vertex to its nearest point, lifted along the normal)."""
    for v in o.data.vertices:
        loc, nrm, idx, d = surf.find_nearest(v.co)
        if loc is not None:
            v.co = loc + nrm * lift


body_t = bvh([body])
for o in [o for o in C if alive(o) and mat0(o).startswith('Badges')]:
    lo, hi = bbox([o]); c = (lo + hi) / 2
    if c.y > 2.0:                                  # boot lid, right-hand side
        onto(o, body_t); o.name = 'badge_m6_boot'
    else:                                           # on the gill: just behind the elremo indicator blade
        onto(o, body_t); o.name = 'badge_m_gill_' + ('L' if c.x > 0 else 'R')
    log('badge', o.name, tuple(round(x, 3) for x in c))

if a.stage < 6:
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(a.out)); sys.exit(0)

# ---------------------------------------------------------------- 6. roles, materials, lowering, wheels that spin
import bl_materials

E_TABLE = {'Material_604': 'paint', 'reflector': 'reflector', 'sidewall': 'tyre', 'tire': 'tyre', 'Material_756': 'caliper',
           'Material_631': 'plastic', 'Material_648': 'lamp_inner', 'Material_661': 'interior', 'Material_646': 'disc',
           'Material_684': 'chrome', 'Material_1010': 'amber', 'Material_660': 'glass', 'Material_589': 'trim_gloss',
           'Material_647': 'lamp_glass', 'Material_662': 'frit', 'Material_976': 'lamp_red', 'Material_1011': 'lamp_glass',
           'Material_644': 'lamp_glass', 'Material_683': 'badge_black', 'Material_707': 'badge_blue',
           'Material_720': 'badge_white', 'Material_1123': 'bulb'}


def role_e(o):
    n, m = o.name, mat0(o).split('.')[0]
    if n.startswith('e63_angeleyes'):
        return 'angel'
    if n.startswith(('e63_lightstrip_glass', 'e63_brakestripinterior')):
        return 'tail_glow'
    if n.startswith(('e63_side_mirrors_reflector', 'e63_mirror_')):
        return 'mirror'
    if n.startswith('e63_kidneys'):
        return 'kidney'
    if n.startswith('e63_body_Material #631'):     # inside the headlights: a silver housing on the real car
        return 'housing'
    if n == 'carbon_roof':
        return 'carbon'
    if n == 'paint_body':
        return 'paint'
    return E_TABLE.get(m)


def role_c(o):
    n = o.name
    if n.startswith(('paint_front_bumper', 'paint_rear_bumper')):
        return 'paint'
    if n.startswith('badge_'):
        return 'badge_tex'
    if n.startswith(('bumperf_a_SUB1', 'bumperf_a_SUB3', 'bumperf_a_SUB4', 'fenders_a_SUB3', 'bumperr_a_SUB1',
                     'bumperr_a_SUB2', 'bumperframer_a')):
        return 'plastic'
    if n.startswith('bumperf_a_SUB5'):
        return 'underbody'
    if n.startswith('grille_a_SUB1'):
        return 'grille'
    if n.startswith('bumperfsidemarkers'):
        return 'chrome'
    if n.startswith('glassbumperfsidemarkers_a_SUB1'):
        return 'amber'
    if n.startswith('glassbumperfsidemarkers_a_SUB0'):
        return 'lamp_glass'
    if n.startswith('bumperr_a_SUB0_body_paint__0_Material'):
        return 'lamp_red'
    if n.startswith('hrom00'):
        return 'exhaust'
    return None


ROLE = {}
for o in list(bpy.data.objects):
    if o.type != 'MESH':
        continue
    cn = o.users_collection[0].name
    r = role_e(o) if cn == 'elremo' else role_c(o) if cn == 'csmx' else ('rim' if o.name.startswith('rim_') else None)
    if o.name.startswith('ref_') or r is None:
        bpy.data.objects.remove(o); continue
    ROLE[o.name] = r

# the role materials are made after the roles are read (a source material may share a role's name)
badge_img = next((i for i in bpy.data.images if i.name.lower().startswith('badges')), None)
MAT = bl_materials.build(badge_img)

# kidneys: chrome surrounds, black slats (M6; the 6 Series had chrome slats)
for o in [o for o in bpy.data.objects if ROLE.get(o.name) == 'kidney']:
    o.data.materials.clear(); o.data.materials.append(MAT['chrome']); o.data.materials.append(MAT['grille'])
    bm = bmesh.new(); bm.from_mesh(o.data)
    for comp, lo, hi in islands(bm):
        for f in comp:
            f.material_index = 0 if (hi.x - lo.x) > 0.12 else 1
    bm.to_mesh(o.data); bm.free(); ROLE[o.name] = 'chrome'
for o in bpy.data.objects:
    r = ROLE.get(o.name)
    if r and o.name not in [k.name for k in bpy.data.objects if k.name.startswith('e63_kidneys')]:
        o.data.materials.clear(); o.data.materials.append(MAT[r])

# carbon roof: top-down UV in metres for the weave
roof = bpy.data.objects['carbon_roof']
uvl = roof.data.uv_layers.new(name='carbon')
for li, loop in enumerate(roof.data.loops):
    co = roof.data.vertices[loop.vertex_index].co; uvl.data[li].uv = (co.x, co.y)

# lowering: everything but the wheels and brakes comes down
WHEEL_ROLES = ('tyre', 'rim', 'disc', 'caliper')
spin = {}
for q, W in WHEEL.items():
    e = bpy.data.objects.new('spin_' + q, None); sc.collection.objects.link(e)
    e.location = Vector((W['face'], W['c'].y, W['c'].z)); e.empty_display_size = 0.35; spin[q] = e
bpy.context.view_layer.update()
for o in list(bpy.data.objects):
    if o.type != 'MESH':
        continue
    r = ROLE.get(o.name); lo, hi = bbox([o]); c = (lo + hi) / 2
    wheel_cap = r in ('badge_black', 'badge_white', 'badge_blue', 'chrome') and abs(c.x) > 0.7 and abs(abs(c.y) - 1.4) < 0.2 and c.z < 0.45
    if r in WHEEL_ROLES or wheel_cap:
        if r != 'caliper':                               # calipers stay put, the rest turns
            q = quad(c); o.parent = spin[q]; o.matrix_parent_inverse = spin[q].matrix_world.inverted()
        continue
    for v in o.data.vertices:
        v.co.z -= a.drop

# join the static body by role (fewer objects, one material each); wheels stay per corner
groups = {}
for o in list(bpy.data.objects):
    if o.type == 'MESH' and o.parent is None and ROLE.get(o.name) not in ('caliper',) and o.name != 'carbon_roof':
        groups.setdefault(ROLE[o.name], []).append(o)
for r, objs in groups.items():
    log('join', r, len(objs), sum(len(o.data.polygons) for o in objs))
    j = join(objs, r)
    for u in list(j.users_collection):
        u.objects.unlink(j)
    sc.collection.objects.link(j)
for o in list(bpy.data.objects):
    if o.users_collection and o.users_collection[0] != sc.collection:
        for u in list(o.users_collection):
            u.objects.unlink(o)
        sc.collection.objects.link(o)
for c in list(bpy.data.collections):
    bpy.data.collections.remove(c)
car = bpy.data.objects.new('M6_E63', None); sc.collection.objects.link(car)
bpy.context.view_layer.update()
for o in sc.collection.objects:
    if o is not car and o.parent is None:
        o.parent = car; o.matrix_parent_inverse = car.matrix_world.inverted()
bpy.ops.outliner.orphans_purge(do_recursive=True)
n = sum(len(o.data.polygons) for o in bpy.data.objects if o.type == 'MESH')
log('saved', len(bpy.data.objects), 'objects', n, 'faces, lowered', a.drop)
bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(a.out))
