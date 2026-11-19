// Fetch-and-swap router used only when the 3D stage is active.
const cache = new Map();

/** Parses a full Soleora page into the parts the router swaps. Pure (needs DOMParser). */
export function extractPage(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const main = doc.getElementById('main');
  return {
    title: doc.title,
    description: doc.querySelector('meta[name="description"]')?.getAttribute('content') || '',
    canonical: doc.querySelector('link[rel="canonical"]')?.getAttribute('href') || '',
    mainHTML: main ? main.innerHTML : '',
    mainStyle: main?.getAttribute('style') || '',
    pageType: main?.dataset.page || 'plain',
    slug: main?.dataset.slug || '',
    current: doc.querySelector('.site-nav a[aria-current="page"]')?.getAttribute('href') || '',
  };
}

/** Normalises a URL to a path key, or null if the router should not handle it. */
export function routeOf(href, base = location.href) {
  const u = new URL(href, base);
  if (u.origin !== new URL(base).origin) return null;
  const p = u.pathname.replace(/\/index\.html$/, '/');
  if (p === '/') return { path: '/', type: 'showroom' };
  const m = p.match(/^\/articles\/([a-z0-9-]+)(\.html)?$/);
  if (m) return { path: `/articles/${m[1]}.html`, type: 'article', slug: m[1] };
  return null;
}

export function prefetch(path) {
  if (!cache.has(path)) {
    cache.set(path, fetch(path, { credentials: 'same-origin' }).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.text();
    }).then(extractPage).catch((e) => { cache.delete(path); throw e; }));
  }
  return cache.get(path);
}

/** Seeds the cache with the current document (so Back to the first page needs no fetch). */
export function seedCurrent() {
  const r = routeOf(location.href);
  if (r) cache.set(r.path, Promise.resolve(extractPage(document.documentElement.outerHTML)));
}

/** Replaces <main> and head metadata with a parsed page. Returns the new main element. */
export function swapIn(page) {
  const main = document.getElementById('main');
  main.innerHTML = page.mainHTML;
  main.dataset.page = page.pageType;
  if (page.slug) main.dataset.slug = page.slug; else delete main.dataset.slug;
  main.setAttribute('style', page.mainStyle);
  document.body.dataset.page = page.pageType;
  document.body.setAttribute('style', page.mainStyle);
  document.title = page.title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', page.description);
  document.querySelector('link[rel="canonical"]')?.setAttribute('href', page.canonical);
  document.querySelectorAll('.site-nav a').forEach((a) => {
    if (a.getAttribute('href') === page.current) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  return main;
}
