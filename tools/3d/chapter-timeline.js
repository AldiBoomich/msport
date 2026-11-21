// What the engine and the gearbox do inside a chapter's hold, as plain functions of ft (0…1).
// Shared by the 3D scene (chapter-fx.js: camera jolts, road speed) and the page overlays
// (src/film/overlays.js: tachometer needle, counters, gear readout), so the HTML always matches the
// picture, live or pre-rendered. No three.js here: the page loads this with its first script.
//
// Changing a number here changes the film: re-render the video version (DESIGN.md → Video version).

export const IDLE = 800;             // rpm the curve below is drawn for; the page rescales it to the
export const REDLINE = 8250;         // idle / redline set in the admin
export const LIMITER_AT = 0.72;      // ft where the needle hits the limiter (jolt + red flash)
export const GEARS = 7;

const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t * t * t * (t * (t * 6 - 15) + 10);

// chapter 3: idle, free rev (faster at the top), fuel-cut bounce on the limiter, back to idle
export const rpmRev = t => {
  if (t < 0.12) return IDLE;
  if (t < LIMITER_AT) return IDLE + (REDLINE - IDLE) * Math.pow((t - 0.12) / (LIMITER_AT - 0.12), 1.6);
  if (t < 0.88) return REDLINE - 260 * Math.abs(Math.sin((t - LIMITER_AT) * 70));
  return lerp(8000, IDLE, ease((t - 0.88) / 0.12));
};

// highest rpm reached so far in the hold (the counters keep their final figure on the way back down)
export const rpmPeak = t => (t >= LIMITER_AT ? REDLINE : rpmRev(t));

// chapter 8: one gear every 12 % of the hold, 1 → 7
export const gearAt = t => (t < 0.06 ? 1 : Math.min(GEARS, 1 + Math.floor((t - 0.06) / 0.12)));
