"""
Cycles stills and film of the M6 (E63) on the site's camera rail: the same frames as the WebGL video
(video-timeline.js), path-traced. Night drive on a damp road under the Shanghai Bund panorama (16K), street
lamps passing overhead, headlights, disc glow, light bar and roof sweep where the site has them.

  node rail-export.mjs rail.json                       (camera + chapter state per frame, from the site code)
  blender -b --factory-startup --python-exit-code 1 --python bl_film.py -- \
      --model m6-e63-v4.blend --rail rail.json --hdri shanghai_bund_16k.exr --out <dir> \
      [--orient desktop|portrait] [--size 1600x900] [--samples 64] \
      [--stills] [--frames 0-1439|590,1141] [--loops] [--save scene.blend]

  --stills   one frame per chapter (the moment the site's stills show) → <dir>/d01.png … (p01 portrait)
  --frames   a range of the film → <dir>/f0000.png …; frames already on disk are skipped (resume)
  --loops    the 17 idle loops (LOOP_LEN + LOOP_FADE frames each) → <dir>/l00_000.png …

World: Blender z up, car front = -y (three.js (x, y, z) = Blender (x, -z, y)), the car stands at the origin
and the road moves under it (+y), so motion blur is real object motion.
"""
import bpy, bmesh, sys, os, math, json, argparse
from mathutils import Vector, Quaternion, Matrix

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument('--model', required=True); ap.add_argument('--rail', required=True); ap.add_argument('--hdri', required=True)
ap.add_argument('--out', required=True)
ap.add_argument('--orient', default='desktop'); ap.add_argument('--size', default='1600x900')
ap.add_argument('--samples', type=int, default=64)
ap.add_argument('--stills', action='store_true'); ap.add_argument('--frames', default='')
ap.add_argument('--loops', action='store_true'); ap.add_argument('--only', default='', help='stills: chapter numbers, e.g. 1,2,10')
ap.add_argument('--save', default='')
ap.add_argument('--env', type=float, default=0.65, help='panorama strength in reflections and light')
ap.add_argument('--sky', type=float, default=0.28, help='panorama strength seen directly (backdrop)')
ap.add_argument('--exposure', type=float, default=0.0)
ap.add_argument('--no-blur', action='store_true')
ap.add_argument('--jpeg', action='store_true', help='film and loop frames as JPEG 95 (a quarter of the PNG size)')
# speed (1080p, RTX 4050 laptop, 2026-11-22): 128 spp / 0.01 / CPU compositor / cubic 8.1 s a frame; 96 / 0.015 / GPU /
# linear 5.2 s, within 1 dB PSNR of it against a 512-spp reference and the same by eye in close-ups
ap.add_argument('--threshold', type=float, default=0.015, help='adaptive sampling noise threshold')
ap.add_argument('--comp', default='gpu', choices=('cpu', 'gpu'), help='compositor device (glare, vignette)')
ap.add_argument('--env-interp', default='Linear', choices=('Cubic', 'Linear'), help='panorama filtering')
ap.add_argument('--street', default='full', choices=('full', 'lite', 'none'), help='moving street for reflections: facades, trees, posts')
ap.add_argument('--fps', type=int, default=30, help='frames per second of the rail (motion blur shutter = half a frame)')
a = ap.parse_args(argv)
os.makedirs(a.out, exist_ok=True)
W, H = map(int, a.size.split('x'))
RAIL = json.load(open(a.rail, encoding='utf-8'))
if 'fps' in RAIL:                                  # rail-export.mjs --fps
    a.fps = RAIL['fps']
STILL_FT = [0.5, 0.6, 0.6, 0.62, 0.5, 0.5, 0.6, 0.6, 0.5, 0.5]   # the site's still moments (STATUS: chapter stills)
HROT = math.radians(180)                                         # panorama yaw: Pudong skyline behind the car
PORTRAIT_REF = 0.8

bpy.ops.wm.open_mainfile(filepath=os.path.abspath(a.model))
sc = bpy.context.scene


def t2b(v):
    return Vector((v[0], -v[2], v[1]))


def lin(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple((x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4) for x in c)


# ---------------------------------------------------------------- render settings
sc.render.engine = 'CYCLES'
pr = bpy.context.preferences.addons['cycles'].preferences
pr.compute_device_type = 'OPTIX'; pr.get_devices()
for d in pr.devices:
    d.use = d.type == 'OPTIX'
cy = sc.cycles
cy.device = 'GPU'; cy.samples = a.samples; cy.use_adaptive_sampling = True; cy.adaptive_threshold = a.threshold
cy.use_denoising = True; cy.denoiser = 'OPTIX'; cy.denoising_input_passes = 'RGB_ALBEDO_NORMAL'
cy.max_bounces = 10; cy.diffuse_bounces = 3; cy.glossy_bounces = 5; cy.transmission_bounces = 10
cy.transparent_max_bounces = 24; cy.volume_bounces = 0
cy.caustics_reflective = False; cy.caustics_refractive = False; cy.blur_glossy = 1.0
cy.sample_clamp_direct = 6.0; cy.sample_clamp_indirect = 3.0
sc.render.use_persistent_data = True
sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = W, H, 100
sc.render.use_motion_blur = not a.no_blur; sc.render.motion_blur_shutter = 0.5
sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGB'; sc.render.image_settings.color_depth = '8'
sc.render.film_transparent = False
sc.view_settings.view_transform = 'AgX'
try:
    sc.view_settings.look = 'AgX - Medium High Contrast'
except TypeError:
    pass
sc.view_settings.exposure = a.exposure
sc.render.fps = a.fps
sc.render.compositor_device = a.comp.upper()

# ---------------------------------------------------------------- world: the Bund at night, 16K
world = bpy.data.worlds.new('bund'); sc.world = world; world.use_nodes = True
nt = world.node_tree; nt.nodes.clear()
tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Rotation'].default_value = (0, 0, HROT)
env = nt.nodes.new('ShaderNodeTexEnvironment'); env.image = bpy.data.images.load(os.path.abspath(a.hdri)); env.interpolation = a.env_interp
nt.links.new(tc.outputs['Generated'], mp.inputs['Vector']); nt.links.new(mp.outputs['Vector'], env.inputs['Vector'])
lp = nt.nodes.new('ShaderNodeLightPath')
k_env = nt.nodes.new('ShaderNodeValue'); k_env.name = k_env.label = 'k_env'; k_env.outputs[0].default_value = a.env
k_sky = nt.nodes.new('ShaderNodeValue'); k_sky.name = k_sky.label = 'k_sky'; k_sky.outputs[0].default_value = a.sky
mixk = nt.nodes.new('ShaderNodeMix'); mixk.data_type = 'FLOAT'
nt.links.new(lp.outputs['Is Camera Ray'], mixk.inputs['Factor'])
nt.links.new(k_env.outputs[0], mixk.inputs['A']); nt.links.new(k_sky.outputs[0], mixk.inputs['B'])
bg = nt.nodes.new('ShaderNodeBackground'); out = nt.nodes.new('ShaderNodeOutputWorld')
nt.links.new(mixk.outputs['Result'], bg.inputs['Strength'])
# Reflections see the far city only. The near half of the panorama (the Bund's floodlit facades and trees, tens of
# metres away, to the car's left and ahead) stood still on the paint while the car drove past at 50 km/h. For
# every ray but the camera's it gives way to a dark night haze; moving facades (below) take its place. Measured
# on the panorama itself (after the yaw), so it turns with it: far = river and Pudong, -115°…61° of azimuth.
sp = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(mp.outputs['Vector'], sp.inputs[0])


def wm(op, a_, b_=None):
    n = nt.nodes.new('ShaderNodeMath'); n.operation = op
    for i, v in enumerate((a_, b_)):
        if v is None:
            continue
        if isinstance(v, (int, float)):
            n.inputs[i].default_value = v
        else:
            nt.links.new(v, n.inputs[i])
    return n.outputs[0]


def wsmooth(x, lo, hi):
    n = nt.nodes.new('ShaderNodeMapRange'); n.interpolation_type = 'SMOOTHSTEP'
    n.inputs['From Min'].default_value = lo; n.inputs['From Max'].default_value = hi; nt.links.new(x, n.inputs['Value'])
    return n.outputs[0]


phi = wm('ARCTAN2', sp.outputs['Y'], sp.outputs['X'])
elev = wm('ARCSINE', sp.outputs['Z'])
near_az = wm('MINIMUM', wm('ADD', wsmooth(phi, math.radians(57), math.radians(65)),
                           wm('SUBTRACT', 1.0, wsmooth(phi, math.radians(-119), math.radians(-111)))), 1.0)
near = wm('MULTIPLY', near_az, wm('SUBTRACT', 1.0, wsmooth(elev, math.radians(34), math.radians(41))))
near = wm('MULTIPLY', near, wm('SUBTRACT', 1.0, lp.outputs['Is Camera Ray']))
haze = nt.nodes.new('ShaderNodeMix'); haze.data_type = 'RGBA'
nt.links.new(wsmooth(elev, 0.0, 0.5), haze.inputs['Factor'])
haze.inputs['A'].default_value = (0.045, 0.034, 0.026, 1); haze.inputs['B'].default_value = (0.010, 0.012, 0.022, 1)
envmix = nt.nodes.new('ShaderNodeMix'); envmix.data_type = 'RGBA'; nt.links.new(near, envmix.inputs['Factor'])
nt.links.new(env.outputs['Color'], envmix.inputs['A']); nt.links.new(haze.outputs['Result'], envmix.inputs['B'])
nt.links.new(envmix.outputs['Result'], bg.inputs['Color'])
nt.links.new(bg.outputs['Background'], out.inputs['Surface'])
world.cycles.sampling_method = 'MANUAL'; world.cycles.sample_map_resolution = 2048

# ---------------------------------------------------------------- road: damp asphalt, lane paint, puddles
TEX = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'assets', '3d', 'textures')
road_mat = bpy.data.materials.new('road'); road_mat.use_nodes = True
rt = road_mat.node_tree; p = rt.nodes['Principled BSDF']
rtc = rt.nodes.new('ShaderNodeTexCoord')
uvm = rt.nodes.new('ShaderNodeMapping'); uvm.inputs['Scale'].default_value = (1 / 2.5, 1 / 2.5, 1)   # 2.5 m tile, as the site
rt.links.new(rtc.outputs['Object'], uvm.inputs['Vector'])


def tex(name, srgb):
    t = rt.nodes.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(os.path.abspath(os.path.join(TEX, name)))
    t.image.colorspace_settings.name = 'sRGB' if srgb else 'Non-Color'; rt.links.new(uvm.outputs['Vector'], t.inputs['Vector'])
    return t


diff = tex('asphalt_track_diff_1k.jpg', True); nor = tex('asphalt_track_nor_gl_1k.jpg', False); rough = tex('asphalt_track_rough_1k.jpg', False)
# wet mask: big soft fbm patches (the site: 0.22 + 0.78 * smoothstep(0.52, 0.64, fbm(xz * 0.32)))
noise = rt.nodes.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value = 0.32; noise.inputs['Detail'].default_value = 5
noise.noise_dimensions = '2D'; rt.links.new(rtc.outputs['Object'], noise.inputs['Vector'])
wet = rt.nodes.new('ShaderNodeMapRange'); wet.inputs['From Min'].default_value = 0.5; wet.inputs['From Max'].default_value = 0.62
wet.inputs['To Min'].default_value = 0.22; wet.inputs['To Max'].default_value = 1.0; wet.clamp = True
rt.links.new(noise.outputs['Fac'], wet.inputs['Value'])
# lane paint: dashes at x = 1.95 every 6 m (3 m long), an edge line at x = -1.75 (the site's road)
sep = rt.nodes.new('ShaderNodeSeparateXYZ'); rt.links.new(rtc.outputs['Object'], sep.inputs[0])


def math_node(op, a_, b_=None):
    n = rt.nodes.new('ShaderNodeMath'); n.operation = op
    for i, v in enumerate((a_, b_)):
        if v is None:
            continue
        if isinstance(v, (int, float)):
            n.inputs[i].default_value = v
        else:
            rt.links.new(v, n.inputs[i])
    return n.outputs[0]


dash_x = math_node('LESS_THAN', math_node('ABSOLUTE', math_node('SUBTRACT', sep.outputs['X'], 1.95)), 0.06)
dash_y = math_node('LESS_THAN', math_node('FRACT', math_node('DIVIDE', sep.outputs['Y'], 6.0)), 0.5)
edge = math_node('LESS_THAN', math_node('ABSOLUTE', math_node('ADD', sep.outputs['X'], 1.75)), 0.075)
paint_mask = math_node('MAXIMUM', math_node('MULTIPLY', dash_x, dash_y), edge)
base = rt.nodes.new('ShaderNodeMix'); base.data_type = 'RGBA'; base.blend_type = 'MULTIPLY'; base.inputs['Factor'].default_value = 1.0
rt.links.new(diff.outputs['Color'], base.inputs['A']); base.inputs['B'].default_value = (*lin('#3a3d42'), 1)
withpaint = rt.nodes.new('ShaderNodeMix'); withpaint.data_type = 'RGBA'
rt.links.new(paint_mask, withpaint.inputs['Factor']); rt.links.new(base.outputs['Result'], withpaint.inputs['A'])
withpaint.inputs['B'].default_value = (*lin('#6e6e6a'), 1)
darken = rt.nodes.new('ShaderNodeMix'); darken.data_type = 'RGBA'; darken.blend_type = 'MULTIPLY'
rt.links.new(wet.outputs[0], darken.inputs['Factor']); rt.links.new(withpaint.outputs['Result'], darken.inputs['A'])
darken.inputs['B'].default_value = (0.42, 0.42, 0.42, 1)
rt.links.new(darken.outputs['Result'], p.inputs['Base Color'])
wet2 = rt.nodes.new('ShaderNodeMath'); wet2.operation = 'POWER'; wet2.inputs[1].default_value = 2.0
rt.links.new(wet.outputs[0], wet2.inputs[0])
rmix = rt.nodes.new('ShaderNodeMix'); rmix.data_type = 'FLOAT'
rt.links.new(wet2.outputs[0], rmix.inputs['Factor']); rt.links.new(rough.outputs['Color'], rmix.inputs['A']); rmix.inputs['B'].default_value = 0.04
rt.links.new(rmix.outputs['Result'], p.inputs['Roughness'])
nmap = rt.nodes.new('ShaderNodeNormalMap'); rt.links.new(nor.outputs['Color'], nmap.inputs['Color'])
nstr = rt.nodes.new('ShaderNodeMapRange'); nstr.inputs['To Min'].default_value = 0.6; nstr.inputs['To Max'].default_value = 0.06
rt.links.new(wet.outputs[0], nstr.inputs['Value']); rt.links.new(nstr.outputs[0], nmap.inputs['Strength'])
rt.links.new(nmap.outputs['Normal'], p.inputs['Normal'])
p.inputs['Metallic'].default_value = 0.0

bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, 0)); road = bpy.context.active_object; road.name = 'road'
road.scale = (600, 4000, 1); road.data.materials.append(road_mat)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

# ---------------------------------------------------------------- street lamps: a row overhead, moving with the road
# (site: row x = -2.1 m, 7.5 m up, every 25 m). Seen in reflections and as light, not by the camera.
lamp_mat = bpy.data.materials.new('street_lamp'); lamp_mat.use_nodes = True
lnt = lamp_mat.node_tree; lnt.nodes.clear()
em = lnt.nodes.new('ShaderNodeEmission'); em.inputs['Color'].default_value = (*lin('#ffd6a0'), 1); em.inputs['Strength'].default_value = 60
lo = lnt.nodes.new('ShaderNodeOutputMaterial'); lnt.links.new(em.outputs[0], lo.inputs['Surface'])
bpy.ops.mesh.primitive_plane_add(size=1, location=(-2.1, -2000, 7.5)); lamp = bpy.context.active_object; lamp.name = 'street_lamps'
lamp.scale = (0.7, 0.28, 1); bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
lamp.rotation_euler = (math.pi, 0, 0)                 # facing down
lamp.data.materials.append(lamp_mat)
arr = lamp.modifiers.new('row', 'ARRAY'); arr.use_relative_offset = False; arr.use_constant_offset = True
arr.constant_offset_displace = (0, -25, 0); arr.count = 170      # flipped plane: -y in local = +y in world
lamp.visible_camera = False; lamp.visible_shadow = False
lamp.parent = road

# ---------------------------------------------------------------- the street's near side, for reflections: moving
# Floodlit facades with lit windows on the left (where the panorama's Bund buildings stand), a row of trees in front
# of them, lamp posts along the river railing on the right. Parented to the road like the lamps overhead, so they
# pass at the car's speed; unseen by the camera (the backdrop stays the photo) and by diffuse light, and not
# sampled as lights (speed): only the paint, glass, chrome and the wet road mirror them.
import random
rng = random.Random(7)


def refl_only(o, mat):
    o.data.materials.append(mat); sc.collection.objects.link(o)
    o.visible_camera = False; o.visible_shadow = False; o.visible_diffuse = False; o.visible_volume_scatter = False
    o.parent = road
    return o


def street_mesh(name, quads):
    v, f = [], []
    for q in quads:
        f.append(tuple(range(len(v), len(v) + 4))); v += q
    me = bpy.data.meshes.new(name); me.from_pydata(v, [], f); me.update()
    return bpy.data.objects.new(name, me)


fac_mat = bpy.data.materials.new('facades'); fac_mat.use_nodes = True; fn = fac_mat.node_tree; fn.nodes.clear()
fac_mat.cycles.emission_sampling = 'NONE'
ftc = fn.nodes.new('ShaderNodeTexCoord'); fsp = fn.nodes.new('ShaderNodeSeparateXYZ'); fn.links.new(ftc.outputs['Object'], fsp.inputs[0])
fyz = fn.nodes.new('ShaderNodeCombineXYZ'); fn.links.new(fsp.outputs['Y'], fyz.inputs[0]); fn.links.new(fsp.outputs['Z'], fyz.inputs[1])
brick = fn.nodes.new('ShaderNodeTexBrick'); fn.links.new(fyz.outputs[0], brick.inputs['Vector'])
brick.inputs['Scale'].default_value = 1.0; brick.inputs['Mortar Size'].default_value = 0.55; brick.inputs['Brick Width'].default_value = 2.4
brick.inputs['Row Height'].default_value = 3.4; brick.offset = 0.0
brick.inputs['Color1'].default_value = (0, 0, 0, 1); brick.inputs['Color2'].default_value = (1, 1, 1, 1); brick.inputs['Mortar'].default_value = (0, 0, 0, 1)


def fmath(op, a_, b_=None, c_=None):
    n = fn.nodes.new('ShaderNodeMath'); n.operation = op
    for i, v in enumerate((a_, b_, c_)):
        if v is None:
            continue
        if isinstance(v, (int, float)):
            n.inputs[i].default_value = v
        else:
            fn.links.new(v, n.inputs[i])
    return n.outputs[0]


bw = fn.nodes.new('ShaderNodeRGBToBW'); fn.links.new(brick.outputs['Color'], bw.inputs[0])
lit = fmath('GREATER_THAN', bw.outputs[0], 0.55)                          # some windows lit, some dark
win = fmath('SUBTRACT', 1.0, brick.outputs['Fac'])                         # Fac = 1 on the wall between windows
fnoise = fn.nodes.new('ShaderNodeTexNoise'); fnoise.inputs['Scale'].default_value = 0.03; fn.links.new(fsp.outputs['Y'], fnoise.inputs['Vector'])
wall = fmath('MULTIPLY', fmath('MULTIPLY_ADD', fnoise.outputs['Fac'], 1.6, -0.25), fmath('SUBTRACT', 1.0, win))   # floodlit stone
wl = fmath('MULTIPLY', fmath('MULTIPLY', win, lit), fmath('MULTIPLY_ADD', bw.outputs[0], 7.0, -2.6))   # 1.3…4.4: rooms differ
fk = fn.nodes.new('ShaderNodeValue'); fk.name = fk.label = 'k'; fk.outputs[0].default_value = 1.0
e_wall = fn.nodes.new('ShaderNodeEmission'); e_wall.inputs['Color'].default_value = (1.0, 0.62, 0.32, 1)
fn.links.new(fmath('MULTIPLY', fmath('MULTIPLY', fmath('MAXIMUM', wall, 0.0), 0.9), fk.outputs[0]), e_wall.inputs['Strength'])
e_win = fn.nodes.new('ShaderNodeEmission'); e_win.inputs['Color'].default_value = (1.0, 0.82, 0.58, 1)
fn.links.new(fmath('MULTIPLY', wl, fk.outputs[0]), e_win.inputs['Strength'])
fadd = fn.nodes.new('ShaderNodeAddShader'); fn.links.new(e_wall.outputs[0], fadd.inputs[0]); fn.links.new(e_win.outputs[0], fadd.inputs[1])
fout = fn.nodes.new('ShaderNodeOutputMaterial'); fn.links.new(fadd.outputs[0], fout.inputs['Surface'])
quads, y = [], -1800.0
while y < 400:
    w, g, h = rng.uniform(14, 38), rng.uniform(3, 12), rng.uniform(12, 32); x = 16 + rng.uniform(-2, 4)
    quads.append([(x, y + w, 0), (x, y, 0), (x, y, h), (x, y + w, h)])          # facing the road (-x)
    y += w + g
facades = refl_only(street_mesh('facades', quads), fac_mat)

# trees: solid low-poly crowns (alpha-cut cards made every ray pass through them: 1.8x the render time)
tree_mat = bpy.data.materials.new('trees'); tree_mat.use_nodes = True
tp = tree_mat.node_tree.nodes['Principled BSDF']; tp.inputs['Base Color'].default_value = (0.012, 0.016, 0.01, 1)
tp.inputs['Roughness'].default_value = 0.9
tbm = bmesh.new(); y = -1800.0
while y < 400:
    r, zc = rng.uniform(2.2, 3.4), rng.uniform(4.6, 6.2); x = 9.5 + rng.uniform(-1, 1)
    m = Matrix.Translation((x, y, zc)) @ Matrix.Diagonal((r * rng.uniform(0.8, 1.0), r, r * rng.uniform(0.75, 0.95), 1))
    bmesh.ops.create_icosphere(tbm, subdivisions=1, radius=1.0, matrix=m)
    y += rng.uniform(10, 15)
tme = bpy.data.meshes.new('trees'); tbm.to_mesh(tme); tbm.free()
trees = refl_only(bpy.data.objects.new('trees', tme), tree_mat)

post_mat = bpy.data.materials.new('posts'); post_mat.use_nodes = True; pn = post_mat.node_tree; pn.nodes.clear()
post_mat.cycles.emission_sampling = 'NONE'
pe = pn.nodes.new('ShaderNodeEmission'); pe.inputs['Color'].default_value = (*lin('#ffcf94'), 1); pe.inputs['Strength'].default_value = 30
po = pn.nodes.new('ShaderNodeOutputMaterial'); pn.links.new(pe.outputs[0], po.inputs['Surface'])
pq, y = [], -1800.0
while y < 400:
    pq.append([(-9.5, y - 0.2, 4.0), (-9.5, y + 0.2, 4.0), (-9.5, y + 0.2, 4.5), (-9.5, y - 0.2, 4.5)])       # facing +x
    y += 16.0
posts = refl_only(street_mesh('posts', pq), post_mat)
for o_, keep in ((facades, a.street != 'none'), (trees, a.street == 'full'), (posts, a.street != 'none')):
    if not keep:
        bpy.data.objects.remove(o_)

# ---------------------------------------------------------------- moving light bar (gills) and roof sweep: reflections only
def strip(name, size, loc, rot):
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc); o = bpy.context.active_object; o.name = name
    o.scale = (*size, 1); bpy.ops.object.transform_apply(location=False, rotation=False, scale=True); o.rotation_euler = rot
    m = bpy.data.materials.new(name); m.use_nodes = True; n = m.node_tree; n.nodes.clear()
    e = n.nodes.new('ShaderNodeEmission'); e.inputs['Color'].default_value = (1, 0.97, 0.93, 1); e.inputs['Strength'].default_value = 0
    oo = n.nodes.new('ShaderNodeOutputMaterial'); n.links.new(e.outputs[0], oo.inputs['Surface'])
    o.data.materials.append(m); o.visible_camera = False; o.visible_shadow = False; o.visible_diffuse = False
    return o, e


bar, bar_e = strip('light_bar', (1.4, 0.15), (2.6, 0, 0.75), (0, math.radians(90), 0))
roofbar, roof_e = strip('roof_sweep', (2.4, 0.12), (0, 0, 3.2), (math.pi, 0, 0))

# ---------------------------------------------------------------- headlight beams on the road
beams = []
for x in (0.62, -0.62):
    ld = bpy.data.lights.new('beam', 'SPOT'); ld.spot_size = 2 * 0.42; ld.spot_blend = 0.6; ld.color = lin('#fff1dc')
    ld.shadow_soft_size = 0.04; ld.energy = 0
    o = bpy.data.objects.new('beam', ld); sc.collection.objects.link(o); o.location = (x, -2.3, 0.69)
    o.rotation_mode = 'QUATERNION'; o.rotation_quaternion = (Vector((x * 1.6, -12, 0)) - o.location).to_track_quat('-Z', 'Y')
    beams.append(ld)

# ---------------------------------------------------------------- camera
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
cam.data.sensor_fit = 'VERTICAL'; cam.data.sensor_height = 24.0; cam.data.clip_start = 0.02; cam.data.clip_end = 5000
cam.rotation_mode = 'QUATERNION'

# ---------------------------------------------------------------- compositor: lamp glow, a soft vignette
sc.use_nodes = True; ct = sc.node_tree; ct.nodes.clear()
rl = ct.nodes.new('CompositorNodeRLayers'); comp = ct.nodes.new('CompositorNodeComposite')
gl = ct.nodes.new('CompositorNodeGlare'); gl.glare_type = 'FOG_GLOW'; gl.quality = 'HIGH'; gl.threshold = 2.0; gl.size = 7; gl.mix = -0.7
ct.links.new(rl.outputs['Image'], gl.inputs['Image'])
el = ct.nodes.new('CompositorNodeEllipseMask'); el.width = 1.15; el.height = 1.15
bl = ct.nodes.new('CompositorNodeBlur'); bl.size_x = bl.size_y = 400; bl.use_relative = False
ct.links.new(el.outputs['Mask'], bl.inputs['Image'])
vr = ct.nodes.new('CompositorNodeMapRange'); vr.inputs['To Min'].default_value = 0.72
ct.links.new(bl.outputs['Image'], vr.inputs['Value'])
mul = ct.nodes.new('CompositorNodeMixRGB'); mul.blend_type = 'MULTIPLY'
ct.links.new(vr.outputs['Value'], mul.inputs[0]); ct.links.new(gl.outputs['Image'], mul.inputs[1]); mul.inputs[2].default_value = (0, 0, 0, 1)
# multiply by black with factor = 1 - vignette: use a second mix instead (fac = mask): image * mask
mix2 = ct.nodes.new('CompositorNodeMixRGB'); mix2.blend_type = 'MULTIPLY'; mix2.inputs[0].default_value = 1.0
ct.nodes.remove(mul)
ct.links.new(gl.outputs['Image'], mix2.inputs[1]); ct.links.new(vr.outputs['Value'], mix2.inputs[2])
ct.links.new(mix2.outputs['Image'], comp.inputs['Image'])

# ---------------------------------------------------------------- animation from the rail
spins = [o for o in bpy.data.objects if o.name.startswith('spin_')]
R_TYRE = 0.343

# the body on its springs: everything of the car but the wheels and brakes hangs from an empty 'body' (roll,
# pitch, heave); the front wheels and their brakes hang from 'steer_LF/RF' (turned about the wheel's vertical)
root = bpy.data.objects['M6_E63']
body_e = bpy.data.objects.new('body', None); sc.collection.objects.link(body_e); body_e.parent = root
body_e.location = (0.0, 0.1, 0.40); body_e.rotation_mode = 'XYZ'
steer = {}
for q in ('LF', 'RF'):
    e = bpy.data.objects['spin_' + q]
    st_ = bpy.data.objects.new('steer_' + q, None); sc.collection.objects.link(st_); st_.parent = root
    st_.location = e.matrix_world.translation.copy(); steer[q] = st_
bpy.context.view_layer.update()


def reparent(o, parent):
    mw = o.matrix_world.copy(); o.parent = parent; o.matrix_parent_inverse = parent.matrix_world.inverted(); o.matrix_world = mw


for o in list(root.children):
    if o in (body_e, *steer.values()) or o.name.startswith('spin_'):
        if o.name in ('spin_LF', 'spin_RF'):
            reparent(o, steer[o.name[-2:]])
        continue
    if o.type == 'MESH' and ('caliper' in o.name or 'brakepad' in o.name or o.name.startswith(('Object063', 'Plane033'))):
        c = o.matrix_world @ (sum((Vector(b) for b in o.bound_box), Vector()) / 8)
        if c.y < 0:
            reparent(o, steer['LF' if c.x > 0 else 'RF'])
        continue
    reparent(o, body_e)
for b in [o for o in bpy.data.objects if o.type == 'LIGHT' and o.name.startswith('beam')]:
    reparent(b, body_e)
bpy.context.view_layer.update()

# Cycles blurs an object's motion by interpolating its transform inside the shutter: translation in a straight
# line, rotation by slerp. The wheel parts came in with their origins at the car's origin, 1.5 m from the axle,
# so a fast wheel swung off its axle inside the shutter (at 40 m/s: see-through, ghosted tyres). With every
# wheel part's origin on its own axle the motion is a pure rotation and the blur is exact.
for e in spins:
    e.rotation_euler = (0, 0, 0)
bpy.context.view_layer.update()
for e in spins:
    axle = e.matrix_world.translation.copy()
    for o in e.children:
        if o.type != 'MESH':
            continue
        if o.data.users > 1:
            o.data = o.data.copy()
        mw = o.matrix_world.copy()
        off = mw.inverted() @ axle
        o.data.transform(Matrix.Translation(-off))
        o.matrix_world = mw @ Matrix.Translation(off)
bpy.context.view_layer.update()


def level_node(mat_name):
    m = bpy.data.materials.get(mat_name)
    return m.node_tree if m else None


def fcurve(id_data, path, frames, values, index=-1):
    ad = id_data.animation_data or id_data.animation_data_create()
    if not ad.action:
        ad.action = bpy.data.actions.new(id_data.name + '_act')
    idx = 0 if index < 0 else index
    fc = ad.action.fcurves.find(path, index=idx)
    if fc:
        ad.action.fcurves.remove(fc)
    fc = ad.action.fcurves.new(path, index=idx)
    fc.keyframe_points.add(len(frames))
    co = []
    for f, v in zip(frames, values):
        co += [f, v]
    fc.keyframe_points.foreach_set('co', co)
    fc.keyframe_points.foreach_set('interpolation', [1] * len(frames))   # LINEAR
    fc.update()


def cam_state(s):
    c = s['cam'][a.orient]
    fov = c['fov']
    if a.orient == 'portrait' and W / H < PORTRAIT_REF:
        fov = math.degrees(2 * math.atan(math.tan(math.radians(fov) / 2) * PORTRAIT_REF / (W / H)))
    pos = t2b(c['pos']); q = (t2b(c['target']) - pos).to_track_quat('-Z', 'Y')
    # Blender's lens shift is in units of the side the sensor fits (the height here, sensor_fit VERTICAL), so
    # dividing by the larger side shifts a landscape frame by H / W of the site's offset: the car sits ~6% of
    # the width further left than on the site. Kept on purpose (the user: small framing differences are fine)
    # so every render matches the 2026-11-22 film; the site's exact framing is `W / 2 / H` and `/ 2`.
    big = max(W, H)
    sx = -c['shift'][0] * W / 2 / big; sy = -c['shift'][1] * H / 2 / big
    lens = cam.data.sensor_height / 2 / math.tan(math.radians(fov) / 2)
    return pos, q, lens, sx, sy


def animate(states, first=1):
    frames = list(range(first, first + len(states)))
    P, Q, L, SX, SY = [], [], [], [], []
    prev = None
    for s in states:
        pos, q, lens, sx, sy = cam_state(s)
        if prev is not None and prev.dot(q) < 0:
            q = -q
        prev = q; P.append(pos); Q.append(q); L.append(lens); SX.append(sx); SY.append(sy)
    for i in range(3):
        fcurve(cam, 'location', frames, [p[i] for p in P], i)
    for i in range(4):
        fcurve(cam, 'rotation_quaternion', frames, [q[i] for q in Q], i)
    fcurve(cam.data, 'lens', frames, L); fcurve(cam.data, 'shift_x', frames, SX); fcurve(cam.data, 'shift_y', frames, SY)
    d0 = states[0]['d']
    D = [s['d'] - d0 for s in states]
    if 'lat' in states[0]:
        # driving dynamics (rail-export.mjs): the camera rig follows the car's path with a lag. Relative to the
        # rig the road (and everything on it) shifts and turns about the car, the panorama turns with it, the
        # car keeps the rest of its lateral offset and heading, the body rolls, pitches and bobs on its springs
        Ls = [s_['lat_s'] for s_ in states]; Ys = [s_['yaw_s'] for s_ in states]
        fcurve(road, 'location', frames, [-L * math.cos(Y) + d * math.sin(Y) for L, Y, d in zip(Ls, Ys, D)], 0)
        fcurve(road, 'location', frames, [L * math.sin(Y) + d * math.cos(Y) for L, Y, d in zip(Ls, Ys, D)], 1)
        fcurve(road, 'rotation_euler', frames, [-Y for Y in Ys], 2)
        fcurve(world.node_tree, 'nodes["%s"].inputs[2].default_value' % mp.name, frames, [HROT + Y for Y in Ys], 2)
        fcurve(root, 'location', frames, [s_['lat'] - s_['lat_s'] for s_ in states], 0)
        fcurve(root, 'rotation_euler', frames, [s_['yaw'] - s_['yaw_s'] for s_ in states], 2)
        fcurve(body_e, 'rotation_euler', frames, [s_['pitch'] for s_ in states], 0)
        fcurve(body_e, 'rotation_euler', frames, [s_['roll'] for s_ in states], 1)
        fcurve(body_e, 'location', frames, [0.40 + s_['heave'] for s_ in states], 2)
        for st_ in steer.values():
            fcurve(st_, 'rotation_euler', frames, [s_['steer'] for s_ in states], 2)
    else:
        fcurve(road, 'location', frames, D, 1)                      # the road (and the lamps) run backwards
    for o in spins:
        fcurve(o, 'rotation_euler', frames, [d / R_TYRE for d in D], 0)
    # angel eyes are the parking lights: always on at night, full with the headlights
    for name, fn in (('angel', lambda s: 0.3 + 0.7 * s['lights']), ('bulb', lambda s: s['lights']), ('disc', lambda s: s['glow'])):
        t = level_node(name)
        if t:
            fcurve(t, 'nodes["level"].outputs[0].default_value', frames, [fn(s) for s in states])
    t = level_node('tail_glow')
    if t:
        fcurve(t, 'nodes["level"].outputs[0].default_value', frames, [1.0 for s in states])
    for b in beams:
        fcurve(b, 'energy', frames, [180.0 * s['lights'] * s['beam'] for s in states])
    wn = world.node_tree
    fcurve(wn, 'nodes["k_env"].outputs[0].default_value', frames, [a.env * (0.15 + 0.85 * s['dim']) for s in states])
    fcurve(wn, 'nodes["k_sky"].outputs[0].default_value', frames, [a.sky * s['dim'] for s in states])
    fcurve(fac_mat.node_tree, 'nodes["k"].outputs[0].default_value', frames, [0.15 + 0.85 * s['dim'] for s in states])
    # light bar along the left flank (gills), front → back; roof sweep over the weave
    fcurve(bar, 'location', frames, [-2.6 + 5.2 * max(0.0, s['bar']) for s in states], 1)
    fcurve(bar_e.id_data, 'nodes["%s"].inputs[1].default_value' % bar_e.name, frames, [40.0 if s['bar'] >= 0 else 0.0 for s in states])
    fcurve(roofbar, 'location', frames, [-1.6 + 3.0 * max(0.0, s['roof']) for s in states], 1)
    fcurve(roof_e.id_data, 'nodes["%s"].inputs[1].default_value' % roof_e.name, frames, [40.0 if s['roof'] >= 0 else 0.0 for s in states])
    sc.frame_start, sc.frame_end = frames[0], frames[-1]
    return frames


def render_frame(f, path):
    if a.jpeg and os.path.basename(path)[0] in 'fl':
        path = path[:-4] + '.jpg'
        sc.render.image_settings.file_format = 'JPEG'; sc.render.image_settings.quality = 95
    else:
        sc.render.image_settings.file_format = 'PNG'
    if os.path.exists(path):
        return
    sc.frame_set(f); sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print('FRAME', f, path, flush=True)


film = RAIL['film']
if a.stills or a.frames:
    animate(film)
if a.save:
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(a.save), copy=True)
if a.stills:
    only = {int(x) for x in a.only.split(',') if x}
    for i, ft in enumerate(STILL_FT):
        if only and i + 1 not in only:
            continue
        k = min((j for j, s in enumerate(film) if s['ft'] is not None and round(s['p']) == i), key=lambda j: abs(film[j]['ft'] - ft))
        render_frame(k + 1, os.path.join(os.path.abspath(a.out), ('d' if a.orient == 'desktop' else 'p') + '%02d.png' % (i + 1)))
if a.frames:
    for part in a.frames.split(','):                 # '0-599' or '590,1141' or '0-9,100-109'
        f0, f1 = (list(map(int, part.split('-'))) * 2)[:2]
        for k in range(f0, f1 + 1):
            render_frame(k + 1, os.path.join(os.path.abspath(a.out), 'f%04d.png' % k))
if a.loops:
    for li, states in enumerate(RAIL['loops']):
        frames = animate(states)
        for j, f in enumerate(frames):
            render_frame(f, os.path.join(os.path.abspath(a.out), 'l%02d_%03d.png' % (li, j)))
