// Renders the pre-rendered film (video-timeline.js) frame by frame on the graphics card.
// usage: node video.mjs <out-dir> [width=1920] [height=1080] [dpr=1] [from=0] [to=9]
//   writes <out-dir>/film/f00000.png …   (the scrubbed film: holds and legs)
//          <out-dir>/loops/L00/f00000.png …   (idle loops, LOOP_LEN + LOOP_FADE frames each; LOOPS=0 skips them)
// Grain is off: the page lays its own over the video (a per-frame grain would bloat the file).
// Then: node video-pack.mjs <out-dir> <ffmpeg> <name> <width> <height> → the .mp4 files for the theme.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { sequence, SIM_DT, LOOPS, LOOP_LEN, LOOP_FADE } from './video-timeline.js';

const TOOLS = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const THEME3D = 'C:/Users/aaldi/Local Sites/msport/app/public/wp-content/themes/msport/assets/3d';
const mounts = { '/sky/': THEME3D + '/env/', '/tex/': THEME3D + '/textures/', '/theme3d/': THEME3D + '/', '/node_modules/': TOOLS + '/node_modules/', '/': TOOLS + '/' };
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.glb': 'model/gltf-binary', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const m = Object.keys(mounts).find(k => u.startsWith(k));
  const f = path.join(mounts[m], u.slice(m.length));
  fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); res.end(b); });
}).listen(0);

const [outDir, w = 1920, h = 1080, dpr = 1, from = 0, to = 9] = process.argv.slice(2);
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force_high_performance_gpu'],
});
const page = await browser.newPage();
page.on('pageerror', e => console.log('pageerror:', e.message));
page.on('console', m => m.type() === 'error' && !/404/.test(m.text()) && console.log('console:', m.text()));
await page.setViewport({ width: +w, height: +h, deviceScaleFactor: 1 });
await page.goto(`http://localhost:${server.address().port}/site-test.html?seq=1&w=${w}&h=${h}&dpr=${dpr}&grain=0`);
await page.waitForFunction('window.__done === true', { timeout: 240000 });

const step = (s, draw = true) => page.evaluate((s, dt, draw) => {
  window.__film.frame({ ...s, dt, draw });
  return draw ? document.getElementById('c').toDataURL('image/png') : null;
}, s, SIM_DT, draw);
const save = (dir, k, url) => fs.writeFileSync(path.join(dir, `f${String(k).padStart(5, '0')}.png`), Buffer.from(url.split(',')[1], 'base64'));
const t0 = Date.now();
const clock = () => `${((Date.now() - t0) / 1000).toFixed(0)} s`;

// ---- the film
const filmDir = path.join(outDir, 'film');
fs.mkdirSync(filmDir, { recursive: true });
const seq = sequence(+from, +to);
// settle the car (speed, springs) at the first state, as the stills do
for (let k = 0; k < 48; k++) await step({ ...seq[0], ft: seq[0].ft === null ? null : 0 }, false);
for (let k = 0; k < seq.length; k++) {
  save(filmDir, k, await step(seq[k]));
  if (k % 100 === 0) console.log(`film ${k}/${seq.length}  ${clock()}`);
}
console.log(`film: ${seq.length} frames, ${clock()}`);

// ---- idle loops: play the hold up to the state, let speed and springs settle, then record
if (process.env.LOOPS !== '0') {
  for (let L = 0; L < LOOPS.length; L++) {
    const { rail, ft } = LOOPS[L];
    if (rail < +from || rail > +to) continue;
    const dir = path.join(outDir, 'loops', `L${String(L).padStart(2, '0')}`);
    fs.mkdirSync(dir, { recursive: true });
    for (let k = 0; k <= 72; k++) await step({ p: rail, ft: (k / 72) * ft }, false);
    for (let k = 0; k < 60; k++) await step({ p: rail, ft }, false);
    for (let k = 0; k < LOOP_LEN + LOOP_FADE; k++) save(dir, k, await step({ p: rail, ft }));
    console.log(`loop ${L} (rail ${rail}, ft ${ft.toFixed(2)})  ${clock()}`);
  }
}
await browser.close();
server.close();
