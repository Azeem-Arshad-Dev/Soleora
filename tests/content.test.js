import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import articles from '../src/data/articles.json';

const H2 = ['A brief history', 'Key features', 'Materials', 'When and how to wear it', 'Finding the right fit', 'Care and maintenance'];

describe('content', () => {
  it('has 18 unique entries', () => {
    expect(articles).toHaveLength(18);
    expect(new Set(articles.map((a) => a.slug)).size).toBe(18);
  });
  for (const a of articles) {
    it(`article body is valid: ${a.slug}`, () => {
      const md = fs.readFileSync(`content/articles/${a.slug}.md`, 'utf8');
      const words = md.split(/\s+/).filter(Boolean).length;
      expect(words).toBeGreaterThanOrEqual(600); expect(words).toBeLessThanOrEqual(900);
      for (const h of H2) expect(md, h).toContain(`## ${h}`);
      const kf = md.split('## Key features')[1].split('\n## ')[0];
      const items = [...kf.matchAll(/^\d+\.\s+\*\*(.+?)\.?\*\*/gm)].map((m) => m[1].replace(/\.$/, ''));
      a.hotspots.forEach((h, i) => expect(items[i]).toBe(h.label));
      expect(a.formality).toBeGreaterThanOrEqual(1); expect(a.formality).toBeLessThanOrEqual(5);
      expect(md).not.toMatch(/\$\d/);
    });
  }
});
