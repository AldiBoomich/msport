// Exports the film's per-frame state for the Cycles renderer (bl_film.py): camera on the rail (desktop and
// portrait keys) and the chapter effects the Cycles film reproduces (headlights, dimming, disc glow, light
// bar, roof sweep, vehicle speed and distance), frame for frame the same as video.mjs renders.
//   node rail-export.mjs <out.json> [--fps 50]
//
// --fps: the same film in time at another frame rate (the site's timeline counts frames at 30 fps; a hold of
// 45 frames is 1.5 s, so at 50 fps it becomes 75 frames). The site's own files stay at 30 until its videos
// are replaced.
//
// Driving dynamics (2026-11-22, the user: "let the car weave and change lanes now and then, the suspension
// working"), deterministic: lane changes in the wide shots, a slow weave, road bumps, and from them the body's
// roll (lateral g), pitch (braking / accelerating), heave, the front wheels' steer, and the path of the camera
// rig, which follows the car with a lag (a tracking car), so the car swings a little in the frame.
import fs from 'node:fs';
import { CHAPTERS } from './chapters.js';
import { cameraPath } from './camera-path.js';
import { HOLD, LEG, LOOPS, LOOP_LEN, LOOP_FADE } from './video-timeline.js';
import { HOLDS, CRUISE } from './chapter-fx.js';

const args = process.argv.slice(2);
const out = args.find(a => !a.startsWith('--'));
const fps = Number(args[args.indexOf('--fps') + 1]) || 30;
const K = fps / 30, DT = 1 / fps;
const n30 = f => Math.round(f * K);

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
// video-timeline.js → sequence(), at this frame rate
function sequence() {
  const seq = [];
  for (let i = 0; i < HOLD.length; i++) {
    const h = n30(HOLD[i]), l = n30(LEG);
    for (let k = 0; k < h; k++) seq.push({ p: i, ft: k / (h - 1) });
    if (i < HOLD.length - 1) for (let k = 1; k <= l; k++) seq.push({ p: i + k / (l + 1), ft: null });
  }
  return seq;
}
function run(seq) {
  const paths = { desktop: cameraPath(CHAPTERS), portrait: cameraPath(CHAPTERS, { portrait: true }) };
  let v = CRUISE, d = 0;
  return seq.map(({ p, ft }) => {
    const st = state(p, ft);
    const target = ft !== null ? st.speed : CRUISE, tau = target < v ? 0.11 : 0.45;
    v += (target - v) * (1 - Math.exp(-DT / tau)); d += v * DT;
    const cam = {};
    for (const [k, path] of Object.entries(paths)) {
      const s = path.sample(p);
      cam[k] = { pos: s.pos.toArray(), target: s.target.toArray(), fov: s.fov, shift: [...s.shift] };
    }
    const sd = paths.desktop.sample(p);
    return { p, ft, cam, lights: st.lights, beam: sd.beam, dim: st.dim, glow: st.glow, bar: st.bar, roof: st.roof, v, d };
  });
}

// ---------------------------------------------------------------- driving dynamics
const LANE = 3.75;                     // the next lane's centre, to the car's left (+x): dashes at 1.95, edge at -1.75
const LC_T = 4.5;                      // seconds a lane change takes (calm, as in an advert)
const smoother = t => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * t * (t * (t * 6 - 15) + 10));
const WHEELBASE = 2.78;
const ROLL_K = 0.018;                  // rad per m/s² of lateral acceleration (a soft-ish 3° at 0.3 g: the roll reads)
const PITCH_K = 0.0021;                // rad per m/s² of braking / acceleration (~1° at 0.8 g)

function lowpass(xs, tau) {           // critically damped follower (the camera rig)
  const out = []; let x = xs[0], vx = 0; const w = 1 / tau;
  for (const target of xs) {
    const a = w * w * (target - x) - 2 * w * vx;
    vx += a * DT; x += vx * DT; out.push(x);
  }
  return out;
}
const deriv = xs => xs.map((x, i) => (xs[Math.min(i + 1, xs.length - 1)] - xs[Math.max(i - 1, 0)]) / (DT * (Math.min(i + 1, xs.length - 1) - Math.max(i - 1, 0))));

function dynamics(states, { periodic = 0, lanes = true } = {}) {
  const n = states.length, t = states.map((_, i) => i * DT);
  // lane changes: in stretches where the desktop camera stays wide (> 6 m off the car) for a whole change,
  // at least 10 s apart, alternately out to the next lane and back
  const lat = new Array(n).fill(0);
  if (lanes) {
    const wide = states.map(s => Math.hypot(...s.cam.desktop.pos) > 5.5 && Math.hypot(...s.cam.portrait.pos) > 5.5);
    const need = Math.round(LC_T / DT); let last = -1e9, side = 1, base = 0; const events = [];
    for (let i = Math.round(1.5 / DT); i + need < n; i++) {
      if (t[i] - last < 10) continue;
      let ok = true;
      for (let k = i; k <= i + need && ok; k++) ok = wide[k];
      if (ok) { events.push([i, side]); last = t[i]; side = -side; i += need; }
    }
    for (let i = 0; i < n; i++) {
      let x = 0;
      for (const [s0, sd] of events) x += (sd > 0 ? 1 : -1) * LANE * smoother((t[i] - t[s0]) / LC_T);
      lat[i] = x;
    }
    console.log('lane changes at', events.map(([i, sd]) => `${(i * DT).toFixed(1)}s ${sd > 0 ? 'out' : 'back'}`).join(', '));
  }
  // a slow weave and the road's bumps (periodic in a loop: whole cycles over its length)
  const P = periodic || 0;
  const fit = f => (P ? Math.max(1, Math.round(f * P)) / P : f);      // a frequency with whole cycles in P seconds
  const fw = fit(1 / 6.5), f1 = fit(1.3), f2 = fit(2.3), f3 = fit(0.7);
  const weave = t.map(x => 0.11 * Math.sin(2 * Math.PI * fw * x));
  const latT = lat.map((x, i) => x + (P ? 0.4 : 1) * weave[i]);
  const vlat = deriv(latT), alat = deriv(vlat);
  // the site's speed changes are near steps (a brake to a crawl in 0.1 s): the body feels them as a real car
  // would, at most 0.9 g braking / 0.6 g accelerating, smoothed over the suspension's response
  const v = states.map(s => s.v), ax = lowpass(deriv(v).map(a => Math.max(-8.8, Math.min(5.9, a))), 0.18);
  const yaw = vlat.map((vy, i) => Math.atan2(vy, Math.max(v[i], 1)));
  // the rig follows the path with a lag; what the camera sees is the difference
  const latS = P ? latT.map(() => 0) : lowpass(latT, 0.45), yawS = P ? yaw.map(() => 0) : lowpass(yaw, 0.45);
  return states.map((s, i) => {
    const bump = 0.005 * Math.sin(2 * Math.PI * f1 * t[i] + 1.1) + 0.003 * Math.sin(2 * Math.PI * f2 * t[i] + 0.4);
    const rollN = 0.0022 * Math.sin(2 * Math.PI * f3 * t[i] + 2.0) + 0.0012 * Math.sin(2 * Math.PI * f2 * t[i] + 2.9);
    const pitchN = 0.0012 * Math.sin(2 * Math.PI * f1 * t[i] + 0.3);
    return {
      ...s,
      lat: latT[i], lat_s: latS[i], yaw: yaw[i], yaw_s: yawS[i],
      roll: -ROLL_K * alat[i] + rollN, pitch: -PITCH_K * ax[i] + pitchN, heave: bump,
      steer: Math.atan(WHEELBASE * alat[i] / Math.max(v[i] * v[i], 4)),
    };
  });
}

const film = dynamics(run(sequence()));
// idle loops: LOOP_LEN + LOOP_FADE frames each at one rail state, the car keeps driving; the motion repeats
// every LOOP_LEN frames, so the cross-faded seam is invisible
const LL = n30(LOOP_LEN), LF = n30(LOOP_FADE);
const loops = LOOPS.map(l => dynamics(run(Array.from({ length: LL + LF }, () => ({ p: l.rail, ft: l.ft }))),
  { periodic: LL * DT, lanes: false }));
fs.writeFileSync(out, JSON.stringify({ fps, chapters: CHAPTERS, film, loops, loop_len: LL, loop_fade: LF }));
const maxAbs = k => Math.max(...film.map(s => Math.abs(s[k])));
console.log('fps', fps, 'film', film.length, 'frames, loops', loops.length, 'x', LL + LF,
  '| max roll', (maxAbs('roll') * 180 / Math.PI).toFixed(2), 'deg, pitch', (maxAbs('pitch') * 180 / Math.PI).toFixed(2),
  'deg, yaw', (maxAbs('yaw') * 180 / Math.PI).toFixed(1), 'deg, steer', (maxAbs('steer') * 180 / Math.PI).toFixed(1), 'deg, lat', maxAbs('lat').toFixed(2), 'm');
