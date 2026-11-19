// Generates every HTML page from src/data/articles.json + content/articles/*.md.
// Usage: node scripts/generate-pages.mjs [outDir]   (default: project root)
import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.resolve(process.argv[2] || ROOT);
const SITE = 'https://example.com';
const articles = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/articles.json'), 'utf8'));
const models = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/models.json'), 'utf8'));

export const CATEGORIES = {
  athletic: { name: 'Athletic', text: 'Shoes built for movement: running, court, pitch and trail. Each one is shaped by the sport it serves.' },
  casual: { name: 'Casual', text: 'The everyday pairs. Sneakers, loafers, espadrilles and sandals that carry you from weekday to weekend.' },
  formal: { name: 'Formal', text: 'The dress shoe family. Oxfords, derbies, brogues and monk straps, told apart by how they close and what they show.' },
  boots: { name: 'Boots', text: 'Above the ankle and built to last. From the clean Chelsea to the hard-wearing work boot.' },
  womens: { name: 'Heels and flats', text: 'From the stiletto to the ballet flat and the ankle boot: shape, height and how to wear each well.' },
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmtDate = (iso) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const url = (p) => SITE + p;
const tintVar = (cat) => `var(--tint-${cat})`;

const ICON = {
  sole: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 2.5c3.4 0 5.2 2.5 5.2 6 0 2.6-1 4.4-1 6.6 0 2.8 1.3 4.4-1.9 4.4H9.2c-2.7 0-3.6-2.3-3.6-5.8 0-2.8.8-4.5.8-6.6 0-2.8.5-4.6 2.6-4.6z" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
  moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 15l7-7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M16 16l4.5 4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  rotL: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  rotR: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.4-5.7M20 4v4h-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

function head({ title, description, canonical, image = '/og/oxford-shoes.webp', type = 'website', jsonld = [] }) {
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url(canonical)}">
<meta property="og:type" content="${type}">
<meta property="og:site_name" content="Soleora">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url(canonical)}">
<meta property="og:image" content="${url(image)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#EEF0EF">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<script src="/theme-init.js"></script>
<link rel="stylesheet" href="/src/css/main.css">
${jsonld.map((j) => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join('\n')}`;
}

function header(current) {
  const link = (href, label, key) => `<li><a href="${href}"${current === key ? ' aria-current="page"' : ''}>${label}</a></li>`;
  return `<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap">
    <a class="wordmark" href="/" aria-label="Soleora, back to the showroom">${ICON.sole}Soleora</a>
    <button class="icon-btn menu-btn" aria-expanded="false" aria-controls="site-nav" aria-label="Menu">${ICON.menu}</button>
    <nav class="site-nav" id="site-nav" aria-label="Main">
      <ul>
        ${link('/', 'Showroom', 'home')}
        ${link('/articles.html', 'All shoes', 'articles')}
        ${link('/about.html', 'About', 'about')}
        ${link('/contact.html', 'Contact', 'contact')}
      </ul>
      <button class="icon-btn theme-toggle" aria-label="Switch to dark mode">${ICON.moon}<span class="theme-label">Dark</span></button>
    </nav>
  </div>
</header>
<div id="stage" class="stage" aria-hidden="false"><div class="pins" id="pins"></div></div>`;
}

function footer() {
  const cats = Object.entries(CATEGORIES).map(([k, c]) => `<li><a href="/category/${k}.html">${c.name}</a></li>`).join('');
  return `<footer class="site-footer">
  <div class="wrap">
    <div>
      <a class="wordmark" href="/">${ICON.sole}Soleora</a>
      <p>A showroom of eighteen shoes, each one explained: where it came from, how it is made, and how to wear it well.</p>
    </div>
    <div><h2>Categories</h2><ul>${cats}</ul></div>
    <div><h2>Soleora</h2><ul><li><a href="/articles.html">All shoes</a></li><li><a href="/about.html">About</a></li><li><a href="/contact.html">Contact</a></li></ul></div>
    <p class="legal">Soleora &copy; 2026. 3D model credits are on the <a href="/about.html">About</a> page.</p>
  </div>
</footer>
<button class="icon-btn back-to-top" aria-label="Back to top">${ICON.up}</button>
<script type="module" src="/src/js/main.js"></script>`;
}

function page({ headHtml, current, main, page, slug = '', tint = '' }) {
  return `<!doctype html>
<html lang="en">
<head>
${headHtml}
</head>
<body data-page="${page}"${slug ? ` data-slug="${slug}"` : ''}${tint ? ` style="--stage-tint:${tint}"` : ''}>
${header(current)}
<main id="main" tabindex="-1" data-page="${page}"${slug ? ` data-slug="${slug}"` : ''}${tint ? ` style="--stage-tint:${tint}"` : ''}>
${main}
</main>
${footer()}
</body>
</html>
`;
}

const pips = (n) => `<span class="pips" aria-hidden="true">${[1, 2, 3, 4, 5].map((i) => `<i${i <= n ? ' class="on"' : ''}></i>`).join('')}</span><span class="sr-only">Formality ${n} of 5</span>`;

function card(a, { headingLevel = 3, lazy = true } = {}) {
  const cat = CATEGORIES[a.category].name;
  return `<li data-cat="${a.category}" data-slug="${a.slug}" data-text="${esc([a.title, a.name, a.excerpt, cat, ...a.tags].join(' ').toLowerCase())}">
  <a href="/articles/${a.slug}.html" data-shoe="${a.slug}">
    <figure>
      <img src="/stills/${a.slug}.webp" width="800" height="600" alt="${esc(a.name)}, shown on a ${cat.toLowerCase()} backdrop"${lazy ? ' loading="lazy"' : ''} style="--stage-tint:${tintVar(a.category)}">
      <figcaption><span class="cat">${cat}</span><h${headingLevel}>${esc(a.name)}</h${headingLevel}><p>${esc(a.excerpt)}</p></figcaption>
    </figure>
  </a>
</li>`;
}

function barcode(slug) {
  let h = 7;
  return Array.from({ length: 34 }, (_, i) => { h = (h * 31 + slug.charCodeAt(i % slug.length)) % 997; return `<b style="width:${1 + (h % 3)}px"></b>`; }).join('');
}

function articleBody(a) {
  let html = marked.parse(fs.readFileSync(path.join(ROOT, `content/articles/${a.slug}.md`), 'utf8'));
  html = html.replace(/<h2>(.*?)<\/h2>/g, (_, t) => `<h2 id="${t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '')}">${t}</h2>`);
  html = html.replace(/(<h2 id="key-features">Key features<\/h2>\s*)<ol>([\s\S]*?)<\/ol>/, (_, h, list) => {
    let i = 0;
    const items = list.replace(/<li>/g, () => { i += 1; return i <= a.hotspots.length ? `<li data-hotspot="${i}">` : '<li>'; });
    return `${h}<ol class="features">${items}</ol>`;
  });
  return html;
}

function articlePage(a, i) {
  const cat = CATEGORIES[a.category];
  const next = articles[(i + 1) % articles.length];
  const related = articles.filter((x) => x.slug !== a.slug && x.category === a.category).concat(articles.filter((x) => x.category !== a.category)).slice(0, 3);
  const p = `/articles/${a.slug}.html`;
  const jsonld = [
    { '@context': 'https://schema.org', '@type': 'Article', headline: a.title, description: a.standfirst, image: url(`/og/${a.slug}.webp`), datePublished: a.date, author: { '@type': 'Organization', name: a.author }, publisher: { '@type': 'Organization', name: 'Soleora' }, mainEntityOfPage: url(p) },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Showroom', item: url('/') },
      { '@type': 'ListItem', position: 2, name: cat.name, item: url(`/category/${a.category}.html`) },
      { '@type': 'ListItem', position: 3, name: a.title, item: url(p) }] },
  ];
  const main = `<div class="wrap article-top">
  <a class="back-link" href="/" data-back>${ICON.back}Back to the showroom</a>
  <header class="article-head">
    <div class="article-title">
      <a class="cat" href="/category/${a.category}.html">${cat.name}</a>
      <h1>${esc(a.title)}</h1>
      <p class="standfirst">${esc(a.standfirst)}</p>
      <p class="meta">${a.readTime} minute read, published ${fmtDate(a.date)}.</p>
    </div>
    <div class="hero-slot" id="hero-slot" data-stage-slot>
      <img class="hero-still" src="/stills/${a.slug}-poster.webp" width="1600" height="1200" alt="${esc(a.name)}, three-quarter view" fetchpriority="high">
      <p class="hero-hint">Drag to turn it.</p>
      <div class="hero-tools">
        <button class="icon-btn" data-rotate="-1" aria-label="Rotate left">${ICON.rotL}</button>
        <button class="icon-btn" data-rotate="1" aria-label="Rotate right">${ICON.rotR}</button>
      </div>
    </div>
  </header>
  <div class="article-body">
    <aside>
      <section class="shoebox-label" aria-label="Quick facts">
        <header>${esc(a.name)}<span class="tnum">No. ${String(a.n).padStart(2, '0')}</span></header>
        <dl>
          <dt>Category</dt><dd>${cat.name}</dd>
          <dt>Origin</dt><dd>${esc(a.facts.origin)}</dd>
          <dt>Best for</dt><dd>${esc(a.facts.bestFor)}</dd>
          <dt>Materials</dt><dd>${esc(a.facts.materials)}</dd>
          <dt>Formality</dt><dd>${pips(a.formality)}</dd>
        </dl>
        <div class="barcode" aria-hidden="true">${barcode(a.slug)}</div>
      </section>
    </aside>
    <article class="prose">
      ${articleBody(a)}
      <ul class="tags" aria-label="Tags">${a.tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      <a class="next-shoe" href="/articles/${next.slug}.html" data-next="${next.slug}">
        <img src="/stills/${next.slug}.webp" width="800" height="600" alt="" loading="lazy">
        <div><span>Next shoe</span><strong>${esc(next.name)}</strong></div>
      </a>
    </article>
  </div>
  <section class="related" aria-labelledby="related-h">
    <h2 id="related-h">More to pick up</h2>
    <ul class="shoe-grid">${related.map((r) => card(r)).join('')}</ul>
  </section>
</div>`;
  return page({
    headHtml: head({ title: `${a.title} | Soleora`, description: a.standfirst, canonical: p, image: `/og/${a.slug}.webp`, type: 'article', jsonld }),
    current: 'articles', main, page: 'article', slug: a.slug, tint: tintVar(a.category),
  });
}

function homePage() {
  const featured = articles.find((a) => a.slug === 'chelsea-boots') || articles[0];
  const tabs = Object.entries(CATEGORIES).map(([k, c]) => `<button type="button" data-cat="${k}" aria-pressed="false">${c.name}</button>`).join('');
  const latest = articles.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  const main = `<section class="showroom" data-stage-slot aria-label="Showroom">
  <div class="wrap">
    <div class="showroom__intro">
      <h1>Pick one up. We'll tell you where it's been.</h1>
      <p>Eighteen shoes, taken apart and explained. Drag the rail, then open the one in front.</p>
    </div>
    <div class="showroom__index fade-swap" aria-hidden="true"><span class="num tnum">${featured.n}</span><span class="of">of ${articles.length}</span></div>
    <div class="showroom__focus">
      <div>
        <h2 class="fade-swap"><a href="/articles/${featured.slug}.html" data-open>${esc(featured.name)}</a></h2>
        <p class="fade-swap"><span class="focus-meta">${CATEGORIES[featured.category].name}. Formality ${featured.formality} of 5.</span></p>
      </div>
      <div class="row">
        <button class="icon-btn" data-step="-1" aria-label="Previous shoe">${ICON.prev}</button>
        <a class="btn" href="/articles/${featured.slug}.html" data-open>Read about it</a>
        <button class="icon-btn" data-step="1" aria-label="Next shoe">${ICON.next}</button>
      </div>
    </div>
    <nav class="showroom__tabs" aria-label="Jump to a category">${tabs}</nav>
    <ol class="rail-list" aria-label="All shoes in the showroom">${articles.map((a) => `<li><a href="/articles/${a.slug}.html" data-rail="${a.slug}">${esc(a.name)}</a></li>`).join('')}</ol>
    <p class="sr-only" aria-live="polite" id="rail-status"></p>
    <div class="showroom-fallback">
      <ul class="shoe-grid">${articles.map((a, i) => card(a, { lazy: i > 2 })).join('')}</ul>
    </div>
  </div>
</section>
<section class="home-more wrap" aria-labelledby="more-h">
  <div class="lede">
    <h2 id="more-h">A field guide to what's on your feet</h2>
    <p>Every shoe here has a history, a set of features that give it away, and a right time to wear it. Start with any of them, or read the newest additions below.</p>
  </div>
  <ul class="shoe-grid">${latest.map((a) => card(a)).join('')}</ul>
</section>`;
  return page({
    headHtml: head({ title: 'Soleora: a showroom of eighteen shoes, explained', description: 'Pick up any of eighteen 3D shoes and read where it came from, how it is made and how to wear it.', canonical: '/', image: `/og/${featured.slug}.webp`, jsonld: [{ '@context': 'https://schema.org', '@type': 'WebSite', name: 'Soleora', url: url('/') }] }),
    current: 'home', main, page: 'showroom',
  });
}

function listingPage() {
  const chips = [['', 'All'], ...Object.entries(CATEGORIES).map(([k, c]) => [k, c.name])].map(([k, n]) => `<button type="button" class="chip" data-cat="${k}" aria-pressed="${k === '' ? 'true' : 'false'}">${n}</button>`).join('');
  const main = `<div class="wrap">
  <header class="page-head"><h1>All shoes</h1><p>Eighteen styles, from trail to black tie. Search by name, or narrow it down by category.</p></header>
  <div class="filters" role="search">
    <label class="search">${ICON.search}<span class="sr-only">Search shoes</span><input type="search" id="q" placeholder="Search, for example boots or leather" autocomplete="off"></label>
    <div class="chips" aria-label="Filter by category">${chips}</div>
  </div>
  <p class="result-count" id="count" aria-live="polite">Showing all ${articles.length} shoes</p>
  <ul class="shoe-grid" id="grid">${articles.map((a) => card(a)).join('')}</ul>
  <div class="empty" id="empty" hidden><p>No shoes match that search. Try a broader word, or clear the filters.</p><button class="btn btn--ghost" id="clear" type="button">Clear filters</button></div>
</div>`;
  return page({ headHtml: head({ title: 'All shoes | Soleora', description: 'Browse all eighteen shoes on Soleora, from running shoes to Oxfords.', canonical: '/articles.html' }), current: 'articles', main, page: 'listing' });
}

function categoryPage(key) {
  const c = CATEGORIES[key];
  const list = articles.filter((a) => a.category === key);
  const others = Object.entries(CATEGORIES).filter(([k]) => k !== key).map(([k, o]) => `<a class="btn btn--ghost" href="/category/${k}.html">${o.name}</a>`).join('');
  const main = `<section class="cat-banner"><div class="wrap"><h1>${c.name}</h1><p>${c.text}</p></div></section>
<div class="wrap"><ul class="shoe-grid">${list.map((a) => card(a, { lazy: false })).join('')}</ul>
<div class="cat-links">${others}</div></div>`;
  return page({ headHtml: head({ title: `${c.name} | Soleora`, description: c.text, canonical: `/category/${key}.html`, image: `/og/${list[0].slug}.webp` }), current: 'articles', main, page: 'category', tint: tintVar(key) });
}

function creditsHtml() {
  const rows = Object.entries(models).map(([slug, m]) => {
    const a = articles.find((x) => x.slug === slug);
    const c = m.credit || {};
    return `<li>${esc(a ? a.name : slug)}: "${esc(c.title)}" by ${esc(c.author)}, ${esc(c.license)}${c.url ? ` (<a href="${esc(c.url)}">source</a>)` : ''}</li>`;
  });
  return rows.length ? `<p>3D models used under their licences:</p><ul>${rows.join('')}</ul><p>All other shoes are generated in code for this site.</p>` : '<p>All shoes are generated in code for this site.</p>';
}

function simplePage(file, title, description, current, body) {
  return page({ headHtml: head({ title: `${title} | Soleora`, description, canonical: `/${file}` }), current, main: `<div class="wrap"><header class="page-head"><h1>${title}</h1></header><div class="prose-page">${body}</div></div>`, page: 'plain' });
}

export function generate(out = OUT) {
  const write = (rel, html) => { const f = path.join(out, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); };
  write('index.html', homePage());
  write('articles.html', listingPage());
  articles.forEach((a, i) => write(`articles/${a.slug}.html`, articlePage(a, i)));
  Object.keys(CATEGORIES).forEach((k) => write(`category/${k}.html`, categoryPage(k)));
  write('about.html', simplePage('about.html', 'About Soleora', 'What Soleora is and how the articles are written.', 'about',
    `<p>Soleora is a showroom for the shoes most people own, or wonder about. Each of the eighteen styles here gets a short, plain-spoken article: where it came from, the features that give it away, what it is made of, when to wear it, how it should fit and how to look after it.</p>
<p>Every shoe in the showroom is a 3D model you can turn in your hands. Where a suitable openly licensed model exists we use it, credited below; the rest are built in code, so think of those as a cobbler's sketch rather than a product photo.</p>
<h2>Credits</h2>
${creditsHtml()}
<h2>How we write</h2>
<p>We avoid prices, brand endorsements and claims we can't support. Where history is uncertain, we say so. If you spot something wrong, tell us and we'll fix it.</p>`));
  write('contact.html', simplePage('contact.html', 'Contact', 'Get in touch with Soleora.', 'contact',
    `<p>Found an error, or want to suggest a shoe we haven't covered yet? Send us an email and we'll reply within a few days.</p>
<p><a class="btn" href="mailto:hello@example.com">Email hello@example.com</a></p>`));
  write('404.html', simplePage('404.html', "We couldn't find that page", 'Page not found.', '',
    `<p>The link may be old, or the address may have a typo. Try the showroom, or browse every shoe.</p>
<p><a class="btn" href="/">Go to the showroom</a> <a class="btn btn--ghost" href="/articles.html">Browse all shoes</a></p>`));
  const urls = ['/', '/articles.html', '/about.html', '/contact.html', ...articles.map((a) => `/articles/${a.slug}.html`), ...Object.keys(CATEGORIES).map((k) => `/category/${k}.html`)];
  write('public/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${url(u)}</loc></url>`).join('\n')}\n</urlset>\n`);
  write('public/robots.txt', `User-agent: *\nAllow: /\nSitemap: ${url('/sitemap.xml')}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  generate();
  console.log(`Generated ${articles.length} articles, ${Object.keys(CATEGORIES).length} categories and 5 pages in ${OUT}`);
}
