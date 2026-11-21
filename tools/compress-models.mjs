// Runs the web pass (tools/lib/web-optimise.mjs) over the site's .glb models in place.
// Usage: node tools/compress-models.mjs [dir=public/models] [--out=dir]
// Idempotent: files that already use EXT_meshopt_compression are left alone.
import fs from 'node:fs';
import path from 'node:path';
import { webIO, webOptimise, isMeshopt } from './lib/web-optimise.mjs';

const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith('--')) || 'public/models';
const outDir = (args.find((a) => a.startsWith('--out=')) || '').slice(6) || dir;
const BUDGET = 768 * 1024; // per-file budget for the web version

const io = await webIO();
fs.mkdirSync(outDir, { recursive: true });
let before = 0, after = 0;
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.glb')).sort()) {
  const src = path.join(dir, f), dst = path.join(outDir, f);
  const size = fs.statSync(src).size;
  const doc = await io.read(src);
  if (isMeshopt(doc)) {
    if (dst !== src) fs.copyFileSync(src, dst);
    console.log(`${f}: already optimised (${Math.round(size / 1024)} KB)`);
    before += size; after += size;
    continue;
  }
  await webOptimise(doc);
  await io.write(dst, doc);
  const out = fs.statSync(dst).size;
  before += size; after += out;
  console.log(`${f}: ${Math.round(size / 1024)} KB -> ${Math.round(out / 1024)} KB${out > BUDGET ? '  (over the 768 KB budget)' : ''}`);
}
console.log(`total: ${Math.round(before / 1024)} KB -> ${Math.round(after / 1024)} KB`);
