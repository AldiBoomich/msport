"""
Web versions of the M6 (E63) v6 model for the live Three.js scene: the Cycles model (bl_build_m6.py, ~1.8 M
triangles) cut down per part, so the body keeps its lines and what the camera hardly sees (interior, the
insides of the lamps, tyre tread) goes first.

  blender -b --factory-startup --python-exit-code 1 --python bl_web_v6.py -- \
      --model m6-e63-v6.blend --out m6-e63-v6-web.blend [--scale 1.0]

--scale multiplies every ratio (0.55 ≈ the phone version). The output .blend keeps object and material names,
so bl_film.py can render it for a side-by-side with the full model; the glTF export comes later (bl_web_export).
"""
import bpy, sys, re, argparse

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument('--model', required=True); ap.add_argument('--out', required=True)
ap.add_argument('--scale', type=float, default=1.0)
a = ap.parse_args(argv)

bpy.ops.wm.open_mainfile(filepath=a.model)

# (object name pattern, ratio): first match wins. Ratios for the desktop version.
RULES = [
    (r'^paint$', 0.62),                       # the body: its lines carry the whole look
    (r'^glass$', 0.6), (r'^carbon_roof$', 0.7), (r'^frit$', 0.5), (r'^mirror$', 0.4),
    (r'^angel$', 0.4),                        # the rings: keep them round
    (r'^grille$', 1.0),                       # the honeycomb in the lower intake: its holes vanish when cut
    (r'^(lamp_glass|amber|housing)$', 0.25),
    (r'^(tail_reflector|reflector|tail_glow)$', 0.07),   # deep inside the lamps
    (r'^interior$', 0.12), (r'^plastic$', 0.3), (r'^chrome$', 0.35), (r'^trim_gloss$', 0.45),
    (r'tire|tyre', 0.1),                      # tread blocks: the wheel spins, they blur anyway
    (r'disk|disc|Cylinder028', 0.3), (r'caliper|brakepad|Plane033|Object063', 0.2),
    (r'.*', 0.4),
]
MIN_TRIS = 800                                 # small parts stay as they are


def tris(me):
    return sum(len(p.vertices) - 2 for p in me.polygons)


# every mesh object must be evaluated by the depsgraph (hidden or excluded ones are skipped by it)
for lc in bpy.context.view_layer.layer_collection.children:
    lc.exclude = False
for o in bpy.data.objects:
    o.hide_viewport = False
    if o.name not in bpy.context.scene.objects:
        bpy.context.scene.collection.objects.link(o)
users = {}
for o in bpy.data.objects:
    if o.type == 'MESH':
        users.setdefault(o.data, []).append(o)

before = after = 0
log = []
for me, objs in users.items():
    o = objs[0]
    n = tris(me); before += n * len(objs)
    ratio = next(r for p, r in RULES if re.search(p, o.name)) * a.scale
    if n < MIN_TRIS or ratio >= 0.999:
        after += n * len(objs); continue
    ratio = max(ratio, MIN_TRIS / n)
    mod = o.modifiers.new('web', 'DECIMATE'); mod.decimate_type = 'COLLAPSE'; mod.ratio = ratio
    mod.use_collapse_triangulate = False
    # keep only this modifier active while evaluating (other modifiers are applied already in v6)
    for m in o.modifiers:
        if m.name != 'web':
            m.show_viewport = False
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    new = bpy.data.meshes.new_from_object(o.evaluated_get(dg))
    o.modifiers.remove(mod)
    for m in o.modifiers:
        m.show_viewport = True
    new.name = me.name + '_web'
    for u in objs:
        u.data = new
    m2 = tris(new); after += m2 * len(objs)
    log.append((o.name, len(objs), n, m2))

for name, k, n, m2 in sorted(log, key=lambda x: -x[2])[:25]:
    print(f'WEB {name:40s} x{k}  {n:7d} -> {m2:7d}')
print(f'WEB TOTAL {before} -> {after} triangles')
bpy.ops.outliner.orphans_purge(do_recursive=True)
bpy.ops.wm.save_as_mainfile(filepath=a.out, compress=True)
print('WEB saved', a.out)
