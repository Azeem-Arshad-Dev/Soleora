import { describe, it, expect } from 'vitest';
import { filterEntries } from '../src/js/listing.js';
import articles from '../src/data/articles.json';

const entries = articles.map((a) => ({ slug: a.slug, category: a.category, text: [a.title, a.name, a.excerpt, ...a.tags].join(' ').toLowerCase() }));

describe('listing filter', () => {
  it('filters by category', () => {
    expect(filterEntries(entries, { cat: 'formal' })).toEqual(['oxford-shoes', 'derby-shoes', 'brogues', 'monk-straps']);
  });
  it('searches across words and combines with category', () => {
    const boots = filterEntries(entries, { q: 'boot' });
    expect(boots).toEqual(expect.arrayContaining(['chelsea-boots', 'chukka-boots', 'work-boots', 'ankle-boots', 'football-boots']));
    expect(filterEntries(entries, { q: 'boot', cat: 'boots' })).toEqual(['chelsea-boots', 'chukka-boots', 'work-boots']);
  });
  it('returns nothing for nonsense', () => {
    expect(filterEntries(entries, { q: 'zzzqqq' })).toEqual([]);
  });
});
