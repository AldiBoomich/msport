"""
Cycles materials for the M6 hero model (bl_build_m6.py assigns them by role; bl_film.py drives the lamps).

Real-world values (photoreal-3d skill → references/materials.md): nothing pure black or white, metals by their
reflectance, one sharp highlight on the paint (the clear coat), glass as a thin pane (reflection by Fresnel +
tinted see-through), so single-sheet windows and lamp covers behave right in a path tracer.

Lamps: the emissive roles carry a Value node labelled "level" (0 = off, 1 = on); bl_film.py keyframes it.
"""
import bpy


def lin(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple((x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4) for x in c)


def _new(name):
    old = bpy.data.materials.get(name)
    if old:
        old.name = name + '_src'            # a source material of the same name stays with its objects
    m = bpy.data.materials.new(name); m.use_nodes = True
    return m, m.node_tree, m.node_tree.nodes['Principled BSDF'], m.node_tree.nodes['Material Output']


def _set(p, **kw):
    for k, v in kw.items():
        k = k.replace('_', ' ')
        p.inputs[k].default_value = (*v, 1.0) if isinstance(v, tuple) and len(v) == 3 else v


def principled(name, base, metallic=0.0, rough=0.5, **kw):
    m, nt, p, out = _new(name)
    _set(p, Base_Color=base, Metallic=metallic, Roughness=rough, **kw)
    return m


def _level(nt, emit_socket, strength):
    """Value node 'level' (0…1) × strength → an emission strength socket."""
    v = nt.nodes.new('ShaderNodeValue'); v.label = 'level'; v.name = 'level'; v.outputs[0].default_value = 0.0
    mul = nt.nodes.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'; mul.inputs[1].default_value = strength
    nt.links.new(v.outputs[0], mul.inputs[0]); nt.links.new(mul.outputs[0], emit_socket)
    return v


def paint(name='paint', base='#07090d', flake_size=0.00035, flake_tilt=0.28):
    """Black Sapphire metallic: a dark blue-black metallic flake base under a mirror clear coat. The flakes
    tilt the base layer's normal per cell (object space, so they stay on the car); the coat stays smooth."""
    m, nt, p, out = _new(name)
    _set(p, Base_Color=lin(base), Metallic=0.75, Roughness=0.36, Coat_Weight=1.0, Coat_Roughness=0.012, Coat_IOR=1.5)
    tc = nt.nodes.new('ShaderNodeTexCoord')
    vor = nt.nodes.new('ShaderNodeTexVoronoi'); vor.inputs['Scale'].default_value = 1.0 / flake_size
    nt.links.new(tc.outputs['Object'], vor.inputs['Vector'])
    sub = nt.nodes.new('ShaderNodeVectorMath'); sub.operation = 'SUBTRACT'; sub.inputs[1].default_value = (0.5, 0.5, 0.5)
    nt.links.new(vor.outputs['Color'], sub.inputs[0])
    sc = nt.nodes.new('ShaderNodeVectorMath'); sc.operation = 'SCALE'; sc.inputs['Scale'].default_value = flake_tilt
    nt.links.new(sub.outputs[0], sc.inputs[0])
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    add = nt.nodes.new('ShaderNodeVectorMath'); add.operation = 'ADD'
    nt.links.new(geo.outputs['Normal'], add.inputs[0]); nt.links.new(sc.outputs[0], add.inputs[1])
    nrm = nt.nodes.new('ShaderNodeVectorMath'); nrm.operation = 'NORMALIZE'
    nt.links.new(add.outputs[0], nrm.inputs[0]); nt.links.new(nrm.outputs[0], p.inputs['Normal'])
    return m


def _fresnel_thin(nt, ior):
    """Schlick's Fresnel on |N·I|: the same from either side of the sheet. Blender's Fresnel node takes a face
    seen from its back as a view from inside the glass (IOR inverted): past ~42° total internal reflection
    turned a cover whose normals face inwards into a black mirror (2026-11-23: half the headlight black
    straight on, the whole lamp gone from the side)."""
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    dot = nt.nodes.new('ShaderNodeVectorMath'); dot.operation = 'DOT_PRODUCT'
    nt.links.new(geo.outputs['Normal'], dot.inputs[0]); nt.links.new(geo.outputs['Incoming'], dot.inputs[1])
    ab = nt.nodes.new('ShaderNodeMath'); ab.operation = 'ABSOLUTE'; nt.links.new(dot.outputs['Value'], ab.inputs[0])
    om = nt.nodes.new('ShaderNodeMath'); om.operation = 'SUBTRACT'; om.inputs[0].default_value = 1.0
    nt.links.new(ab.outputs[0], om.inputs[1])
    p5 = nt.nodes.new('ShaderNodeMath'); p5.operation = 'POWER'; p5.inputs[1].default_value = 5.0
    nt.links.new(om.outputs[0], p5.inputs[0])
    r0 = ((ior - 1) / (ior + 1)) ** 2
    fr = nt.nodes.new('ShaderNodeMath'); fr.operation = 'MULTIPLY_ADD'; fr.inputs[1].default_value = 1 - r0; fr.inputs[2].default_value = r0
    nt.links.new(p5.outputs[0], fr.inputs[0])
    return fr.outputs[0]


def thin_glass(name, tint, ior=1.5, rough=0.0, emit=None, strength=0.0):
    """A thin pane: reflection by Fresnel, the rest passes tinted (no refraction offset, works on single
    sheets and on two-sided panes alike, whichever way their normals face). emit: colour behind the pane that
    lights up with 'level'."""
    m, nt, p, out = _new(name)
    nt.nodes.remove(p)
    fr = _fresnel_thin(nt, ior)
    tr = nt.nodes.new('ShaderNodeBsdfTransparent'); tr.inputs['Color'].default_value = (*tint, 1)
    gl = nt.nodes.new('ShaderNodeBsdfGlossy'); gl.distribution = 'GGX'; gl.inputs['Roughness'].default_value = rough
    mix = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(fr, mix.inputs[0]); nt.links.new(tr.outputs[0], mix.inputs[1]); nt.links.new(gl.outputs[0], mix.inputs[2])
    last = mix
    if emit:
        em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Color'].default_value = (*emit, 1)
        _level(nt, em.inputs['Strength'], strength)
        add = nt.nodes.new('ShaderNodeAddShader')
        nt.links.new(mix.outputs[0], add.inputs[0]); nt.links.new(em.outputs[0], add.inputs[1]); last = add
    nt.links.new(last.outputs[0], out.inputs['Surface'])
    return m


def emissive(name, base, emit, strength, rough=0.2, transmission=0.0):
    m, nt, p, out = _new(name)
    _set(p, Base_Color=base, Roughness=rough, Emission_Color=emit, Transmission_Weight=transmission)
    _level(nt, p.inputs['Emission Strength'], strength)
    return m


def _facing(nt, axis, lo, hi):
    """0…1: how straight the view looks down the lamp's axis (Geometry → Incoming points back to the viewer),
    smoothstep between the cosines lo and hi."""
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    dot = nt.nodes.new('ShaderNodeVectorMath'); dot.operation = 'DOT_PRODUCT'; dot.inputs[1].default_value = axis
    nt.links.new(geo.outputs['Incoming'], dot.inputs[0])
    mr = nt.nodes.new('ShaderNodeMapRange'); mr.interpolation_type = 'SMOOTHSTEP'
    mr.inputs['From Min'].default_value = lo; mr.inputs['From Max'].default_value = hi
    nt.links.new(dot.outputs['Value'], mr.inputs['Value'])
    return mr.outputs[0]


def projector(name='bulb', strength=160.0):
    """Bi-xenon projector lens: clear glass whose light is a beam. Straight into the lamp it burns white; a few
    degrees off it falls to a dim glow, from the side only the glass's reflections remain (a flat emitter
    glowing alike from every side read as a sticker). The film no longer uses it (bl_film.py --lamps real:
    lens_glass, the same from every side); kept for the model file's own lamps (--lamps v5)."""
    m = thin_glass(name, (0.9, 0.93, 1.0))
    nt = m.node_tree; out = nt.nodes['Material Output']; last = out.inputs['Surface'].links[0].from_node
    core = _facing(nt, (0.0, -1.0, 0.0), 0.80, 0.985)                    # within ~10–35° of the axis
    halo = _facing(nt, (0.0, -1.0, 0.0), 0.0, 0.85)
    sq = nt.nodes.new('ShaderNodeMath'); sq.operation = 'POWER'; sq.inputs[1].default_value = 2.0
    nt.links.new(core, sq.inputs[0])
    k = nt.nodes.new('ShaderNodeMath'); k.operation = 'MULTIPLY_ADD'; k.inputs[1].default_value = 0.012; k.inputs[2].default_value = 0.002
    nt.links.new(halo, k.inputs[0])
    tot = nt.nodes.new('ShaderNodeMath'); tot.operation = 'ADD'
    nt.links.new(sq.outputs[0], tot.inputs[0]); nt.links.new(k.outputs[0], tot.inputs[1])
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Color'].default_value = (0.86, 0.92, 1.0, 1)
    lv = nt.nodes.new('ShaderNodeValue'); lv.label = lv.name = 'level'; lv.outputs[0].default_value = 0.0
    mul = nt.nodes.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'; nt.links.new(lv.outputs[0], mul.inputs[0])
    nt.links.new(tot.outputs[0], mul.inputs[1])
    mul2 = nt.nodes.new('ShaderNodeMath'); mul2.operation = 'MULTIPLY'; mul2.inputs[1].default_value = strength
    nt.links.new(mul.outputs[0], mul2.inputs[0]); nt.links.new(mul2.outputs[0], em.inputs['Strength'])
    add = nt.nodes.new('ShaderNodeAddShader')
    nt.links.new(last.outputs[0], add.inputs[0]); nt.links.new(em.outputs[0], add.inputs[1])
    nt.links.new(add.outputs[0], out.inputs['Surface'])
    return m


def ring_light(name='angel', colour=(0.84, 0.91, 1.0), strength=30.0, spill=0.2):
    """Angel eye ring as the real one: a light guide that glows evenly along its whole length and from every
    side, nothing view-dependent (2026-11-23, the user, with photos a02 / a03: "two even bright rings"; a
    glassy Principled ring with emission on top changed with the angle). Pure emission × 'level'.
    spill: its light on everything but the camera (the chrome bowl a centimetre away), as a fraction: at full
    strength the bowl glowed white round the rings and the lamp read as one white blob, not as the photo's
    crisp rings in a silver bowl."""
    m, nt, p, out = _new(name)
    nt.nodes.remove(p)
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Color'].default_value = (*colour, 1)
    lp = nt.nodes.new('ShaderNodeLightPath')
    k = nt.nodes.new('ShaderNodeMath'); k.operation = 'MULTIPLY_ADD'            # camera 1, other rays spill
    k.inputs[1].default_value = 1.0 - spill; k.inputs[2].default_value = spill
    nt.links.new(lp.outputs['Is Camera Ray'], k.inputs[0])
    mul = nt.nodes.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'; nt.links.new(k.outputs[0], mul.inputs[0])
    _level(nt, mul.inputs[1], strength)
    nt.links.new(mul.outputs[0], em.inputs['Strength'])
    nt.links.new(em.outputs[0], out.inputs['Surface'])
    return m


def lens_glass(name='bulb', glow=0.0, colour=(0.86, 0.92, 1.0)):
    """Projector lens as in the photos (a02: a dark glass ball inside the ring): clear glass, the same from every
    side; glow: an even glow from the lamp behind it × 'level' (0: none; even 0.8 read as a white disc). The
    2026-11-22 lens burned at 160 straight on, lit the whole bowl white and went black from the side, so the
    lamp looked different at every angle."""
    m = thin_glass(name, (0.9, 0.93, 1.0), emit=colour, strength=glow)
    m.cycles.emission_sampling = 'NONE'
    return m


def tail_reflector(name='tail_reflector'):
    """The tail lamp's honeycomb behind the red cover: red-anodised metal (not mirror chrome, which showed the
    golden facades), lit faintly from inside by the light guides ('level')."""
    m, nt, p, out = _new(name)
    _set(p, Base_Color=(0.32, 0.025, 0.018), Metallic=1.0, Roughness=0.24, Emission_Color=(1.0, 0.05, 0.02))
    _level(nt, p.inputs['Emission Strength'], 2.0)
    m.cycles.emission_sampling = 'NONE'            # a glow to look at, not a light to sample
    return m


def carbon(name='carbon', tow=0.004):
    """Twill carbon under a clear coat: anisotropic fibres whose direction flips every tow (checker in the
    roof's own top-down UV 'carbon'), a slight brightness step between the two directions."""
    m, nt, p, out = _new(name)
    _set(p, Base_Color=lin('#0c0d0f'), Metallic=0.0, Roughness=0.32, Anisotropic=0.8, Coat_Weight=1.0,
         Coat_Roughness=0.015, Coat_IOR=1.5)
    uv = nt.nodes.new('ShaderNodeUVMap'); uv.uv_map = 'carbon'
    # 2x2 twill: checker on a grid sheared by one cell per row
    sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(uv.outputs[0], sep.inputs[0])
    u = nt.nodes.new('ShaderNodeMath'); u.operation = 'DIVIDE'; u.inputs[1].default_value = tow
    v = nt.nodes.new('ShaderNodeMath'); v.operation = 'DIVIDE'; v.inputs[1].default_value = tow
    nt.links.new(sep.outputs[0], u.inputs[0]); nt.links.new(sep.outputs[1], v.inputs[0])
    s = nt.nodes.new('ShaderNodeMath'); s.operation = 'ADD'; nt.links.new(u.outputs[0], s.inputs[0]); nt.links.new(v.outputs[0], s.inputs[1])
    fl = nt.nodes.new('ShaderNodeMath'); fl.operation = 'FLOOR'; nt.links.new(s.outputs[0], fl.inputs[0])
    hf = nt.nodes.new('ShaderNodeMath'); hf.operation = 'DIVIDE'; hf.inputs[1].default_value = 2.0; nt.links.new(fl.outputs[0], hf.inputs[0])
    fr = nt.nodes.new('ShaderNodeMath'); fr.operation = 'FRACT'; nt.links.new(hf.outputs[0], fr.inputs[0])
    k = nt.nodes.new('ShaderNodeMath'); k.operation = 'MULTIPLY'; k.inputs[1].default_value = 0.5
    nt.links.new(fr.outputs[0], k.inputs[0])                     # 0 or 0.25: fibre direction
    nt.links.new(k.outputs[0], p.inputs['Anisotropic Rotation'])
    tg = nt.nodes.new('ShaderNodeTangent'); tg.direction_type = 'UV_MAP'; tg.uv_map = 'carbon'
    nt.links.new(tg.outputs[0], p.inputs['Tangent'])
    col = nt.nodes.new('ShaderNodeMix'); col.data_type = 'RGBA'
    col.inputs['A'].default_value = (*lin('#0b0c0e'), 1); col.inputs['B'].default_value = (*lin('#16181b'), 1)
    nt.links.new(fr.outputs[0], col.inputs['Factor']); nt.links.new(col.outputs['Result'], p.inputs['Base Color'])
    return m


def exhaust(name='exhaust', steel=0.3, rough=0.34):
    """Brushed stainless tips, sooty inside: ambient occlusion darkens and roughens the inner pipe (polished,
    the lips mirrored the red tail lamps as glowing pink rings; at 0.5 / 0.22 they still shone as bright rings
    in the night film, 2026-11-23)."""
    m, nt, p, out = _new(name)
    _set(p, Base_Color=(steel, steel * 0.98, steel * 0.94), Metallic=1.0, Roughness=rough)
    ao = nt.nodes.new('ShaderNodeAmbientOcclusion'); ao.inputs['Distance'].default_value = 0.06
    ramp = nt.nodes.new('ShaderNodeMapRange'); ramp.inputs['From Min'].default_value = 0.35; ramp.inputs['From Max'].default_value = 0.9
    nt.links.new(ao.outputs['AO'], ramp.inputs['Value'])
    col = nt.nodes.new('ShaderNodeMix'); col.data_type = 'RGBA'
    col.inputs['A'].default_value = (0.02, 0.018, 0.016, 1); col.inputs['B'].default_value = (steel, steel * 0.98, steel * 0.94, 1)
    nt.links.new(ramp.outputs[0], col.inputs['Factor']); nt.links.new(col.outputs['Result'], p.inputs['Base Color'])
    rr = nt.nodes.new('ShaderNodeMapRange'); rr.inputs['To Min'].default_value = 0.7; rr.inputs['To Max'].default_value = rough
    nt.links.new(ramp.outputs[0], rr.inputs['Value']); nt.links.new(rr.outputs[0], p.inputs['Roughness'])
    return m


def badge_tex(name, image):
    """A printed badge (csmx atlas): colour from the image, the grey letters chrome, cut out by its alpha."""
    m, nt, p, out = _new(name)
    tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = image; tex.interpolation = 'Cubic'
    nt.links.new(tex.outputs['Color'], p.inputs['Base Color']); nt.links.new(tex.outputs['Alpha'], p.inputs['Alpha'])
    hsv = nt.nodes.new('ShaderNodeSeparateColor'); hsv.mode = 'HSV'; nt.links.new(tex.outputs['Color'], hsv.inputs[0])
    inv = nt.nodes.new('ShaderNodeMapRange'); inv.inputs['From Min'].default_value = 0.15; inv.inputs['From Max'].default_value = 0.35
    inv.inputs['To Min'].default_value = 1.0; inv.inputs['To Max'].default_value = 0.0
    nt.links.new(hsv.outputs['Green'], inv.inputs['Value']); nt.links.new(inv.outputs[0], p.inputs['Metallic'])
    _set(p, Roughness=0.12, Coat_Weight=0.6, Coat_Roughness=0.02)
    m.blend_method = 'HASHED'
    return m


def build(badge_image=None):
    """All role materials, by role name."""
    M = {
        'paint': paint(),
        'carbon': carbon(),
        'chrome': principled('chrome', (0.62, 0.62, 0.63), 1.0, 0.035),
        'reflector': principled('reflector', (0.7, 0.7, 0.72), 1.0, 0.06),
        'mirror': principled('mirror', (0.75, 0.75, 0.76), 1.0, 0.0),
        # headlight bowl: smooth enough to mirror the rings as rings (rough, it spread them into a white sheet)
        'housing': principled('housing', (0.45, 0.46, 0.48), 1.0, 0.08),
        'glass': thin_glass('glass', (0.55, 0.6, 0.59)),
        'lamp_glass': thin_glass('lamp_glass', (0.96, 0.96, 0.96)),
        'lamp_inner': thin_glass('lamp_inner', (0.9, 0.9, 0.9), rough=0.08),
        'lamp_red': thin_glass('lamp_red', (0.62, 0.025, 0.02)),
        'amber': principled('amber', lin('#d06a10'), 0.0, 0.25, Transmission_Weight=0.4),
        'angel': emissive('angel', (0.8, 0.8, 0.82), (0.82, 0.9, 1.0), 14.0, rough=0.15, transmission=0.6),
        'bulb': projector(),
        'tail_glow': emissive('tail_glow', (0.35, 0.02, 0.02), (1.0, 0.035, 0.015), 55.0, rough=0.35, transmission=0.3),
        'tail_reflector': tail_reflector(),
        'plastic': principled('plastic', lin('#121315'), 0.0, 0.55),
        'grille': principled('grille', lin('#0d0e0f'), 0.0, 0.3),
        'trim_gloss': principled('trim_gloss', lin('#0b0c0d'), 0.0, 0.08, Coat_Weight=0.5),
        'frit': principled('frit', lin('#0a0a0b'), 0.0, 0.22),
        'interior': principled('interior', lin('#16171a'), 0.0, 0.55),
        'underbody': principled('underbody', lin('#0e0e0e'), 0.0, 0.85),
        'tyre': principled('tyre', lin('#1b1b1c'), 0.0, 0.78, Specular_IOR_Level=0.35),
        'rim': principled('rim', lin('#b9bcbf'), 1.0, 0.3),
        'disc': emissive('disc', (0.42, 0.42, 0.43), (1.0, 0.1, 0.01), 0.22, rough=0.38),
        'caliper': principled('caliper', lin('#8d8f92'), 0.7, 0.42),
        'exhaust': exhaust(),
        'badge_black': principled('badge_black', lin('#0c0c0c'), 0.0, 0.15, Coat_Weight=1.0),
        'badge_white': principled('badge_white', lin('#e4e4e4'), 0.0, 0.2, Coat_Weight=1.0),
        'badge_blue': principled('badge_blue', lin('#1c69d4'), 0.0, 0.2, Coat_Weight=1.0),
        # M stripes: enamel under a clear coat
        'badge_m_light': principled('badge_m_light', lin('#0a96d6'), 0.0, 0.25, Coat_Weight=1.0, Coat_Roughness=0.02),
        'badge_m_dark': principled('badge_m_dark', lin('#283087'), 0.0, 0.25, Coat_Weight=1.0, Coat_Roughness=0.02),
        'badge_m_red': principled('badge_m_red', lin('#e1261c'), 0.0, 0.25, Coat_Weight=1.0, Coat_Roughness=0.02),
    }
    M['disc'].node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value = 1.0
    if badge_image:
        M['badge_tex'] = badge_tex('badge_tex', badge_image)
    return M
