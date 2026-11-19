// One-off: merge content/meta/*.json with the 3D settings below into src/data/articles.json.
import fs from 'node:fs';
const ROWS = [
  ['running-shoes', 'athletic', true, [['Cushioned midsole', 'midsole'], ['Breathable mesh upper', 'vamp'], ['Heel counter', 'heel']]],
  ['basketball-shoes', 'athletic', false, [['High collar for ankle support', 'collar'], ['Herringbone traction outsole', 'sole'], ['Lacing system', 'laces']]],
  ['football-boots', 'athletic', false, [['Studded soleplate', 'studs'], ['Low-profile upper', 'vamp'], ['Laces for lockdown', 'laces']]],
  ['hiking-shoes-boots', 'athletic', false, [['Deep lugged outsole', 'lugs'], ['Protective toe bumper', 'toeCap'], ['Padded collar', 'collar']]],
  ['sneakers', 'casual', true, [['Vulcanized rubber sole', 'sole'], ['Canvas upper', 'vamp'], ['Lace-up front', 'laces']]],
  ['loafers', 'casual', false, [['Moccasin apron stitching', 'vamp'], ['Penny strap saddle', 'strap'], ['Low stacked heel', 'heelBlock']]],
  ['slip-ons-espadrilles', 'casual', false, [['Jute rope sole', 'juteSole'], ['Canvas upper', 'vamp']]],
  ['sandals', 'casual', false, [['Adjustable straps', 'strap'], ['Contoured footbed', 'sole']]],
  ['oxford-shoes', 'formal', true, [['Closed lacing', 'laces'], ['Cap toe', 'toeCap'], ['Stacked leather heel', 'heelBlock']]],
  ['derby-shoes', 'formal', false, [['Open lacing', 'laces'], ['Plain toe', 'toe'], ['Leather sole', 'sole']]],
  ['brogues', 'formal', false, [['Decorative perforations', 'broguing'], ['Wingtip toe cap', 'toeCap'], ['Lacing', 'laces']]],
  ['monk-straps', 'formal', false, [['Buckled strap', 'buckle'], ['Plain vamp', 'vamp'], ['Leather heel', 'heelBlock']]],
  ['chelsea-boots', 'boots', true, [['Elastic side panel', 'elastic'], ['Pull tab', 'pullTab'], ['Low stacked heel', 'heelBlock']]],
  ['chukka-boots', 'boots', false, [['Two-eyelet lacing', 'laces'], ['Ankle-height shaft', 'shaft'], ['Crepe sole', 'sole']]],
  ['work-boots', 'boots', false, [['Reinforced toe', 'toeCap'], ['Lugged outsole', 'lugs'], ['Tall laced shaft', 'laces']]],
  ['heels', 'womens', false, [['Stiletto heel', 'heelBlock'], ['Pointed toe', 'toe'], ['Arched sole', 'sole']]],
  ['ballet-flats', 'womens', false, [['Bow at the vamp', 'bow'], ['Low-cut topline', 'collar'], ['Flexible flat sole', 'sole']]],
  ['ankle-boots', 'womens', false, [['Block heel', 'heelBlock'], ['Side zip', 'zip'], ['Ankle-height shaft', 'shaft']]],
];
const NAMES = {"running-shoes": "Running shoes", "basketball-shoes": "Basketball shoes", "football-boots": "Football boots", "hiking-shoes-boots": "Hiking shoes", "sneakers": "Sneakers", "loafers": "Loafers", "slip-ons-espadrilles": "Espadrilles", "sandals": "Sandals", "oxford-shoes": "Oxfords", "derby-shoes": "Derbies", "brogues": "Brogues", "monk-straps": "Monk straps", "chelsea-boots": "Chelsea boots", "chukka-boots": "Chukka boots", "work-boots": "Work boots", "heels": "Heels", "ballet-flats": "Ballet flats", "ankle-boots": "Ankle boots"};
const TINTS = { athletic: '#B7CCC3', casual: '#CBC2DE', formal: '#C6B8AD', boots: '#CFB894', womens: '#BFC9D8' };
const VIEWS = { 'ankle-boots': { yaw: 35, pitch: 10 }, 'monk-straps': { yaw: -40, pitch: 14 }, 'loafers': { yaw: -30, pitch: 18 } };
const start = new Date('2026-11-02T00:00:00Z');
const out = ROWS.map(([slug, category, featured, hs], i) => {
  const meta = JSON.parse(fs.readFileSync(`content/meta/${slug}.json`, 'utf8'));
  const words = fs.readFileSync(`content/articles/${slug}.md`, 'utf8').split(/\s+/).filter(Boolean).length;
  const d = new Date(start.getTime() + i * 86400000);
  return {
    slug, n: i + 1, name: NAMES[slug], title: meta.title, standfirst: meta.standfirst, category, excerpt: meta.excerpt,
    author: 'Soleora Editorial', date: d.toISOString().slice(0, 10), readTime: Math.max(3, Math.round(words / 220)),
    tags: meta.tags, featured, formality: meta.formality, stageTint: TINTS[category],
    view: { yaw: -35, pitch: 12, ...(VIEWS[slug] || {}) },
    hotspots: hs.map(([label, anchor], n) => ({ n: n + 1, label, anchor })),
    facts: meta.facts,
  };
});
fs.writeFileSync('src/data/articles.json', JSON.stringify(out, null, 2) + '\n');
console.log('wrote', out.length);
