// Wheel detail for the M6 model: the theme imports this file as is.
//   detailWheels(root) after the materials are set up.
//
// The source model's wheels are game-level: a smooth tyre with a 256 px texture, a 156-triangle
// brake disc with a 128 px picture of holes, and the caliper drawn on a flat card. This module:
//  - tyre: keeps the mesh, draws tread grooves, sipes, shoulder blocks, a rim protector rib and
//    raised sidewall lettering procedurally in the shader (sharp at any distance, nothing to download);
//  - brake: hides the card disc and builds a real one: two drilled friction plates with radial vanes
//    in the gap, a hat, and a caliper (fixed to the car, the disc turns with the wheel);
//  - rim: painted silver alloy under clear coat (keeps the model's atlas for the centre cap / nuts).
//
// Wheel space: each wheel_XX node sits at the axle centre, axle along x, metres; the car's left is +x.
// In the shaders "p-space" is wheel space mirrored so that +x always points out of the car and the
// angle runs clockwise as seen from outside (sidewall text reads correctly on both sides).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// node-space → p-space and back is the same reflection: (o·x, y, −o·z)
const mirror = (v, o) => v.set(o * v.x, v.y, -o * v.z);

export function detailWheels(root, { maxAnisotropy = 8 } = {}) {
  const nodes = [];
  root.traverse(o => { if (/^wheel_[LR][FB]$/.test(o.name)) nodes.push(o); });
  if (!nodes.length) return null;

  const report = {};
  let rimMat = null, mainDims = null;
  const tyres = [];
  const sidewall = sidewallTexture(maxAnisotropy);
  const brakeMats = brakeMaterials();

  for (const node of nodes) {
    node.updateMatrix();
    const out = Math.sign(node.position.x) || 1; // +1 left wheels, −1 right wheels
    const front = node.name.endsWith('F');
    let discBox = null, hubP = Infinity;
    report[node.name] = {};
    for (const m of [...node.children]) {
      if (!m.isMesh) continue;
      m.updateMatrix();
      if (/^brake_disc/.test(m.name)) {
        if (!/back/.test(m.name)) {
          m.geometry.computeBoundingBox();
          discBox = m.geometry.boundingBox.clone().applyMatrix4(m.matrix);
        }
        m.visible = false; // replaced below
      } else if (/^tyre/.test(m.name)) {
        const dims = prepTyre(m, out);
        tyres.push(m);
        // the sidewall band is measured on the main tyre mesh only (the _back mesh is the hidden inner skin)
        if (!/back/.test(m.name)) { report[node.name].tyre = dims; mainDims ||= dims; }
      } else if (/^rim/.test(m.name)) {
        if (!rimMat) rimMat = rimMaterial(m.material.map);
        m.material = rimMat;
        // innermost point of the rim centre = the hub mounting face, where the brake hat ends
        const p = m.geometry.attributes.position, v = new THREE.Vector3();
        for (let i = 0; i < p.count; i++) {
          v.fromBufferAttribute(p, i).applyMatrix4(m.matrix);
          const r = Math.hypot(v.y, v.z);
          if (r > 0.04 && r < 0.075) hubP = Math.min(hubP, out * v.x);
        }
      }
    }
    if (!discBox) continue;

    // brake: sized and placed from the hidden card disc
    const ax = (discBox.min.x + discBox.max.x) / 2;
    const ro = Math.min(0.19, Math.max(discBox.max.y - discBox.min.y, discBox.max.z - discBox.min.z) / 2);
    const T = front ? 0.036 : 0.026;
    const hub = Math.max(T / 2 + 0.008, Math.min(T / 2 + 0.042, hubP - out * ax - 0.001));
    const spec = { ro, ri: ro - 0.058, T, plate: front ? 0.0095 : 0.008, hub };
    report[node.name].brake = { ax: +ax.toFixed(4), ro: +ro.toFixed(4), hub: +hub.toFixed(4) };

    // local frame: +x = out of the car (rotated 180° about y on the right side: a proper rotation)
    const spin = new THREE.Group();
    spin.name = `brake_disc_${node.name.slice(6)}`;
    spin.position.set(ax, 0, 0);
    if (out < 0) spin.rotation.y = Math.PI;
    spin.add(...buildDisc(spec, brakeMats));
    node.add(spin); // turns with the wheel

    const fixed = new THREE.Group();
    fixed.name = `brake_caliper_${node.name.slice(6)}`;
    fixed.position.copy(node.position).add(new THREE.Vector3(ax, 0, 0));
    if (out < 0) fixed.rotation.y = Math.PI;
    // trailing side of the disc, a little above the axle (node space y = 0.26, z = −0.97)
    const phi = Math.atan2(out * -0.97, 0.26);
    fixed.add(...buildCaliper(spec, phi, brakeMats));
    node.parent.add(fixed); // does not turn
  }
  if (mainDims) { const mat = tyreMaterial(sidewall, mainDims); tyres.forEach(t => { t.material = mat; }); }
  return report;
}

// ---------------------------------------------------------------- tyre

function prepTyre(mesh, out) {
  const g = mesh.geometry = mesh.geometry.clone();
  const pos = g.attributes.position, nor = g.attributes.normal;
  const nm = new THREE.Matrix3().getNormalMatrix(mesh.matrix);
  const tp = new Float32Array(pos.count * 3), tn = new Float32Array(pos.count * 3), to = new Float32Array(pos.count).fill(out);
  const v = new THREE.Vector3(), n = new THREE.Vector3();
  let R = 0, bead = 9, aOut = 0;
  for (let i = 0; i < pos.count; i++) {
    mirror(v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrix), out);
    mirror(n.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize(), out);
    v.toArray(tp, i * 3); n.toArray(tn, i * 3);
    const r = Math.hypot(v.y, v.z);
    R = Math.max(R, r);
    if (v.x > 0) bead = Math.min(bead, r);
  }
  for (let i = 0; i < pos.count; i++) { const r = Math.hypot(tp[i * 3 + 1], tp[i * 3 + 2]); if (r > R - 0.006) aOut = Math.max(aOut, Math.abs(tp[i * 3])); }
  g.setAttribute('aTp', new THREE.BufferAttribute(tp, 3));
  g.setAttribute('aTn', new THREE.BufferAttribute(tn, 3));
  g.setAttribute('aOut', new THREE.BufferAttribute(to, 1));
  return { R: +R.toFixed(4), bead: +bead.toFixed(4), treadHalf: +aOut.toFixed(4) };
}

// raised lettering, white on black; u = angle (clockwise from the top, seen from outside), v = radius (top = outer)
function sidewallTexture(maxAnisotropy) {
  const c = document.createElement('canvas'); c.width = 4096; c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = '#fff'; x.textBaseline = 'middle';
  // texels are ~0.44 mm along the circle and ~0.12 mm across: squeeze glyphs to keep their proportions
  const SQ = 0.27;
  const put = (t, u, v, px, w = 900) => { x.save(); x.translate(u, v); x.scale(SQ, 1); x.font = `${w} ${px}px "Arial Black", Arial, sans-serif`; x.fillText(t, 0, 0); x.restore(); };
  for (const o of [0, 2048]) {
    put('MICHELIN', o + 180, 132, 190);
    put('PILOT SPORT', o + 780, 92, 96, 800);
    put('255/40 ZR19 96Y', o + 780, 182, 78, 700);
    put('★', o + 1280, 130, 120, 400);
    put('TUBELESS  RADIAL  X', o + 1420, 128, 62, 700);
    put('DOT  M5 3A  4X  0807', o + 1720, 128, 56, 700);
  }
  const t = new THREE.CanvasTexture(c);
  // flipY off: canvas top row = v 0 = the outer edge of the band (letters stand with their tops outwards)
  t.flipY = false; t.wrapS = THREE.RepeatWrapping; t.anisotropy = maxAnisotropy;
  return t;
}

function tyreMaterial(sidewall, d) {
  // rubber reflects little (lower F0 than the default 0.04) — otherwise the night strips turn it grey
  const m = new THREE.MeshPhysicalMaterial({ name: 'tyre', color: 0xffffff, roughness: 0.8, metalness: 0, specularIntensity: 0.45 });
  // groove pitch divides the circumference exactly: no seam
  const pitch = (2 * Math.PI * d.R) / Math.round((2 * Math.PI * d.R) / 0.032);
  // lettering band: middle of the sidewall
  const top = d.bead + (d.R - d.bead) * 0.62, bot = d.bead + (d.R - d.bead) * 0.22;
  if (typeof location !== 'undefined' && /tyredebug=1/.test(location.search)) m.defines = { TYRE_DEBUG: '' };
  // driven by chapter-fx.js: 0…1 while the wheel spins fast, lettering and cross grooves fade to their average
  m.userData.spin = { blur: { value: 0 } };
  m.onBeforeCompile = sh => {
    sh.uniforms.uSpinBlur = m.userData.spin.blur;
    sh.uniforms.uSide = { value: sidewall };
    sh.uniforms.uDim = { value: new THREE.Vector4(d.R, pitch, bot, top) };
    sh.uniforms.uBead = { value: d.bead };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
attribute vec3 aTp; attribute vec3 aTn; attribute float aOut;
varying vec3 vTp; varying vec3 vTn; varying vec3 vAxV; varying vec3 vRadV;`)
      .replace('#include <project_vertex>', `#include <project_vertex>
vTp = aTp; vTn = aTn;
vAxV = normalize(mat3(modelViewMatrix) * vec3(aOut, 0.0, 0.0));
vRadV = mat3(modelViewMatrix) * vec3(0.0, aTp.y, -aOut * aTp.z);`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform sampler2D uSide; uniform vec4 uDim; uniform float uBead; uniform float uSpinBlur;
varying vec3 vTp; varying vec3 vTn; varying vec3 vAxV; varying vec3 vRadV;
// 1 inside a groove centred at c of width w along x (antialiased by aa)
float gLine(float x, float c, float w, float aa) { return 1.0 - smoothstep(-aa, aa, abs(x - c) - 0.5 * w); }
// periodic lateral grooves along the arc s
float gLat(float s, float pitch, float w, float aa) { float d = abs(fract(s / pitch + 0.5) - 0.5) * pitch; return mix(1.0 - smoothstep(-aa, aa, d - 0.5 * w), w / pitch, uSpinBlur); }
// tread: 1 = groove bottom, 0 = rubber surface. q = (axial m, + = outer shoulder; arc m)
float tread(vec2 q, float aa) {
  float a = q.x, s = q.y, P = uDim.y;
  float g = gLine(a, -0.071, 0.0125, aa);
  g = max(g, gLine(a, -0.019, 0.0095, aa));
  g = max(g, gLine(a, 0.039, 0.0130, aa));
  float t = max(a - 0.0465, 0.0);                       // outer shoulder: curved slots
  g = max(g, gLat(s - (0.32 * t + 3.2 * t * t), P, 0.0045, aa) * smoothstep(0.045, 0.0475, a));
  float ti = max(-0.078 - a, 0.0);                      // inner shoulder: straighter slots, offset half a pitch
  g = max(g, gLat(s + 0.5 * P + 0.24 * ti + 1.6 * ti * ti, P, 0.005, aa) * (1.0 - smoothstep(-0.079, -0.0765, a)));
  float s1 = gLat(s - 0.55 * a, P, 0.0012, aa) * smoothstep(-0.0135, -0.011, a) * (1.0 - smoothstep(0.026, 0.029, a));
  float s2 = gLat(s + 0.5 * P + 0.45 * a, P, 0.0012, aa) * smoothstep(-0.0635, -0.061, a) * (1.0 - smoothstep(-0.034, -0.031, a));
  return max(g, max(s1, s2) * 0.7);
}
float bump(float x, float c, float w) { float t = clamp(1.0 - abs(x - c) / w, 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
vec3 tP = vTp; vec3 tN = normalize(vTn);
float tR = length(tP.yz), tTh = atan(tP.z, tP.y);
float tAA = length(fwidth(tP)) * 0.7 + 1e-6;           // one pixel in metres (no seam at ±pi)
float wTread = smoothstep(0.55, 0.85, dot(tN, vec3(0.0, tP.yz / tR))) * smoothstep(uDim.x - 0.03, uDim.x - 0.012, tR);
float wSide = smoothstep(0.5, 0.8, tN.x);              // outer sidewall
vec2 tQ = vec2(tP.x, tTh * uDim.x);
float tG = tread(tQ, tAA) * wTread;
float sV = (uDim.w - tR) / (uDim.w - uDim.z);
vec2 sUV = vec2(tTh / 6.2831853 + 0.5, sV);
float sIn = step(0.0, sV) * step(sV, 1.0) * wSide;
float sL = mix(texture2D(uSide, sUV).r, 0.08, uSpinBlur) * sIn;
float rib = bump(tR, uBead + 0.009, 0.004) * wSide;      // rim protector rib
diffuseColor.rgb = vec3(0.019) * (1.0 - 0.6 * tG) * (1.0 + 0.35 * sL + 0.2 * rib);
#ifdef TYRE_DEBUG
diffuseColor.rgb = vec3(wSide, wTread, sL + sIn * 0.3);
#endif`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor = mix(mix(0.62, 0.86, wTread), 0.97, tG);
roughnessFactor = mix(roughnessFactor, 0.78, sL);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
{
  vec3 Av = normalize(vAxV), Rv = normalize(vRadV);
  vec3 Tv = -normalize(cross(Av, Rv));                 // direction of increasing arc (derived for the mirror)
  float e = 0.0005;
  float ga = (tread(tQ + vec2(e, 0.0), tAA) - tread(tQ - vec2(e, 0.0), tAA)) / (2.0 * e);
  float gs = (tread(tQ + vec2(0.0, e), tAA) - tread(tQ - vec2(0.0, e), tAA)) / (2.0 * e);
  normal = normalize(normal + 0.0016 * (ga * Av + gs * Tv) * wTread);
  // raised letters and the rib: height h → n = N − h'
  vec2 dt = vec2(1.0 / 4096.0, 1.0 / 256.0);
  float hu = texture2D(uSide, sUV + vec2(dt.x, 0.0)).r - texture2D(uSide, sUV - vec2(dt.x, 0.0)).r;
  float hv = texture2D(uSide, sUV + vec2(0.0, dt.y)).r - texture2D(uSide, sUV - vec2(0.0, dt.y)).r;
  float dS = hu / (2.0 * dt.x * 6.2831853 * tR);       // per metre of arc
  float dR = -hv / (2.0 * dt.y * (uDim.w - uDim.z));   // per metre of radius (v runs inwards)
  float dRib = (bump(tR + 0.0005, uBead + 0.009, 0.004) - bump(tR - 0.0005, uBead + 0.009, 0.004)) / 0.001;
  normal = normalize(normal - (0.0005 * (dS * Tv + dR * Rv) * sIn * (1.0 - uSpinBlur) + 0.0025 * dRib * Rv * wSide));
}`);
  };
  return m;
}

// ---------------------------------------------------------------- rim

function rimMaterial(map) {
  // painted silver alloy (style 167 double spoke): metallic base coat + clear coat
  return new THREE.MeshPhysicalMaterial({ name: 'rim', map, color: 0xd9dce0, metalness: 0.85, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.04 });
}

// ---------------------------------------------------------------- brake

function brakeMaterials() {
  const disc = new THREE.MeshPhysicalMaterial({ name: 'brake_disc', color: 0x9a9da2, metalness: 1, roughness: 0.3, side: THREE.DoubleSide });
  // driven by chapter-fx.js: blur 0…1 (the holes fade to their average while the wheel spins fast),
  // glow 0…1 (hard braking: the friction ring heats from dull red to orange)
  disc.userData.spin = { blur: { value: 0 }, glow: { value: 0 } };
  disc.onBeforeCompile = sh => {
    sh.uniforms.uSpinBlur = disc.userData.spin.blur;
    sh.uniforms.uGlow = disc.userData.spin.glow;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vDp; varying vec3 vDn;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvDp = position; vDn = normal;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vDp; varying vec3 vDn;
uniform vec2 uBand; // inner, outer radius of the friction ring
uniform float uSpinBlur, uGlow;
// cross-drilled pattern: 30 spiral arms x 3 rows; returns distance to the nearest hole centre (m)
float holeDist(float r, float ph) {
  float N = 30.0, step_ = 6.2831853 / N, best = 1.0;
  for (int j = 0; j < 3; j++) {
    float rj = mix(uBand.x + 0.013, uBand.y - 0.012, float(j) / 2.0);
    float off = float(j) * step_ / 3.0;
    float k = floor((ph - off) / step_ + 0.5);
    float c = k * step_ + off;
    best = min(best, length(vec2(r - rj, (ph - c) * rj)));
  }
  return best;
}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
float dR = length(vDp.yz), dPh = atan(vDp.z, vDp.y);
float face = smoothstep(0.7, 0.9, abs(normalize(vDn).x)) * step(uBand.x, dR);
float hd = holeDist(dR, dPh);
float dAA = fwidth(dR) + 1e-6;
float hole = (1.0 - smoothstep(0.0031 - dAA, 0.0031 + dAA, hd)) * face;
float chamf = (1.0 - smoothstep(0.0040 - dAA, 0.0040 + dAA, hd)) * face - hole;
hole = mix(hole, 0.06 * face, uSpinBlur); chamf *= 1.0 - uSpinBlur;   // spinning: the holes blur into a grey ring
float ring = 0.5 + 0.5 * sin(dR * 9000.0);              // lathe marks, fade before they alias
float mk = 1.0 - smoothstep(0.15, 0.6, fwidth(dR * 9000.0 / 6.2831853));
float pad = smoothstep(uBand.x + 0.002, uBand.x + 0.006, dR) * (1.0 - smoothstep(uBand.y - 0.004, uBand.y - 0.001, dR));
vec3 steel = mix(vec3(0.30, 0.29, 0.28), vec3(0.62, 0.63, 0.65), pad * face);   // bright pad track, darker edges
steel *= 1.0 - 0.08 * ring * mk * face;
diffuseColor.rgb = mix(steel, vec3(0.012), hole);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor = mix(mix(0.55, 0.24, pad * face), 1.0, hole);`)
      // heat: hottest in the middle of the pad track, never in the holes; dull red → orange
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
if (uGlow > 0.0) {
  float track = pad * face * (1.0 - hole) * (0.55 + 0.45 * sin(3.14159 * clamp((dR - uBand.x) / (uBand.y - uBand.x), 0.0, 1.0)));
  vec3 hot = mix(vec3(0.5, 0.01, 0.0), vec3(1.0, 0.11, 0.004), uGlow);
  totalEmissiveRadiance += hot * track * uGlow * uGlow * 1.1;
}`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
{ // chamfer round each hole: tilt the normal towards the hole centre
  float ph2 = dPh + 0.0005 / max(dR, 0.01);
  float hd2 = holeDist(dR + 0.0005, dPh), hd3 = holeDist(dR, ph2);
  vec3 tr = normalize(vec3(0.0, vDp.y, vDp.z)), tt = normalize(vec3(0.0, -vDp.z, vDp.y));
  vec3 gl = ((hd2 - hd) * tr + (hd3 - hd) * tt) / 0.0005;
  normal = normalize(normal - normalMatrix_frag(gl) * chamf * 0.9);
}`);
    // fragment shaders have no normalMatrix: pass the view-space basis instead
    sh.vertexShader = sh.vertexShader
      .replace('varying vec3 vDp; varying vec3 vDn;', 'varying vec3 vDp; varying vec3 vDn; varying vec3 vDy; varying vec3 vDz;')
      .replace('vDp = position; vDn = normal;', 'vDp = position; vDn = normal; vDy = normalize(normalMatrix * vec3(0.0, 1.0, 0.0)); vDz = normalize(normalMatrix * vec3(0.0, 0.0, 1.0));');
    sh.fragmentShader = sh.fragmentShader
      .replace('varying vec3 vDp; varying vec3 vDn;', 'varying vec3 vDp; varying vec3 vDn; varying vec3 vDy; varying vec3 vDz;\n#define normalMatrix_frag(v) (vDy * (v).y + vDz * (v).z)');
    sh.uniforms.uBand = disc.userData.band;
  };
  disc.userData.band = { value: new THREE.Vector2(0.13, 0.187) };
  return {
    disc,
    vane: new THREE.MeshStandardMaterial({ name: 'brake_vane', color: 0x2a2826, metalness: 1, roughness: 0.6 }),
    hat: new THREE.MeshPhysicalMaterial({ name: 'brake_hat', color: 0x34363a, metalness: 0.9, roughness: 0.42, clearcoat: 0.3, side: THREE.DoubleSide }),
    caliper: new THREE.MeshPhysicalMaterial({ name: 'brake_caliper', color: 0x6b7077, metalness: 0.7, roughness: 0.34, clearcoat: 1, clearcoatRoughness: 0.08 }),
    bolt: new THREE.MeshStandardMaterial({ name: 'brake_bolt', color: 0xc9ccd0, metalness: 0.8, roughness: 0.45 }),
  };
}

// lathe around y, then (x, y, z) → (y, z, x): the axis becomes x (a proper rotation, normals stay outward)
const toAxleX = new THREE.Matrix4().set(0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1);
const lathe = (pts, seg = 160) => new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), seg).applyMatrix4(toAxleX);

function buildDisc({ ro, ri, T, plate, hub }, M) {
  M.disc.userData.band.value.set(ri, ro);
  const c = 0.0007; // edge chamfer
  // one friction plate between h0 (gap side) and h1 (outer face); closed profile, counter-clockwise in (r, h)
  const plateGeo = (h0, h1) => lathe([[ri, h0], [ro - c, h0], [ro, h0 + c], [ro, h1 - c], [ro - c, h1], [ri + c, h1], [ri, h1 - c], [ri, h0]].reverse());
  const outer = plateGeo(T / 2 - plate, T / 2), inner = plateGeo(-T / 2, -T / 2 + plate);
  // radial vanes in the cooling gap
  const vanes = [];
  const gap = T - 2 * plate;
  for (let i = 0; i < 40; i++) {
    const b = new THREE.BoxGeometry(gap, ro - ri - 0.006, 0.004);
    b.translate(0, (ro + ri) / 2 - 0.001, 0);
    b.rotateX((i / 40) * Math.PI * 2);
    vanes.push(b);
  }
  // hat: from the inner edge of the outer plate out to the hub face (towards the rim)
  const hat = lathe([[ri + 0.004, T / 2 - plate * 0.5], [ri - 0.004, T / 2 + 0.002], [0.085, hub - 0.004], [0.08, hub], [0.035, hub], [0.035, hub - 0.006], [0.078, hub - 0.006], [ri - 0.01, T / 2 - plate * 0.5]].reverse(), 96);
  return [
    new THREE.Mesh(outer, M.disc), new THREE.Mesh(inner, M.disc),
    new THREE.Mesh(mergeGeometries(vanes), M.vane), new THREE.Mesh(hat, M.hat),
  ];
}

function buildCaliper({ ro, ri, T }, phi, M) {
  // body: annular sector around the disc edge, extruded across the disc, rounded edges
  const half = 0.47, r0 = ri + 0.004, r1 = ro + 0.024, sh = new THREE.Shape();
  const P = (r, a) => [r * Math.cos(a), r * Math.sin(a)];
  sh.moveTo(...P(r0, phi - half));
  sh.absarc(0, 0, r1, phi - half, phi + half, false);
  sh.absarc(0, 0, r0, phi + half, phi - half, true);
  const depth = T + 0.05, bev = 0.009;
  const body = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 6, curveSegments: 64 });
  // extrude axis z → x, shape (x, y) → (y, z): (x, y, z) → (z, x, y), a proper rotation
  const toX = new THREE.Matrix4().set(0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1);
  body.applyMatrix4(toX).translate(-depth / 2 + 0.008, 0, 0); // a little more body on the outer side
  const parts = [new THREE.Mesh(body, M.caliper)];
  // piston housing: a raised, rounded block on the outer face
  const ph = new THREE.Shape(), hh = 0.3, q0 = r0 + 0.012, q1 = r1 - 0.01;
  ph.moveTo(...P(q0, phi - hh));
  ph.absarc(0, 0, q1, phi - hh, phi + hh, false);
  ph.absarc(0, 0, q0, phi + hh, phi - hh, true);
  const face = depth / 2 + 0.008 + bev; // outer face of the body
  const housing = new THREE.ExtrudeGeometry(ph, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.005, bevelSize: 0.006, bevelSegments: 6, curveSegments: 48 });
  housing.applyMatrix4(toX).translate(face - 0.005, 0, 0); // stands 12 mm proud of the body
  parts.push(new THREE.Mesh(housing, M.caliper));
  // guide pin caps on the body face either side of the housing, bleed screw on top of the housing
  for (const [da, rr, rad, len, x0] of [[-0.4, (r0 + r1) / 2, 0.008, 0.007, face], [0.4, (r0 + r1) / 2, 0.008, 0.007, face], [0.12, q1 - 0.006, 0.0035, 0.012, face + 0.012]]) {
    const cyl = new THREE.CylinderGeometry(rad, rad, len, 24).rotateZ(-Math.PI / 2);
    const [y, z] = P(rr, phi + da);
    cyl.translate(x0 + len / 2 - 0.001, y, z);
    parts.push(new THREE.Mesh(cyl, M.bolt));
  }
  return parts;
}
