// Exports the film's per-frame state for the Cycles renderer (bl_film.py): camera on the rail (desktop and
// portrait keys) and the chapter effects the Cycles film reproduces (headlights, dimming, disc glow, light
// bar, roof sweep, vehicle speed and distance), frame for frame the same as video.mjs renders.
//   node rail-export.mjs <out.json>
import fs from 'node:fs';
import { CHAPTERS } from './chapters.js';
import { cameraPath } from './camera-path.js';
import { sequence, SIM_DT, LOOPS, LOOP_LEN, LOOP_FADE } from './video-timeline.js';
import { HOLDS, CRUISE } from './chapter-fx.js';

const DEFAULT = { lights: 1, dim: 1, bloom: 1, haze: 0, glow: 0, speed: CRUISE, bar: -1, roof: -1, rpm: 0, gear: 0 };
const BLEND = ['lights', 'dim', 'bloom', 'haze', 'glow'];
const ease = t => t * t * t * (t * (t * 6 - 15) + 10);
const hold = (i, t) => ({ ...DEFAULT, ...HOLDS[i](t) });
function state(p, ft) {
  if (ft !== null) return hold(Math.round(p), ft);
  const a = Math.min(Math.floor(p), HOLDS.length - 2), e = ease(p - a);
  const A = hold(a, 1), B = hold(a + 1, 0), st = { ...DEFAULT };
  for (const k of BLEND) st[k] = A[k] + (B[k] - A[k]) * e;
  return st;
}
function run(seq) {
  const paths = { desktop: cameraPath(CHAPTERS), portrait: cameraPath(CHAPTERS, { portrait: true }) };
  let v = CRUISE, d = 0;
  return seq.map(({ p, ft }) => {
    const st = state(p, ft);
    const target = ft !== null ? st.speed : CRUISE, tau = target < v ? 0.11 : 0.45;
    v += (target - v) * (1 - Math.exp(-SIM_DT / tau)); d += v * SIM_DT;
    const cam = {};
    for (const [k, path] of Object.entries(paths)) {
      const s = path.sample(p);
      cam[k] = { pos: s.pos.toArray(), target: s.target.toArray(), fov: s.fov, shift: [...s.shift] };
    }
    const sd = paths.desktop.sample(p);
    return { p, ft, cam, lights: st.lights, beam: sd.beam, dim: st.dim, glow: st.glow, bar: st.bar, roof: st.roof, v, d };
  });
}
const film = run(sequence());
// idle loops: LOOP_LEN + LOOP_FADE frames each at one rail state, the car keeps driving
const loops = LOOPS.map(l => run(Array.from({ length: LOOP_LEN + LOOP_FADE }, () => ({ p: l.rail, ft: l.ft }))));
fs.writeFileSync(process.argv[2], JSON.stringify({ chapters: CHAPTERS, film, loops }));
console.log('film', film.length, 'frames, loops', loops.length);
