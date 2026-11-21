"""Bake ambient occlusion for the prepared M6 model (output of bl_prepare.py).
usage: blender -b --factory-startup --python bl_bake_ao.py -- prep.glb out.glb shadow.png [samples]

1. Vertex AO -> float attribute `_AO` on every mesh (three.js reads it as `_ao`):
   - body parts: whole car as occluders (wheels darken the arches),
   - each wheel on its own (spokes, barrel, tyre), so the AO turns with the wheel and stays right.
2. Ground contact shadow: AO baked on a plane under the car -> grey PNG (white = open, dark = under the car).
The AO is applied to indirect light only in the viewer / theme, never to the colour.
"""
import bpy, sys

argv = sys.argv[sys.argv.index('--') + 1:]
SRC, DST, SHADOW = argv[0], argv[1], argv[2]
SAMPLES = int(argv[3]) if len(argv) > 3 else 128

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'
sc.cycles.device = 'CPU'
sc.cycles.samples = SAMPLES
if sc.world is None:
    sc.world = bpy.data.worlds.new('world')

meshes = [o for o in sc.objects if o.type == 'MESH']
WHEEL_PARTS = ('rim', 'tyre', 'brake_disc')
is_wheel = lambda o: o.name.split('.')[0].startswith(WHEEL_PARTS)
body = [o for o in meshes if not is_wheel(o)]
wheels = {}
for o in meshes:
    if is_wheel(o) and o.parent is not None:
        wheels.setdefault(o.parent.name, []).append(o)

# every mesh needs a material for Cycles bake
fallback = bpy.data.materials.new('bake_fallback')
for o in meshes:
    if not o.data.materials:
        o.data.materials.append(fallback)


def bake_vertex_ao(objs, visible, distance):
    for o in meshes:
        o.hide_render = o not in visible
    sc.world.light_settings.distance = distance
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
        ca = o.data.color_attributes.get('ao_bake') or o.data.color_attributes.new('ao_bake', 'BYTE_COLOR', 'CORNER')
        o.data.color_attributes.active_color = ca
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.bake(type='AO', target='VERTEX_COLORS')
    print('BAKED', len(objs), 'objects, distance', distance)


bake_vertex_ao(body, meshes, 0.45)
for name, parts in wheels.items():
    bake_vertex_ao(parts, parts, 0.25)

# corner colours -> one float per vertex, named _AO (exported as a custom glTF attribute)
for o in meshes:
    me = o.data
    ca = me.color_attributes.get('ao_bake')
    if ca is None:
        continue
    acc = [0.0] * len(me.vertices)
    cnt = [0] * len(me.vertices)
    for loop in me.loops:
        acc[loop.vertex_index] += ca.data[loop.index].color[0]
        cnt[loop.vertex_index] += 1
    me.color_attributes.remove(ca)
    at = me.attributes.new('_AO', 'FLOAT', 'POINT')
    for i, v in enumerate(acc):
        at.data[i].value = v / cnt[i] if cnt[i] else 1.0

# ground contact shadow: plane 3.4 x 6.4 m under the car (Blender: x = width, y = length, z = up)
for o in meshes:
    o.hide_render = False
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, 0.001))
plane = bpy.context.active_object
plane.scale = (3.4, 6.4, 1)
bpy.ops.object.transform_apply(scale=True)
img = bpy.data.images.new('shadow', 512, 1024, alpha=False, float_buffer=True)
mat = bpy.data.materials.new('shadow_bake'); mat.use_nodes = True
node = mat.node_tree.nodes.new('ShaderNodeTexImage'); node.image = img
mat.node_tree.nodes.active = node
plane.data.materials.append(mat)
sc.world.light_settings.distance = 1.6
bpy.ops.object.select_all(action='DESELECT'); plane.select_set(True)
bpy.context.view_layer.objects.active = plane
sc.cycles.samples = max(SAMPLES * 8, 2048)  # smooth, grain-free shadow
bpy.ops.object.bake(type='AO', target='IMAGE_TEXTURES')
img.filepath_raw = SHADOW; img.file_format = 'PNG'
sc.render.image_settings.color_depth = '16'
img.save()
bpy.data.objects.remove(plane, do_unlink=True)
print('SHADOW', SHADOW)

kw = dict(filepath=DST, export_format='GLB', export_yup=True, export_apply=True, export_texcoords=True,
          export_normals=True, export_materials='EXPORT', export_image_format='AUTO', export_extras=False,
          export_attributes=True)
try:
    bpy.ops.export_scene.gltf(**kw, export_vertex_color='NONE')
except TypeError:
    bpy.ops.export_scene.gltf(**kw, export_colors=False)
print('DONE', DST)
