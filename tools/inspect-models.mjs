// Prints bounding box, vertex count and top-level parts for each .glb given.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { getBounds } from '@gltf-transform/functions';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
for (const f of process.argv.slice(2)) {
  try {
    const doc = await io.read(f);
    const root = doc.getRoot();
    const scene = root.getDefaultScene() || root.listScenes()[0];
    const b = getBounds(scene);
    const size = b.max.map((v, i) => +(v - b.min[i]).toFixed(3));
    let verts = 0, tris = 0;
    for (const m of root.listMeshes()) for (const p of m.listPrimitives()) { verts += p.getAttribute('POSITION').getCount(); tris += (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3; }
    const parts = [];
    const walk = (n, depth) => { const mesh = n.getMesh(); if (mesh) { const nb = getBounds(n); parts.push(`${n.getName() || mesh.getName() || '?'}[${nb.min.map((v, i) => (v + (nb.max[i] - v) / 2).toFixed(2)).join(',')}]`); } n.listChildren().forEach((c) => walk(c, depth + 1)); };
    scene.listChildren().forEach((n) => walk(n, 0));
    console.log(`${f.split('/').pop()}: size ${size.join(' x ')} | ${verts} verts ${Math.round(tris)} tris | ${root.listTextures().length} tex | ${parts.length} parts: ${parts.slice(0, 6).join(' ')}`);
  } catch (e) { console.log(f, 'ERROR', e.message); }
}
