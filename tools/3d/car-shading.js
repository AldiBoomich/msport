// Baked shading for the M6 model (tools/3d/bl_bake_ao.py): the theme imports this file as is.
//
// applyBakedAO(root)  — every mesh carries a per-vertex `_ao` attribute (ambient occlusion baked in
//   Cycles). It darkens only the indirect light (environment diffuse + reflections, clear coat
//   included), never the colour or the direct lights: arches, panel gaps, the space under the bumper
//   and between the spokes get depth, and reflections stop "floating" on surfaces that cannot see the sky.
//   Call it last, after every other material change (it chains onto existing onBeforeCompile hooks).
// contactShadow(texture) — the baked ground shadow (car-shadow.png, 3.4 x 6.4 m) as a multiply decal.
import * as THREE from 'three';

// specularOf(material) → how much the bake darkens that material's reflections (default `specular`).
//   The paint passes 0: the per-vertex bake is too coarse on the big panels and printed dark blotches
//   on the doors and fenders; on the paint it darkens the (near-black) diffuse only.
export function applyBakedAO(root, { strength = 1, specular = 0.85, specularOf = () => specular } = {}) {
  const uses = new Map(); // material → meshes
  root.traverse(o => {
    if (!o.isMesh) return;
    for (const m of [].concat(o.material)) { if (!uses.has(m)) uses.set(m, []); uses.get(m).push(o); }
  });
  let patched = 0;
  for (const [m, meshes] of uses) {
    if (!meshes.some(o => o.geometry.attributes._ao)) continue; // e.g. the procedural brake parts
    // a material shared with a mesh that has no bake: give that mesh a neutral AO of 1
    for (const o of meshes) {
      if (!o.geometry.attributes._ao) o.geometry.setAttribute('_ao', new THREE.Float32BufferAttribute(new Float32Array(o.geometry.attributes.position.count).fill(1), 1));
    }
    const prev = m.onBeforeCompile;
    const key = (m.customProgramCacheKey ? m.customProgramCacheKey() : prev.toString()) + '|bakedAO';
    m.onBeforeCompile = (sh, r) => {
      prev.call(m, sh, r);
      sh.uniforms.uAOk = { value: new THREE.Vector2(strength, specularOf(m)) };
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float _ao;\nvarying float vBakedAO;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBakedAO = _ao;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vBakedAO;\nuniform vec2 uAOk;')
        .replace('#include <aomap_fragment>', `#include <aomap_fragment>
{
  float bAO = clamp(mix(1.0, vBakedAO, uAOk.x), 0.0, 1.0);
  float sAO = mix(1.0, bAO, uAOk.y);
  reflectedLight.indirectDiffuse *= bAO;
  reflectedLight.indirectSpecular *= sAO;
  #if defined( USE_CLEARCOAT )
    clearcoatSpecularIndirect *= sAO;
  #endif
  #if defined( USE_SHEEN )
    sheenSpecularIndirect *= bAO;
  #endif
}`);
    };
    m.customProgramCacheKey = () => key;
    m.needsUpdate = true;
    patched++;
  }
  return patched;
}

export function contactShadow(texture, { width = 3.4, length = 6.4, gamma = 1.35 } = {}) {
  texture.colorSpace = THREE.NoColorSpace; // AO values are linear
  const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, blending: THREE.MultiplyBlending, premultipliedAlpha: true, toneMapped: false, fog: false });
  mat.onBeforeCompile = sh => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
diffuseColor.rgb = vec3(pow(diffuseColor.r, ${gamma.toFixed(2)}));`);
  };
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, length), mat);
  mesh.rotation.x = -Math.PI / 2; // texture top (rear of the car) → −z
  mesh.position.y = 0.006;
  mesh.renderOrder = 1;
  mesh.name = 'contact_shadow';
  return mesh;
}

// Metallic paint as two layers (MeshPhysicalMaterial with clearcoat = 1):
//   base  — a near-black binder that hardly reflects (specularIntensity ~0.2) with metal flakes in it:
//           tiny mirrors (cells of `cell` m), each tilted at random, so they sparkle one by one in a
//           highlight and add a soft tinted glow round it;
//   top   — the clear coat, a smooth mirror (its normal is never touched by the flakes).
// That split is what makes black paint look deep instead of satin plastic: a sharp white reflection
// on top, a dark sparkling layer under it. Where a flake gets smaller than a pixel the flakes blend
// into their average (more metal, rougher), so nothing shimmers when the camera moves.
// paintFlakes(shader, opts) patches a paint shader in onBeforeCompile; it needs `varying vec3 vWp`
// (world position) and must be called after any other patch that edits the same chunks, so the
// others (carbon roof) can override it. FLAKE_MASK (a GLSL expression, 1 = paint) can exclude areas.
export function paintFlakes(sh, {
  cell = 0.0009, cover = 0.3, tilt = 0.3,
  binder = [0.0024, 0.0029, 0.0042], flake = [0.028, 0.032, 0.043],
  binderRough = 0.55, flakeRough = 0.2, farRough = 0.34, mask = '1.0',
} = {}) {
  const v3 = a => `vec3(${a.map(x => x.toFixed(4)).join(', ')})`;
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <common>', `#include <common>
vec3 flakeHash(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.xxy + p.yxx) * p.zyx);
}`)
    .replace('#include <color_fragment>', `#include <color_fragment>
vec3 fP = vWp / ${cell.toFixed(5)};
vec3 fR = flakeHash(floor(fP));
float fAA = 1.0 - smoothstep(0.7, 1.8, length(fwidth(fP)));   // 1 = flakes resolved, 0 = averaged
float fOn = step(${(1 - cover).toFixed(3)}, fR.x);
float fMix = mix(${cover.toFixed(3)}, fOn, fAA) * (${mask});
diffuseColor.rgb = mix(${v3(binder)}, ${v3(flake)}, fMix);`)
    .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor = mix(roughnessFactor, mix(${farRough.toFixed(3)}, mix(${binderRough.toFixed(3)}, ${flakeRough.toFixed(3)}, fOn), fAA), ${mask});`)
    .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
metalnessFactor = mix(metalnessFactor, fMix, ${mask});`)
    .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
normal = normalize(normal + (viewMatrix * vec4((fR.yzx * 2.0 - 1.0) * ${tilt.toFixed(3)}, 0.0)).xyz * fOn * fAA * (${mask}));`);
}

// Smooth reflections on a lumpy body. The source model's panels are slightly wavy (hand-modelled,
// then subdivided), and a mirror clear coat shows every wave as a wobble in the reflections — the
// clearest "game model" tell. This diffuses the vertex normals over the surface (each pass averages a
// vertex normal with its neighbours'), which removes the small waves and keeps the large curvature.
// Neighbours across a crease (normals more than `featureAngle` apart: shut lines, the shoulder line,
// panel edges) are ignored, so sharp design lines stay sharp. Vertices split at UV seams are joined
// by position. Only normals change, never the shape. ~0.3 s for the M6 paint at 24 passes.
export function smoothNormals(root, { match = o => o.userData.matName === 'paint', iterations = 24, featureAngle = 32 } = {}) {
  const cosF = Math.cos(featureAngle * Math.PI / 180);
  const done = new WeakSet();
  let verts = 0;
  root.traverse(o => {
    if (!o.isMesh || !match(o) || done.has(o.geometry) || !o.geometry.index || !o.geometry.attributes.normal) return;
    const g = o.geometry; done.add(g);
    const pos = g.attributes.position, nrm = g.attributes.normal, idx = g.index.array, n = pos.count;
    // vertices that share a position form a group
    const gid = new Int32Array(n), keys = new Map();
    for (let i = 0; i < n; i++) {
      const k = pos.getX(i) + ',' + pos.getY(i) + ',' + pos.getZ(i);
      let id = keys.get(k); if (id === undefined) { id = keys.size; keys.set(k, id); } gid[i] = id;
    }
    const G = keys.size;
    // group members (CSR)
    const mStart = new Int32Array(G + 1); for (let i = 0; i < n; i++) mStart[gid[i] + 1]++;
    for (let i = 0; i < G; i++) mStart[i + 1] += mStart[i];
    const mList = new Int32Array(n), mFill = mStart.slice(0, G);
    for (let i = 0; i < n; i++) mList[mFill[gid[i]]++] = i;
    // group adjacency from the triangle edges (CSR, duplicates removed)
    const adj = Array.from({ length: G }, () => new Set());
    for (let t = 0; t < idx.length; t += 3) {
      const a = gid[idx[t]], b = gid[idx[t + 1]], c = gid[idx[t + 2]];
      adj[a].add(b); adj[a].add(c); adj[b].add(a); adj[b].add(c); adj[c].add(a); adj[c].add(b);
    }
    const aStart = new Int32Array(G + 1); for (let i = 0; i < G; i++) aStart[i + 1] = aStart[i] + adj[i].size + 1;
    const aList = new Int32Array(aStart[G]);
    for (let i = 0; i < G; i++) { let p = aStart[i]; aList[p++] = i; for (const j of adj[i]) aList[p++] = j; }
    let N = new Float32Array(n * 3), M = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const x = nrm.getX(i), y = nrm.getY(i), z = nrm.getZ(i), l = Math.hypot(x, y, z) || 1;
      N[i * 3] = x / l; N[i * 3 + 1] = y / l; N[i * 3 + 2] = z / l;
    }
    const N0 = N.slice();
    for (let it = 0; it < iterations; it++) {
      for (let v = 0; v < n; v++) {
        // the crease test uses the original normals, so smoothing never creeps across a crease
        const ox = N0[v * 3], oy = N0[v * 3 + 1], oz = N0[v * 3 + 2];
        let sx = 0, sy = 0, sz = 0;
        const gv = gid[v];
        for (let a = aStart[gv]; a < aStart[gv + 1]; a++) {
          const gg = aList[a];
          for (let m = mStart[gg]; m < mStart[gg + 1]; m++) {
            const u = mList[m];
            if (ox * N0[u * 3] + oy * N0[u * 3 + 1] + oz * N0[u * 3 + 2] < cosF) continue;
            sx += N[u * 3]; sy += N[u * 3 + 1]; sz += N[u * 3 + 2];
          }
        }
        const l = Math.hypot(sx, sy, sz) || 1;
        M[v * 3] = sx / l; M[v * 3 + 1] = sy / l; M[v * 3 + 2] = sz / l;
      }
      [N, M] = [M, N];
    }
    g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
    verts += n;
  });
  return verts;
}
