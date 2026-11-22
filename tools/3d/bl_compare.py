"""
Render the car from the camera of each reference photo (Cycles, daylight HDRI, transparent film with a
shadow catcher), so the render can be laid over the photo (tools/3d/compare_sheet.py).

  blender -b --factory-startup --python-exit-code 1 --python bl_compare.py -- \
      --model ../../assets/3d/m6-e63-v3.glb --refs refs.json --out <dir> [--only b01,a07] [--samples 64] [--size 900]

refs.json: one entry per photo (camera in the same terms as viewer.html: car normalised to 4.85 m long, on the
ground, centred; az 0 = front, +90 = the car's left side, el = elevation, d = distance to the target point,
fov = vertical field of view in degrees). --model may be a .glb or a .blend (a .blend is used as is: its
materials are kept, only the camera, world and film are set).
"""
import bpy, sys, json, math, os, argparse
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument('--model', required=True)
ap.add_argument('--refs', required=True)
ap.add_argument('--out', required=True)
ap.add_argument('--only', default='')
ap.add_argument('--samples', type=int, default=64)
ap.add_argument('--size', type=int, default=900, help='longest side of the render, px')
ap.add_argument('--hdri-dir', default='C:/Users/aaldi/Local Sites/msport/3d-source/hdri')
ap.add_argument('--hide', default='', help='debug: hide objects of these roles, e.g. trim_black,plastic')
ap.add_argument('--fit', action='store_true', help='fit each camera to the car mask of its photo (refs/masks/<id>.png, rembg) first')
ap.add_argument('--fit-write', action='store_true', help='write the fitted cameras back into refs.json')
ap.add_argument('--fit-iters', type=int, default=160)
ap.add_argument('--keep-materials', action='store_true', help='do not apply the preview materials')
ap.add_argument('--paint', default='paint', help='material names (before the first ".") painted per photo, comma-separated')
ap.add_argument('--two-sided', action='store_true', help='keep back faces (models not prepared by bl_prepare.py)')
a = ap.parse_args(argv)
os.makedirs(a.out, exist_ok=True)
cfg = json.load(open(a.refs, encoding='utf-8'))

# ---- scene
if a.model.endswith('.blend'):
    bpy.ops.wm.open_mainfile(filepath=os.path.abspath(a.model))
else:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.abspath(a.model))
sc = bpy.context.scene
meshes = [o for o in sc.objects if o.type == 'MESH' and not o.name.startswith('cmp_')]

# normalise like viewer.html: longest horizontal side 4.85 m, wheels on z = 0, centred in x / y
if not a.model.endswith('.blend'):
    root = bpy.data.objects.new('cmp_root', None); sc.collection.objects.link(root)
    for o in sc.objects:
        if o.parent is None and o is not root:
            o.parent = root
    bpy.context.view_layer.update()
    def bbox():
        pts = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
        lo = Vector([min(p[i] for p in pts) for i in range(3)]); hi = Vector([max(p[i] for p in pts) for i in range(3)])
        return lo, hi
    lo, hi = bbox(); s = 4.85 / max(hi.x - lo.x, hi.y - lo.y)
    root.scale = (s, s, s); bpy.context.view_layer.update()
    lo, hi = bbox(); root.location -= Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z)); bpy.context.view_layer.update()

# ---- preview materials (real-world values; the final ones are built in the Cycles pass)
def principled(m):
    if not m or not m.use_nodes:
        return None
    return next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)

def setv(p, name, v):
    if name in p.inputs:
        for l in list(p.inputs[name].links):
            p.id_data.links.remove(l)
        p.inputs[name].default_value = v

def lin(hexs):
    h = hexs.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple((x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4) for x in c) + (1.0,)

PRESET = {  # role: (base colour, metallic, roughness, extra)
    'chrome': ('#c6c6c6', 1.0, 0.06, {}),
    'grille': ('#0b0b0c', 0.0, 0.35, {}),
    'trim_black': ('#0a0a0b', 0.0, 0.45, {}),
    'plastic': ('#141516', 0.0, 0.6, {}),
    'underbody': ('#0c0c0c', 0.0, 0.8, {}),
    'rim': ('#a9abad', 0.85, 0.28, {}),
    'tyre': ('#1c1c1c', 0.0, 0.72, {}),
    'brake_disc': ('#7a7a7a', 1.0, 0.38, {}),
    'glass': ('#1d2224', 0.0, 0.0, {'Transmission Weight': 1.0, 'IOR': 1.52}),
    'lights_glass': ('#ffffff', 0.0, 0.0, {'Transmission Weight': 1.0, 'IOR': 1.5}),
}
paint_mats = set()
PAINT = set(a.paint.split(','))
for m in bpy.data.materials:
    if m.name.split('.')[0] in PAINT:
        paint_mats.add(m)
if not a.keep_materials:
    for o in meshes:
        for m in o.data.materials:
            p = principled(m)
            if not p:
                continue
            r = m.name.split('.')[0]
            if r in PRESET:
                col, met, rough, extra = PRESET[r]
                setv(p, 'Base Color', lin(col)); setv(p, 'Metallic', met); setv(p, 'Roughness', rough)
                for k, v in extra.items():
                    setv(p, k, v)

# single-sided like the site (three.js FrontSide): bl_prepare.py keeps some doubled panels as *_back
# objects; seen from behind a face must vanish, or the two layers fight in blotches. Glass stays two-sided.
def front_side_only(m):
    nt = m.node_tree
    out = next((n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL' and n.is_active_output), None)
    if not out or not out.inputs['Surface'].links or any(n.label == 'front_only' for n in nt.nodes):
        return
    src = out.inputs['Surface'].links[0].from_socket
    geo = nt.nodes.new('ShaderNodeNewGeometry'); tr = nt.nodes.new('ShaderNodeBsdfTransparent')
    mix = nt.nodes.new('ShaderNodeMixShader'); mix.label = 'front_only'
    nt.links.new(geo.outputs['Backfacing'], mix.inputs['Fac'])
    nt.links.new(src, mix.inputs[1]); nt.links.new(tr.outputs['BSDF'], mix.inputs[2])
    nt.links.new(mix.outputs['Shader'], out.inputs['Surface'])

for m in bpy.data.materials:
    if not a.two_sided and m.use_nodes and m.name.split('.')[0] not in ('glass', 'lights_glass'):
        front_side_only(m)

# mesh repairs a path tracer needs (bl_fix.py): trim buried under the paint, doubled *_back layers
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bl_fix
if not a.model.endswith('.blend'):
    print('BURIED faces removed', bl_fix.buried_faces(meshes))
    bl_fix.lift_back_layers(meshes)
hide = set(filter(None, a.hide.split(',')))
for o in meshes:
    if bl_fix.role(o) in hide:
        o.hide_render = True

def set_paint(spec):
    col, met, rough = spec.get('color', '#0b0d12'), spec.get('metallic', 0.6), spec.get('rough', 0.32)
    for m in paint_mats:
        p = principled(m)
        setv(p, 'Base Color', lin(col)); setv(p, 'Metallic', met); setv(p, 'Roughness', rough)
        setv(p, 'Coat Weight', 1.0); setv(p, 'Coat Roughness', spec.get('coat_rough', 0.02)); setv(p, 'Coat IOR', 1.5)

# ---- render settings
sc.render.engine = 'CYCLES'
prefs = bpy.context.preferences.addons['cycles'].preferences
prefs.compute_device_type = 'OPTIX'; prefs.get_devices()
for d in prefs.devices:
    d.use = d.type == 'OPTIX'
sc.cycles.device = 'GPU'
sc.cycles.samples = a.samples
sc.cycles.use_denoising = True; sc.cycles.denoiser = 'OPTIX'
sc.render.film_transparent = True
sc.view_settings.view_transform = 'AgX'
sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'

# shadow catcher ground
if 'cmp_ground' not in bpy.data.objects:
    bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, 0))
    g = bpy.context.active_object; g.name = 'cmp_ground'; g.is_shadow_catcher = True

cam = bpy.data.objects.get('cmp_cam') or bpy.data.objects.new('cmp_cam', bpy.data.cameras.new('cmp_cam'))
if cam.name not in sc.collection.objects:
    sc.collection.objects.link(cam)
sc.camera = cam

world = sc.world or bpy.data.worlds.new('cmp_world'); sc.world = world; world.use_nodes = True
nt = world.node_tree; nt.nodes.clear()
tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping'); env = nt.nodes.new('ShaderNodeTexEnvironment')
bg = nt.nodes.new('ShaderNodeBackground'); out = nt.nodes.new('ShaderNodeOutputWorld')
nt.links.new(tc.outputs['Generated'], mp.inputs['Vector']); nt.links.new(mp.outputs['Vector'], env.inputs['Vector'])
nt.links.new(env.outputs['Color'], bg.inputs['Color']); nt.links.new(bg.outputs['Background'], out.inputs['Surface'])
loaded = {}

def three_to_blender(x, y, z):
    return Vector((x, -z, y))  # glTF / three.js y-up, front +z  ->  Blender z-up, front -y

def set_camera(c, w, h, size):
    k = size / max(w, h)
    sc.render.resolution_x, sc.render.resolution_y = round(w * k), round(h * k)
    sc.render.resolution_percentage = 100
    az, el, d = math.radians(c['az']), math.radians(c['el']), c['d']
    t = Vector((c.get('tx', 0), c.get('ty', 0.6), c.get('tz', 0)))
    pos = t + Vector((d * math.cos(el) * math.sin(az), d * math.sin(el), d * math.cos(el) * math.cos(az)))
    cam.location = three_to_blender(*pos)
    q = (three_to_blender(*t) - cam.location).to_track_quat('-Z', 'Y')
    if c.get('roll'):
        from mathutils import Quaternion
        q = q @ Quaternion((0, 0, 1), math.radians(c['roll']))
    cam.rotation_mode = 'QUATERNION'; cam.rotation_quaternion = q
    cam.data.sensor_fit = 'VERTICAL'; cam.data.lens_unit = 'FOV'; cam.data.angle = math.radians(c['fov'])
    cam.data.shift_x, cam.data.shift_y = c.get('sx', 0), c.get('sy', 0)

# ---- camera fit: silhouette (Workbench, alpha) against the photo's car mask, 1 - IoU minimised by Nelder-Mead
import numpy as np
MASKS = os.path.join(os.path.dirname(cfg['photos']), 'masks')
TMP = os.path.join(os.path.abspath(a.out), '_sil.png')
FIT_KEYS = ['az', 'el', 'd', 'fov', 'sx', 'sy', 'roll']
FIT_STEP = [6.0, 3.0, 0.6, 4.0, 0.03, 0.03, 1.0]

def load_gray(path, w, h):
    im = bpy.data.images.load(path); im.scale(w, h)
    px = np.array(im.pixels[:], dtype=np.float32).reshape(h, w, im.channels)
    bpy.data.images.remove(im)
    return px

def silhouette(c, w, h):
    set_camera(c, w, h, max(w, h))
    sc.render.filepath = TMP
    bpy.ops.render.render(write_still=True)
    return load_gray(TMP, w, h)[..., 3] > 0.5

def fit(ref):
    mpath = os.path.join(MASKS, ref['id'] + '.png')
    if not os.path.exists(mpath):
        return ref['cam'], None, None
    W0, H0 = ref['size']; k = 320 / max(W0, H0); w, h = round(W0 * k), round(H0 * k)
    target = load_gray(mpath, w, h)[..., 0] > 0.5
    eng, sam = sc.render.engine, None
    sc.render.engine = 'BLENDER_WORKBENCH'; sc.display.shading.light = 'FLAT'
    ground = bpy.data.objects['cmp_ground']; ground.hide_render = True
    base = dict(ref['cam'])
    def loss(v):
        c = dict(base); c.update({k_: float(x) for k_, x in zip(FIT_KEYS, v)})
        c['d'] = max(1.5, c['d']); c['fov'] = min(80, max(8, c['fov']))
        s = silhouette(c, w, h)
        inter = np.logical_and(s, target).sum(); uni = np.logical_or(s, target).sum()
        # photos are level: a tilted camera is only allowed within a few degrees
        return 1 - inter / max(1, uni) + max(0, abs(c.get('roll', 0)) - 3) * 0.02
    x0 = np.array([base.get(k_, 0.0) for k_ in FIT_KEYS], dtype=float)
    first = loss(x0)
    best, bestv = nelder_mead(loss, x0, a.fit_iters)
    best, bestv = nelder_mead(loss, best, a.fit_iters // 2, scale=0.4)  # restart: escapes a collapsed simplex
    c = dict(base); c.update({k_: round(float(x), 3) for k_, x in zip(FIT_KEYS, best)})
    sc.render.engine = eng; ground.hide_render = False
    return c, 1 - first, 1 - bestv

def nelder_mead(loss, x0, iters, scale=1.0):
    n = len(x0); simplex = [x0] + [x0 + np.eye(n)[i] * FIT_STEP[i] * scale for i in range(n)]
    vals = [loss(p) for p in simplex[:1]] + [loss(p) for p in simplex[1:]]
    for it in range(iters):
        order = np.argsort(vals); simplex = [simplex[i] for i in order]; vals = [vals[i] for i in order]
        cen = np.mean(simplex[:-1], axis=0)
        xr = cen + (cen - simplex[-1]); fr = loss(xr)
        if fr < vals[0]:
            xe = cen + 2 * (cen - simplex[-1]); fe = loss(xe)
            simplex[-1], vals[-1] = (xe, fe) if fe < fr else (xr, fr)
        elif fr < vals[-2]:
            simplex[-1], vals[-1] = xr, fr
        else:
            xc = cen + 0.5 * (simplex[-1] - cen); fc = loss(xc)
            if fc < vals[-1]:
                simplex[-1], vals[-1] = xc, fc
            else:
                simplex = [simplex[0]] + [simplex[0] + 0.5 * (p - simplex[0]) for p in simplex[1:]]
                vals = [vals[0]] + [loss(p) for p in simplex[1:]]
        if max(vals) - min(vals) < 0.0015 and it > 30:
            break
    i = int(np.argmin(vals))
    return simplex[i], vals[i]

only = set(filter(None, a.only.split(',')))
fitted = {}
for ref in cfg['refs']:
    if only and ref['id'] not in only:
        continue
    if a.fit and ref.get('fit', True):
        c, i0, i1 = fit(ref)
        if i0 is not None:
            print(f"FIT {ref['id']} IoU {i0:.3f} -> {i1:.3f} cam {c}")
            ref['cam'] = c; fitted[ref['id']] = (c, round(i1, 3))
    set_camera(ref['cam'], *ref['size'], a.size)
    L = ref.get('light', {})
    hdri = os.path.join(a.hdri_dir, L.get('hdri', 'canary_wharf') + '_4k.hdr')
    if hdri not in loaded:
        loaded[hdri] = bpy.data.images.load(hdri)
    env.image = loaded[hdri]
    mp.inputs['Rotation'].default_value = (0, 0, math.radians(L.get('rot', 0)))
    bg.inputs['Strength'].default_value = L.get('strength', 1.0)
    sc.view_settings.exposure = L.get('exposure', 0)
    set_paint(ref.get('paint', {}))
    sc.render.filepath = os.path.join(os.path.abspath(a.out), ref['id'] + '.png')
    bpy.ops.render.render(write_still=True)
    print('RENDERED', ref['id'], sc.render.filepath)

if a.fit and a.fit_write and fitted:
    raw = json.load(open(a.refs, encoding='utf-8'))
    for r in raw['refs']:
        if r['id'] in fitted:
            r['cam'], r['iou'] = fitted[r['id']]
    with open(a.refs, 'w', encoding='utf-8', newline='\n') as f:
        f.write('{\n  "photos": ' + json.dumps(raw['photos']) + ',\n  "refs": [\n'
                + ',\n'.join('    ' + json.dumps(r, ensure_ascii=False) for r in raw['refs']) + '\n  ]\n}\n')
    print('WROTE', a.refs)
