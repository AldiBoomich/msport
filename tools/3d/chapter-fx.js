// Per-chapter effects and the driving loop for the 3D film (DESIGN.md → Motion → Chapters).
// The theme imports this file as is; the viewer (tools/3d/viewer.html, fx=1) wires it up.
//
//   const fx = createChapterFx({ scene, root, renderer, roadMaps, laneDashes, ... });
//   fx.patch(material)            moving lights (street lamps, light bars) in a material's reflections
//   fx.update({ p, ft, dt })      p = rail position 0…9, ft = 0…1 inside a chapter's hold zone (null on a leg),
//                                 dt = seconds since the last frame → state for the camera, lights, post
//
// Everything that moves is driven by one vehicle speed (m/s): the road and its puddles scroll, the
// wheels turn (with a rotational blur once the spokes would strobe), the street lamps pass overhead.
// Events (limiter, gear shifts, hard braking) kick damped springs on the camera, so every jolt settles
// by itself, the same way at 24 or 120 fps.
import * as THREE from 'three';
import { rpmRev, gearAt, LIMITER_AT } from './chapter-timeline.js';

export const CRUISE = 14;            // m/s, ≈ 50 km/h: street lamps every 25 m pass every ~1.8 s
const GEAR_V = [9, 15, 21, 27, 33, 39, 45];
const clamp01 = x => Math.min(Math.max(x, 0), 1);
const ss = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t * t * t * (t * (t * 6 - 15) + 10);

// ------------------------------------------------------------------ timeline
// State inside each chapter's hold zone, t = 0…1. Anything not returned keeps the default.
// On a leg between two chapters the continuous values blend from the end of one hold to the start of
// the next, so nothing ever jumps.
const DEFAULT = { lights: 1, dim: 1, bloom: 1, haze: 0, glow: 0, speed: CRUISE, bar: -1, roof: -1, rpm: 0, gear: 0 };
export const HOLDS = [
  /* 1 top    */ () => ({ lights: 0 }),
  /* 2 front  */ t => ({ lights: ss(0.12, 0.3, t) }),                          // headlights and angel eyes come on
  /* 3 rev    */ t => ({ dim: 1 - 0.82 * ss(0, 0.22, t) * (1 - ss(0.9, 1, t)), rpm: rpmRev(t) }),
  /* 4 wheels */ t => ({                                                       // spin up, brake hard, the disc glows
    speed: t < 0.4 ? 34 : t < 0.72 ? 2 : CRUISE,
    glow: ss(0.42, 0.6, t) * (1 - 0.35 * ss(0.72, 1, t)) }),
  /* 5 gills  */ t => ({ bar: ease(clamp01((t - 0.05) / 0.9)) }),              // light bar along the side
  /* 6 roof   */ t => ({ roof: ease(clamp01((t - 0.05) / 0.9)) }),             // highlight along the weave
  /* 7 sound  */ t => ({ haze: 0.45 + 0.55 * ss(0.15, 0.35, t) }),             // heat haze, stronger with the sound
  /* 8 smg    */ t => ({ gear: gearAt(t), speed: GEAR_V[gearAt(t) - 1] }),
  /* 9 specs  */ () => ({ dim: 0.45 }),
  /* 10 outro */ () => ({ dim: 0.6, bloom: 0.43 }),                         // headlights into the lens: a tight glow, no milky veil over the bonnet
];
const holdState = (i, t) => ({ ...DEFAULT, ...HOLDS[i](t) });
const BLEND = ['lights', 'dim', 'bloom', 'haze', 'glow'];

// ------------------------------------------------------------------ GLSL: moving lights in reflections
// One infinite row of street lamps (a single ray-plane test covers all of them: the hit point is
// folded by the lamp spacing) + two free rectangular emitters (light bar, roof sweep). Rays come from
// the material's own reflection vector, so the highlights are sharp on the clear coat and spread on
// rough surfaces (the rect grows with roughness x distance and loses brightness to keep its energy).
const FX_GLSL = /* glsl */`
uniform vec4 uFxLamp;      // row x, height, spacing, road distance
uniform vec4 uFxLampSize;  // half size x, half size z, fade distance
uniform vec3 uFxLampE;     // radiance
uniform vec3 uFxC[2]; uniform vec3 uFxU[2]; uniform vec3 uFxV[2]; uniform vec3 uFxE[2];
uniform vec2 uFxK;         // specular, diffuse gain
varying vec3 vFxWp;
float fxRect(vec2 l, vec2 s) { vec2 m = 1.0 - smoothstep(1.0 - s, 1.0 + s, abs(l)); return m.x * m.y; }
vec3 fxSpec(vec3 P, vec3 R, float rough) {
  float sp = 0.002 + rough * rough * 1.2;
  vec3 sum = vec3(0.0);
  if (R.y > 1e-3 && uFxLampE.r > 0.0) {
    float t = (uFxLamp.y - P.y) / R.y;
    vec3 h = P + R * t;
    float zz = mod(h.z + uFxLamp.w, uFxLamp.z) - 0.5 * uFxLamp.z;
    vec2 hs = uFxLampSize.xy; float b = sp * t;
    vec2 l = vec2((h.x - uFxLamp.x) / (hs.x + b), zz / (hs.y + b));
    float k = hs.x * hs.y / ((hs.x + b) * (hs.y + b));
    float fade = 1.0 - smoothstep(uFxLampSize.z * 0.5, uFxLampSize.z, t);
    sum += uFxLampE * fxRect(l, vec2(0.12 + 0.6 * min(b / hs.x, 1.0), 0.12 + 0.6 * min(b / hs.y, 1.0))) * k * fade;
  }
  for (int i = 0; i < 2; i++) {
    vec3 E = uFxE[i];
    if (E.r + E.g + E.b <= 0.0) continue;
    vec3 U = uFxU[i], V = uFxV[i], N = normalize(cross(U, V));
    float dn = dot(R, N);
    if (dn > -1e-4) continue;                           // only rays that meet the emitting face
    float t = dot(uFxC[i] - P, N) / dn;
    if (t <= 0.0) continue;
    vec3 h = P + R * t - uFxC[i];
    float lu = length(U), lv = length(V), b = sp * t;
    vec2 l = vec2(dot(h, U) / (lu * (lu + b)), dot(h, V) / (lv * (lv + b)));
    float k = lu * lv / ((lu + b) * (lv + b));
    sum += E * fxRect(l, vec2(0.1 + 0.6 * min(b / lu, 1.0), 0.1 + 0.6 * min(b / lv, 1.0))) * k;
  }
  return sum * uFxK.x * FX_SPEC_K;
}
vec3 fxIrr(vec3 P, vec3 N) {
  vec3 sum = vec3(0.0);
  if (uFxLampE.r > 0.0) {
    float A = 4.0 * uFxLampSize.x * uFxLampSize.y;
    float base = floor((P.z + uFxLamp.w) / uFxLamp.z);
    for (int k = -1; k <= 1; k++) {
      vec3 L = vec3(uFxLamp.x, uFxLamp.y, (base + float(k) + 0.5) * uFxLamp.z - uFxLamp.w) - P;
      float d2 = dot(L, L); vec3 l = L * inversesqrt(d2);
      sum += uFxLampE * A * max(dot(N, l), 0.0) * max(l.y, 0.0) / (d2 + A);
    }
  }
  for (int i = 0; i < 2; i++) {
    vec3 E = uFxE[i];
    if (E.r + E.g + E.b <= 0.0) continue;
    vec3 Ne = normalize(cross(uFxU[i], uFxV[i]));
    float A = 4.0 * length(uFxU[i]) * length(uFxV[i]);
    vec3 L = uFxC[i] - P; float d2 = dot(L, L); vec3 l = L * inversesqrt(d2);
    sum += E * A * max(dot(N, l), 0.0) * max(dot(-l, Ne), 0.0) / (d2 + A);
  }
  return sum * uFxK.y;
}`;
const FX_APPLY = /* glsl */`
{
  vec3 fxV = normalize(cameraPosition - vFxWp);
  vec3 fxN = normalize(inverseTransformDirection(geometryNormal, viewMatrix));
  reflectedLight.indirectSpecular += fxSpec(vFxWp, reflect(-fxV, fxN), material.roughness)
    * EnvironmentBRDF(geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness);
  reflectedLight.indirectDiffuse += fxIrr(vFxWp, fxN) * BRDF_Lambert(material.diffuseColor);
  #ifdef USE_CLEARCOAT
    vec3 fxNc = normalize(inverseTransformDirection(geometryClearcoatNormal, viewMatrix));
    clearcoatSpecularIndirect += fxSpec(vFxWp, reflect(-fxV, fxNc), material.clearcoatRoughness)
      * EnvironmentBRDF(geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness);
  #endif
}`;

// ------------------------------------------------------------------ heat haze (screen space)
// Two plumes (one per exhaust pair) projected to the screen each frame: a segment that rises and
// trails behind the tips, widening as it goes. Inside it the image is displaced by flowing noise.
export const HAZE_SHADER = {
  uniforms: {
    tDiffuse: { value: null }, uStrength: { value: 0 }, uTime: { value: 0 }, uAspect: { value: 1 },
    uA: { value: [new THREE.Vector2(), new THREE.Vector2()] }, uB: { value: [new THREE.Vector2(), new THREE.Vector2()] },
    uW: { value: new THREE.Vector2(0.02, 0.02) },
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: /* glsl */`
uniform sampler2D tDiffuse; uniform float uStrength, uTime, uAspect; uniform vec2 uA[2]; uniform vec2 uB[2]; uniform vec2 uW;
varying vec2 vUv;
float hh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float nz(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hh(i), hh(i + vec2(1, 0)), f.x), mix(hh(i + vec2(0, 1)), hh(i + 1.0), f.x), f.y); }
void main() {
  vec2 off = vec2(0.0);
  if (uStrength > 0.0) for (int i = 0; i < 2; i++) {
    vec2 a = uA[i], ab = uB[i] - a;
    float h = clamp(dot(vUv - a, ab) / max(dot(ab, ab), 1e-8), 0.0, 1.0);
    vec2 d = (vUv - a - ab * h) * vec2(uAspect, 1.0);
    float w = uW[i] * (0.7 + 2.2 * h);
    float m = (1.0 - smoothstep(0.0, w, length(d))) * smoothstep(0.0, 0.08, h) * (1.0 - 0.7 * h);
    vec2 q = (vUv * vec2(uAspect, 1.0)) / (uW[i] * 0.45) - vec2(0.0, -uTime * 2.6);
    vec2 n = vec2(nz(q) + 0.5 * nz(q * 2.1 + 7.3), nz(q + 19.1) + 0.5 * nz(q * 2.3 + 3.7)) - 0.75;
    off += n * m * uW[i];
  }
  gl_FragColor = texture2D(tDiffuse, vUv + off * uStrength * 0.22);
}`,
};

// ------------------------------------------------------------------ the effect rig
export function createChapterFx({ scene, root, renderer, camera, roadMaps = [], roadRepeat = 24, roadSize = 60,
  dashes = [], roadD = { value: 0 }, shutter = 1 / 48, speed = 1, tips = [[0.53, 0.33, -2.35], [-0.53, 0.33, -2.35]] }) {
  const U = {
    uFxLamp: { value: new THREE.Vector4(-2.1, 7.5, 25, 0) },
    uFxLampSize: { value: new THREE.Vector4(0.32, 0.14, 70, 0) },
    uFxLampE: { value: new THREE.Color(1.0, 0.5, 0.17).multiplyScalar(26) },   // high-pressure sodium
    uFxC: { value: [new THREE.Vector3(), new THREE.Vector3()] },
    uFxU: { value: [new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0)] },
    uFxV: { value: [new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)] },
    uFxE: { value: [new THREE.Color(0, 0, 0), new THREE.Color(0, 0, 0)] },
    uFxK: { value: new THREE.Vector2(1, 1) },
  };
  const roadU = { uRoadD: roadD, uRoadBlur: { value: 0 } };
  const lampE = U.uFxLampE.value.clone();

  // add the moving lights to a lit material (MeshStandard / MeshPhysical); chains onto existing hooks
  function patch(m, { road = false } = {}) {
    if (!m || m.userData.fx || !(m.isMeshStandardMaterial)) return;
    m.userData.fx = true;
    const prev = m.onBeforeCompile;
    const key = (m.customProgramCacheKey ? m.customProgramCacheKey() : prev.toString()) + '|fx' + (road ? 'road' : '');
    m.onBeforeCompile = (sh, r) => {
      prev.call(m, sh, r);
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vFxWp;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvFxWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader
        // the wet road mirrors the lamps less crisply than paint (ripples, grime): a third of the energy
        .replace('#include <common>', `#include <common>\n#define FX_SPEC_K ${road ? '0.3' : '1.0'}\n` + FX_GLSL)
        .replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\n' + FX_APPLY);
      if (road) {
        // motion blur on the asphalt: the colour map is averaged along the direction of travel and the
        // micro-normals flatten out with speed (v runs along world −z)
        Object.assign(sh.uniforms, roadU);
        sh.fragmentShader = sh.fragmentShader
          .replace('#include <common>', '#include <common>\nuniform float uRoadBlur;')
          .replace('#include <map_fragment>', `#ifdef USE_MAP
  vec4 sampledDiffuseColor = vec4(0.0);
  for (int i = 0; i < 6; i++) sampledDiffuseColor += texture2D(map, vMapUv + vec2(0.0, (float(i) / 5.0 - 0.5) * uRoadBlur));
  diffuseColor *= sampledDiffuseColor / 6.0;
#endif`)
          .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = normalize(mix(normal, nonPerturbedNormal, clamp(uRoadBlur * 2.5, 0.0, 0.85)));');
      }
    };
    m.customProgramCacheKey = () => key;
    m.needsUpdate = true;
  }
  root.traverse(o => { if (o.isMesh) [].concat(o.material).forEach(m => patch(m)); });

  // street lamp heads (the reflections come from the shader; these are the lamps themselves, seen in
  // wide shots at the top of the frame)
  const lampMat = new THREE.MeshBasicMaterial({ color: U.uFxLampE.value.clone().multiplyScalar(0.5), fog: true });
  const lamps = [];
  for (let i = 0; i < 6; i++) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(U.uFxLampSize.value.x * 2, 0.05, U.uFxLampSize.value.y * 2), lampMat);
    scene.add(l); lamps.push(l);
  }

  // ---- wheels: rolling + rotational blur
  // Each rim is rendered once, face on, into a texture. A flat disc in front of the rim (a child of the
  // wheel node, so it turns with it) shows that picture averaged over the angle the wheel turns while the
  // shutter is open. Below ~10° it is invisible; past ~25° it replaces the rim, whose crisp spokes would
  // otherwise strobe. The drilled disc and the tyre lettering fade to their average the same way.
  const wheels = [];
  const wheelMats = new Set();
  root.updateMatrixWorld(true);
  root.traverse(o => {
    if (!/^wheel_[LR][FB]$/.test(o.name)) return;
    const rims = [], v = new THREE.Vector3();
    let R = 0, face = 0;
    const out = Math.sign(o.position.x) || 1;
    o.traverse(m => {
      if (!m.isMesh) return;
      if (/^rim/.test(m.name)) rims.push(m);
      if (/^(tyre|brake_disc)/.test(m.material.name || '') && m.material.userData.spin) wheelMats.add(m.material);
      if (/^tyre/.test(m.name) && !/back/.test(m.name)) {
        const p = m.geometry.attributes.position;
        for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(m.matrix); R = Math.max(R, Math.hypot(v.y, v.z)); }
      }
    });
    for (const m of rims) {
      const p = m.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(m.matrix); face = Math.max(face, out * v.x); }
    }
    if (!rims.length || !R) return;
    wheels.push({ node: o, rims, R, face, out });
  });
  const blurDiscs = [];
  {
    const prevBg = scene.background, prevFog = scene.fog, prevTarget = renderer.getRenderTarget();
    const prevClear = renderer.getClearColor(new THREE.Color()), prevAlpha = renderer.getClearAlpha();
    scene.background = null; scene.fog = null;
    renderer.setClearColor(0x000000, 0);
    const ws = new THREE.Vector3();
    for (const w of wheels) {
      w.node.matrixWorld.decompose(new THREE.Vector3(), new THREE.Quaternion(), ws);
      const Rw = w.R * ws.x;
      const rt = new THREE.WebGLRenderTarget(1024, 1024, { type: THREE.HalfFloatType, samples: 4, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
      const cam = new THREE.OrthographicCamera(-Rw, Rw, Rw, -Rw, 0.01, 4);
      const c = new THREE.Vector3().setFromMatrixPosition(w.node.matrixWorld);
      const axis = new THREE.Vector3(w.out, 0, 0).transformDirection(w.node.matrixWorld);
      cam.position.copy(c).addScaledVector(axis, 2); cam.up.set(0, 1, 0); cam.lookAt(c);
      cam.layers.set(7);
      w.rims.forEach(m => m.layers.set(7));
      renderer.setRenderTarget(rt); renderer.clear(); renderer.render(scene, cam);
      w.rims.forEach(m => m.layers.set(0));
      const mat = new THREE.ShaderMaterial({
        uniforms: { uTex: { value: rt.texture }, uBlur: { value: 0 }, uOpacity: { value: 0 } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: /* glsl */`
uniform sampler2D uTex; uniform float uBlur, uOpacity; varying vec2 vUv;
void main() {
  vec2 p = vUv - 0.5;
  // each of the 48 taps reads a mip level as wide as the gap to the next tap: a smooth arc, no grain
  float stepPx = length(p) * 1024.0 * uBlur / 48.0;
  float lod = log2(max(stepPx, 1.0));
  vec4 acc = vec4(0.0);
  for (int i = 0; i < 48; i++) {
    float a = uBlur * ((float(i) + 0.5) / 48.0 - 0.5), c = cos(a), s = sin(a);
    acc += textureLod(uTex, vec2(c * p.x - s * p.y, s * p.x + c * p.y) + 0.5, lod);
  }
  acc /= 48.0;
  // the face-on capture reflects whatever is beside the car (neon); half the colour cast goes
  float l = dot(acc.rgb, vec3(0.2126, 0.7152, 0.0722));
  acc.rgb = mix(vec3(l), acc.rgb, 0.45) * 1.15;
  gl_FragColor = acc * uOpacity;              // premultiplied (the rim was rendered over transparent black)
}`,
        transparent: true, premultipliedAlpha: true, depthWrite: false,
      });
      const disc = new THREE.Mesh(new THREE.PlaneGeometry(2 * w.R, 2 * w.R), mat);
      disc.position.set(w.out * (w.face + 0.004), 0, 0);
      disc.rotation.y = w.out * Math.PI / 2;
      disc.renderOrder = 2; disc.visible = false;
      w.node.add(disc); w.disc = disc; blurDiscs.push(disc);
    }
    renderer.setRenderTarget(prevTarget); renderer.setClearColor(prevClear, prevAlpha);
    scene.background = prevBg; scene.fog = prevFog;
  }
  const R = wheels.length ? wheels[0].R * new THREE.Vector3().setFromMatrixScale(wheels[0].node.matrixWorld).x : 0.34;

  // ---- simulation state
  const sim = { v: CRUISE * speed, d: 0, time: 0, rpm: 800, gear: 0, flash: 0, lastT: null, lastI: -1,
    spring: { x: new THREE.Vector3(), v: new THREE.Vector3() }, dip: { x: 0, v: 0 } };
  const kick = (pitch, roll = 0, yaw = 0) => { sim.spring.v.x += pitch; sim.spring.v.z += roll; sim.spring.v.y += yaw; };
  const tipV = tips.map(t => new THREE.Vector3(...t));
  const proj = new THREE.Vector3();
  const toUv = (p3, out) => { proj.copy(p3).project(camera); return out.set(proj.x * 0.5 + 0.5, proj.y * 0.5 + 0.5); };

  function update({ p, ft = null, dt = 1 / 60 }) {
    // continuous state: a hold, or a blend between the end of one hold and the start of the next
    let st;
    const i = Math.round(p);
    if (ft !== null) st = holdState(i, ft);
    else {
      const a = Math.min(Math.floor(p), HOLDS.length - 2), e = ease(p - a);
      const A = holdState(a, 1), B = holdState(a + 1, 0);
      st = { ...DEFAULT };
      for (const k of BLEND) st[k] = lerp(A[k], B[k], e);
    }
    // events: only when the hold is played forwards
    if (ft !== null && sim.lastI === i && sim.lastT !== null && ft > sim.lastT) {
      const crossed = x => sim.lastT < x && ft >= x;
      if (i === 2 && crossed(LIMITER_AT)) { kick(-0.16, 0.05); sim.flash = 1; }                     // limiter
      if (i === 3 && crossed(0.4)) { sim.dip.v -= 0.55; kick(0.12); }                          // hard braking: nose dives
      if (i === 7 && gearAt(ft) > gearAt(sim.lastT)) kick(0.07 + 0.012 * gearAt(ft), 0.02 * (gearAt(ft) % 2 ? 1 : -1)); // gear shift
    }
    sim.lastI = ft !== null ? i : -1; sim.lastT = ft;

    // vehicle: speed follows its target (brakes bite faster than the engine pulls)
    const target = (ft !== null ? st.speed : CRUISE) * speed;   // speed: "Driving speed" in the admin
    const tau = target < sim.v ? 0.11 : 0.45;
    sim.v += (target - sim.v) * (1 - Math.exp(-dt / tau));
    sim.d += sim.v * dt; sim.time += dt;
    sim.flash *= Math.exp(-dt / 0.22);
    // springs (sub-stepped so they behave the same at any frame rate)
    const n = Math.max(1, Math.ceil(dt / 0.004)), h = dt / n, w0 = 2 * Math.PI * 3.2, z = 0.32, wd = 2 * Math.PI * 2.2;
    for (let k = 0; k < n; k++) {
      const s = sim.spring;
      s.v.addScaledVector(s.x, -w0 * w0 * h).multiplyScalar(1 - 2 * z * w0 * h); s.x.addScaledVector(s.v, h);
      sim.dip.v += (-wd * wd * sim.dip.x) * h; sim.dip.v *= 1 - 2 * 0.45 * wd * h; sim.dip.x += sim.dip.v * h;
    }

    // road, puddles, lane dashes, street lamps
    const repeatPerM = roadRepeat / roadSize;
    roadMaps.forEach(t => { t.offset.y = -sim.d * repeatPerM; });
    roadU.uRoadD.value = sim.d;
    const blurLen = sim.v * shutter;
    roadU.uRoadBlur.value = blurLen * repeatPerM;
    const DS = 6, span = dashes.length * DS;
    dashes.forEach((m, k) => {
      m.position.z = ((((k * DS - sim.d) % span) + span) % span) - span / 2;
      m.scale.y = (3 + blurLen) / 3;
    });
    U.uFxLamp.value.w = sim.d;
    U.uFxLampE.value.copy(lampE).multiplyScalar(0.35 + 0.65 * st.dim);
    const L = U.uFxLamp.value;
    lamps.forEach((m, k) => { m.position.set(L.x, L.y, (Math.floor(sim.d / L.z) + k - 1 + 0.5) * L.z - sim.d); });

    // wheels: roll, blur
    const ang = sim.d / R, blur = (sim.v / R) * shutter;     // radians turned while the shutter is open
    const op = ss(0.17, 0.45, blur);
    for (const w of wheels) {
      w.node.rotation.x = ang;
      w.disc.visible = op > 0.001;
      w.disc.material.uniforms.uBlur.value = Math.min(blur, 2 * Math.PI);
      w.disc.material.uniforms.uOpacity.value = op;
      w.rims.forEach(m => { m.visible = op < 0.999; });
    }
    for (const m of wheelMats) {
      m.userData.spin.blur.value = ss(0.15, 0.6, blur);
      if (m.userData.spin.glow) m.userData.spin.glow.value = st.glow;
    }

    // light bar along the side (chapter 5), highlight across the roof (chapter 6)
    const E = U.uFxE.value;
    if (st.bar >= 0) {
      U.uFxC.value[0].set(3.3, 0.55, lerp(2.8, -3.1, st.bar));
      U.uFxU.value[0].set(0, 0, 0.022); U.uFxV.value[0].set(0, 1.0, 0);
      E[0].setRGB(0.9, 0.95, 1.0).multiplyScalar(120 * ss(0, 0.06, st.bar) * (1 - ss(0.94, 1, st.bar)));
    } else E[0].setRGB(0, 0, 0);
    if (st.roof >= 0) {
      U.uFxC.value[1].set(-0.6, 6.0, lerp(3.2, -1.2, st.roof));
      U.uFxU.value[1].set(3.0, 0, 0); U.uFxV.value[1].set(0, 0, 0.05);
      E[1].setRGB(0.9, 0.95, 1.0).multiplyScalar(30 * ss(0, 0.06, st.roof) * (1 - ss(0.94, 1, st.roof)));
    } else E[1].setRGB(0, 0, 0);

    // camera: settled springs + a faint road-speed shake (≤ 0.3°)
    const t = sim.time, sh = THREE.MathUtils.degToRad(0.03 + 0.12 * clamp01(sim.v / 45));
    const shake = [Math.sin(t * 13.1) * 0.6 + Math.sin(t * 29.7 + 1.3) * 0.4, Math.sin(t * 11.3 + 2.1) * 0.5 + Math.sin(t * 23.9) * 0.5];
    const rot = [sim.spring.x.x + shake[0] * sh * 0.5 + sim.dip.x * 0.12, sim.spring.x.y, sim.spring.x.z + shake[1] * sh * 0.5];

    return { lights: st.lights, dim: st.dim, bloom: st.bloom, flash: sim.flash, rot, dip: sim.dip.x, haze: st.haze,
      rpm: i === 2 && ft !== null ? st.rpm : null, gear: i === 7 && ft !== null ? st.gear : null, speed: sim.v };
  }

  // heat haze plumes (chapter 7) projected with the final camera → HAZE_SHADER uniforms
  function projectHaze(u, strength) {
    camera.updateMatrixWorld();
    u.uStrength.value = strength; u.uTime.value = sim.time; u.uAspect.value = camera.aspect;
    tipV.forEach((tp, k) => {
      toUv(tp, u.uA.value[k]);
      toUv(tp.clone().add(new THREE.Vector3(0, 0.22, -0.7)), u.uB.value[k]);
      const dist = camera.position.distanceTo(tp);
      u.uW.value.setComponent(k, 0.07 / (2 * dist * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)));
    });
  }

  return { patch, update, projectHaze, uniforms: U, roadUniforms: roadU, sim, wheels };
}
