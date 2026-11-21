// Packs a Radiance .hdr panorama into two small WebP files the site can load (the 4K .hdr is 25 MB):
//   <out>-base.webp  colour, sRGB, lossy: the HDR value divided by its gain, so it never exceeds 1
//   <out>-gain.webp  grey, lossless: per-pixel gain, 0…255 → 2^(0…gmax); 0 where the pixel is ≤ 1
//   <out>.json       { width, height, gmax }
// Decoded on the GPU by tools/3d/city-sky.js: hdr = srgbToLinear(base) * 2^(gain * gmax).
// A gain map (as in Ultra HDR photos), but with plain WebP and no alpha, so the browser decodes it
// natively and nothing is premultiplied.
//
// usage: node hdr-pack.mjs <in.hdr> <out prefix> <ffmpeg> [--width 4096] [--q 88]
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const [inFile, outPrefix, ffmpeg, ...rest] = process.argv.slice(2);
const opt = (k, d) => { const i = rest.indexOf(k); return i >= 0 ? +rest[i + 1] : d; };
const outW = opt('--width', 0), Q = opt('--q', 88);

// ---- read RGBE (new-style run-length scanlines)
const buf = fs.readFileSync(inFile);
let pos = 0;
const line = () => { const s = pos; while (buf[pos] !== 0x0a) pos++; return buf.toString('latin1', s, pos++); };
if (!line().startsWith('#?')) throw new Error('not a Radiance file');
while (line() !== '');
const [, H, , W] = line().split(' ').map((x, i) => (i % 2 ? +x : x));
const rgbe = new Uint8Array(W * H * 4), scan = new Uint8Array(W * 4);
for (let y = 0; y < H; y++) {
  if (buf[pos] !== 2 || buf[pos + 1] !== 2) throw new Error('old-style RLE not supported');
  pos += 4;
  for (let c = 0; c < 4; c++) {
    let x = 0;
    while (x < W) {
      let n = buf[pos++];
      if (n > 128) { n -= 128; const v = buf[pos++]; while (n--) scan[(x++) * 4 + c] = v; }
      else while (n--) scan[(x++) * 4 + c] = buf[pos++];
    }
  }
  rgbe.set(scan, y * W * 4);
}
let lin = new Float32Array(W * H * 3);
for (let i = 0; i < W * H; i++) {
  const e = rgbe[i * 4 + 3];
  const f = e ? Math.pow(2, e - 128) / 255 : 0; // same decode as three.js RGBELoader (the stills used it)
  for (let c = 0; c < 3; c++) lin[i * 3 + c] = rgbe[i * 4 + c] * f;
}

// ---- optional box downscale in linear light
let w = W, h = H;
if (outW && outW < W) {
  const k = W / outW; w = outW; h = Math.round(H / k);
  const o = new Float32Array(w * h * 3);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let r = 0, g = 0, b = 0, n = 0;
    for (let yy = Math.floor(y * k); yy < Math.floor((y + 1) * k); yy++) for (let xx = Math.floor(x * k); xx < Math.floor((x + 1) * k); xx++) {
      const j = (yy * W + xx) * 3; r += lin[j]; g += lin[j + 1]; b += lin[j + 2]; n++;
    }
    const j = (y * w + x) * 3; o[j] = r / n; o[j + 1] = g / n; o[j + 2] = b / n;
  }
  lin = o;
}

// ---- split into base + gain
let peak = 1;
for (let i = 0; i < lin.length; i++) peak = Math.max(peak, lin[i]);
const gmax = Math.ceil(Math.log2(peak) * 10) / 10 || 0.1;
const base = Buffer.alloc(w * h * 3), gain = Buffer.alloc(w * h);
const toSrgb = v => (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
for (let i = 0; i < w * h; i++) {
  const m = Math.max(lin[i * 3], lin[i * 3 + 1], lin[i * 3 + 2]);
  let q = 0;
  if (m > 1) q = Math.min(255, Math.ceil(Math.log2(m) / gmax * 255)); // rounded up: base stays ≤ 1
  gain[i] = q;
  const s = Math.pow(2, -q / 255 * gmax);
  for (let c = 0; c < 3; c++) base[i * 3 + c] = Math.round(Math.min(1, toSrgb(Math.max(0, lin[i * 3 + c] * s))) * 255);
}

// ---- encode with ffmpeg (raw → WebP)
const enc = (data, pix, file, args) => execFileSync(ffmpeg, ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', pix, '-s', `${w}x${h}`, '-i', '-', ...args, file], { input: data });
enc(base, 'rgb24', `${outPrefix}-base.webp`, ['-c:v', 'libwebp', '-quality', String(Q), '-compression_level', '6', '-preset', 'photo']);
enc(gain, 'gray', `${outPrefix}-gain.webp`, ['-c:v', 'libwebp', '-lossless', '1', '-compression_level', '6']);
fs.writeFileSync(`${outPrefix}.json`, JSON.stringify({ width: w, height: h, gmax }) + '\n');
const kb = f => Math.round(fs.statSync(f).size / 1024);
console.log(`${w}x${h}, peak ${peak.toFixed(1)}, gmax ${gmax}, base ${kb(`${outPrefix}-base.webp`)} KB, gain ${kb(`${outPrefix}-gain.webp`)} KB`);
