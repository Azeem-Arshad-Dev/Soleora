// Search + category filter for the All shoes page.

/** Pure filter used by the page and the tests. entries: [{slug, category, text}] */
export function filterEntries(entries, { q = '', cat = null } = {}) {
  const words = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return entries.filter((e) => (!cat || e.category === cat) && words.every((w) => e.text.includes(w))).map((e) => e.slug);
}

export function initListing() {
  const grid = document.getElementById('grid');
  if (!grid) return;
  const input = document.getElementById('q');
  const chips = [...document.querySelectorAll('.chip')];
  const count = document.getElementById('count');
  const empty = document.getElementById('empty');
  const items = [...grid.children].map((li) => ({ li, slug: li.dataset.slug, category: li.dataset.cat, text: li.dataset.text }));
  const params = new URLSearchParams(location.search);
  let q = params.get('q') || '';
  let cat = params.get('cat') || null;
  input.value = q;

  function apply() {
    const keep = new Set(filterEntries(items, { q, cat }));
    items.forEach((it) => { it.li.hidden = !keep.has(it.slug); });
    chips.forEach((c) => c.setAttribute('aria-pressed', String((c.dataset.cat || null) === cat)));
    count.textContent = keep.size === items.length ? `Showing all ${items.length} shoes` : `Showing ${keep.size} of ${items.length} shoes`;
    empty.hidden = keep.size > 0;
    const u = new URL(location.href);
    q ? u.searchParams.set('q', q) : u.searchParams.delete('q');
    cat ? u.searchParams.set('cat', cat) : u.searchParams.delete('cat');
    history.replaceState(null, '', u);
  }
  let t;
  input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { q = input.value; apply(); }, 150); });
  chips.forEach((c) => c.addEventListener('click', () => { cat = c.dataset.cat || null; apply(); }));
  document.getElementById('clear').addEventListener('click', () => { q = ''; cat = null; input.value = ''; apply(); input.focus(); });
  apply();
}
