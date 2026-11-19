import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { SHOE_SLUGS } from '../src/js/shoes/specs.js';
import { buildShoe } from '../src/js/shoes/build.js';
import articles from '../src/data/articles.json';

const PLAN = ['running-shoes','basketball-shoes','football-boots','hiking-shoes-boots','sneakers','loafers','slip-ons-espadrilles','sandals','oxford-shoes','derby-shoes','brogues','monk-straps','chelsea-boots','chukka-boots','work-boots','heels','ballet-flats','ankle-boots'];

describe('shoe generator', () => {
  it('every content-plan slug has a spec', () => {
    expect(SHOE_SLUGS.sort()).toEqual([...PLAN].sort());
  });
  for (const slug of PLAN) {
    it(`buildShoe normalises size: ${slug}`, () => {
      const { group } = buildShoe(slug, { quality: 'low' });
      group.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(group);
      const size = box.getSize(new THREE.Vector3());
      expect(size.x).toBeGreaterThan(0.95); expect(size.x).toBeLessThan(1.05);
      expect(Math.abs(box.min.y)).toBeLessThan(0.005);
      expect(Math.abs((box.min.z + box.max.z) / 2)).toBeLessThan(0.02);
      let nan = false;
      group.traverse((o) => { const p = o.geometry?.getAttribute('position'); if (p) for (const v of p.array) if (!Number.isFinite(v)) nan = true; });
      expect(nan).toBe(false);
    });
  }
  it('hotspots reference real anchors', () => {
    for (const a of articles) {
      const { anchors } = buildShoe(a.slug, { quality: 'low' });
      for (const h of a.hotspots) {
        expect(anchors[h.anchor], `${a.slug}:${h.anchor}`).toBeInstanceOf(THREE.Vector3);
        expect(anchors[h.anchor].length(), `${a.slug}:${h.anchor} not at origin`).toBeGreaterThan(0.01);
      }
    }
  });
});
