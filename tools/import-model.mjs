// Optimises a downloaded .glb for the site and registers it in src/data/models.json.
// Usage: node tools/import-model.mjs <slug> <input.glb> [--rotate=x,y,z] [--title=..] [--author=..] [--license=..] [--url=..]
// Rotation (degrees) is applied at runtime so the toe points +x and the sole sits on y = 0.
import fs from 'node:fs';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, quantize, simplify, textureCompress, resample, flatten, join } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

const [slug, input, ...rest] = process.argv.slice(2);
if (!slug || !input) { console.error('Usage: node tools/import-model.mjs <slug> <input.glb> [--rotate=x,y,z] [--title=] [--author=] [--license=] [--url=]'); process.exit(1); }
const opt = Object.fromEntries(rest.filter((a) => a.startsWith('--')).map((a) => { const [k, ...v] = a.slice(2).split('='); return [k, v.join('=')]; }));

const MAX_VERTS = 40000;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(input);
const root = doc.getRoot();
for (const ext of root.listExtensionsUsed()) {
  if (['KHR_materials_variants', 'KHR_draco_mesh_compression', 'EXT_meshopt_compression'].includes(ext.extensionName)) ext.dispose();
}
let verts = 0;
for (const m of root.listMeshes()) for (const p of m.listPrimitives()) verts += p.getAttribute('POSITION')?.getCount() || 0;
await MeshoptSimplifier.ready;
const steps = [dedup(), flatten(), join(), weld(), resample(), prune()];
if (verts > MAX_VERTS) steps.push(simplify({ simplifier: MeshoptSimplifier, ratio: MAX_VERTS / verts, error: 0.002 }));
steps.push(textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024], quality: 82 }), quantize(), prune());
await doc.transform(...steps);

const outRel = `/models/${slug}.glb`;
const out = path.join('public', outRel);
fs.mkdirSync(path.dirname(out), { recursive: true });
await io.write(out, doc);
const kb = Math.round(fs.statSync(out).size / 1024);

const manifestPath = 'src/data/models.json';
const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : {};
const prev = manifest[slug] || {};
manifest[slug] = {
  file: outRel,
  rotation: opt.rotate ? opt.rotate.split(',').map(Number) : (prev.rotation || [0, 0, 0]),
  credit: {
    title: opt.title ?? prev.credit?.title ?? '',
    author: opt.author ?? prev.credit?.author ?? '',
    license: opt.license ?? prev.credit?.license ?? '',
    url: opt.url ?? prev.credit?.url ?? '',
  },
  anchors: prev.anchors || {},
};
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`${slug}: ${verts} vertices in, ${kb} KB out -> ${out}${kb > 700 ? '  (over the 700 KB budget)' : ''}`);
