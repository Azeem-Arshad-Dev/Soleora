import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import * as THREE from 'three';
import models from '../src/data/models.json';
import articles from '../src/data/articles.json';
import { snapAnchors } from '../src/js/shoes/models.js';

describe('ready-made models', () => {
  for (const [slug, m] of Object.entries(models)) {
    it(`${slug}: file exists, within budget, credited`, () => {
      expect(articles.some((a) => a.slug === slug)).toBe(true);
      const f = `public${m.file}`;
      expect(fs.existsSync(f)).toBe(true);
      expect(fs.statSync(f).size).toBeLessThanOrEqual(700 * 1024);
      for (const k of ['title', 'author', 'license', 'url']) expect(m.credit[k], k).toBeTruthy();
      expect(m.credit.license).not.toMatch(/NC|NoDerivatives|ND/);
      expect(m.rotation).toHaveLength(3);
    });
  }
  it('snapAnchors moves an anchor onto the nearest surface point', () => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1, 8, 8, 8)));
    const out = snapAnchors(g, { a: new THREE.Vector3(0, 2, 0) }, 0);
    expect(out.a.y).toBeCloseTo(0.5, 5);
  });
});
