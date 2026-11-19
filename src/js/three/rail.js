// The showroom rail: 18 shoes in a line; the focused one turns to its 3/4 view.
import * as THREE from 'three';
import { gsap } from 'gsap';
import { frameObject } from './stage.js';

export const SPACING = 1.3;
const D2R = Math.PI / 180;

/** Scale for a shoe `d` places away from the focus (continuous). */
export function railScale(d) {
  const a = Math.abs(d);
  if (a <= 1) return 1 - 0.45 * a;
  if (a <= 2) return 0.55 - 0.17 * (a - 1);
  return Math.max(0.3, 0.38 - 0.08 * (a - 2));
}

export function createRail(stage, entries, { startIndex = 0, quality = 'high' } = {}) {
  const shoes = new Array(entries.length).fill(null);
  const state = { pos: startIndex, focus: startIndex, active: true, spin: 0, drop: 0 };
  const listeners = new Set();
  const root = new THREE.Group();
  stage.scene.add(root);

  function ensure(i) {
    if (i < 0 || i >= entries.length || shoes[i]) return;
    const g = stage.addShoe(entries[i].slug, quality);
    stage.scene.remove(g);
    root.add(g);
    g.userData.index = i;
    shoes[i] = g;
  }
  // Neighbours are built one per idle slot so the first frame is never blocked.
  const queue = new Set();
  let pumping = false;
  const idle = window.requestIdleCallback || ((f) => setTimeout(f, 16));
  function pump() {
    pumping = true;
    idle(() => {
      const next = [...queue].sort((a, b) => Math.abs(a - state.pos) - Math.abs(b - state.pos))[0];
      if (next !== undefined) { queue.delete(next); ensure(next); layout(); stage.requestRender(); }
      if (queue.size) pump(); else pumping = false;
    });
  }
  function ensureNear(r = 2) {
    const c = Math.round(state.pos);
    ensure(Math.max(0, Math.min(entries.length - 1, c)));
    for (let k = -r; k <= r; k++) { const i = c + k; if (i >= 0 && i < entries.length && !shoes[i]) queue.add(i); }
    if (queue.size && !pumping) pump();
  }

  /** Lays every shoe out from the continuous rail position. */
  function layout() {
    for (let i = 0; i < shoes.length; i++) {
      const g = shoes[i];
      if (!g || g.userData.detached) continue;
      const d = i - state.pos;
      const vis = Math.abs(d) < 3.2;
      g.visible = vis && state.active;
      if (!vis) continue;
      const s = railScale(d);
      g.scale.setScalar(s);
      g.position.set(i * SPACING, i === state.focus ? state.drop : 0, 0);
      const closeness = Math.max(0, 1 - Math.abs(d));
      const e = closeness * closeness * (3 - 2 * closeness);
      const yaw = entries[i].view.yaw * D2R;
      g.rotation.set(0, e * yaw + (i === state.focus ? state.spin * e : 0), 0);
    }
  }

  const tmp = {};
  function cameraPose(fill = 0.42, baseAt = 0.62) {
    const i = Math.round(state.pos);
    const proxy = { position: new THREE.Vector3(state.pos * SPACING, 0, 0), userData: shoes[i]?.userData || {} };
    return frameObject(stage, proxy, { fill, baseAt, yaw: entries[i].view.yaw, pitch: entries[i].view.pitch, out: tmp });
  }
  function applyCamera() {
    const p = cameraPose(stage.size.w < 720 ? 0.66 : 0.36, stage.size.w < 720 ? 0.56 : 0.64);
    stage.followLight(p.target.x);
    stage.camera.position.copy(p.position);
    stage.camera.lookAt(p.target);
  }

  function update() { if (!state.active) return; ensureNear(); layout(); applyCamera(); stage.requestRender(); }

  let tween = null;
  function goTo(i, { instant = false } = {}) {
    i = Math.max(0, Math.min(entries.length - 1, i));
    const changed = i !== state.focus;
    state.focus = i;
    state.spin = 0;
    tween?.kill();
    if (instant) { state.pos = i; update(); } else {
      tween = gsap.to(state, { pos: i, duration: 0.6, ease: 'power3.out', onUpdate: update });
    }
    if (changed) listeners.forEach((f) => f(i));
  }

  ensure(startIndex);
  update();

  return {
    get index() { return state.focus; },
    get pos() { return state.pos; },
    entries, shoes, state,
    focusedGroup() { return shoes[state.focus]; },
    ensure,
    groups() { return shoes.filter(Boolean).filter((g) => g.visible); },
    goTo,
    step(d) { goTo(state.focus + d); },
    /** Drag: move the rail continuously by `du` units. */
    nudge(du) { tween?.kill(); state.pos = Math.max(-0.4, Math.min(entries.length - 0.6, state.pos + du)); update(); },
    settle(velocity = 0) { goTo(Math.round(state.pos - velocity * 0.25)); },
    spinBy(rad) { state.spin += rad; update(); },
    onFocus(f) { listeners.add(f); return () => listeners.delete(f); },
    setActive(v) { state.active = v; root.visible = v; if (v) update(); stage.requestRender(); },
    update, cameraPose, applyCamera, root,
  };
}
