// Article hero viewer: one shoe, drag/buttons to turn it, hotspot pins linked to Key features.
import * as THREE from 'three';
import { gsap } from 'gsap';
import { frameObject } from './stage.js';

const D2R = Math.PI / 180;

export function heroPose(stage, shoe, entry) {
  const narrow = stage.size.w < 600;
  return frameObject(stage, shoe, { fill: narrow ? 0.72 : 0.7, baseAt: 0.82, yaw: entry.view.yaw, pitch: entry.view.pitch + 4, out: {} });
}

/**
 * mountViewer(stage, shoe, entry, mainEl) -> { dispose, showPins(), hidePins() }
 * `shoe` is a group already in the scene; this takes control of its rotation and the camera.
 */
export function mountViewer(stage, shoe, entry, mainEl, { animatePins = true } = {}) {
  const pinsEl = document.getElementById('pins');
  const state = { yaw: shoe.rotation.y, follow: true };
  const anchors = shoe.userData.anchors || {};
  const pins = entry.hotspots.map((h) => {
    const b = document.createElement('button');
    b.className = 'pin is-hidden';
    b.type = 'button';
    b.innerHTML = `${h.n}<span class="tip">${h.label}</span>`;
    b.setAttribute('aria-label', `${h.n}: ${h.label}`);
    b.dataset.n = h.n;
    pinsEl.appendChild(b);
    return { h, el: b, local: anchors[h.anchor]?.clone() || new THREE.Vector3(), shown: false };
  });
  let pinsOn = false;
  const center = new THREE.Vector3();
  const ray = new THREE.Raycaster();
  const world = new THREE.Vector3();

  function place() {
    if (!state.follow) return;
    const p = heroPose(stage, shoe, entry);
    stage.followLight(shoe.position.x);
    stage.camera.position.copy(p.position);
    stage.camera.lookAt(p.target);
  }

  const offFrame = stage.onFrame(() => {
    shoe.rotation.y = state.yaw;
    shoe.updateMatrixWorld(true);
    center.set(0, (shoe.userData.height || 0.3) * 0.45, 0);
    shoe.localToWorld(center);
    for (const p of pins) {
      world.copy(p.local);
      shoe.localToWorld(world);
      const s = stage.project(world);
      // Visible if nothing on the shoe sits between the camera and the anchor.
      const dir = world.clone().sub(stage.camera.position);
      const dist = dir.length();
      ray.set(stage.camera.position, dir.normalize());
      ray.far = dist;
      const hit = ray.intersectObject(shoe, true)[0];
      const facing = !hit || hit.distance > dist - 0.03;
      p.el.style.transform = `translate(${s.x}px, ${s.y}px)`;
      p.el.classList.toggle('is-hidden', !(pinsOn && facing && s.visible));
    }
  });

  // Drag to rotate.
  const el = stage.renderer.domElement;
  let drag = null;
  const down = (e) => { drag = { x: e.clientX, yaw: state.yaw, moved: 0 }; el.setPointerCapture(e.pointerId); stage.requestRender(); };
  const move = (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    drag.moved = Math.max(drag.moved, Math.abs(dx));
    state.yaw = drag.yaw + dx * 0.008;
    stage.requestRender();
  };
  const up = () => { drag = null; };
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);

  const turnTo = (yaw) => gsap.to(state, { yaw, duration: 0.7, ease: 'power3.inOut', onUpdate: () => stage.requestRender() });

  const onTools = (e) => {
    const b = e.target.closest('[data-rotate]');
    if (b) turnTo(state.yaw + Number(b.dataset.rotate) * 30 * D2R);
  };
  mainEl.addEventListener('click', onTools);

  function activate(n, { scroll = false, turn = false } = {}) {
    pins.forEach((p) => p.el.classList.toggle('is-active', p.h.n === n));
    mainEl.querySelectorAll('[data-hotspot]').forEach((li) => li.classList.toggle('is-active', Number(li.dataset.hotspot) === n));
    const p = pins.find((x) => x.h.n === n);
    if (turn && p) {
      // Turn so the anchor faces the camera, keeping a slight 3/4 angle.
      const target = Math.atan2(-p.local.x, p.local.z) - 0.35;
      let d = target - state.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      turnTo(state.yaw + d);
    }
    if (scroll) mainEl.querySelector(`[data-hotspot="${n}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  const onPin = (e) => { const b = e.target.closest('.pin'); if (b) activate(Number(b.dataset.n), { scroll: true, turn: true }); };
  pinsEl.addEventListener('click', onPin);
  const onLiEnter = (e) => { const li = e.target.closest('[data-hotspot]'); if (li) activate(Number(li.dataset.hotspot), { turn: true }); };
  const onLiLeave = (e) => { if (e.target.closest('[data-hotspot]')) activate(0); };
  mainEl.addEventListener('mouseover', onLiEnter);
  mainEl.addEventListener('focusin', onLiEnter);
  mainEl.addEventListener('mouseout', onLiLeave);

  return {
    state,
    place,
    showPins() {
      pinsOn = true;
      if (animatePins) pins.forEach((p, i) => { p.el.style.transitionDelay = `${i * 60}ms`; setTimeout(() => { p.el.style.transitionDelay = ''; }, 600); });
      stage.requestRender();
    },
    hidePins() { pinsOn = false; stage.requestRender(); },
    dispose() {
      offFrame();
      pins.forEach((p) => p.el.remove());
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      pinsEl.removeEventListener('click', onPin);
      mainEl.removeEventListener('click', onTools);
      mainEl.removeEventListener('mouseover', onLiEnter);
      mainEl.removeEventListener('focusin', onLiEnter);
      mainEl.removeEventListener('mouseout', onLiLeave);
    },
  };
}
