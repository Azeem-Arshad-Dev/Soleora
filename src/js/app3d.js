// Orchestrates the persistent 3D stage, the showroom rail, the article viewer and the
// shoe-to-article transition. Loaded only when WebGL2 is available.
import * as THREE from 'three';
import { gsap } from 'gsap';
import articles from '../data/articles.json';
import { createStage, themeStageColor } from './three/stage.js';
import { createRail, SPACING } from './three/rail.js';
import { mountViewer, heroPose } from './three/viewer.js';
import { prefetch, routeOf, seedCurrent, swapIn } from './router.js';
import { reducedMotion } from './capability.js';

const STUDIO = '#D5D9DC';
const TINTS = { athletic: '#B7CCC3', casual: '#CBC2DE', formal: '#C6B8AD', boots: '#CFB894', womens: '#BFC9D8' };
const CAT_NAMES = { athletic: 'Athletic', casual: 'Casual', formal: 'Formal', boots: 'Boots', womens: 'Heels and flats' };
const indexOf = (slug) => articles.findIndex((a) => a.slug === slug);
const lerp = (a, b, k) => a + (b - a) * k;
const finished = (t) => new Promise((r) => t.eventCallback('onComplete', () => r()));

let stage, rail, viewer = null, heroShoe = null, stageEl, tier;
let mode = 'none'; // 'showroom' | 'article'
let busy = false, tl = null, showroomDom = null, current = null, tintHex = STUDIO;

/* ---------- Stage placement over the page's slot ---------- */
function slotRect() {
  const s = document.querySelector('#main [data-stage-slot]');
  if (!s) return null;
  const r = s.getBoundingClientRect();
  return { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height };
}
function stageRect() {
  return { x: parseFloat(stageEl.style.left) || 0, y: parseFloat(stageEl.style.top) || 0, w: stageEl.offsetWidth, h: stageEl.offsetHeight };
}
function placeStage(r) {
  if (!r) return;
  Object.assign(stageEl.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` });
  stage.resize();
}
function sync() {
  if (busy) return;
  placeStage(slotRect());
  if (mode === 'showroom') rail.applyCamera();
  if (mode === 'article' && viewer) viewer.place();
  stage.requestRender();
}

function setTint(hex) { tintHex = hex; stage.baseTint = hex; stage.setTint(hex); }
function tweenTint(hex, duration, timeline, at = 0) {
  const from = stage.tint;
  const to = themeStageColor(hex);
  const o = { k: 0 };
  tintHex = hex; stage.baseTint = hex;
  timeline.to(o, { k: 1, duration, ease: 'power2.inOut', onUpdate: () => stage.setTintColor(from.clone().lerp(to, o.k)) }, at);
}

/* ---------- Showroom DOM bindings ---------- */
function bindShowroom(main) {
  const sec = main.querySelector('.showroom');
  const $ = (s) => sec.querySelector(s);
  const num = $('.showroom__index'), numN = $('.showroom__index .num');
  const nameH = $('.showroom__focus h2'), nameA = nameH.querySelector('a');
  const metaP = $('.showroom__focus p'), meta = $('.focus-meta');
  const status = $('#rail-status');
  const tabs = [...sec.querySelectorAll('.showroom__tabs button')];
  let t;
  function render(i, { announce = true, animate = true } = {}) {
    const a = articles[i];
    const apply = () => {
      numN.textContent = a.n;
      nameA.textContent = a.name;
      meta.textContent = `${CAT_NAMES[a.category]}. Formality ${a.formality} of 5.`;
      sec.querySelectorAll('[data-open]').forEach((el) => el.setAttribute('href', `/articles/${a.slug}.html`));
      [num, nameH, metaP].forEach((el) => el.classList.remove('is-out'));
    };
    tabs.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cat === a.category)));
    if (announce) status.textContent = `${a.name}, ${a.n} of ${articles.length}.`;
    clearTimeout(t);
    if (!animate || reducedMotion()) return apply();
    [num, nameH, metaP].forEach((el) => el.classList.add('is-out'));
    t = setTimeout(apply, 160);
  }
  const offFocus = rail.onFocus((i) => render(i));
  render(rail.index, { announce: false, animate: false });

  const onClick = (e) => {
    const step = e.target.closest('[data-step]');
    if (step) { rail.step(Number(step.dataset.step)); return; }
    const tab = e.target.closest('.showroom__tabs button');
    if (tab) rail.goTo(articles.findIndex((a) => a.category === tab.dataset.cat));
  };
  const onFocusIn = (e) => {
    const l = e.target.closest('[data-rail]');
    if (l) rail.goTo(indexOf(l.dataset.rail));
  };
  const onOver = (e) => { const l = e.target.closest('[data-open]'); if (l) prefetch(new URL(l.href).pathname).catch(() => {}); };
  sec.addEventListener('click', onClick);
  sec.addEventListener('focusin', onFocusIn);
  sec.addEventListener('pointerover', onOver);
  return {
    sec,
    unbind() { offFocus(); clearTimeout(t); sec.removeEventListener('click', onClick); sec.removeEventListener('focusin', onFocusIn); sec.removeEventListener('pointerover', onOver); },
  };
}

/* ---------- Canvas input in showroom mode ---------- */
function bindCanvasInput() {
  const el = stage.renderer.domElement;
  let d = null;
  el.addEventListener('pointerdown', (e) => {
    if (mode !== 'showroom' || busy) return;
    d = { x: e.clientX, y: e.clientY, last: e.clientX, t: performance.now(), v: 0, moved: 0 };
    el.setPointerCapture(e.pointerId);
    const g = stage.pick(e.offsetX, e.offsetY, rail.groups());
    if (g && g.userData.index === rail.index) prefetch(`/articles/${articles[rail.index].slug}.html`).catch(() => {});
  });
  el.addEventListener('pointermove', (e) => {
    if (!d || mode !== 'showroom') return;
    const dx = e.clientX - d.last;
    d.last = e.clientX;
    d.moved = Math.max(d.moved, Math.abs(e.clientX - d.x));
    if (d.moved < 6) return;
    stageEl.classList.add('is-dragging');
    const pxPerUnit = Math.max(160, stage.size.w * (stage.size.w < 720 ? 0.55 : 0.3));
    const now = performance.now();
    d.v = (-dx / pxPerUnit) / Math.max(1, now - d.t) * 1000;
    d.t = now;
    rail.nudge(-dx / pxPerUnit);
  });
  const end = (e) => {
    if (!d || mode !== 'showroom') { d = null; return; }
    stageEl.classList.remove('is-dragging');
    if (d.moved < 6 && e.type === 'pointerup') {
      const g = stage.pick(e.offsetX, e.offsetY, rail.groups());
      if (g) {
        const i = g.userData.index;
        if (i === rail.index) go(`/articles/${articles[i].slug}.html`, { push: true });
        else rail.goTo(i);
      }
    } else rail.settle(Math.max(-6, Math.min(6, d.v)));
    d = null;
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  let wheelT;
  stageEl.addEventListener('wheel', (e) => {
    if (mode !== 'showroom' || busy || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    rail.nudge(e.deltaX / 400);
    clearTimeout(wheelT);
    wheelT = setTimeout(() => rail.settle(0), 140);
  }, { passive: false });
  el.addEventListener('pointermove', (e) => {
    if (mode !== 'showroom' || d) return;
    const g = stage.pick(e.offsetX, e.offsetY, rail.groups());
    el.style.cursor = g ? 'pointer' : '';
  });
}

/* ---------- Modes ---------- */
function enterShowroom(main, { first = false } = {}) {
  mode = 'showroom';
  rail.setActive(true);
  showroomDom = bindShowroom(main);
  placeStage(slotRect());
  rail.applyCamera();
  if (first && !reducedMotion()) {
    rail.state.drop = 0.35;
    rail.update();
    gsap.to(rail.state, { drop: 0, duration: 0.9, ease: 'bounce.out', delay: 0.15, onUpdate: () => rail.update() });
  }
}
function leaveShowroom() { showroomDom?.unbind(); showroomDom = null; }

function enterArticle(main, slug) {
  mode = 'article';
  const entry = articles[indexOf(slug)];
  main.querySelectorAll('.hero-still').forEach((img) => img.classList.add('is-covered'));
  viewer = mountViewer(stage, heroShoe, entry, main);
  viewer.place();
}

/** Detaches rail shoe i into the scene so the rail can be hidden while it stays. */
function takeShoe(i) {
  rail.ensure(i);
  const g = rail.shoes[i];
  g.userData.detached = true;
  stage.scene.attach(g);
  g.visible = true;
  return g;
}
function returnShoe(g) {
  if (!g) return;
  g.userData.detached = false;
  rail.root.attach(g);
}

/* ---------- Transitions ---------- */
function killFlight() { if (tl) { tl.progress(1); tl = null; } }

async function flyToArticle(slug, path, { push }) {
  const page = await prefetch(path);
  busy = true;
  const reduce = reducedMotion();
  const i = indexOf(slug);
  const entry = articles[i];
  if (rail.index !== i) rail.goTo(i, { instant: true });
  const fromRect = stageRect();
  showroomDom?.sec.classList.add('is-leaving');
  const camFrom = stage.camera.position.clone();
  const tgtFrom = new THREE.Vector3(); stage.camera.getWorldDirection(tgtFrom); tgtFrom.multiplyScalar(4).add(camFrom);
  const others = rail.groups().filter((g) => g.userData.index !== i);
  const shoe = takeShoe(i);
  heroShoe = shoe;

  await new Promise((r) => setTimeout(r, reduce ? 0 : 200));
  leaveShowroom();
  window.scrollTo(0, 0);
  const main = swapIn(page);
  main.classList.add('is-entering');
  if (push) history.pushState({}, '', path);
  current = routeOf(location.href);
  const toRect = slotRect();
  placeStage(fromRect);

  const yawFrom = shoe.rotation.y, yawTo = entry.view.yaw * Math.PI / 180;
  const o = { p: 0 };
  tl = gsap.timeline({ onComplete: done });
  others.forEach((g) => {
    const dir = Math.sign(g.userData.index - i);
    tl.to(g.position, { x: g.position.x + dir * 2.4, duration: reduce ? 0.01 : 0.6, ease: 'power2.in' }, 0);
    tl.to(g.scale, { x: 0.01, y: 0.01, z: 0.01, duration: reduce ? 0.01 : 0.6, ease: 'power2.in' }, 0);
  });
  tweenTint(entry.category ? TINTS[entry.category] : STUDIO, reduce ? 0.2 : 0.7, tl, 0);
  tl.to(o, {
    p: 1, duration: reduce ? 0.2 : 0.9, ease: 'power3.inOut',
    onUpdate() {
      const e = o.p;
      placeStage({ x: lerp(fromRect.x, toRect.x, e), y: lerp(fromRect.y, toRect.y, e), w: lerp(fromRect.w, toRect.w, e), h: lerp(fromRect.h, toRect.h, e) });
      shoe.rotation.y = lerp(yawFrom, yawTo, e);
      shoe.scale.setScalar(1);
      shoe.position.set(i * SPACING, 0, 0);
      const pose = heroPose(stage, shoe, entry);
      stage.followLight(shoe.position.x);
      stage.camera.position.lerpVectors(camFrom, pose.position, e);
      stage.camera.lookAt(new THREE.Vector3().lerpVectors(tgtFrom, pose.target, e));
      stage.requestRender();
    },
  }, 0);

  function done() {
    tl = null;
    rail.setActive(false);
    others.forEach((g) => { g.scale.setScalar(1); });
    busy = false;
    enterArticle(main, slug);
    main.classList.remove('is-entering');
    main.querySelectorAll('.article-title, .back-link').forEach((el) => el.classList.add('enter-up'));
    setTimeout(() => main.querySelectorAll('.article-body, .related').forEach((el) => el.classList.add('enter-up')), reduce ? 0 : 120);
    setTimeout(() => viewer?.showPins(), reduce ? 0 : 300);
    const h1 = main.querySelector('h1');
    if (h1) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); }
    sync();
  }
}

async function flyToShowroom(path, { push }) {
  const page = await prefetch(path);
  busy = true;
  const reduce = reducedMotion();
  const slug = current?.slug;
  const i = Math.max(0, indexOf(slug));
  viewer?.hidePins();
  viewer?.dispose();
  viewer = null;
  const fromRect = stageRect();
  const camFrom = stage.camera.position.clone();
  const tgtFrom = new THREE.Vector3(); stage.camera.getWorldDirection(tgtFrom); tgtFrom.multiplyScalar(4).add(camFrom);
  const yawFrom = heroShoe.rotation.y;
  const main = swapIn(page);
  window.scrollTo(0, 0);
  if (push) history.pushState({}, '', path);
  current = routeOf(location.href);
  const sec = main.querySelector('.showroom');
  sec.classList.add('is-leaving');
  const toRect = slotRect();
  placeStage(fromRect);

  // Put the hero back into the rail and lay the rail out at the target state.
  returnShoe(heroShoe);
  rail.state.pos = i; rail.state.focus = i; rail.state.spin = 0;
  rail.setActive(true);
  rail.update();
  const others = rail.groups().filter((g) => g.userData.index !== i);
  const targets = others.map((g) => ({ g, x: g.position.x, s: g.scale.x }));
  const shoe = rail.shoes[i];
  const yawTo = shoe.rotation.y;
  targets.forEach(({ g, x }) => { g.position.x = x + Math.sign(g.userData.index - i) * 2.4; g.scale.setScalar(0.01); });
  shoe.rotation.y = yawFrom;
  placeStage(fromRect);

  const o = { p: 0 };
  tl = gsap.timeline({ onComplete: done });
  targets.forEach(({ g, x, s }) => {
    tl.to(g.position, { x, duration: reduce ? 0.01 : 0.7, ease: 'power3.out' }, reduce ? 0 : 0.25);
    tl.to(g.scale, { x: s, y: s, z: s, duration: reduce ? 0.01 : 0.7, ease: 'power3.out' }, reduce ? 0 : 0.25);
  });
  tweenTint(STUDIO, reduce ? 0.2 : 0.7, tl, 0);
  tl.to(o, {
    p: 1, duration: reduce ? 0.2 : 0.9, ease: 'power3.inOut',
    onUpdate() {
      const e = o.p;
      placeStage({ x: lerp(fromRect.x, toRect.x, e), y: lerp(fromRect.y, toRect.y, e), w: lerp(fromRect.w, toRect.w, e), h: lerp(fromRect.h, toRect.h, e) });
      shoe.rotation.y = lerp(yawFrom, yawTo, e);
      const pose = rail.cameraPose(stage.size.w < 720 ? 0.7 : 0.36, stage.size.w < 720 ? 0.6 : 0.64);
      stage.camera.position.lerpVectors(camFrom, pose.position, e);
      stage.camera.lookAt(new THREE.Vector3().lerpVectors(tgtFrom, pose.target, e));
      stage.requestRender();
    },
  }, 0);

  function done() {
    tl = null;
    busy = false;
    heroShoe = null;
    enterShowroom(main);
    rail.update();
    sec.classList.remove('is-leaving');
    sync();
    main.querySelector(`[data-rail="${articles[i].slug}"]`)?.focus({ preventScroll: true });
  }
}

async function swapArticle(slug, path, { push }) {
  const page = await prefetch(path);
  busy = true;
  const reduce = reducedMotion();
  const i = indexOf(slug);
  const entry = articles[i];
  viewer?.hidePins(); viewer?.dispose(); viewer = null;
  const old = heroShoe;
  const t = gsap.timeline();
  t.to(old.scale, { x: 0.01, y: 0.01, z: 0.01, duration: reduce ? 0.01 : 0.35, ease: 'power2.in' }, 0);
  t.to(old.rotation, { y: old.rotation.y - 1.2, duration: reduce ? 0.01 : 0.35, ease: 'power2.in' }, 0);
  await finished(t);
  returnShoe(old); old.scale.setScalar(1);
  window.scrollTo(0, 0);
  const main = swapIn(page);
  if (push) history.pushState({}, '', path);
  current = routeOf(location.href);
  placeStage(slotRect());
  heroShoe = takeShoe(i);
  heroShoe.position.set(i * SPACING, 0, 0);
  heroShoe.scale.setScalar(0.01);
  const yawTo = entry.view.yaw * Math.PI / 180;
  heroShoe.rotation.y = yawTo + 1.2;
  const pose = heroPose(stage, heroShoe, entry);
  stage.camera.position.copy(pose.position); stage.camera.lookAt(pose.target);
  const t2 = gsap.timeline();
  tweenTint(TINTS[entry.category], reduce ? 0.2 : 0.5, t2, 0);
  t2.to(heroShoe.scale, { x: 1, y: 1, z: 1, duration: reduce ? 0.01 : 0.55, ease: 'power3.out', onUpdate: () => stage.requestRender() }, 0.05);
  t2.to(heroShoe.rotation, { y: yawTo, duration: reduce ? 0.01 : 0.55, ease: 'power3.out' }, 0.05);
  main.querySelectorAll('.article-title, .back-link, .article-body').forEach((el) => el.classList.add('enter-up'));
  await finished(t2);
  busy = false;
  enterArticle(main, slug);
  viewer.showPins();
  main.querySelector('h1')?.focus?.({ preventScroll: true });
  sync();
}

/* ---------- Router glue ---------- */
async function go(href, { push }) {
  const r = routeOf(href);
  if (!r) { location.href = href; return; }
  if (busy) { killFlight(); return; }
  try {
    if (r.type === 'article' && mode === 'showroom') await flyToArticle(r.slug, r.path, { push });
    else if (r.type === 'article' && mode === 'article') {
      if (r.slug === current?.slug) return;
      await swapArticle(r.slug, r.path, { push });
    } else if (r.type === 'showroom' && mode === 'article') await flyToShowroom(r.path, { push });
    else if (push) location.href = href;
  } catch (err) {
    console.warn('Route failed, loading normally', err);
    location.href = href;
  }
}

function interceptLinks() {
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    const r = routeOf(a.href);
    if (!r) return;
    if (r.type === 'showroom' && mode === 'showroom') return;
    e.preventDefault();
    go(a.href, { push: true });
  });
  window.addEventListener('popstate', () => {
    const r = routeOf(location.href);
    if (!r) { location.reload(); return; }
    if (busy) killFlight();
    go(location.href, { push: false });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && tl) { tl.timeScale(4); return; }
    if (mode !== 'showroom' || busy) return;
    if (e.target.closest('input, textarea, select')) return;
    if (e.key === 'ArrowRight') { rail.step(1); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { rail.step(-1); e.preventDefault(); }
  });
}

/* ---------- Boot ---------- */
export function start(opts) {
  tier = opts.tier;
  stageEl = document.getElementById('stage');
  stage = createStage(stageEl, { tier });
  seedCurrent();
  current = routeOf(location.href);
  const main = document.getElementById('main');
  const startSlug = current?.type === 'article' ? current.slug : 'chelsea-boots';
  rail = createRail(stage, articles, { startIndex: Math.max(0, indexOf(startSlug)), quality: tier === 'light' ? 'low' : 'high' });
  bindCanvasInput();
  interceptLinks();
  history.scrollRestoration = 'manual';

  if (current?.type === 'article') {
    const i = indexOf(current.slug);
    rail.setActive(false);
    heroShoe = takeShoe(i);
    heroShoe.position.set(i * SPACING, 0, 0);
    heroShoe.rotation.y = articles[i].view.yaw * Math.PI / 180;
    setTint(TINTS[articles[i].category]);
    placeStage(slotRect());
    enterArticle(main, current.slug);
    setTimeout(() => viewer?.showPins(), 450);
  } else {
    setTint(STUDIO);
    enterShowroom(main, { first: true });
  }

  window.addEventListener('resize', () => sync());
  new ResizeObserver(() => sync()).observe(document.getElementById('main'));
  document.fonts?.ready.then(() => sync());
  document.addEventListener('soleora:theme', () => { stage.setTint(tintHex); });

  const first = current?.type === 'article' ? heroShoe : rail.focusedGroup();
  Promise.race([first?.userData.ready || Promise.resolve(), new Promise((r) => setTimeout(r, 6000))]).then(() => requestAnimationFrame(() => {
    stage.renderNow();
    stageEl.classList.add('is-ready');
    document.querySelectorAll('.hero-still').forEach((img) => img.classList.add('is-covered'));
    window.__soleora.ready = true;
    window.__soleora.debug = { go, get mode() { return mode; }, get busy() { return busy; }, get focus() { return rail.index; }, stageRect, slotRect };
  }));
}
