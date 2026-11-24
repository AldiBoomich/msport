// Packs the Cycles frames from bl_film.py into the same kind of files video-pack.mjs makes for the site
// (a keyframe every 8 frames, no B-frames; the idle loops one after another, each loop's extra frames
// cross-faded into its start), plus a side-by-side check against the current site video.
//
// usage: node cycles-pack.mjs <film dir> <loops dir|-> <ffmpeg> <out prefix> <width> <height> [crf=24] [compare.mp4] [--fps 50] [--reverse]
//   <film dir>/f0000.jpg …          bl_film.py --frames … --jpeg
//   <loops dir>/l00_000.jpg …       bl_film.py --loops --jpeg
//   compare.mp4: the site video to put on the left of <out prefix>-vs-site.mp4 (labels: "WebGL" / "Cycles")
//   --fps: the frames' rate (rail-export.mjs --fps); keyframes and loop lengths keep the site's spacing in time
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { LOOPS, LOOP_LEN, LOOP_FADE } from './video-timeline.js';

const argv = process.argv.slice(2);
const fi = argv.indexOf('--fps'), FPS = fi >= 0 ? Number(argv[fi + 1]) : 30;
if (fi >= 0) argv.splice(fi, 2);
const ri = argv.indexOf('--reverse'), REVERSE = ri >= 0;
if (REVERSE) argv.splice(ri, 1);
const [filmDir, loopsDir, ff, out, w, h, crf = 24, site] = argv;
const K = FPS / 30, GOP = String(Math.round(8 * K)), LL = Math.round(LOOP_LEN * K), LF = Math.round(LOOP_FADE * K);
const run = args => execFileSync(ff, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
const scale = `scale=${w}:${h}:flags=lanczos`;
const x264 = ['-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf), '-pix_fmt', 'yuv420p', '-movflags', '+faststart'];

// --reverse: only the film played backwards → <out>-reverse.mp4 (src/film/video.js plays it when the scroll goes
// up: frame k of it is frame FRAMES-1-k of the film). Same settings as the film, so both seek alike.
if (REVERSE) {
  const frames = fs.readdirSync(filmDir).filter(f => /^f\d{4}\.jpg$/.test(f)).sort();
  const seq = fs.mkdtempSync(path.join(os.tmpdir(), 'revseq-'));
  frames.reverse().forEach((f, i) => {
    const to = path.join(seq, `f${String(i).padStart(5, '0')}.jpg`);
    try { fs.linkSync(path.join(filmDir, f), to); } catch { fs.copyFileSync(path.join(filmDir, f), to); }
  });
  run(['-framerate', String(FPS), '-i', path.join(seq, 'f%05d.jpg'), '-vf', scale, ...x264,
    '-g', GOP, '-keyint_min', GOP, '-sc_threshold', '0', '-bf', '0', out + '-reverse.mp4']);
  fs.rmSync(seq, { recursive: true, force: true });
  console.log(out + '-reverse.mp4', fs.statSync(out + '-reverse.mp4').size);
  process.exit(0);
}

run(['-framerate', String(FPS), '-i', path.join(filmDir, 'f%04d.jpg'), '-vf', scale, ...x264,
  '-g', GOP, '-keyint_min', GOP, '-sc_threshold', '0', '-bf', '0', out + '.mp4']);
console.log(out + '.mp4', fs.statSync(out + '.mp4').size);

if (loopsDir && loopsDir !== '-' && fs.existsSync(loopsDir)) {
  const seq = fs.mkdtempSync(path.join(os.tmpdir(), 'loopseq-'));
  let n = 0;
  const put = f => fs.copyFileSync(f, path.join(seq, `f${String(n++).padStart(5, '0')}.jpg`));
  for (let L = 0; L < LOOPS.length; L++) {
    const name = k => path.join(loopsDir, `l${String(L).padStart(2, '0')}_${String(k).padStart(3, '0')}.jpg`);
    if (!fs.existsSync(name(LL + LF - 1))) throw new Error('missing loop ' + L);
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'blend-'));
    run(['-start_number', String(LL), '-i', path.join(loopsDir, `l${String(L).padStart(2, '0')}_%03d.jpg`),
      '-i', path.join(loopsDir, `l${String(L).padStart(2, '0')}_%03d.jpg`),
      '-filter_complex', `[0:v][1:v]blend=all_expr='A*(1-N/${LF})+B*(N/${LF})':shortest=1`,
      '-frames:v', String(LF), '-q:v', '2', path.join(tmp, 'b%05d.jpg')]);
    for (let k = 0; k < LL; k++) put(k < LF ? path.join(tmp, `b${String(k + 1).padStart(5, '0')}.jpg`) : name(k));
  }
  run(['-framerate', String(FPS), '-i', path.join(seq, 'f%05d.jpg'), '-vf', scale, ...x264,
    '-g', String(LL), '-keyint_min', String(LL), '-sc_threshold', '0', '-force_key_frames', `expr:eq(mod(n,${LL}),0)`, out + '-loops.mp4']);
  console.log(out + '-loops.mp4', fs.statSync(out + '-loops.mp4').size);
}

if (site) {
  // side by side, the same frame of the rail on both halves
  const font = 'C\\:/Windows/Fonts/arial.ttf';
  const label = t => `drawtext=fontfile='${font}':text='${t}':x=24:y=20:fontsize=28:fontcolor=white:box=1:boxcolor=black@0.45:boxborderw=8`;
  const half = Number(w) > Number(h) ? 'scale=1280:720:flags=lanczos' : 'scale=540:1170:flags=lanczos';
  run(['-i', site, '-i', out + '.mp4', '-filter_complex',
    `[0:v]fps=${FPS},${half},${label('WebGL (site now)')}[a];[1:v]${half},${label('Cycles (new)')}[b];[a][b]hstack=inputs=2[v]`,
    '-map', '[v]', ...x264, out + '-vs-site.mp4']);
  console.log(out + '-vs-site.mp4', fs.statSync(out + '-vs-site.mp4').size);
}
