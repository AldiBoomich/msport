// Reflection environment for the car: the theme imports this file as is.
//
// nightEnvironment(renderer, { hdr, ... }) → PMREM texture for scene.environment.
//   A night city HDRI (what the paint reflects: the skyline as a bright line along the doors, street
//   lights, dark sky) plus soft-edged "lightformers" — long panels like the softboxes of a car studio
//   or tunnel lights — that draw clean highlight lines along the bonnet, roof and shoulder, so the
//   body's shape reads in black paint.
//   Rendered into a 1024 px cube first: PMREMGenerator.fromScene() is fixed at 256 px, far too soft
//   for a mirror clear coat (that is what made the reflections look low-res).
import * as THREE from 'three';
import { skyMesh } from './city-sky.js';

const formerMaterial = (color, k, soft) => new THREE.ShaderMaterial({
  uniforms: { uC: { value: new THREE.Color(color).multiplyScalar(k) }, uSoft: { value: soft } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  // soft rectangle: full brightness inside, smooth falloff to 0 over `uSoft` of the half-size at the edges
  fragmentShader: `uniform vec3 uC; uniform vec2 uSoft; varying vec2 vUv;
void main(){
  vec2 d = abs(vUv - 0.5) * 2.0;
  float e = (1.0 - smoothstep(1.0 - uSoft.x, 1.0, d.x)) * (1.0 - smoothstep(1.0 - uSoft.y, 1.0, d.y));
  gl_FragColor = vec4(uC * e, 1.0);
}`,
  side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, toneMapped: false,
});

// default lightformers, car-centred (front = +z, car's left = +x)
export const DEFAULT_FORMERS = [
  // long overhead strip along the car: the bright line down the bonnet, roof and boot
  { size: [1.4, 11], pos: [0, 6, 0], rot: [Math.PI / 2, 0, 0], color: 0xe6eeff, k: 3.2, soft: [0.5, 0.15] },
  // wide soft panel above-front: the windscreen and bonnet glow
  { size: [7, 2.4], pos: [0, 5, 6], look: [0, 0.6, 0], color: 0xdde6f5, k: 0.55, soft: [0.6, 0.8] },
  // low horizontal strips on both sides: the highlight line along the shoulder and doors
  { size: [12, 0.45], pos: [7.5, 1.7, 0], look: [0, 1.7, 0], color: 0xffd2a6, k: 2.2, soft: [0.25, 0.6] },
  { size: [12, 0.45], pos: [-7.5, 1.7, 0], look: [0, 1.7, 0], color: 0xc8d8ff, k: 1.8, soft: [0.25, 0.6] },
  // vertical kicker behind-left: the rear three-quarter edge
  { size: [0.5, 4], pos: [-5, 2.5, -6], look: [0, 1, 0], color: 0xffffff, k: 2.0, soft: [0.6, 0.4] },
];

export function nightEnvironment(renderer, {
  hdr = null,            // equirectangular HDR texture (RGBELoader), or null for a black void
  sky = null,            // or the packed panorama (city-sky.js → loadCitySky), drawn as a sphere
  hdrIntensity = 1,
  rotation = 0,          // HDRI yaw, radians
  formers = DEFAULT_FORMERS,
  formerScale = 1,
  ground = 0x0a0b0d,     // the night road under the car (linear colour × groundK), or null to keep the HDRI's ground
  groundK = 0.12,
  size = 1024,           // cube face size
  centre = [0, 0.8, 0],
  soften = null,         // skyMesh soften: blur near-field clutter in the panorama (reflections only)
} = {}) {
  const es = new THREE.Scene();
  if (sky) {
    const m = skyMesh(sky, { intensity: hdrIntensity, rotation, soften });
    m.renderOrder = -2; es.add(m);
    es.background = null;
  } else if (hdr) {
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    es.background = hdr; es.backgroundIntensity = hdrIntensity; es.backgroundRotation.set(0, rotation, 0);
  } else es.background = new THREE.Color(0x020203);
  // the HDRI's own ground (a lit square, pavement) would show in every door as a grey wall; a dark road
  // instead gives the classic crisp horizon line along the doors: bright city above, black road below
  if (ground !== null) {
    const g = new THREE.Mesh(new THREE.CircleGeometry(120, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color(ground).multiplyScalar(groundK), side: THREE.DoubleSide, toneMapped: false }));
    g.rotation.x = -Math.PI / 2; g.renderOrder = -1; es.add(g);
  }
  for (const f of formers) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(f.size[0], f.size[1]), formerMaterial(f.color, f.k * formerScale, new THREE.Vector2(...f.soft)));
    m.position.fromArray(f.pos);
    if (f.rot) m.rotation.fromArray(f.rot); else m.lookAt(new THREE.Vector3().fromArray(f.look)); // straight down: lookAt is degenerate
    es.add(m);
  }
  const rt = new THREE.WebGLCubeRenderTarget(size, { type: THREE.HalfFloatType, generateMipmaps: false });
  const cam = new THREE.CubeCamera(0.05, 500, rt);
  cam.position.fromArray(centre);
  cam.update(renderer, es);
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromCubemap(rt.texture).texture;
  pm.dispose(); rt.dispose();
  es.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } }); // the sky's textures stay (backdrop)
  return env;
}
