// Packs the Cycles frames from bl_film.py into WebP frames for the frame-sequence film (src/film/frames.js):
// the page draws them on a canvas, one per scroll position, so every frame stays a sharp still (no video
// compression, no seeking).
//
// usage: node frames-pack.mjs <film dir|-> <loops dir|-> <ffmpeg> <out dir> [quality=82] [--jobs 4]
//   <film dir>/f0000.jpg …     bl_film.py --frames … --jpeg        → <out dir>/film/f0000.webp …
//   <loops dir>/l00_000.jpg …  bl_film.py --loops --jpeg           → <out dir>/loops/l00_00.webp …
//   Each idle loop keeps LOOP_LEN frames; its first LOOP_FADE frames are cross-faded with the extra frames
//   rendered after the end (as cycles-pack.mjs does for the video), so it plays round without a jump.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { LOOPS, LOOP_LEN, LOOP_FADE } from './video-timeline.js';

const argv = process.argv.slice(2);
const ji = argv.indexOf('--jobs'), JOBS = ji >= 0 ? Number(argv[ji + 1]) : 4;
if (ji >= 0) argv.splice(ji, 2);
const [filmDir, loopsDir, ff, out, quality = '82'] = argv;
const webp = ['-c:v', 'libwebp', '-quality', String(quality), '-compression_level', '4'];

const run = args => new Promise((resolve, reject) => {
  const p = spawn(ff, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
  p.on('exit', code => (code ? reject(new Error('ffmpeg ' + code)) : resolve()));
});

const tasks = [];
if (filmDir && filmDir !== '-') {
  const dir = path.join(out, 'film');
  fs.mkdirSync(dir, { recursive: true });
  const n = fs.readdirSync(filmDir).filter(f => /^f\d{4}\.jpg$/.test(f)).length;
  // split into JOBS stretches, one ffmpeg each
  const step = Math.ceil(n / JOBS);
  for (let s = 0; s < n; s += step) {
    tasks.push(() => run(['-start_number', String(s), '-i', path.join(filmDir, 'f%04d.jpg'), '-frames:v', String(Math.min(step, n - s)),
      ...webp, '-start_number', String(s), path.join(dir, 'f%04d.webp')]));
  }
}
if (loopsDir && loopsDir !== '-') {
  const dir = path.join(out, 'loops');
  fs.mkdirSync(dir, { recursive: true });
  for (let L = 0; L < LOOPS.length; L++) {
    const src = path.join(loopsDir, `l${String(L).padStart(2, '0')}_%03d.jpg`);
    const dst = path.join(dir, `l${String(L).padStart(2, '0')}_%02d.webp`);
    if (!fs.existsSync(src.replace('%03d', String(LOOP_LEN + LOOP_FADE - 1).padStart(3, '0')))) throw new Error('missing loop ' + L);
    tasks.push(async () => {
      // frames 0 … LOOP_FADE-1: the frames after the end fading into the start
      await run(['-start_number', String(LOOP_LEN), '-i', src, '-i', src,
        '-filter_complex', `[0:v][1:v]blend=all_expr='A*(1-N/${LOOP_FADE})+B*(N/${LOOP_FADE})':shortest=1`,
        '-frames:v', String(LOOP_FADE), ...webp, '-start_number', '0', dst]);
      // the rest as rendered
      await run(['-start_number', String(LOOP_FADE), '-i', src, '-frames:v', String(LOOP_LEN - LOOP_FADE),
        ...webp, '-start_number', String(LOOP_FADE), dst]);
    });
  }
}

let next = 0;
const worker = async () => {
  while (next < tasks.length) await tasks[next++]();
};
const t0 = Date.now();
await Promise.all(Array.from({ length: JOBS }, worker));
const size = d => (fs.existsSync(d) ? fs.readdirSync(d).reduce((a, f) => a + fs.statSync(path.join(d, f)).size, 0) : 0);
for (const d of ['film', 'loops']) {
  const p = path.join(out, d);
  if (fs.existsSync(p)) console.log(p, fs.readdirSync(p).length, 'frames', (size(p) / 1048576).toFixed(1), 'MB');
}
console.log('done in', ((Date.now() - t0) / 1000).toFixed(0), 's');
