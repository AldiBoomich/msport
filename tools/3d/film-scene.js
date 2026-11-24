// The 3D film scene for the site: the viewer's final look (tools/3d/viewer.html with
//   mode=final&env=city&road=1&fx=1, the settings the chapter stills were rendered with), packed into one
// object the page drives. The viewer stays the lab for tests and stills; any look change made there is
// copied here and checked by rendering both (tools/3d/site-test.html).
//
//   const film = await createFilm({ canvas, urls, width, height, dpr, mobile });
//   film.frame({ p, ft, dt, sound })  p = 0…9 on the camera rail, ft = 0…1 inside a chapter's hold (null on a
//                               leg), dt = seconds since the last frame, sound = the V10 recording is playing
//                               (the heat haze over the tips grows) → { rpm, gear, speed }
//   look = { paint, gloss, speed }  the admin's "3D scene" fields (paint colour, clear coat roughness, driving
//                               speed factor); left out = the look the stills and the video were rendered with
//   film.resize(width, height)  CSS pixels
//   film.dispose()
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { nightEnvironment } from './car-env.js';
import { loadCitySky, skyMesh } from './city-sky.js';
import { applyBakedAO, contactShadow, paintFlakes, smoothNormals } from './car-shading.js';
import { detailWheels } from './wheel-detail.js';
import { createChapterFx, HAZE_SHADER } from './chapter-fx.js';
import { CHAPTERS } from './chapters.js';
import { cameraPath } from './camera-path.js';

const GROUND = '#14171B';           // --c-ground: the canvas edge melts into the page
const EXPOSURE = 1.35;
const HAZE_SOUND = 0.6;              // extra heat haze while the sound plays (1 = twice as strong; more warps the tips)
const HROT = THREE.MathUtils.degToRad(180); // HDRI yaw: the Pudong skyline behind the car
// the horizon strip (hdr-pack.mjs of shanghai_bund_16k.exr rows 2276…4460 of 8192 = +40°…−8°, packed at 12288 px):
// panorama v from 0.45557 to 0.72217
const BAND_V = [0.45557, 0.72217];
// the v6 look, matched to the Cycles stills (chapter 2 trials, 2026-11-24): AgX + an S-curve like Cycles' AgX
// "Medium High Contrast"; the sky open and brighter, capped under the bloom threshold (the city never blooms, as
// in Cycles where only the lamps glow); fewer studio light bars in the reflections; crisp rings; dim lamp insides
const V6_LOOK = { tone: 'agx', exposure: 1.35, contrast: 0.35, sky: 0.18, skyCap: 5, dome: false, fog: false, formers: 0.35, ring: 0.4, lampEnv: 0.25, reflect: 1 };
const PORTRAIT_REF = 0.8;           // portrait keys are framed for 4:5

// three.js ACESFilmicToneMapping (r170) inverted: the linear colour that comes out as `hex`
function groundThroughACES(hex, exposure) {
  const aces = ([r, g, b]) => {
    const k = exposure / 0.6; r *= k; g *= k; b *= k;
    const i = [0.59719 * r + 0.35458 * g + 0.04823 * b, 0.07600 * r + 0.90834 * g + 0.01566 * b, 0.02840 * r + 0.13383 * g + 0.83777 * b];
    const f = i.map(v => (v * (v + 0.0245786) - 0.000090537) / (v * (0.983729 * v + 0.4329510) + 0.238081));
    return [1.60475 * f[0] - 0.53108 * f[1] - 0.07367 * f[2], -0.10208 * f[0] + 1.10813 * f[1] - 0.00605 * f[2], -0.00327 * f[0] - 0.07276 * f[1] + 1.07602 * f[2]];
  };
  const t = new THREE.Color(hex).toArray();
  let l = t.slice();
  for (let n = 0; n < 60; n++) { const o = aces(l); l = l.map((v, i) => v * t[i] / Math.max(o[i], 1e-6)); }
  return new THREE.Color().fromArray(l);
}

const withWorldPos = sh => {
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vWp;')
    .replace('#include <project_vertex>', '#include <project_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', 'varying vec3 vWp;\n#include <common>');
};

/**
 * @param {object} o
 * @param {HTMLCanvasElement} o.canvas
 * @param {{model: string, sky: string, shadow: string, asphalt: {diff: string, nor: string, rough: string}}} o.urls
 * @param {number} o.width   CSS px
 * @param {number} o.height  CSS px
 * @param {number} o.dpr     device pixel ratio to render at (already capped by the caller)
 */
export async function createFilm({ canvas, urls, width, height, dpr = 1, samples = 4, quality = {}, adaptive = false, look = {}, onProgress = null, tune = {} }) {
  const Q = { bloom: true, wet: true, ...quality };
  let W = width, H = height;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(dpr); renderer.setSize(W, H, false);
  // tune.tone 'agx': AgX like the Cycles renders (ACES turns the city's blues purple)
  renderer.toneMapping = tune.tone === 'agx' ? THREE.AgXToneMapping : THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = tune.exposure ?? EXPOSURE;
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, W / H, 0.01, 100);

  // ---- assets in parallel
  const tl = new THREE.TextureLoader();
  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  const roadTex = (url, srgb) => tl.loadAsync(url).then(t => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(24, 24); t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
  // onProgress (the page's preloader): share loaded, weighted by size: the model ~2.2 MB (streamed, so it
  // moves smoothly), the panorama ~1 MB, the textures small
  // urls.skyBand: the sharp horizon strip (desktops; needs 12288 px textures), see BAND_V
  const useBand = !!urls.skyBand && renderer.capabilities.maxTextureSize >= 12288;
  const part = [0, 0, 0, 0, 0, 0, 0], weight = useBand ? [0.18, 0.4, 0.02, 0.03, 0.03, 0.03, 0.31] : [0.3, 0.55, 0.03, 0.04, 0.04, 0.04, 0];
  const report = () => onProgress?.(Math.min(1, part.reduce((a, v, i) => a + v * weight[i], 0)));
  const track = (i, p) => p.then(v => { part[i] = 1; report(); return v; });
  const [sky, gltf, shadowTex, diff, nor, rough, skyBand] = await Promise.all([
    track(0, loadCitySky(urls.sky)),
    track(1, loader.loadAsync(urls.model, e => { if (e.total) { part[1] = Math.min(0.99, e.loaded / e.total); report(); } })),
    track(2, tl.loadAsync(urls.shadow)),
    track(3, roadTex(urls.asphalt.diff, true)), track(4, roadTex(urls.asphalt.nor)), track(5, roadTex(urls.asphalt.rough)),
    useBand ? track(6, loadCitySky(urls.skyBand)) : null,
  ]);
  // v6 (the Cycles model cut down by bl_web_v6.py / bl_web_export.py): its own parts and lamps (v6Materials) and a
  // look matched to the Cycles frames (V6_LOOK); `tune` still overrides any of it
  const V6 = !!gltf.scene.getObjectByName('angel');
  if (V6) {
    tune = { ...V6_LOOK, ...Object.fromEntries(Object.entries(tune).filter(([, v]) => v !== undefined)) };
    renderer.toneMapping = tune.tone === 'agx' ? THREE.AgXToneMapping : THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = tune.exposure ?? EXPOSURE;
  }
  const roadMaps = [diff, nor, rough];

  // ---- environment: night city + lightformers in a 1024 cube (what the paint reflects)
  // soften: the Bund's lit trees (left and right of the panorama) printed leaf-shaped dark patches in the
  // paint; in the reflections only, that band is blurred into a smooth warm glow (the backdrop is untouched)
  scene.environment = nightEnvironment(renderer, { sky, hdrIntensity: 0.42, rotation: HROT, formerScale: tune.formers ?? 1, groundK: 0.12,
    soften: { u: [[-0.02, 0.345], [0.80, 1.02]], v: [0.42, 0.78], r: [0.05, 0.04] } });
  scene.environmentIntensity = 1.3;

  // ---- the car: 4.85 m long, on the ground, centred
  const root = gltf.scene;
  let box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  root.scale.multiplyScalar(4.85 / Math.max(size.x, size.z));
  box = new THREE.Box3().setFromObject(root);
  const c = box.getCenter(new THREE.Vector3());
  root.position.sub(new THREE.Vector3(c.x, box.min.y, c.z));
  scene.add(root);

  // v6 (the Cycles model cut down by bl_web_v6.py / bl_web_export.py): its own parts and lamps, see v6Materials()

  // Black Sapphire Metallic: two-layer flake paint under a mirror clear coat, carbon twill on the roof
  // (v3: the roof is part of the paint mesh, masked by position; v6: a mesh of its own, mask = 1 there, 0 on the paint)
  const paint = new THREE.MeshPhysicalMaterial({ name: 'paint', color: new THREE.Color(look.paint || '#050608'), metalness: 0.45, roughness: 0.32,
    clearcoat: 1, clearcoatRoughness: Number.isFinite(look.gloss) ? look.gloss : 0.012, specularIntensity: 0.01 });
  const CARBON = { tow: 0.016, y0: 1.25, x0: 0.58, z0: -1.03, z1: 0.19 };
  const ROOF_V3 = `smoothstep(${CARBON.y0.toFixed(3)}, ${(CARBON.y0 + 0.02).toFixed(3)}, vWp.y)
    * (1.0 - smoothstep(${(CARBON.x0 - 0.04).toFixed(3)}, ${CARBON.x0.toFixed(3)}, abs(vWp.x)))
    * smoothstep(${CARBON.z0.toFixed(3)}, ${(CARBON.z0 + 0.04).toFixed(3)}, vWp.z)
    * (1.0 - smoothstep(${(CARBON.z1 - 0.04).toFixed(3)}, ${CARBON.z1.toFixed(3)}, vWp.z))`;
  const bodyShader = (roof, tow = CARBON.tow, tilt = 0.55) => sh => {
    withWorldPos(sh);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
float roofMask() {
  return ${roof};
}
vec3 twill(vec2 p) {
  vec2 c = floor(p), f = fract(p);
  float dir = mod(c.x + c.y, 4.0) < 2.0 ? 0.0 : 1.0;
  float across = dir < 0.5 ? f.y - 0.5 : f.x - 0.5;
  float along = dir < 0.5 ? p.x : p.y;
  float fib = fract(sin(dot(floor(vec2(along * 40.0, dir)), vec2(12.9898, 78.233))) * 43758.5453);
  return vec3(across, dir, fib);
}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
float cMask = roofMask();
vec2 cP = vWp.xz / ${tow.toFixed(4)};
float cAA = 1.0 - smoothstep(0.25, 0.6, length(fwidth(cP)));
vec3 cW = twill(cP);
vec3 cCol = mix(vec3(0.030, 0.031, 0.034), vec3(0.012, 0.012, 0.014), cW.y);
cCol *= mix(1.0, 0.6 + 0.4 * cos(cW.x * 3.14159), cAA) * (0.92 + 0.08 * cW.z);
diffuseColor.rgb = mix(diffuseColor.rgb, cCol, cMask);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor = mix(roughnessFactor, mix(0.42, 0.28, cW.y), cMask);`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
metalnessFactor = mix(metalnessFactor, 0.15, cMask);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
{
  vec3 axis = cW.y < 0.5 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
  vec3 tilt = (viewMatrix * vec4(axis * sin(cW.x * 3.14159) * ${tilt.toFixed(3)}, 0.0)).xyz;
  normal = normalize(normal + tilt * cMask * cAA);
}`);
    paintFlakes(sh, { mask: '(1.0 - roofMask())', cell: 0.0009, cover: 0.3, tilt: 0.3, flake: [0.028, 0.032, 0.043], flakeRough: 0.2 });
  };
  paint.onBeforeCompile = bodyShader(V6 ? '0.0' : ROOF_V3);
  paint.customProgramCacheKey = () => 'paint';

  const glass = new THREE.MeshPhysicalMaterial({ color: 0x0b0d10, roughness: 0.02, metalness: 0, transparent: true, opacity: 0.82, side: THREE.DoubleSide, envMapIntensity: 1.4 });
  glass.onBeforeCompile = sh => {   // the headlight lenses share the windscreen material: keep them clear
    withWorldPos(sh);
    sh.fragmentShader = sh.fragmentShader.replace('#include <alphamap_fragment>', `#include <alphamap_fragment>
if (vWp.z > 1.5 && vWp.y < 1.0) { diffuseColor.a = 0.1; diffuseColor.rgb = vec3(0.6); }`);
  };
  const lightGlass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.02, metalness: 0, transparent: true, opacity: 0.25, side: THREE.DoubleSide });
  lightGlass.onBeforeCompile = sh => { // rear lenses are deep red glass
    withWorldPos(sh);
    sh.fragmentShader = sh.fragmentShader.replace('#include <alphamap_fragment>', `#include <alphamap_fragment>
if (vWp.z < -1.5) { diffuseColor.rgb = vec3(0.30, 0.006, 0.008); diffuseColor.a = 0.72; }`);
  };
  if (V6) v6Materials(root, { env: scene.environment, lampEnv: tune.lampEnv ?? 1, discGlow: tune.discGlow ?? 0.35, paint, glass, carbon: Object.assign(new THREE.MeshPhysicalMaterial({ name: 'carbon', color: 0x0c0d0f,
    metalness: 0, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.015, specularIntensity: tune.carbonSpec ?? 0.15 }), { onBeforeCompile: bodyShader('1.0', tune.carbonTow ?? 0.006, tune.carbonTilt ?? 0.18), customProgramCacheKey: () => 'carbon' }) });
  else root.traverse(o => {
    if (!o.isMesh) return;
    const n = o.userData.matName = o.material.name || '';
    if (n === 'paint') o.material = paint;
    else if (n === 'glass') o.material = glass;
    else if (n === 'lights_glass') o.material = lightGlass;
    else if (n === 'trim_black' || n === 'underbody') o.material = new THREE.MeshPhysicalMaterial({ color: 0x050505, roughness: 0.45, metalness: 0, clearcoat: 0.3, clearcoatRoughness: 0.3 });
    else if (n === 'tyre') { o.material.color?.set(0x111111); o.material.roughness = 0.85; o.material.metalness = 0; }
    else if (n === 'rim') { o.material.metalness = 0.9; o.material.roughness = 0.35; o.material.color?.set(0x9a9ea3); }
    else if (n === 'chrome') o.material = new THREE.MeshStandardMaterial({ color: 0xc6c6c6, roughness: 0.08, metalness: 1 });
    else if (n === 'grille') o.material = new THREE.MeshPhysicalMaterial({ color: 0x08090a, roughness: 0.38, metalness: 0.2, clearcoat: 0.5, clearcoatRoughness: 0.12 });
    else if (n === 'interior' && !o.material.userData.dark) {
      const m = o.material; m.color.multiplyScalar(0.12); m.userData.dark = true;
      m.onBeforeCompile = sh => {
        withWorldPos(sh);
        sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\nif (vWp.y > 1.12) diffuseColor.rgb *= 0.04;');
      };
    }
  });
  // 120 passes (was 16): the source mesh ripples, and 16 passes only turned the ripple into broad lumps that
  // broke the city's reflection into dark blotches on the doors and rear wings (zebra check, 2026-11-21).
  // The crease test (12°, on the original normals) is unchanged, so the body lines stay as sharp. ~0.4 s at load.
  // v6 comes with clean normals and modelled wheels (tread, drilled discs, calipers): neither pass
  if (!V6) {
    smoothNormals(root, { iterations: 120, featureAngle: 12 });
    detailWheels(root, { maxAnisotropy: maxAniso });
  }

  // ---- night: fog and background in the page colour, the city as a dim sharp backdrop
  const ground = groundThroughACES(GROUND, EXPOSURE);
  scene.background = ground;
  // tune (look trials against the Cycles frames): sky = backdrop strength, fog = [near, far] or false, dome = false
  // opens the sky above the skyline (by default it fades into the page colour)
  if (tune.fog !== false) scene.fog = new THREE.Fog(ground, ...(tune.fog || [8, 22]));
  const backdrop = skyMesh(sky, { intensity: tune.sky ?? 0.11, rotation: HROT, radius: 90, followCamera: true,
    band: skyBand ? { sky: skyBand, v: BAND_V } : null, cap: tune.skyCap || 0 });
  backdrop.renderOrder = -2; scene.add(backdrop);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(80, 64, 32), new THREE.ShaderMaterial({
    uniforms: { uCol: { value: ground.clone() }, uTop: { value: THREE.MathUtils.degToRad(7.5) }, uLow: { value: THREE.MathUtils.degToRad(-0.5) } },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 uCol; uniform float uTop, uLow; varying vec3 vD;
void main(){
  float el = asin(clamp(normalize(vD).y, -1.0, 1.0));
  float a = 1.0 - smoothstep(uLow - 0.02, uLow + 0.01, el);
  a = max(a, smoothstep(uTop * 0.35, uTop, el));
  gl_FragColor = vec4(uCol, a);
}`,
    side: THREE.BackSide, transparent: true, depthWrite: false, fog: false,
  }));
  dome.renderOrder = -1; dome.frustumCulled = false;
  dome.onBeforeRender = (r, s, cam) => { dome.position.copy(cam.position); dome.updateMatrixWorld(); };
  if (tune.dome !== false) scene.add(dome);
  const shadowMesh = contactShadow(shadowTex); scene.add(shadowMesh);

  // ---- damp road: asphalt, worn lane paint, puddles that mirror the city
  const g = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ map: diff, normalMap: nor, roughnessMap: rough,
    color: 0x3a3d42, roughness: 0.9, metalness: 0.05, normalScale: new THREE.Vector2(0.6, 0.6) }));
  g.rotation.x = -Math.PI / 2; scene.add(g);
  const paintLine = new THREE.MeshStandardMaterial({ color: 0x8a8a84, roughness: 0.7 });
  const dashes = [];
  for (let z = -30; z < 30; z += 6) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 3), paintLine); m.rotation.x = -Math.PI / 2; m.position.set(1.95, 0.004, z); scene.add(m); dashes.push(m); }
  const edge = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 60), paintLine); edge.rotation.x = -Math.PI / 2; edge.position.set(-1.75, 0.004, 0); scene.add(edge);
  const roadD = { value: 0 };
  // planar reflection (tune.reflect > 0): the car and the city mirrored in the wet patches, rendered at half resolution
  // from a camera mirrored in the road plane (renderReflection); the env map still lights the dry asphalt
  const reflU = { uRefl: { value: null }, uReflMat: { value: new THREE.Matrix4() }, uReflK: { value: tune.reflect ?? 0 } };
  const NOISE = `
float wHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float wNoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(wHash(i), wHash(i + vec2(1, 0)), f.x), mix(wHash(i + vec2(0, 1)), wHash(i + 1.0), f.x), f.y); }
float wFbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * wNoise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
uniform float uRoadD;
vec2 roadXZ() { return vWp.xz + vec2(0.0, uRoadD); }
float wetMask() { return clamp((0.22 + 0.78 * smoothstep(0.52, 0.64, wFbm(roadXZ() * 0.32))) * 1.000, 0.0, 1.0); }
float carOcc() { return mix(1.0, 0.06, (1.0 - smoothstep(0.85, 1.7, abs(vWp.x))) * (1.0 - smoothstep(2.3, 3.4, abs(vWp.z)))); }`;
  const wetPatch = (sh, extraColour = '') => {
    withWorldPos(sh);
    sh.uniforms.uRoadD = roadD; Object.assign(sh.uniforms, reflU);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D uRefl; uniform mat4 uReflMat; uniform float uReflK;\n' + NOISE)
      .replace('#include <color_fragment>', `#include <color_fragment>
float wet = wetMask();
${extraColour}
diffuseColor.rgb *= mix(1.0, 0.42, wet);`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.05, wet * wet);')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = normalize(mix(normal, nonPerturbedNormal, wet * 0.9));')
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
reflectedLight.indirectSpecular *= carOcc();
if (uReflK > 0.0) {
  vec4 rc = uReflMat * vec4(vWp, 1.0);
  // ripples: the puddles' own noise bends the image a little; a 3 x 5 tap blur, longer vertically (wet asphalt
  // stretches lights into streaks); faded out far away, where the road plane ends
  vec2 ruv = rc.xy / rc.w + (vec2(wFbm(roadXZ() * 2.7), wFbm(roadXZ() * 2.7 + 31.7)) - 0.5) * 0.03;
  vec3 rcol = vec3(0.0);
  for (int i = 0; i < 3; i++) for (int j = 0; j < 5; j++)
    rcol += texture2D(uRefl, ruv + vec2((float(i) - 1.0) * 0.0035, (float(j) - 2.0) * 0.007)).rgb;
  rcol /= 15.0;
  float nv = clamp(dot(geometryNormal, geometryViewDir), 0.0, 1.0);
  float fr = 0.04 + 0.96 * pow(1.0 - nv, 5.0);
  float far = 1.0 - smoothstep(10.0, 24.0, length(vWp.xz));
  reflectedLight.indirectSpecular = mix(reflectedLight.indirectSpecular, rcol * fr * uReflK, (0.25 + 0.75 * wet * wet) * far);   // damp everywhere, a mirror in the puddles
}`);
  };
  for (const m of [g.material, paintLine]) { m.envMap = scene.environment; m.envMapIntensity = tune.roadEnv ?? 0.5; }
  if (Q.wet) g.material.onBeforeCompile = sh => wetPatch(sh);
  g.material.customProgramCacheKey = () => 'wet-road';
  if (Q.wet) paintLine.onBeforeCompile = sh => wetPatch(sh, 'diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.035), smoothstep(0.5, 0.72, wFbm(roadXZ() * 9.0)) * 0.85);');
  paintLine.customProgramCacheKey = () => 'wet-line';
  let refl = null;
  if (reflU.uReflK.value > 0) {
    const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
    reflU.uRefl.value = rt.texture;
    refl = { rt, cam: new THREE.PerspectiveCamera(), on: true, hide: [g, edge, shadowMesh, ...dashes] };
  }
  const _rt = new THREE.Vector3(), _rd = new THREE.Vector3(), _ru = new THREE.Vector3();
  const BIAS = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
  function renderReflection() {
    const rc = refl.cam;
    camera.updateMatrixWorld();
    rc.position.copy(camera.position); rc.position.y = -rc.position.y;
    camera.getWorldDirection(_rd); _rt.copy(camera.position).add(_rd); _rt.y = -_rt.y;
    _ru.set(0, 1, 0).applyQuaternion(camera.quaternion); _ru.y = -_ru.y;
    rc.up.copy(_ru); rc.lookAt(_rt);
    rc.projectionMatrix.copy(camera.projectionMatrix); rc.projectionMatrixInverse.copy(camera.projectionMatrixInverse);
    rc.updateMatrixWorld();
    reflU.uReflMat.value.copy(BIAS).multiply(rc.projectionMatrix).multiply(rc.matrixWorldInverse);
    for (const o of refl.hide) o.visible = false;
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(refl.rt); renderer.clear(); renderer.render(scene, rc); renderer.setRenderTarget(prev);
    for (const o of refl.hide) o.visible = true;
  }
  const sizeReflection = () => { if (refl) { const pr = renderer.getPixelRatio(); refl.rt.setSize(Math.round(W * pr / 2), Math.round(H * pr / 2)); } };
  sizeReflection();

  // ---- lamps: projector cores + angel-eye rings at the front, deep red tail lamps, two headlight beams
  const uFront = { value: 0 };
  const PROJ = [{ c: [0.695, 0.605], z: 2.07, r: 0.055 }, { c: [0.595, 0.62], z: 2.135, r: 0.036 }];
  const BROWY = 0.655;
  const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.78, 0.86, 1.0) });
  const setRing = v => ringMat.color.setRGB(0.78, 0.86, 1.0).multiplyScalar((9 + 5 * v) * (tune.ring ?? 1));
  if (V6) root.traverse(o => { if (o.isMesh && o.userData.matName === 'angel') o.material = ringMat; });   // modelled rings
  else for (const sx of [1, -1]) for (const p of PROJ) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(p.r * 0.94, 0.0038, 10, 72), ringMat);
    ring.position.set(sx * p.c[0], p.c[1], p.z + 0.006);
    root.add(ring);
  }
  root.traverse(o => {
    if (!o.isMesh || o.userData.matName !== 'lights') return;
    const m = o.material = o.material.clone();
    m.emissive = new THREE.Color(0xffffff);
    m.onBeforeCompile = sh => {
      sh.uniforms.uFront = uFront;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWl;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvWl = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
varying vec3 vWl;
uniform float uFront;
float lensCore() {
  vec2 p = vec2(abs(vWl.x), vWl.y);
  float a = 1.0 - smoothstep(0.016, 0.034, distance(p, vec2(${PROJ[0].c.join(', ')})));
  float b = 1.0 - smoothstep(0.012, 0.026, distance(p, vec2(${PROJ[1].c.join(', ')})));
  return max(a, b);
}`)
        .replace('#include <color_fragment>', '#include <color_fragment>\nif (abs(vWl.z) < 1.5) diffuseColor.rgb *= vec3(0.30, 0.16, 0.04);')
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
if (vWl.z > 1.5) {
  float below = 1.0 - smoothstep(${(BROWY - 0.004).toFixed(4)}, ${(BROWY + 0.004).toFixed(4)}, vWl.y);
  totalEmissiveRadiance = vec3(1.0, 0.96, 0.9) * uFront * below * (0.6 + 9.0 * lensCore());
} else if (vWl.z < -1.5) {
  float tail = smoothstep(0.69, 0.71, vWl.y) * (1.0 - smoothstep(0.94, 0.96, vWl.y));
  totalEmissiveRadiance = vec3(0.62, 0.006, 0.004) * 1.6 * tail;
} else totalEmissiveRadiance = vec3(0.0);`);
    };
  });
  const headlamps = [];
  for (const x of [0.62, -0.62]) {   // always in the scene (0 when off): fading them never recompiles
    const hl = new THREE.SpotLight(0xfff1dc, 0, 30, 0.42, 0.6, 1.6); hl.position.set(x, 0.72, 2.25); hl.target.position.set(x * 1.6, 0, 12);
    scene.add(hl, hl.target); headlamps.push(hl);
  }
  const setLights = (v, beam = 1) => { uFront.value = v; headlamps.forEach(h => { h.intensity = 40 * v * beam; }); setRing(v); };

  // no baked AO on the paint's reflections: the coarse bake made dark blotches on the doors
  applyBakedAO(root, { strength: 1, specularOf: m => (m === paint ? 0 : 0.85) });

  // ---- driving loop + chapter effects (patched after the AO, as in the viewer)
  const fx = createChapterFx({ scene, root, renderer, camera, roadMaps, dashes, roadD, shutter: 1 / 48, speed: look.speed > 0 ? look.speed : 1 });
  fx.patch(g.material, { road: true }); fx.patch(paintLine);

  // ---- post: MSAA → heat haze → HDR cap → bloom → tone map → grain + vignette + limiter flash
  const rt = new THREE.WebGLRenderTarget(W * dpr, H * dpr, { type: THREE.HalfFloatType, samples });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(dpr); composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  const haze = new ShaderPass(HAZE_SHADER); haze.enabled = false; composer.addPass(haze);
  composer.addPass(new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uCap: { value: 16 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform sampler2D tDiffuse; uniform float uCap; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv); gl_FragColor = vec4(min(c.rgb, vec3(uCap)), c.a); }',
  }));
  const BLOOM = 0.35;   // strength; each chapter scales it (st.bloom)
  const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), BLOOM, 0.3, 6);
  bloom.enabled = Q.bloom;
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  // cheap edge smoothing, only when the adaptive quality has turned MSAA off (sRGB input, before the grain)
  const fxaa = new ShaderPass(FXAAShader); fxaa.enabled = false; composer.addPass(fxaa);
  const finish = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uGrain: { value: Q.grain === false ? 0 : 0.024 }, uVig: { value: 0.45 }, uSeed: { value: 0 }, uFlash: { value: 0 },
      uContrast: { value: tune.contrast ?? 0 },
      uAspect: { value: W / H }, uGround: { value: new THREE.Color(0x14171b).convertLinearToSRGB() } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uGrain, uVig, uSeed, uAspect, uFlash, uContrast; uniform vec3 uGround; varying vec2 vUv;
float h(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
void main() {
  vec3 c = texture2D(tDiffuse, vUv).rgb;
  // uContrast: an S-curve on the display values (AgX's "Medium High Contrast" look of the Cycles renders)
  vec3 cc = clamp(c, 0.0, 1.0); c = mix(c, cc * cc * (3.0 - 2.0 * cc), uContrast);
  vec2 d = (vUv - 0.5) * vec2(uAspect, 1.0);
  float r = length(d) / length(vec2(uAspect, 1.0) * 0.5);
  c = mix(c, uGround, smoothstep(0.5, 1.05, r) * uVig);
  c = mix(c, vec3(0.898, 0.282, 0.180), uFlash * 0.55 * smoothstep(0.45, 1.05, r));
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c += (h(gl_FragCoord.xy + uSeed * 97.0) - 0.5) * uGrain * (1.15 - 0.6 * l);
  gl_FragColor = vec4(c, 1.0);
}`,
  });
  composer.addPass(finish);

  // ---- camera on the rail
  let portrait = H > W;
  let path = cameraPath(CHAPTERS, { portrait });
  const fitFov = fov => (portrait && W / H < PORTRAIT_REF
    ? THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(fov) / 2) * PORTRAIT_REF / (W / H)))
    : fov);
  const s = { pos: new THREE.Vector3(), target: new THREE.Vector3(), shift: [0, 0] };
  const applyKey = k => {
    camera.fov = fitFov(k.fov); camera.position.copy(k.pos); camera.lookAt(k.target);
    camera.setViewOffset(W, H, -k.shift[0] * W / 2, k.shift[1] * H / 2, W, H); camera.updateProjectionMatrix();
  };
  const base = { env: scene.environmentIntensity, sky: backdrop.material.uniforms.uK.value, road: g.material.envMapIntensity, line: paintLine.envMapIntensity };

  let soundK = 0;
  function frame({ p, ft = null, dt = 1 / 60, draw = true, sound = false }) {
    path.sample(p, s); applyKey(s);
    const st = fx.update({ p, ft, dt });
    setLights(st.lights, s.beam);
    camera.position.y += st.dip;
    camera.rotateX(st.rot[0]); camera.rotateY(st.rot[1]); camera.rotateZ(st.rot[2]);
    scene.environmentIntensity = base.env * (0.15 + 0.85 * st.dim);
    backdrop.material.uniforms.uK.value = base.sky * st.dim;
    g.material.envMapIntensity = base.road * st.dim;
    paintLine.envMapIntensity = base.line * st.dim;
    bloom.strength = BLOOM * st.bloom;
    // the heat haze grows over ~1 s while the V10 recording plays and settles back when it stops
    soundK += ((sound ? 1 : 0) - soundK) * (1 - Math.exp(-dt / (sound ? 0.8 : 1.2)));
    haze.enabled = st.haze > 0.001;
    if (haze.enabled) fx.projectHaze(haze.uniforms, st.haze * (1 + HAZE_SOUND * soundK));
    finish.uniforms.uFlash.value = st.flash;
    if (draw) {
      if (refl?.on) renderReflection();
      finish.uniforms.uSeed.value = (finish.uniforms.uSeed.value + 1) % 64; composer.render();
      if (adaptive) govern(dt);
    }
    return st;
  }

  // ---- adaptive quality: only for graphics that cannot hold ~50 fps (integrated GPUs). Full quality stays
  // untouched where it runs smoothly; each step costs the least visible thing first.
  const LEVELS = [
    { dpr, samples, bloom: true },
    { dpr: Math.min(dpr, 1), samples, bloom: true },
    { dpr: Math.min(dpr, 1), samples: 0, bloom: true },      // MSAA is the dearest pass on an iGPU
    { dpr: Math.min(dpr, 0.75), samples: 0, bloom: true },
    { dpr: Math.min(dpr, 0.6), samples: 0, bloom: false },
  ].filter((l, i, a) => i === 0 || JSON.stringify(l) !== JSON.stringify(a[i - 1]));
  let level = 0, warm = 0, times = [];
  function setLevel(i) {
    level = Math.max(0, Math.min(LEVELS.length - 1, i));
    const L = LEVELS[level];
    for (const t of [composer.renderTarget1, composer.renderTarget2]) { t.samples = L.samples; t.dispose(); }
    renderer.setPixelRatio(L.dpr); renderer.setSize(W, H, false);
    composer.setPixelRatio(L.dpr);
    bloom.enabled = Q.bloom && L.bloom;
    fxaa.enabled = L.samples === 0;
    if (refl) { refl.on = level < 2; reflU.uReflK.value = refl.on ? tune.reflect : 0; sizeReflection(); }   // the mirror goes with MSAA
    fxaa.material.uniforms.resolution.value.set(1 / (W * L.dpr), 1 / (H * L.dpr));
    performance.mark('msport-film-quality-' + level);
  }
  function govern(dt) {
    if (++warm < 40) return;                      // skip the first frames (uploads, caches)
    times.push(dt);
    if (times.length < 45) return;
    const mean = times.reduce((a, b) => a + b, 0) / times.length;
    times = [];
    if (mean > 0.0205 && level < LEVELS.length - 1) { setLevel(level + 1); warm = 25; }
  }

  function resize(w, h) {
    W = w; H = h;
    renderer.setSize(W, H, false);
    composer.setSize(W, H);
    bloom.resolution.set(W, H);
    finish.uniforms.uAspect.value = W / H;
    const pr = renderer.getPixelRatio();
    fxaa.material.uniforms.resolution.value.set(1 / (W * pr), 1 / (H * pr));
    sizeReflection();
    camera.aspect = W / H;
    if ((H > W) !== portrait) { portrait = H > W; path = cameraPath(CHAPTERS, { portrait }); }
  }

  // compile every shader now (one long task during loading instead of a hitch mid-scroll): the hidden
  // wheel-blur discs and the heat-haze pass too
  for (const w of fx.wheels) w.disc.visible = true;
  renderer.compile(scene, camera);
  haze.enabled = true; composer.render(); haze.enabled = false;
  for (const w of fx.wheels) w.disc.visible = false;

  return {
    frame, resize, renderer, keys: () => path.keys,
    get level() { return level; }, setLevel,
    dispose() { composer.dispose(); renderer.dispose(); renderer.forceContextLoss(); },
  };
}

/**
 * Materials for the v6 model (bl_web_export.py), by its material names; values from the Cycles materials
 * (bl_materials.py: tuples are linear, hex is sRGB). The angel rings get the scene's ring material later.
 */
function v6Materials(root, { env, lampEnv = 1, discGlow = 0.35, paint, glass, carbon }) {
  const lin = (r, g, b) => new THREE.Color().setRGB(r, g, b);
  const std = (color, metalness, roughness, extra = {}) => new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
  const phys = (color, metalness, roughness, extra = {}) => new THREE.MeshPhysicalMaterial({ color, metalness, roughness, ...extra });
  const lens = (color, opacity) => phys(color, 0, 0.02, { transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 1.2 });
  // brake disc: steel; glows orange in the wheels chapter (chapter-fx.js drives userData.spin.glow)
  const disc = std(lin(0.42, 0.42, 0.43), 1, 0.38);
  disc.userData.spin = { blur: { value: 0 }, glow: { value: 0 } };
  // glow on the friction ring only (wheel space: axle along x; outer 45 % of the radius), deep orange
  const discR = { value: 0 };
  root.traverse(o => {
    if (!o.isMesh || !/^brake_disc_/.test(o.name)) return;
    o.updateMatrix(); o.geometry.applyMatrix4(o.matrix);                 // into wheel space (axle at 0, along x)
    o.position.set(0, 0, 0); o.quaternion.identity(); o.scale.set(1, 1, 1); o.updateMatrix();
    const p = o.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) discR.value = Math.max(discR.value, Math.hypot(p.getY(i), p.getZ(i)));
  });
  disc.onBeforeCompile = sh => {
    sh.uniforms.uGlow = disc.userData.spin.glow; sh.uniforms.uDiscR = discR;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vObj;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uGlow, uDiscR;\nvarying vec3 vObj;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
float ring = smoothstep(0.55, 0.62, length(vObj.yz) / uDiscR);
totalEmissiveRadiance += vec3(1.0, 0.1, 0.005) * ${discGlow.toFixed(3)} * uGlow * ring;`);
  };
  disc.customProgramCacheKey = () => 'v6-disc';
  const M = {
    paint, glass, carbon,
    brake_disc: disc,
    chrome: std(0xc6c6c6, 1, 0.08),
    reflector: std(lin(0.7, 0.7, 0.72), 1, 0.06),
    mirror: std(lin(0.75, 0.75, 0.76), 1, 0),
    housing: std(lin(0.5, 0.51, 0.53), 1, 0.1),               // the headlight bowl: mirrors the rings
    lamp_glass: lens(0xffffff, 0.12),
    lamp_red: lens(lin(0.30, 0.006, 0.008), 0.72),
    amber: phys('#d06a10', 0, 0.25, { transparent: true, opacity: 0.85 }),
    bulb: lens(0xc8d2dc, 0.35),                                // projector lens: clear glass
    tail_glow: new THREE.MeshBasicMaterial({ color: lin(1.0, 0.035, 0.015).multiplyScalar(3.2) }),
    tail_reflector: std(lin(0.32, 0.025, 0.018), 1, 0.24, { emissive: lin(1.0, 0.05, 0.02), emissiveIntensity: 0.35 }),
    plastic: std('#121315', 0, 0.55),
    grille: phys(0x08090a, 0.2, 0.38, { clearcoat: 0.5, clearcoatRoughness: 0.12 }),
    trim_gloss: phys('#0b0c0d', 0, 0.08, { clearcoat: 0.5, clearcoatRoughness: 0.05 }),
    frit: std('#0a0a0b', 0, 0.22),
    interior: std('#101114', 0, 0.6),
    underbody: std('#0e0e0e', 0, 0.85),
    tyre: std('#1b1b1c', 0, 0.78),
    rim: phys('#b9bcbf', 1, 0.3, { clearcoat: 0.6, clearcoatRoughness: 0.05 }),
    caliper: std('#8d8f92', 0.7, 0.42),
    exhaust: std(lin(0.3, 0.294, 0.282), 1, 0.34),
    badge_black: phys('#0c0c0c', 0, 0.15, { clearcoat: 1 }),
    badge_white: phys('#e4e4e4', 0, 0.2, { clearcoat: 1 }),
    badge_blue: phys('#1c69d4', 0, 0.2, { clearcoat: 1 }),
    badge_m_light: phys('#0a96d6', 0, 0.25, { clearcoat: 1, clearcoatRoughness: 0.02 }),
    badge_m_dark: phys('#283087', 0, 0.25, { clearcoat: 1, clearcoatRoughness: 0.02 }),
    badge_m_red: phys('#e1261c', 0, 0.25, { clearcoat: 1, clearcoatRoughness: 0.02 }),
  };
  for (const [k, m] of Object.entries(M)) if (!m.name) m.name = k;
  // inside the lamps: a closed box would hardly see the sky; the environment map does not know that (lampEnv < 1 dims it)
  for (const k of ['housing', 'reflector', 'tail_reflector']) { M[k].envMap = env; M[k].envMapIntensity = lampEnv; }
  root.traverse(o => {
    if (!o.isMesh) return;
    const swap = m => M[m.name] || m;
    o.userData.matName = [].concat(o.material)[0].name || '';
    o.material = Array.isArray(o.material) ? o.material.map(swap) : swap(o.material);
  });
}
