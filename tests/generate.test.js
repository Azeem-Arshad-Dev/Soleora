import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { generate } from '../scripts/generate-pages.mjs';
import articles from '../src/data/articles.json';

describe('page generator', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'soleora-'));
  generate(dir);
  it('writes one page per article with the DOM contract', () => {
    const files = fs.readdirSync(path.join(dir, 'articles'));
    expect(files).toHaveLength(18);
    for (const a of articles) {
      const html = fs.readFileSync(path.join(dir, 'articles', `${a.slug}.html`), 'utf8');
      expect(html.match(/<h1[ >]/g)).toHaveLength(1);
      expect(html).toContain('id="hero-slot"');
      expect(html).toContain(`<link rel="canonical" href="https://example.com/articles/${a.slug}.html">`);
      expect(html).toContain(`<title>${a.title.replace(/&/g, '&amp;')} | Soleora</title>`);
      const lds = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
      expect(lds.map((l) => l['@type'])).toEqual(['Article', 'BreadcrumbList']);
      expect((html.match(/data-hotspot="/g) || []).length).toBe(a.hotspots.length);
    }
  });
  it('writes listing, category and static pages plus sitemap', () => {
    for (const f of ['index.html', 'articles.html', 'about.html', 'contact.html', '404.html', 'public/sitemap.xml', 'public/robots.txt']) expect(fs.existsSync(path.join(dir, f)), f).toBe(true);
    expect(fs.readdirSync(path.join(dir, 'category'))).toHaveLength(5);
    expect(fs.readFileSync(path.join(dir, 'public/sitemap.xml'), 'utf8').match(/<loc>/g)).toHaveLength(27);
  });
});
