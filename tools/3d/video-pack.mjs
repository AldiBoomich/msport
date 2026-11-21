// Packs the frames from video.mjs into the theme's video files.
// usage: node video-pack.mjs <render-dir> <ffmpeg> <out prefix> <width> <height> [crf=24]
//   <prefix>.mp4        the film, a keyframe every 8 frames (seeking while scrolling stays ~5 ms, also on
//                       integrated graphics) and no B-frames
//   <prefix>-loops.mp4  the idle loops one after another, LOOP_LEN frames each, a keyframe at each start;
//                       each loop's extra LOOP_FADE frames are cross-faded into its first ones, so the end
//                       runs into the start without a seam
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { LOOPS, LOOP_LEN, LOOP_FADE } from './video-timeline.js';

const [dir, ff, out, w, h, crf = 24] = process.argv.slice(2);
const run = args => execFileSync(ff, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
const scale = `scale=${w}:${h}:flags=lanczos`;
const x264 = ['-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf), '-pix_fmt', 'yuv420p', '-movflags', '+faststart'];

run(['-framerate', '30', '-i', path.join(dir, 'film', 'f%05d.png'), '-vf', scale, ...x264,
  '-g', '8', '-keyint_min', '8', '-sc_threshold', '0', '-bf', '0', out + '.mp4']);
console.log(out + '.mp4', fs.statSync(out + '.mp4').size);

const seqDir = path.join(dir, 'loopseq');
fs.rmSync(seqDir, { recursive: true, force: true });
fs.mkdirSync(seqDir);
let n = 0;
const put = f => fs.copyFileSync(f, path.join(seqDir, `f${String(n++).padStart(5, '0')}.png`));
for (let L = 0; L < LOOPS.length; L++) {
  const src = path.join(dir, 'loops', `L${String(L).padStart(2, '0')}`);
  if (!fs.existsSync(src)) throw new Error('missing loop ' + src);
  const tmp = path.join(src, 'blend');
  fs.mkdirSync(tmp, { recursive: true });
  // out[k] = mix(f[LOOP_LEN + k], f[k], k / LOOP_FADE) for k < LOOP_FADE, then f[k]
  run(['-start_number', String(LOOP_LEN), '-i', path.join(src, 'f%05d.png'), '-i', path.join(src, 'f%05d.png'),
    '-filter_complex', `[0:v][1:v]blend=all_expr='A*(1-N/${LOOP_FADE})+B*(N/${LOOP_FADE})':shortest=1`,
    '-frames:v', String(LOOP_FADE), path.join(tmp, 'b%05d.png')]);
  for (let k = 0; k < LOOP_LEN; k++) {
    put(k < LOOP_FADE ? path.join(tmp, `b${String(k + 1).padStart(5, '0')}.png`) : path.join(src, `f${String(k).padStart(5, '0')}.png`));
  }
}
run(['-framerate', '30', '-i', path.join(seqDir, 'f%05d.png'), '-vf', scale, ...x264,
  '-g', String(LOOP_LEN), '-keyint_min', String(LOOP_LEN), '-sc_threshold', '0', '-force_key_frames', `expr:eq(mod(n,${LOOP_LEN}),0)`, out + '-loops.mp4']);
console.log(out + '-loops.mp4', fs.statSync(out + '-loops.mp4').size);
