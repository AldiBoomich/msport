// usage: node shot.mjs out.png "query string" [more "out.png" "query" pairs...]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const TOOLS = path.dirname(decodeURIComponent(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, '$1'));
const THEME3D = 'C:/Users/aaldi/Local Sites/msport/app/public/wp-content/themes/msport/assets/3d';
const HDRI = 'C:/Users/aaldi/Local Sites/msport/3d-source/hdri'; // 4K night HDRIs (too big for the theme)
const SKY = process.env.SKY_DIR || THEME3D + '/env'; // packed panoramas (hdr-pack.mjs)
const mounts = { '/hdri/': HDRI + '/', '/sky/': SKY + '/', '/env/': THEME3D + '/env/', '/tex/': THEME3D + '/textures/', '/src/': THEME3D + '/source/', '/theme3d/': THEME3D + '/', '/node_modules/': TOOLS + '/node_modules/', '/': TOOLS + '/' };
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.glb': 'model/gltf-binary', '.hdr': 'application/octet-stream', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.wasm': 'application/wasm', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const m = Object.keys(mounts).find(k => u.startsWith(k));
  const f = path.join(mounts[m], u.slice(m.length));
  fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); res.end(b); });
}).listen(0);
const port = server.address().port;

// GPU=1: render on the graphics card (D3D11) instead of the CPU rasteriser; SS=2: supersample (render 2x, the PNG is 2x)
const gpu = process.env.GPU === '1';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: gpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu', '--force_high_performance_gpu']
    : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i += 2) {
  const out = args[i], qs = args[i + 1];
  const p = new URLSearchParams(qs);
  const w = +(p.get('w') || 1600), h = +(p.get('h') || 900);
  const page = await browser.newPage();
  page.on('console', m => m.type() === 'error' && console.log('console:', m.text()));
  page.on('pageerror', e => console.log('pageerror:', e.message));
  const ss = +(process.env.SS || 1);
  await page.setViewport({ width: w, height: h, deviceScaleFactor: ss });
  await page.goto(`http://localhost:${port}/${p.get('page') || 'viewer.html'}?${qs}&dpr=${ss}`);
  await page.waitForFunction('window.__done === true', { timeout: 240000 });
  console.log(out, (await page.title()).slice(0, 1200));
  await page.screenshot({ path: out });
  await page.close();
}
await browser.close();
server.close();
