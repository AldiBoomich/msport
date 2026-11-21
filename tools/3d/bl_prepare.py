"""Prepare the Mona x Supercars E63 M6 for the web.
usage: blender -b --factory-startup --python bl_prepare.py -- in.glb out.glb SUBDIV_BODY SUBDIV_WHEELS
       (v3 model: `... -- model.glb prep.glb 1 1`, then bl_bake_ao.py, then gltf-transform, see docs/STATUS.md)

v3 (2026-11-18): the body keeps its design lines. Folds that are much sharper than the surface around them
and run on for 12 cm or more (shoulder line, bonnet ridges, bumper and sill edges, lamp surrounds) are
creased before the subdivision; the facets of the coarse curves are not, so the subdivision rounds only them.
Panels are faired (Taubin) with the lines pinned, which irons out the lumps of the SketchUp mesh.
The grille slats get their own material. Env switches: FEAT_MIN, FEAT_HARD, FEAT_RATIO, FEAT_R, LINE_MIN,
CREASE_MAX, SMOOTH_ANGLE, FAIR, FAIR_POST, FEATURE_ROLES, GRILLE=0, DEBUG_CREASE=1 (design lines in red,
for the viewer's mode=clay&vc=1). LEGACY=1 rebuilds the old v1/v2 body (creases only above 55°, all rounded).
"""
import bpy, bmesh, sys, math
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
SRC, DST = argv[0], argv[1]
SUB_BODY = int(argv[2]) if len(argv) > 2 else 1
SUB_WHEEL = int(argv[3]) if len(argv) > 3 else 1

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)

# material name -> role
ROLE = {
    'material_13': 'paint', 'material': 'trim_black', 'M6_plast': 'plastic', 'bajo': 'underbody',
    'M6_rin': 'rim', 'llanta': 'tyre', 'disk': 'brake_disc', 'M6_int': 'interior',
    'vidrios': 'glass', 'M6_luz': 'lights', 'M6_luz2': 'lights_glass', 'cromo': 'chrome',
}

# 1. delete edge-line objects (no faces)
for o in list(bpy.data.objects):
    if o.type == 'MESH' and len(o.data.polygons) == 0:
        bpy.data.objects.remove(o, do_unlink=True)

meshes = [o for o in bpy.data.objects if o.type == 'MESH']

# 2. bake transforms into the meshes, unparent, scale inches -> metres
bpy.ops.object.select_all(action='DESELECT')
for o in meshes:
    o.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
for o in list(bpy.data.objects):
    if o.type != 'MESH':
        bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
INCH = 0.0254
for o in meshes:
    o.data.transform(__import__('mathutils').Matrix.Scale(INCH, 4))
    o.data.update()

def role_of(o):
    m = o.data.materials[0] if o.data.materials else None
    return ROLE.get(m.name, m.name if m else 'none')

for o in meshes:
    r = role_of(o)
    o.name = o.data.name = r
    if o.data.materials and o.data.materials[0]:
        o.data.materials[0].name = r

# 3a. remove SketchUp "back faces": coincident faces with opposite normals; keep the one facing outward
from mathutils.kdtree import KDTree
allc = [v.co for o in meshes for v in o.data.vertices]
CAR_C = Vector((sum(v.x for v in allc) / len(allc), sum(v.y for v in allc) / len(allc), 0.55))
faces = []
for oi, o in enumerate(meshes):
    for p in o.data.polygons:
        faces.append((oi, p.index, p.center.copy(), p.normal.copy(), p.area))
kd = KDTree(len(faces))
for i, f in enumerate(faces):
    kd.insert(f[2], i)
kd.balance()
# BVH of the whole car to test which side of a double face is open to the outside
from mathutils.bvhtree import BVHTree
allverts, allpolys, off = [], [], 0
for o in meshes:
    allverts += [v.co.copy() for v in o.data.vertices]
    allpolys += [[i + off for i in p.vertices] for p in o.data.polygons]
    off += len(o.data.vertices)
bvh = BVHTree.FromPolygons(allverts, allpolys, all_triangles=False, epsilon=0.0)
DIRS = None

def openness(c, n):
    """Average free distance of rays cast into the hemisphere around the normal (capped at 3 m)."""
    tot = 0.0
    t1 = n.orthogonal().normalized(); t2 = n.cross(t1)
    for a, b in ((0, 0), (0.5, 0), (-0.5, 0), (0, 0.5), (0, -0.5)):
        d = (n + t1 * a + t2 * b).normalized()
        hit = bvh.ray_cast(c + n * 0.0015, d, 3.0)
        tot += hit[3] if hit[0] is not None else 3.0
    return tot

kill = set()      # confident back faces: deleted
keep_back = set() # unsure: moved to a separate un-welded "<role>_back" object, both sides stay
for i, (oi, pi, c, n, a) in enumerate(faces):
    if i in kill or i in keep_back:
        continue
    for co, j, dist in kd.find_range(c, 0.0008):
        if j == i or j in kill or j in keep_back:
            continue
        oj, pj, cj, nj, aj = faces[j]
        if n.dot(nj) < -0.95 and abs(a - aj) < max(a, aj) * 0.2 + 1e-9:
            oi_open = openness(c, n); oj_open = openness(cj, nj)
            loser = j if oi_open >= oj_open else i
            hi, lo = max(oi_open, oj_open), min(oi_open, oj_open)
            confident = hi >= 10.0 and lo <= 3.0  # winner sees mostly open sky, loser is enclosed
            (kill if confident else keep_back).add(loser)
            if loser == i:
                break

backs = []
# collect both index lists first (indices refer to the original meshes), then apply in one pass per object
both = {}
for k in kill:
    both.setdefault(faces[k][0], [[], []])[0].append(faces[k][1])
for k in keep_back:
    both.setdefault(faces[k][0], [[], []])[1].append(faces[k][1])
for oi, (dele, mov) in both.items():
    o = meshes[oi]
    if mov:
        nb = o.copy(); nb.data = o.data.copy(); nb.name = nb.data.name = o.name + '_back'
        bpy.context.scene.collection.objects.link(nb)
        ms = set(mov)
        bm = bmesh.new(); bm.from_mesh(nb.data); bm.faces.ensure_lookup_table()
        bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.index not in ms], context='FACES')
        bm.to_mesh(nb.data); bm.free()
        backs.append(nb)
    rm = set(dele) | set(mov)
    bm = bmesh.new(); bm.from_mesh(o.data); bm.faces.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.index in rm], context='FACES')
    bm.to_mesh(o.data); bm.free()
print('BACKFACES deleted', len(kill), 'kept as _back', len(keep_back))
meshes = [o for o in meshes if len(o.data.polygons) > 0 or bpy.data.objects.remove(o, do_unlink=True)]

# 3b. weld + clean every mesh
for o in meshes:
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0004)
    bmesh.ops.dissolve_degenerate(bm, edges=bm.edges, dist=0.00005)
    bm.to_mesh(o.data); bm.free()

import os
FEAT_MIN = float(os.environ.get('FEAT_MIN', 7))     # deg: folds below this are always smooth
FEAT_HARD = float(os.environ.get('FEAT_HARD', 40))  # deg: folds above this are always sharp
FEAT_RATIO = float(os.environ.get('FEAT_RATIO', 1.9))  # fold / neighbourhood ratio that makes a design line
FEAT_R = float(os.environ.get('FEAT_R', 0.035))
LINE_MIN = float(os.environ.get('LINE_MIN', 0.12))  # m: shortest design line     # m: neighbourhood radius
CREASE_MAX = float(os.environ.get('CREASE_MAX', 1.0))
SMOOTH_ANGLE = float(os.environ.get('SMOOTH_ANGLE', 30))
from mathutils.kdtree import KDTree as _KD

def smoothstep(a, b, x):
    t = min(max((x - a) / (b - a), 0.0), 1.0)
    return t * t * (3 - 2 * t)

def crease_features(o):
    """Crease the body's design lines, not the facets of its curves.
    A design line is a fold that is much sharper than the surface around it (the shoulder line, bonnet
    ridges, bumper and sill edges). The facets of a coarse curve (arches, bumper corners, the roof) fold
    by about the same angle as all their neighbours, so the subdivision is free to round them.
    Returns the number of creased edges."""
    bm = bmesh.new(); bm.from_mesh(o.data); bm.edges.ensure_lookup_table()
    cl = bm.edges.layers.float.get('crease_edge') or bm.edges.layers.float.new('crease_edge')
    ang, mid, dirv = {}, {}, {}
    for e in bm.edges:
        v0, v1 = e.verts[0].co, e.verts[1].co
        mid[e.index] = (v0 + v1) / 2
        d = v1 - v0
        dirv[e.index] = d.normalized() if d.length > 1e-9 else d
        ang[e.index] = math.degrees(e.calc_face_angle(0)) if len(e.link_faces) == 2 else None
    kd = _KD(len(bm.edges))
    for e in bm.edges: kd.insert(mid[e.index], e.index)
    kd.balance()
    n = 0
    for e in bm.edges:
        a = ang[e.index]
        if a is None:            # open border (shut line, panel edge): keep its shape
            e[cl] = 1.0; n += 1; continue
        if a < FEAT_MIN:
            e[cl] = 0.0; continue
        if a >= FEAT_HARD:
            e[cl] = CREASE_MAX; n += 1; continue
        m, d = mid[e.index], dirv[e.index]
        acc, cnt = 0.0, 0
        for co, j, dist in kd.find_range(m, FEAT_R):
            if j == e.index or ang[j] is None: continue
            off = co - m
            # skip edges of the same line (collinear with this one)
            perp = (off - d * off.dot(d)).length
            if perp < 0.006 and abs(dirv[j].dot(d)) > 0.7: continue
            acc += ang[j]; cnt += 1
        ref = acc / cnt if cnt else 0.0
        ratio = a / max(ref, 1.0)
        w = smoothstep(FEAT_RATIO - 0.4, FEAT_RATIO + 0.6, ratio) * smoothstep(FEAT_MIN, FEAT_MIN + 8, a)
        w = max(w, smoothstep(FEAT_HARD - 12, FEAT_HARD, a))
        e[cl] = w * CREASE_MAX
        if w > 0.5: n += 1
    # a design line is long: drop short fragments (triangulation noise on curved panels). Creased edges
    # are chained through shared vertices where the line runs on (directions within ~45 deg); chains
    # shorter than LINE_MIN lose their crease, except hard folds and open borders.
    soft = [e for e in bm.edges if ang[e.index] is not None and ang[e.index] < FEAT_HARD and e[cl] >= 0.5 * CREASE_MAX]
    line = set(e.index for e in bm.edges if e[cl] >= 0.5 * CREASE_MAX or ang[e.index] is None)
    seen, dropped = set(), 0
    for e0 in soft:
        if e0.index in seen: continue
        comp, stack, length = [], [e0], 0.0
        seen.add(e0.index)
        while stack:
            e = stack.pop(); comp.append(e); length += e.calc_length()
            for v in e.verts:
                for e2 in v.link_edges:
                    if e2.index in seen or e2.index not in line: continue
                    if abs(dirv[e2.index].dot(dirv[e.index])) < 0.7: continue
                    seen.add(e2.index); stack.append(e2)
        if length < LINE_MIN:
            for e in comp:
                if ang[e.index] is not None and ang[e.index] < FEAT_HARD:
                    e[cl] = 0.0; dropped += 1
    print('LINES dropped', dropped, 'short creased edges')
    bm.to_mesh(o.data); bm.free()
    return n

def crease_sharp(o, angle_deg):
    bm = bmesh.new(); bm.from_mesh(o.data)
    cl = bm.edges.layers.float.get('crease_edge') or bm.edges.layers.float.new('crease_edge')
    lim = math.radians(angle_deg)
    for e in bm.edges:
        if len(e.link_faces) != 2:
            e[cl] = 1.0
        elif e.calc_face_angle(0) > lim:
            e[cl] = 1.0
    bm.to_mesh(o.data); bm.free()

FAIR_ITERS = int(os.environ.get('FAIR', 8))
FAIR_POST = int(os.environ.get('FAIR_POST', 4))

def fair(o, iters, pin=0.5, lam=0.5, mu=-0.53):
    """Taubin smoothing (no shrinkage) that irons the lumps out of the panels but keeps the design lines.
    Vertices inside a panel move towards their neighbours. Vertices on a design line (crease >= pin) or an
    open border only move along that line, so the line straightens but stays where it is and stays sharp.
    Corners (where lines meet or end) stay put."""
    if iters <= 0:
        return
    bm = bmesh.new(); bm.from_mesh(o.data); bm.verts.ensure_lookup_table()
    cl = bm.edges.layers.float.get('crease_edge')
    feat = lambda e: len(e.link_faces) != 2 or (cl is not None and e[cl] >= pin)
    nb = []
    for v in bm.verts:
        fe = [e for e in v.link_edges if feat(e)]
        if not fe:
            nb.append([e.other_vert(v).index for e in v.link_edges])
        elif len(fe) == 2:
            nb.append([e.other_vert(v).index for e in fe])
        else:
            nb.append([])
    co = [v.co.copy() for v in bm.verts]
    for it in range(iters * 2):
        k = lam if it % 2 == 0 else mu
        new = co[:]
        for i, ns in enumerate(nb):
            if ns:
                avg = sum((co[j] for j in ns), Vector()) / len(ns)
                new[i] = co[i] + (avg - co[i]) * k
        co = new
    for v, c in zip(bm.verts, co):
        v.co = c
    bm.to_mesh(o.data); bm.free()

def subdivide(o, levels, crease_angle, features=False):
    if levels <= 0:
        return
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.tris_convert_to_quads(face_threshold=math.radians(40), shape_threshold=math.radians(40))
    bpy.ops.object.mode_set(mode='OBJECT')
    if features:
        print('FEATURES', o.name, crease_features(o))
        fair(o, FAIR_ITERS)
    else:
        crease_sharp(o, crease_angle)
    mod = o.modifiers.new('sub', 'SUBSURF')
    mod.levels = mod.render_levels = levels
    mod.quality = 3
    mod.boundary_smooth = 'PRESERVE_CORNERS'
    mod.use_creases = True
    bpy.ops.object.modifier_apply(modifier=mod.name)
    if features:
        cl = o.data.attributes.get('crease_edge')
        print('CREASE AFTER SUBSURF', o.name, None if cl is None else sum(1 for d in cl.data if d.value >= 0.5), len(o.data.edges))
        fair(o, FAIR_POST)
        if os.environ.get('DEBUG_CREASE'):
            # red = vertices on a design line, for the viewer's vc=1 clay mode
            ca = o.data.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
            red = set()
            for e, d in zip(o.data.edges, o.data.attributes['crease_edge'].data):
                if d.value >= 0.5: red.update(e.vertices)
            for i, c in enumerate(ca.data):
                c.color = (0.9, 0.05, 0.03, 1) if i in red else (0.7, 0.7, 0.7, 1)
            o.data.color_attributes.active_color = ca

def smooth_normals(o, angle):
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True)
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(angle), keep_sharp_edges=False)
    wn = o.modifiers.new('wn', 'WEIGHTED_NORMAL'); wn.keep_sharp = True; wn.weight = 50
    bpy.ops.object.modifier_apply(modifier=wn.name)

LEGACY = bool(os.environ.get('LEGACY'))
FEATURE_ROLES = set() if LEGACY else set(os.environ.get('FEATURE_ROLES', 'paint,trim_black,underbody').split(','))
SUB = {'paint': SUB_BODY, 'trim_black': SUB_BODY, 'underbody': SUB_BODY, 'plastic': 0,
       'tyre': SUB_WHEEL, 'rim': SUB_WHEEL, 'brake_disc': 0}
CREASE = {'paint': 55, 'trim_black': 50, 'underbody': 50, 'tyre': 60, 'rim': 45}
for o in meshes:
    r = o.name
    feat = r in FEATURE_ROLES
    subdivide(o, SUB.get(r, 0), CREASE.get(r, 50), features=feat)
    smooth_normals(o, SMOOTH_ANGLE if feat else (40 if r in ('paint', 'tyre', 'rim', 'trim_black', 'underbody') else 35))

# 4. split wheel parts into 4 wheels, each with its own pivot (axle centre)
wheel_parts = [o for o in bpy.data.objects if o.type == 'MESH' and o.name.replace('_back', '') in ('rim', 'tyre', 'brake_disc')]
tyre = next(o for o in meshes if o.name == 'tyre')

def world_center(obj, polys):
    vs = [obj.data.vertices[i].co for p in polys for i in p.vertices]
    return sum(vs, Vector()) / len(vs)

# wheel centres from tyre loose parts
bpy.context.view_layer.objects.active = tyre
bpy.ops.object.select_all(action='DESELECT'); tyre.select_set(True)
bb = [tyre.matrix_world @ Vector(c) for c in tyre.bound_box]
cx = sum(v.x for v in bb) / 8; cz = sum(v.z for v in bb) / 8  # glTF import: Y up? Blender is Z up after import
# Blender import converts glTF Y-up to Z-up: length axis is Y, width X, height Z
cy = sum(v.y for v in bb) / 8

def quadrant(v):
    return ('L' if v.x > cx else 'R') + ('F' if v.y < cy else 'B')

wheels = {}
for part in wheel_parts:
    bpy.ops.object.select_all(action='DESELECT'); part.select_set(True)
    bpy.context.view_layer.objects.active = part
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.separate(type='LOOSE'); bpy.ops.object.mode_set(mode='OBJECT')
    pieces = [o for o in bpy.context.selected_objects]
    base = part.name.split('.')[0]
    for pc in pieces:
        c = pc.matrix_world @ (sum((Vector(b) for b in pc.bound_box), Vector()) / 8)
        q = quadrant(c)
        wheels.setdefault(q, {}).setdefault(base, []).append(pc)

# join pieces per wheel & part, then parent to an empty at the axle centre
for q, parts in wheels.items():
    tyres = parts.get('tyre', [])
    allv = [pc.matrix_world @ v.co for pc in tyres for v in pc.data.vertices]
    if not allv:
        continue
    mn = Vector((min(v.x for v in allv), min(v.y for v in allv), min(v.z for v in allv)))
    mx = Vector((max(v.x for v in allv), max(v.y for v in allv), max(v.z for v in allv)))
    centre = (mn + mx) / 2
    emp = bpy.data.objects.new(f'wheel_{q}', None); bpy.context.scene.collection.objects.link(emp)
    emp.location = centre
    for base, pcs in parts.items():
        bpy.ops.object.select_all(action='DESELECT')
        for pc in pcs:
            pc.select_set(True)
        bpy.context.view_layer.objects.active = pcs[0]
        if len(pcs) > 1:
            bpy.ops.object.join()
        ob = bpy.context.view_layer.objects.active
        ob.name = f'{base}_{q}'
        ob.data.transform(__import__('mathutils').Matrix.Translation(-centre))
        ob.location = Vector((0, 0, 0))
        ob.parent = emp
    print('WHEEL', q, tuple(round(v, 3) for v in centre), {k: len(v) for k, v in parts.items()})

# 5. car root, centred on the ground
car = bpy.data.objects.new('m6_e63', None); bpy.context.scene.collection.objects.link(car)
objs = [o for o in bpy.data.objects if o.type == 'MESH']
allw = [o.matrix_world @ Vector(c) for o in objs for c in o.bound_box]
mn = Vector((min(v.x for v in allw), min(v.y for v in allw), min(v.z for v in allw)))
mx = Vector((max(v.x for v in allw), max(v.y for v in allw), max(v.z for v in allw)))
off = Vector(((mn.x + mx.x) / 2, (mn.y + mx.y) / 2, mn.z))
for o in bpy.data.objects:
    if o is car or o.parent is not None:
        continue
    o.location -= off
    o.parent = car
print('SIZE', tuple(round(v, 3) for v in (mx - mn)))

# 6. kidney grille: the slats are chrome parts in this model; split them into their own `grille` material
# (dark slats inside a chrome surround, as on the reference photos). Slats: narrow vertical loose parts at
# the nose, 5-37 cm off the centre line (the surround and the badge stay chrome).
def split_grille():
    ch = next((o for o in bpy.data.objects if o.type == 'MESH' and o.name == 'chrome'), None)
    if ch is None:
        return
    front = max(-(ch.matrix_world @ v.co).y for v in ch.data.vertices)  # glTF +z (front) = Blender -y
    bm = bmesh.new(); bm.from_mesh(ch.data); bm.faces.ensure_lookup_table()
    mw = ch.matrix_world
    seen, slat_faces = set(), []
    for f in bm.faces:
        if f.index in seen: continue
        comp, st = [], [f]; seen.add(f.index)
        while st:
            g = st.pop(); comp.append(g)
            for e in g.edges:
                for h in e.link_faces:
                    if h.index not in seen: seen.add(h.index); st.append(h)
        cs = [mw @ v.co for g in comp for v in g.verts]
        xs = [c.x for c in cs]; zs = [c.z for c in cs]; fz = [-c.y for c in cs]
        w, h, cx = max(xs) - min(xs), max(zs) - min(zs), abs(sum(xs) / len(xs))
        if max(fz) > front - 0.2 and w < 0.035 and 0.08 < h < 0.2 and 0.05 < cx < 0.37:
            slat_faces += [g.index for g in comp]
    bm.free()
    if not slat_faces:
        return
    bpy.ops.object.select_all(action='DESELECT'); ch.select_set(True); bpy.context.view_layer.objects.active = ch
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='DESELECT'); bpy.ops.object.mode_set(mode='OBJECT')
    for i in slat_faces: ch.data.polygons[i].select = True
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.separate(type='SELECTED'); bpy.ops.object.mode_set(mode='OBJECT')
    gr = next(o for o in bpy.context.selected_objects if o is not ch)
    gr.name = gr.data.name = 'grille'
    m = ch.data.materials[0].copy(); m.name = 'grille'; gr.data.materials[0] = m
    # its own values, or gltf-transform dedup merges it back into the chrome
    bsdf = next((nd for nd in (m.node_tree.nodes if m.use_nodes else []) if nd.type == 'BSDF_PRINCIPLED'), None)
    if bsdf:
        bsdf.inputs['Base Color'].default_value = (0.02, 0.02, 0.022, 1)
        bsdf.inputs['Roughness'].default_value = 0.4
        bsdf.inputs['Metallic'].default_value = 0.2
    print('GRILLE slats', len(slat_faces), 'faces')

if not LEGACY and os.environ.get('GRILLE', '1') != '0':
    split_grille()

tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in bpy.data.objects if o.type == 'MESH')
print('TRIS', tris)
for o in bpy.data.objects:
    if o.type == 'MESH':
        print('MESH', o.name, sum(len(p.vertices) - 2 for p in o.data.polygons))

bpy.ops.export_scene.gltf(filepath=DST, export_format='GLB', export_yup=True, export_apply=True,
                          export_texcoords=True, export_normals=True, export_materials='EXPORT',
                          export_image_format='AUTO', export_extras=False,
                          **({'export_vertex_color': 'ACTIVE'} if os.environ.get('DEBUG_CREASE') else {}))
print('DONE', DST)
