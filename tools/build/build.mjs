// Builds the film scripts: src/film/boot.js (+ the live scene chunk, Three.js inside) → assets/js/film/.
// usage (in tools/build): npm install, then npm run build  (or: npm run watch)
// three.js is pinned to the version the chapter stills were rendered with (package.json).
import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const theme = path.resolve(here, '../..');
const outdir = path.join(theme, 'assets/js/film');

const options = {
  entryPoints: { boot: path.join(theme, 'src/film/boot.js') },
  outdir,
  bundle: true,
  splitting: true,                   // live.js (Three.js) becomes its own chunk, loaded with import()
  format: 'esm',
  target: 'es2020',
  minify: true,
  chunkNames: 'chunks/[name]-[hash]',
  nodePaths: [path.join(here, 'node_modules')], // tools/3d/*.js import 'three' too
  legalComments: 'eof',
  logLevel: 'info',
  metafile: true,
};

if (process.argv.includes('--watch')) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
} else {
  fs.rmSync(outdir, { recursive: true, force: true }); // generated files only
  const r = await esbuild.build(options);
  for (const [f, o] of Object.entries(r.metafile.outputs)) console.log(path.relative(theme, f), Math.round(o.bytes / 1024) + ' KB');
}
