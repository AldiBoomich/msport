// The night city panorama, packed by tools/3d/hdr-pack.mjs (base + gain WebP, ~1 MB instead of a 25 MB
// .hdr), decoded on the GPU. The theme imports this file as is.
//
//   const sky = await loadCitySky('/path/shanghai-bund-4k');     // fetches -base.webp, -gain.webp, .json
//   skyMesh(sky, { intensity, rotation, radius })                // sphere that shows the panorama, for
//                                                                // nightEnvironment({ sky }) and the backdrop
// hdr = srgbToLinear(base) * 2^(gain * gmax), sampled per pixel by view direction with the same
// equirectangular mapping three.js uses for scene.background.
import * as THREE from 'three';

export async function loadCitySky(prefix, { maxAnisotropy = 1 } = {}) {
  const tl = new THREE.TextureLoader();
  const [base, gain, meta] = await Promise.all([
    tl.loadAsync(prefix + '-base.webp'),
    tl.loadAsync(prefix + '-gain.webp'),
    fetch(prefix + '.json').then(r => { if (!r.ok) throw new Error('city sky: ' + r.status); return r.json(); }),
  ]);
  base.colorSpace = THREE.SRGBColorSpace;
  for (const t of [base, gain]) {
    // no mipmaps: the atan() seam of the equirect lookup would pick the smallest mip along a line.
    // The panorama is never minified much (4K across 360°; a 1024 cube face is 1:1).
    t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter;
    t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping; t.anisotropy = maxAnisotropy;
  }
  return { base, gain, gmax: meta.gmax };
}

// soften: blur the panorama where it is near-field clutter (the Bund's lit trees), for the reflections only.
//   { u: [[u0, u1], ...] texture-space azimuth ranges, v: [v0, v1] elevation band, r: [ru, rv] blur radius }
// band: { sky: loadCitySky(<a horizontal strip of the same panorama at a higher resolution>), v: [v0, v1] } — the
// strip covers panorama v0…v1 (uv.y, 0 = straight down) and replaces the panorama there, so the skyline is sharp
// without a 16K file (the rest of the sky is smooth anyway)
// cap: the brightest the sphere may show (linear), e.g. just under the bloom threshold so the city never blooms
export function skyMaterial(sky, { intensity = 1, rotation = 0, soften = null, band = null, cap = 0 } = {}) {
  const S = soften ? soften.u.length : 0;
  return new THREE.ShaderMaterial({
    uniforms: { uBase: { value: sky.base }, uGain: { value: sky.gain }, uGmax: { value: sky.gmax },
      uK: { value: intensity }, uRot: { value: rotation },
      uBandBase: { value: band?.sky.base || null }, uBandGain: { value: band?.sky.gain || null }, uBandGmax: { value: band?.sky.gmax || 0 },
      uBandV: { value: new THREE.Vector2(...(band?.v || [0, 1])) } },
    defines: { ...(S ? { SOFT_N: S } : {}), ...(band ? { BAND: 1 } : {}), ...(cap ? { CAP: cap.toFixed(3) } : {}) },
    vertexShader: 'varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: /* glsl */`
uniform sampler2D uBase, uGain; uniform float uGmax, uK, uRot; varying vec3 vD;
vec3 sky(vec2 uv) { return texture2D(uBase, uv).rgb * exp2(texture2D(uGain, uv).r * uGmax); }
#ifdef BAND
uniform sampler2D uBandBase, uBandGain; uniform float uBandGmax; uniform vec2 uBandV;
vec3 skyBand(vec2 uv) {
  vec2 b = vec2(uv.x, (uv.y - uBandV.x) / (uBandV.y - uBandV.x));
  return texture2D(uBandBase, b).rgb * exp2(texture2D(uBandGain, b).r * uBandGmax);
}
#endif
${S ? `const vec2 SOFT_U[SOFT_N] = vec2[](${soften.u.map(([a, b]) => `vec2(${a.toFixed(4)}, ${b.toFixed(4)})`).join(', ')});
float softMask(vec2 uv) {
  float m = 0.0;
  for (int i = 0; i < SOFT_N; i++) m = max(m, smoothstep(SOFT_U[i].x - 0.02, SOFT_U[i].x + 0.02, uv.x) * (1.0 - smoothstep(SOFT_U[i].y - 0.02, SOFT_U[i].y + 0.02, uv.x)));
  return m * smoothstep(${(soften.v[0] - 0.03).toFixed(4)}, ${(soften.v[0] + 0.03).toFixed(4)}, uv.y) * (1.0 - smoothstep(${(soften.v[1] - 0.03).toFixed(4)}, ${(soften.v[1] + 0.03).toFixed(4)}, uv.y));
}
vec3 skySoft(vec2 uv) {
  vec3 acc = vec3(0.0); float w = 0.0;
  for (int i = -8; i <= 8; i++) for (int j = -6; j <= 6; j++) {
    vec2 o = vec2(float(i) / 8.0 * ${soften.r[0].toFixed(4)}, float(j) / 6.0 * ${soften.r[1].toFixed(4)});
    float k = exp(-2.0 * dot(vec2(i, j) / vec2(8.0, 6.0), vec2(i, j) / vec2(8.0, 6.0)));
    acc += min(sky(uv + o), vec3(8.0)) * k; w += k;
  }
  vec3 b = acc / w;
  // the trees are green under sodium light: keep the brightness, give it the facades' warm gold
  return dot(b, vec3(0.2126, 0.7152, 0.0722)) * vec3(1.27, 0.96, 0.56);
}` : ''}
void main() {
  vec3 d = normalize(vD);
  // scene.backgroundRotation (yaw) as three.js applies it to an equirect background
  float c = cos(uRot), s = sin(uRot);
  d = vec3(c * d.x - s * d.z, d.y, s * d.x + c * d.z);
  vec2 uv = vec2(atan(d.z, d.x) * 0.15915494 + 0.5, asin(clamp(d.y, -1.0, 1.0)) * 0.31830989 + 0.5);
  vec3 hdr = sky(uv);
#ifdef BAND
  float bw = smoothstep(uBandV.x, uBandV.x + 0.008, uv.y) * (1.0 - smoothstep(uBandV.y - 0.008, uBandV.y, uv.y));
  if (bw > 0.0) hdr = mix(hdr, skyBand(uv), bw);
#endif
${S ? '  float sm = softMask(uv); if (sm > 0.0) hdr = mix(hdr, skySoft(uv), sm);' : ''}
  hdr *= uK;
#ifdef CAP
  hdr = min(hdr, vec3(CAP));
#endif
  gl_FragColor = vec4(hdr, 1.0);
}`,
    side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false, toneMapped: false,
  });
}

export function skyMesh(sky, { intensity = 1, rotation = 0, radius = 400, followCamera = false, soften = null, band = null, cap = 0 } = {}) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 32), skyMaterial(sky, { intensity, rotation, soften, band, cap }));
  m.frustumCulled = false;
  if (followCamera) m.onBeforeRender = (r, s, cam) => { m.position.copy(cam.position); m.updateMatrixWorld(); };
  return m;
}
