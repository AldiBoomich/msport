// Fly-through preview: renders the whole camera rail (tools/3d/camera-path.js) frame by frame.
// usage: node film.mjs <out-dir> "<viewer query>" [legFrames=48] [holdFrames=12] [from=0] [to=9]
// Writes <out-dir>/f0000.jpg …; join with:
//   ffmpeg -framerate 24 -i <out-dir>/f%04d.jpg -c:v libx264 -pix_fmt yuv420p -crf 20 film.mp4
// Hold frames copy the key frame: on the site the camera rests there while the text is read.
// FX=1 (viewer query with fx=1): hold frames are rendered live and play the chapter's effect
// (chapter-fx.js), at 24 fps of simulated time; HOLDS="36,60,…" sets the hold length per chapter.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const TOOLS = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const THEME3D = 'C:/Users/aaldi/Local Sites/msport/app/public/wp-content/themes/msport/assets/3d';
const HDRI = 'C:/Users/aaldi/Local Sites/msport/3d-source/hdri'; // 4K night HDRIs (too big for the theme)
const mounts = { '/hdri/': HDRI + '/', '/env/': THEME3D + '/env/', '/tex/': THEME3D + '/textures/', '/theme3d/': THEME3D + '/', '/node_modules/': TOOLS + '/node_modules/', '/': TOOLS + '/' };const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.glb': 'model/gltf-binary', '.jpg': 'image/jpeg', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const m = Object.keys(mounts).find(k => u.startsWith(k));
  const f = path.join(mounts[m], u.slice(m.length));
  fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); res.end(b); });
}).listen(0);

const [outDir, qs, leg = 48, hold = 12, from = 0, to = 9] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const p = new URLSearchParams(qs);
// GPU=1: graphics card (D3D11); SS=2: frames rendered at 2x (downscale when encoding for a crisp video)
const gpu = process.env.GPU === '1', ss = +(process.env.SS || 1);
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true, args: gpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force_high_performance_gpu']
    : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage();
page.on('pageerror', e => console.log('pageerror:', e.message));
page.on('console', m => m.type() === 'error' && console.log('console:', m.text()));
await page.setViewport({ width: +(p.get('w') || 1280), height: +(p.get('h') || 548), deviceScaleFactor: ss });
await page.goto(`http://localhost:${server.address().port}/viewer.html?film=1&${qs}&dpr=${ss}`);
await page.waitForFunction('window.__done === true', { timeout: 240000 });

let n = 0;
const t0 = Date.now();
const FX = process.env.FX === '1';
const holds = (process.env.HOLDS || '').split(',').filter(Boolean).map(Number);
const shot = async (v, ft = null) => {
  await page.evaluate((v, ft) => window.__frame(v, ft, 1 / 24), v, ft);
  const f = path.join(outDir, `f${String(n++).padStart(4, '0')}.jpg`);
  await page.screenshot({ path: f, type: 'jpeg', quality: 90 });
  return f;
};
const holdAt = f => { for (let h = 0; h < +hold; h++) fs.copyFileSync(f, path.join(outDir, `f${String(n++).padStart(4, '0')}.jpg`)); };
const playHold = async i => { const N = holds[i] || +hold; for (let h = 0; h <= N; h++) await shot(i, h / N); };
for (let i = +from; i < +to; i++) {
  if (FX) await playHold(i); else holdAt(await shot(i));
  for (let k = 1; k < +leg; k++) await shot(i + k / +leg);
  console.log(`leg ${i + 1}->${i + 2} done, ${n} frames, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
if (FX) await playHold(+to); else holdAt(await shot(+to));
await browser.close();
server.close();
console.log('frames:', n);
