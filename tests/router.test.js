// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { extractPage, routeOf } from '../src/js/router.js';

describe('router', () => {
  it('extracts an article page', () => {
    const p = extractPage(fs.readFileSync('articles/chelsea-boots.html', 'utf8'));
    expect(p.title).toBe('Chelsea Boots: A Wardrobe Essential | Soleora');
    expect(p.pageType).toBe('article');
    expect(p.slug).toBe('chelsea-boots');
    expect(p.mainHTML).toContain('id="hero-slot"');
  });
  it('extracts the showroom', () => {
    const p = extractPage(fs.readFileSync('index.html', 'utf8'));
    expect(p.pageType).toBe('showroom');
    expect(p.slug).toBe('');
  });
  it('routes only showroom and article URLs on the same origin', () => {
    const base = 'https://example.com/articles/sneakers.html';
    expect(routeOf('/', base)).toEqual({ path: '/', type: 'showroom' });
    expect(routeOf('/index.html', base).type).toBe('showroom');
    expect(routeOf('/articles/heels.html', base)).toEqual({ path: '/articles/heels.html', type: 'article', slug: 'heels' });
    expect(routeOf('/articles/heels', base).path).toBe('/articles/heels.html');
    expect(routeOf('/about.html', base)).toBeNull();
    expect(routeOf('https://other.com/', base)).toBeNull();
  });
});
