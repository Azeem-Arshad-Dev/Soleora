// Optimises a downloaded .glb for the site and registers it in src/data/models.json.
// Usage: node tools/import-model.mjs <slug> <input.glb> [--rotate=x,y,z] [--title=..] [--author=..] [--license=..] [--url=..]
// Rotation (degrees) is applied at runtime so the toe points +x and the sole sits on y = 0.
import fs from 'node:fs';
import path from 'node:path';
import { dedup, prune, weld, quantize, simplify, textureCompress, resample, flatten, join, metalRough, normals } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import { webIO, webOptimise } from './lib/web-optimise.mjs';

const [slug, input, ...rest] = process.argv.slice(2);
if (!slug || !input) { console.error('Usage: node tools/import-model.mjs <slug> <input.glb> [--rotate=x,y,z] [--title=] [--author=] [--license=] [--url=]'); process.exit(1); }
const opt = Object.fromEntries(rest.filter((a) => a.startsWith('--')).map((a) => { const [k, ...v] = a.slice(2).split('='); return [k, v.join('=')]; }));

const MAX_VERTS = Number(opt.maxverts || 20000);
const io = await webIO(); // also reads inputs that are already meshopt-compressed
const doc = await io.read(input);
const root = doc.getRoot();
// --keep=a,b keeps only mesh nodes whose name contains one of the parts (for files that hold a pair).
if (opt.keep) {
  const keep = opt.keep.split(',');
  for (const n of root.listNodes()) if (n.getMesh() && !keep.some((k) => n.getName().includes(k))) n.setMesh(null);
}
for (const ext of root.listExtensionsUsed()) {
  if (['KHR_materials_variants', 'KHR_draco_mesh_compression', 'EXT_meshopt_compression'].includes(ext.extensionName)) ext.dispose();
}
// --smooth: drop flat per-face normals so welding can share vertices, then rebuild smooth normals.
if (opt.smooth !== undefined) {
  for (const m of root.listMeshes()) for (const p of m.listPrimitives()) { const n = p.getAttribute('NORMAL'); if (n) { p.setAttribute('NORMAL', null); n.dispose(); } }
}
let verts = 0;
for (const m of root.listMeshes()) for (const p of m.listPrimitives()) verts += p.getAttribute('POSITION')?.getCount() || 0;
await MeshoptSimplifier.ready;
// Older Sketchfab exports use spec/gloss materials, which three.js no longer reads: convert to metal/rough.
const steps = [metalRough(), dedup(), flatten(), join(), weld(), resample(), prune()];
if (verts > MAX_VERTS) steps.push(simplify({ simplifier: MeshoptSimplifier, ratio: MAX_VERTS / verts, error: Number(opt.error || 0.01) }));
if (opt.smooth !== undefined) steps.push(normals({ overwrite: true }));
steps.push(textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024], quality: 82 }), quantize(), prune());
await doc.transform(...steps);
await webOptimise(doc); // 512 px aux maps + EXT_meshopt_compression

const outRel = `/models/${slug}.glb`;
const out = opt.out || path.join('public', outRel);
fs.mkdirSync(path.dirname(out), { recursive: true });
await io.write(out, doc);
const kb = Math.round(fs.statSync(out).size / 1024);

if (opt.out) { console.log(`${slug}: ${verts} vertices in, ${kb} KB out -> ${out} (trial, not registered)`); process.exit(0); }
const manifestPath = 'src/data/models.json';
const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : {};
const prev = manifest[slug] || {};
manifest[slug] = {
  file: outRel,
  rotation: opt.rotate ? opt.rotate.split(',').map(Number) : (prev.rotation || [0, 0, 0]),
  ...(opt.keep ? { keep: opt.keep } : {}),
  ...(prev.material ? { material: prev.material } : {}),
  credit: {
    title: opt.title ?? prev.credit?.title ?? '',
    author: opt.author ?? prev.credit?.author ?? '',
    license: opt.license ?? prev.credit?.license ?? '',
    url: opt.url ?? prev.credit?.url ?? '',
  },
  anchors: prev.anchors || {},
};
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`${slug}: ${verts} vertices in, ${kb} KB out -> ${out}${kb > 768 ? '  (over the 768 KB budget)' : ''}`);
