// Ready-made .glb shoe models (see src/data/models.json and tools/import-model.mjs).
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import MODELS from '../../data/models.json';
import { normalizeGroup } from './build.js';

export const hasModel = (slug) => Boolean(MODELS[slug]);
export const modelInfo = (slug) => MODELS[slug] || null;

const D2R = Math.PI / 180;
const cache = new Map();
let loader;

/** Moves each anchor to the nearest surface point of `group`, lifted slightly along that point's normal. */
export function snapAnchors(group, anchors, lift = 0.012) {
  const pts = [], nors = [];
  const v = new THREE.Vector3(), n = new THREE.Vector3(), nm = new THREE.Matrix3();
  group.updateMatrixWorld(true);
  group.traverse((o) => {
    if (!o.isMesh) return;
    const pos = o.geometry.getAttribute('position');
    const nor = o.geometry.getAttribute('normal');
    nm.getNormalMatrix(o.matrixWorld);
    const step = Math.max(1, Math.floor(pos.count / 20000));
    for (let i = 0; i < pos.count; i += step) {
      pts.push(v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld).clone());
      nors.push(nor ? n.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize().clone() : new THREE.Vector3(0, 1, 0));
    }
  });
  const out = {};
  for (const [k, a] of Object.entries(anchors)) {
    let best = -1, bd = Infinity;
    for (let i = 0; i < pts.length; i++) { const d = pts[i].distanceToSquared(a); if (d < bd) { bd = d; best = i; } }
    out[k] = best < 0 ? a.clone() : pts[best].clone().addScaledVector(nors[best], lift);
  }
  return out;
}

/**
 * loadModel(slug, fallbackAnchors) -> Promise<{ group, anchors, height, width }>
 * The group is normalised to the same convention as the procedural shoes.
 */
export function loadModel(slug, fallbackAnchors = {}) {
  const info = MODELS[slug];
  if (!info) return Promise.reject(new Error(`No model for ${slug}`));
  if (!cache.has(slug)) {
    loader ||= new GLTFLoader();
    cache.set(slug, loader.loadAsync(info.file).then((gltf) => {
      const group = new THREE.Group();
      const rot = new THREE.Group();
      const [rx, ry, rz] = info.rotation || [0, 0, 0];
      rot.rotation.set(rx * D2R, ry * D2R, rz * D2R);
      rot.add(gltf.scene);
      group.add(rot);
      group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
      const { height, width } = normalizeGroup(group);
      const manual = Object.fromEntries(Object.entries(info.anchors || {}).map(([k, a]) => [k, new THREE.Vector3(...a)]));
      const missing = Object.fromEntries(Object.entries(fallbackAnchors).filter(([k]) => !manual[k]));
      const anchors = { ...snapAnchors(group, missing), ...manual };
      return { group, anchors, height, width };
    }));
  }
  return cache.get(slug);
}
