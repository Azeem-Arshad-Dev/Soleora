// Every character the site's text can contain must be in the self-hosted font subset
// (src/fonts/subset.json), or it would render in a fallback font. Fix: add it there and run
// python3 tools/subset-fonts.py.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const { unicodes } = JSON.parse(fs.readFileSync('src/fonts/subset.json', 'utf8'));
const ranges = unicodes.split(',').map((r) => r.replace('U+', '').split('-').map((h) => parseInt(h, 16)));
const covered = (cp) => ranges.some(([a, b = a]) => cp >= a && cp <= b);

function files(dir, ext) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? files(p, ext) : p.endsWith(ext) ? [p] : [];
  });
}

describe('font subset', () => {
  const sources = [...files('content', '.md'), ...files('src/data', '.json'), 'scripts/generate-pages.mjs', 'CREDITS.md'];
  for (const f of sources) {
    it(`covers every character in ${f}`, () => {
      const text = fs.readFileSync(f, 'utf8');
      const missing = [...new Set([...text].filter((c) => c !== '\n' && c !== '\r' && c !== '\t' && !covered(c.codePointAt(0))))];
      expect(missing.map((c) => `${c} U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`)).toEqual([]);
    });
  }
  it('the generated @font-face rules use the same range', () => {
    const css = fs.readFileSync('src/css/fonts.css', 'utf8');
    expect(css.match(/unicode-range: ([^;]+);/g)).toEqual([`unicode-range: ${unicodes};`, `unicode-range: ${unicodes};`]);
  });
});
