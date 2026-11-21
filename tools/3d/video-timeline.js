// The pre-rendered film (DESIGN.md → How the 3D film works → Video version): one continuous video of the whole
// camera rail, scrubbed by the scroll on devices that cannot run the live scene at full quality.
// Shared by the renderer (video.mjs) and the page (src/film/video.js), so frame k always shows the same state.
//
// Order: hold 0, leg 0→1, hold 1, leg 1→2, … hold 9. A hold plays its chapter (ft 0…1); a leg is the camera
// travelling to the next key. Frame counts follow the scroll lengths in main.css → 8.0 (a hold is 50svh,
// 150svh in rev and smg; a leg is about 100svh), so the picture moves at the same pace everywhere.
export const SIM_DT = 1 / 30;                       // seconds of simulated driving per frame
export const HOLD = [45, 45, 135, 45, 45, 45, 45, 135, 45, 45];
export const LEG = 90;

const starts = [];
let n = 0;
for (let i = 0; i < HOLD.length; i++) {
  starts.push(n);
  n += HOLD[i] + (i < HOLD.length - 1 ? LEG : 0);
}
export const FRAMES = n;

/** Every frame's state, in order: { p, ft } (ft null on a leg). `from` / `to` limit it to rail keys. */
export function sequence(from = 0, to = HOLD.length - 1) {
  const out = [];
  for (let i = from; i <= to; i++) {
    for (let k = 0; k < HOLD[i]; k++) out.push({ p: i, ft: k / (HOLD[i] - 1) });
    if (i < to) for (let k = 1; k <= LEG; k++) out.push({ p: i + k / (LEG + 1), ft: null });
  }
  return out;
}

// Idle loops ("parked" clips): when the scroll rests inside a hold, the live scene keeps driving (road,
// wheels, street lamps). The video cannot, so each calm stretch of a hold has a seamless loop rendered at
// one state: { rail, ft: the state rendered, range: [from, to] of ft where it stands in }. Stretches where
// the effect itself moves (the light bar in gills / roof, the rpm build-up) have none: the frame rests.
// All loops sit one after another in one file, LOOP_LEN frames each, a keyframe at each start.
export const LOOP_LEN = 60;
export const LOOP_FADE = 15;                        // extra frames rendered and cross-faded into the start
export const LOOPS = [
  { rail: 0, ft: 0.5, range: [0, 1] },
  { rail: 1, ft: 0.65, range: [0.32, 1] },
  { rail: 2, ft: 0.5, range: [0.24, 0.7] },
  { rail: 3, ft: 0.25, range: [0.12, 0.38] },       // 34 m/s
  { rail: 3, ft: 0.64, range: [0.6, 0.71] },        // braked to a crawl, the disc glows
  { rail: 3, ft: 0.92, range: [0.82, 1] },
  { rail: 4, ft: 1, range: [0.96, 1] },
  { rail: 5, ft: 1, range: [0.96, 1] },
  { rail: 6, ft: 0.7, range: [0.37, 1] },
  { rail: 7, ft: 0.03, range: [0, 0.055] },         // one loop per gear (gearAt in chapter-fx.js)
  ...[2, 3, 4, 5, 6].map(g => ({ rail: 7, ft: 0.06 + 0.12 * (g - 1.5), range: [0.08 + 0.12 * (g - 2), 0.16 + 0.12 * (g - 2)] })),
  { rail: 7, ft: 0.85, range: [0.7, 1] },
  { rail: 9, ft: 0.5, range: [0, 1] },
];

/** The loop for a resting rail state, or -1. */
export function loopAt(p, ft) {
  if (ft === null || ft === undefined) return -1;
  const i = Math.round(p);
  return LOOPS.findIndex(l => l.rail === i && ft >= l.range[0] && ft <= l.range[1]);
}

/** Rail state (boot.js → railAt) → frame index, fractional (0 … FRAMES - 1). */
export function frameAt(p, ft) {
  if (ft !== null && ft !== undefined) {
    const i = Math.round(p);
    return starts[i] + Math.min(1, Math.max(0, ft)) * (HOLD[i] - 1);
  }
  const i = Math.min(Math.floor(p), HOLD.length - 2);
  const t = p - i;
  return starts[i] + HOLD[i] - 1 + t * (LEG + 1);
}
