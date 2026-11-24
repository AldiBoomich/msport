"""
glTF for the live scene from the web version of the M6 v6 (bl_web_v6.py → m6-e63-v6-web.blend).

  blender -b --factory-startup --python-exit-code 1 --python bl_web_export.py -- --model m6-e63-v6-web.blend --out m6-e63-v6.glb

The scene (film-scene.js) finds the parts by name, as it did on v3:
  - wheels: nodes wheel_LF / wheel_RF / wheel_LB / wheel_RB at the axle centre (were spin_*), holding rim_XX,
    tyre_XX_n, brake_disc_XX and the centre cap pieces (cap_XX_n);
  - everything else: one mesh per material, named after it (paint, glass, angel, tail_glow, caliper, ...).
Materials keep the v6 names; film-scene.js gives each its web material (no textures in v6: all procedural).
"""
import bpy, sys, argparse
from collections import defaultdict

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument('--model', required=True); ap.add_argument('--out', required=True)
a = ap.parse_args(argv)
bpy.ops.wm.open_mainfile(filepath=a.model)

for lc in bpy.context.view_layer.layer_collection.children:
    lc.exclude = False
for o in bpy.data.objects:
    o.hide_viewport = False; o.hide_set(False); o.hide_select = False
root = bpy.data.objects['M6_E63']


def join(objs, name):
    """Join meshes into the first one (data made single-user first), named `name`."""
    objs = [o for o in objs if o.type == 'MESH']
    if not objs:
        return None
    for o in objs:
        if o.data.users > 1:
            o.data = o.data.copy()
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    j = bpy.context.view_layer.objects.active
    j.name = name; j.data.name = name
    return j


# ---- wheels: spin_XX → wheel_XX, parts named for chapter-fx.js / film-scene.js
for side in ('LF', 'RF', 'LB', 'RB'):
    w = bpy.data.objects['spin_' + side]
    w.name = 'wheel_' + side
    kids = list(w.children)
    by = defaultdict(list)
    for k in kids:
        m = k.material_slots[0].material.name if k.material_slots and k.material_slots[0].material else ''
        if k.name.startswith('rim_'):
            by['rim'].append(k)
        elif m == 'tyre':
            by['tyre'].append(k)
        elif m == 'disc':
            by['disc'].append(k)
        else:
            by['cap'].append(k)
    join(by['rim'], 'rim_' + side)
    join(by['tyre'], 'tyre_' + side)
    join(by['disc'], 'brake_disc_' + side)
    caps = defaultdict(list)
    for k in by['cap']:
        caps[k.material_slots[0].material.name].append(k)
    for i, (mname, objs) in enumerate(sorted(caps.items())):
        join(objs, f'cap_{side}_{mname}')

# ---- body: one mesh per material (multi-material meshes stay as they are)
groups = defaultdict(list)
for o in list(root.children):
    if o.type != 'MESH':
        continue
    mats = {s.material.name for s in o.material_slots if s.material}
    key = next(iter(mats)) if len(mats) == 1 else o.name
    groups[key].append(o)
for key, objs in groups.items():
    join(objs, key)

# disc material: the scene's wheel code looks for 'brake_disc'
if 'disc' in bpy.data.materials:
    bpy.data.materials['disc'].name = 'brake_disc'

n_mesh = sum(1 for o in bpy.data.objects if o.type == 'MESH')
tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in bpy.data.objects if o.type == 'MESH')
print(f'EXPORT meshes {n_mesh}, triangles {tris}')
for o in sorted(bpy.data.objects, key=lambda o: o.name):
    if o.type == 'MESH' or o.name.startswith('wheel_'):
        print('EXPORT', o.name, o.parent.name if o.parent else '-', [s.material.name for s in getattr(o, 'material_slots', []) if s.material])

bpy.ops.object.select_all(action='DESELECT')
bpy.ops.export_scene.gltf(filepath=a.out, export_format='GLB', use_selection=False, export_apply=True,
                          export_yup=True, export_texcoords=True, export_normals=True, export_tangents=False,
                          export_materials='EXPORT', export_cameras=False, export_lights=False,
                          export_animations=False, export_extras=False)
print('EXPORT saved', a.out)
