import { detectTier } from './capability.js';

function initChrome() {
  const menuBtn = document.querySelector('.menu-btn');
  const nav = document.getElementById('site-nav');
  menuBtn?.addEventListener('click', () => {
    const open = menuBtn.getAttribute('aria-expanded') !== 'true';
    menuBtn.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
  });
  nav?.addEventListener('click', (e) => { if (e.target.closest('a')) { nav.classList.remove('is-open'); menuBtn?.setAttribute('aria-expanded', 'false'); } });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav?.classList.contains('is-open')) { nav.classList.remove('is-open'); menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.focus(); } });

  const toggle = document.querySelector('.theme-toggle');
  const syncToggle = () => {
    const dark = document.documentElement.dataset.theme === 'dark';
    toggle?.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    const l = toggle?.querySelector('.theme-label'); if (l) l.textContent = dark ? 'Light' : 'Dark';
  };
  syncToggle();
  toggle?.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('soleora-theme', next); } catch {}
    syncToggle();
    document.dispatchEvent(new CustomEvent('soleora:theme'));
  });

  const top = document.querySelector('.back-to-top');
  const onScroll = () => top?.classList.toggle('is-visible', window.scrollY > 600);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  top?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

initChrome();
const page = document.body.dataset.page;
const tier = detectTier();
window.__soleora = { ready: false, tier };

if ((page === 'showroom' || page === 'article') && tier !== 'stills') {
  document.documentElement.classList.add('has-3d');
  import('./app3d.js').then((m) => m.start({ tier })).catch((err) => {
    console.warn('3D unavailable, showing stills', err);
    document.documentElement.classList.remove('has-3d');
    window.__soleora.ready = true;
  });
} else {
  if (page === 'listing') import('./listing.js').then((m) => m.initListing());
  window.__soleora.ready = true;
}
