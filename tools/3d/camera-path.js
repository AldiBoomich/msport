// One continuous camera rail through the 10 chapter keys (tools/3d/chapters.js).
// The theme imports this file as is; scroll only has to supply p.
//
// p = 0 … 9: chapter index as a float (0 = chapter 1, 9 = chapter 10).
// - Position and target ride centripetal Catmull-Rom splines through the keys:
//   no corners, no loops, no jump when the camera passes a chapter.
// - Inside each leg the time is eased with smootherstep, so the camera slows to
//   rest on every key (zero speed and zero acceleration there) and starts again
//   just as softly. Scroll hold zones in the theme sit on these rests.
// - fov, framing shift and the headlight level blend with the same easing.
// - A key may carry `via: [[x, y, z], …]` points: extra rail points inside the leg
//   that leaves this key (used to steer the camera around the car).
import { CatmullRomCurve3, Vector3 } from 'three';

export const smootherstep = t => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a, b, t) => a + (b - a) * t;

export function cameraPath(chapters, { portrait = false } = {}) {
  const keys = chapters.map(c => (portrait && c.mobile ? { ...c, ...c.mobile } : c));
  const posPts = [], tgtPts = [], keyAt = [];
  keys.forEach((k, i) => {
    keyAt.push(posPts.length);
    posPts.push(new Vector3(...k.pos));
    tgtPts.push(new Vector3(...k.target));
    const next = keys[i + 1];
    if (next && k.via) k.via.forEach((v, j) => {
      // the target glides between the two key targets while the camera uses the via point
      const f = (j + 1) / (k.via.length + 1);
      posPts.push(new Vector3(...v));
      tgtPts.push(new Vector3(...k.target).lerp(new Vector3(...next.target), f));
    });
  });
  const pos = new CatmullRomCurve3(posPts, false, 'centripetal');
  const tgt = new CatmullRomCurve3(tgtPts, false, 'centripetal');
  const last = keys.length - 1, span = posPts.length - 1;

  // p (chapter float) → { pos, target, fov, shift, lights, beam, chapter, rest }
  function sample(p, out = { pos: new Vector3(), target: new Vector3(), shift: [0, 0] }) {
    p = Math.min(Math.max(p, 0), last);
    const i = Math.min(Math.floor(p), last - 1), e = smootherstep(p - i);
    const a = keys[i], b = keys[i + 1];
    const u = lerp(keyAt[i], keyAt[i + 1], e) / span;
    pos.getPoint(u, out.pos);
    tgt.getPoint(u, out.target);
    out.fov = lerp(a.fov, b.fov, e);
    const sa = a.shift || [0, 0], sb = b.shift || [0, 0];
    out.shift[0] = lerp(sa[0], sb[0], e);
    out.shift[1] = lerp(sa[1], sb[1], e);
    out.lights = lerp(a.lights ? 1 : 0, b.lights ? 1 : 0, e);
    out.beam = lerp(a.beam ?? 1, b.beam ?? 1, e);   // headlight beams on the road (not the lamp glow)
    out.chapter = Math.round(p);       // nearest chapter (0-based)
    out.rest = 1 - Math.min(1, Math.abs(p - Math.round(p)) * 2); // 1 on a key, 0 mid-leg
    return out;
  }

  return { keys, sample, count: keys.length };
}
