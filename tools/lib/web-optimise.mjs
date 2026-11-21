// Final web pass shared by tools/import-model.mjs and tools/compress-models.mjs:
//  - low-frequency maps (metal/rough, occlusion, specular) are resized to 512 px; base colour and
//    normal maps keep their full resolution because they carry the visible detail in the hero view;
//  - geometry gets EXT_meshopt_compression (filter mode: 14-bit positions, 8-bit octahedral normals),
//    decoded at runtime by MeshoptDecoder (see src/js/shoes/models.js).
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { meshopt, listTextureSlots, compressTexture } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';

export const AUX_SLOTS = new Set(['metallicRoughnessTexture', 'occlusionTexture', 'specularTexture', 'specularColorTexture']);
export const AUX_SIZE = 512;

export async function webIO() {
  await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);
  return new NodeIO().registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
}

export const isMeshopt = (doc) => doc.getRoot().listExtensionsUsed().some((e) => e.extensionName === 'EXT_meshopt_compression');

/** Applies the web pass to `doc` in place (call before io.write). */
export async function webOptimise(doc) {
  for (const t of doc.getRoot().listTextures()) {
    const slots = listTextureSlots(t);
    const size = t.getSize();
    if (!slots.length || !slots.every((s) => AUX_SLOTS.has(s)) || !size || Math.max(...size) <= AUX_SIZE) continue;
    await compressTexture(t, { encoder: sharp, targetFormat: 'webp', resize: [AUX_SIZE, AUX_SIZE], quality: 85 });
  }
  if (!isMeshopt(doc)) await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'high' }));
  return doc;
}
