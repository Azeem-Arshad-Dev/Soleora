// Assembles a complete shoe from its spec. buildShoe(slug) -> { group, anchors }
import * as THREE from 'three';
import { SHOE_SPECS } from './specs.js';
import { material, lighten } from './materials.js';
import {
  makeLast, upperSide, upperPoint, onUpper, upperNormal, thetaCut, throatT, topBand,
  slab, tube, toplinePoints, smoothstep, lerp, clamp,
} from './geometry.js';

const PI2 = Math.PI / 2;
const C = (hex) => new THREE.Color(hex);

function darken(hex, k) { return C(hex).lerp(C('#000000'), k); }

function painter(spec, last) {
  const u = spec.upper;
  if (!u || !u.paint) return null;
  const pc = C(u.paintColor || '#000000');
  const accent = C('#2F5D8A');
  // Soft-edged regions: inside(d) where d < 0 is inside, blended over `e`.
  const soft = (d, e = 0.006) => 1 - smoothstep(-e, e, d);
  const out = (color, k) => (k > 0.001 ? { color, k } : null);
  return (t, y, th) => {
    const rel = y - last.base(t);
    switch (u.paint) {
      case 'runner': {
        const heel = soft(Math.max(t - 0.2 - rel * 0.25, rel - 0.2), 0.004);
        const toe = soft(Math.max(0.86 - t, rel - 0.06), 0.004);
        return out(accent, Math.max(heel, toe));
      }
      case 'counter': return out(pc, Math.max(soft(Math.max(t - 0.22, rel - 0.3)), soft(0.86 - t)));
      case 'bumper': return out(pc, Math.max(soft(Math.max(0.8 - t, rel - 0.08)), soft(rel - 0.03, 0.004)));
      case 'elastic': return t < 0.45 ? out(pc, soft(Math.abs(t - 0.3) - ((rel - 0.2) * 0.13 + 0.004), 0.004) * soft(0.2 - rel, 0.004)) : null;
      case 'toecap': return out(pc, soft(0.82 - t, 0.003));
      default: return null;
    }
  };
}

/** Builds one shoe. quality 'high' for heroes/focus, 'low' for rail neighbours. */
export function buildShoe(slug, { quality = 'high' } = {}) {
  const spec = SHOE_SPECS[slug];
  if (!spec) throw new Error(`Unknown shoe: ${slug}`);
  const last = makeLast(spec);
  const group = new THREE.Group();
  group.name = slug;
  const hi = quality === 'high';
  const segT = hi ? 128 : 64, segA = hi ? 64 : 24;
  const anchors = {};
  const parts = {};
  const add = (geo, mat, name) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; if (name) m.name = name; group.add(m); return m; };

  // ---- Sole layers (stacked), with a lip that hides the upper-to-sole joint.
  const layers = spec.sole.layers.slice();
  if (spec.stripe) layers.splice(1, 0, { kind: 'rubber', color: spec.stripe.color, frac: 0.08 });
  const total = layers.reduce((s, l) => s + l.frac, 0);
  let acc = 0;
  layers.forEach((layer, i) => {
    const f0 = acc / total, f1 = (acc + layer.frac) / total;
    acc += layer.frac;
    const isTop = i === layers.length - 1;
    const lip = isTop ? (spec.sole.lip ?? 0.012) : 0;
    const geo = slab(last, {
      bottom: (t) => last.lift(t) + last.soleThick(t) * f0,
      top: (t) => last.lift(t) + last.soleThick(t) * f1 + lip,
      grow: isTop ? 0.004 : 0.002, bevel: hi ? 0.005 : 0,
    });
    add(geo, material(layer.kind, layer.color), `sole-${i}`);
  });

  // ---- Heel block.
  const heelH = spec.last.heelHeight ?? 0;
  if (heelH > 0.015 && spec.heel !== false) {
    const h = spec.heel || { kind: 'rubber', color: '#2A1E17' };
    const len = h.len ?? spec.last.heelLen ?? 0.25;
    const tCenter = len * 0.45;
    const geo = slab(last, {
      ta: 0.004, tb: len, bottom: () => 0, top: (t) => last.lift(t) + 0.004, bevel: hi ? 0.004 : 0,
      taper: h.taper ?? 0.94, taperAt: new THREE.Vector2(tCenter - 0.5, 0),
    });
    add(geo, material(h.kind || 'calf', h.color || '#2A1E17'), 'heel');
    anchors.heelBlock = new THREE.Vector3(tCenter - 0.5, heelH * 0.45, last.width(tCenter) * (h.taper ? 0.5 + h.taper * 0.4 : 0.9));
  }

  // ---- Upper.
  const u = spec.upper;
  const throat = throatT(last);
  if (u) {
    const paint = painter(spec, last);
    const upMat = material(u.kind, u.color, { vertexColors: true });
    const linColor = ['knit', 'canvas'].includes(u.kind) ? '#DAD7D0' : '#A38B6D';
    for (const side of [-1, 1]) {
      const g = upperSide(last, side, { segT, segA, base: u.color, paint });
      add(g, upMat, `upper-${side}`);
      add(g, material('lining', linColor), `lining-${side}`);
    }
    // Rolled collar binding along the opening.
    if (throat > 0.02) {
      const r = spec.collarPad ? 0.013 : 0.0055;
      const col = spec.collarPad ? spec.collarPad.color : (spec.piping ? spec.piping.color : darken(u.color, 0.12).getStyle());
      add(tube(toplinePoints(last, throat, hi ? 40 : 16, r * 0.3), r, false, hi ? 10 : 6), material(u.kind === 'patent' ? 'patent' : 'calf', col), 'collar');
    }
  } else {
    // Sandals: a contoured footbed is part of the sole; straps come below.
  }

  // ---- Tongue.
  if (spec.tongue && spec.last.lace) {
    const { from, to } = spec.last.lace;
    const t0 = from - 0.08;
    const geo = topBand(last, {
      t0, t1: to + 0.015, grow: -0.003, segT: hi ? 24 : 10, segA: hi ? 40 : 16, thetaFrom: 0.42,
      raise: (t) => 0.022 * Math.pow(1 - smoothstep(t0, t0 + 0.12, t), 2),
    });
    const m = material(u?.kind === 'polished' ? 'calf' : (u?.kind || 'calf'), spec.tongue.color).clone();
    m.side = THREE.DoubleSide;
    add(geo, m, 'tongue');
  }

  // ---- Laces and eyelets.
  if (spec.laces) {
    const L = spec.laces;
    const lm = material('lace', L.color);
    const em = material('metal', '#3A3632');
    const ptsL = [], ptsR = [];
    for (let i = 0; i < L.pairs; i++) {
      const t = L.pairs === 1 ? L.from : lerp(L.from, L.to, i / (L.pairs - 1));
      const th = Math.max(0.3, thetaCut(last, t) - 0.06);
      ptsL.push(onUpper(last, t, th, -1, 0.007));
      ptsR.push(onUpper(last, t, th, 1, 0.007));
    }
    const eyelet = new THREE.TorusGeometry(0.0075, 0.0026, 6, hi ? 14 : 8);
    [...ptsL, ...ptsR].forEach((p, k) => {
      const side = k < ptsL.length ? -1 : 1;
      const i = k % ptsL.length;
      const t = L.pairs === 1 ? L.from : lerp(L.from, L.to, i / (L.pairs - 1));
      const n = upperNormal(last, t, Math.max(0.3, thetaCut(last, t) - 0.06), side);
      const m = new THREE.Mesh(eyelet, em);
      m.position.copy(p).addScaledVector(n, -0.002);
      m.lookAt(p.clone().add(n));
      group.add(m);
    });
    const bar = (a, b) => {
      const mid = a.clone().add(b).multiplyScalar(0.5);
      mid.y += 0.006 + a.distanceTo(b) * 0.06;
      return tube([a, mid, b], 0.0042, false, 6);
    };
    for (let i = 0; i < L.pairs; i++) {
      if (L.style === 'cross' && i < L.pairs - 1) {
        add(bar(ptsL[i], ptsR[i + 1]), lm);
        add(bar(ptsR[i], ptsL[i + 1]), lm);
      } else {
        add(bar(ptsL[i], ptsR[i]), lm);
      }
    }
    if (L.style === 'cross') add(bar(ptsL[L.pairs - 1], ptsR[L.pairs - 1]), lm);
    // Bow at the top pair.
    const top = ptsL[0].clone().add(ptsR[0]).multiplyScalar(0.5);
    top.y += 0.012;
    const loop = new THREE.TorusGeometry(0.022, 0.0032, 6, hi ? 20 : 10);
    for (const s of [-1, 1]) {
      const m = new THREE.Mesh(loop, lm);
      m.position.copy(top).add(new THREE.Vector3(-0.004, 0.006, s * 0.022));
      m.rotation.set(0, 0, 0);
      m.rotateY(Math.PI / 2);
      m.rotateX(s * 0.5);
      m.scale.set(1, 0.55, 1);
      group.add(m);
      add(tube([top.clone(), top.clone().add(new THREE.Vector3(-0.02, -0.02, s * 0.03)), top.clone().add(new THREE.Vector3(-0.03, -0.055, s * 0.05))], 0.003, false, 6), lm);
    }
    const mid = Math.round((L.pairs - 1) * 0.5);
    anchors.laces = ptsL[mid].clone().add(ptsR[mid]).multiplyScalar(0.5).add(new THREE.Vector3(0, 0.012, 0));
    parts.lacePoints = { ptsL, ptsR };
  }

  // ---- Seams (stitched lines) and perforations.
  const stitchMat = u ? material('stitch', lighten(u.color, 0.15).getStyle()) : null;
  const perfMat = u ? material('stitch', darken(u.color, 0.55).getStyle()) : null;
  const perfGeo = new THREE.SphereGeometry(0.0034, 6, 4);
  const perfPts = [];
  const sidePt = (t, thp, side, lift = 0.0025) => onUpper(last, clamp(t, 0.005, 0.995), thp, side, lift);
  for (const s of spec.seams || []) {
    const pts = [];
    if (s.type === 'cap' || s.type === 'wing') {
      const depth = s.type === 'wing' ? s.depth : 0.03;
      const n = 28;
      for (let i = 0; i <= n; i++) {
        const k = i / n; // medial bottom -> top -> lateral bottom
        const side = k < 0.5 ? -1 : 1;
        const thp = lerp(0.12, PI2, k < 0.5 ? k * 2 : (1 - k) * 2);
        const t = s.t - depth * Math.pow(1 - Math.sin(thp), s.type === 'wing' ? 1.1 : 2);
        pts.push(sidePt(t, Math.min(thp, PI2 - 0.0001), side));
        if (s.perforate) perfPts.push([t - 0.014, thp, side]);
      }
      add(tube(pts, 0.0025, false, 5), stitchMat);
    } else if (s.type === 'quarter') {
      for (const side of [-1, 1]) {
        const p = [];
        for (let i = 0; i <= 10; i++) {
          const k = i / 10;
          const t = s.t - 0.1 * k;
          const thp = lerp(Math.min(thetaCut(last, s.t) - 0.02, PI2 - 0.05), 0.12, k);
          p.push(sidePt(t, thp, side));
          if (s.perforate) perfPts.push([t + 0.014, thp, side]);
        }
        add(tube(p, 0.0025, false, 5), stitchMat);
      }
    } else if (s.type === 'apron') {
      const n = 30;
      for (let i = 0; i <= n; i++) {
        const phi = (i / n) * Math.PI;
        const t = s.from + (0.95 - s.from) * Math.sin(phi);
        const thp = lerp(s.theta, PI2 - 0.0001, Math.pow(Math.sin(phi), 3));
        pts.push(sidePt(t, thp, phi < PI2 ? -1 : 1, 0.005));
      }
      add(tube(pts, 0.0042, false, 6), stitchMat);
    }
  }
  if (spec.medallion) {
    for (let i = 0; i < 9; i++) {
      const a = (i / 8) * Math.PI;
      perfPts.push([0.9 - 0.03 * Math.sin(a), PI2 - 0.12 + 0.3 * Math.cos(a) * 0.4, i < 4 ? -1 : 1]);
    }
  }
  if (perfPts.length && hi) {
    const inst = new THREE.InstancedMesh(perfGeo, perfMat, perfPts.length);
    const m4 = new THREE.Matrix4();
    perfPts.forEach(([t, thp, side], i) => {
      m4.makeTranslation(sidePt(t, Math.min(thp, PI2 - 0.0001), side, 0.0005));
      inst.setMatrixAt(i, m4);
    });
    group.add(inst);
  }
  if (perfPts.length) anchors.broguing = sidePt(0.66, 0.75, 1, 0.01);

  // ---- Straps (monk, penny, sandal) and buckles.
  for (const s of spec.straps || []) {
    const geo = topBand(last, {
      t0: s.t0, t1: s.t1, grow: s.grow ?? 0.008, segT: 6, segA: hi ? 48 : 20,
      thetaFrom: s.from ?? 0.02, heightScale: s.scale ?? 1,
    });
    const m = material('calf', s.color).clone();
    m.side = THREE.DoubleSide;
    add(geo, m, 'strap');
    const tm = (s.t0 + s.t1) / 2;
    const H = (last.roof(tm) + (s.grow ?? 0.008)) * (s.scale ?? 1);
    anchors.strap = new THREE.Vector3(tm - 0.5, last.base(tm) + H + 0.006, 0);
    if (s.slot) {
      const slot = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.004, 0.05), material('calf', '#1A0F0A'));
      slot.position.copy(anchors.strap).add(new THREE.Vector3(0, 0.0005, 0));
      group.add(slot);
    }
  }
  if (spec.heelStrap) {
    const hs = spec.heelStrap;
    const thAt = (t, rel) => Math.asin(Math.pow(clamp(rel / last.roof(t), 0, 1), 1 / last.power));
    for (const side of [-1, 1]) {
      const g = upperSide(last, side, { segT: 30, segA: 4, t0: 0, t1: 0.32, base: '#ffffff', grow: 0.004, thetaMin: (t) => thAt(t, hs.y0), thetaMax: (t) => thAt(t, hs.y1) });
      const m = material('calf', hs.color).clone();
      m.side = THREE.DoubleSide;
      add(g, m, 'heel-strap');
    }
  }
  if (spec.buckle) {
    const b = spec.buckle;
    const p = onUpper(last, b.t, b.theta, b.side, spec.straps ? 0.016 : 0.009);
    const n = upperNormal(last, b.t, b.theta, b.side);
    const frame = new THREE.Mesh(new THREE.TorusGeometry(b.small ? 0.012 : 0.03, b.small ? 0.0025 : 0.0055, 6, 4), material('metal', '#B8B4AA'));
    frame.position.copy(p);
    frame.lookAt(p.clone().add(n));
    frame.rotateZ(Math.PI / 4);
    group.add(frame);
    anchors.buckle = p.clone().addScaledVector(n, 0.01);
  }

  // ---- Studs and lugs.
  if (spec.studs) {
    const geo = new THREE.CylinderGeometry(0.014, 0.02, 0.045, hi ? 14 : 8);
    const inst = new THREE.InstancedMesh(geo, material('rubber', spec.studs.color), spec.studs.points.length);
    const m4 = new THREE.Matrix4();
    spec.studs.points.forEach(([t, k], i) => {
      m4.makeTranslation(t - 0.5, last.lift(t) - 0.02, k * last.width(t));
      inst.setMatrixAt(i, m4);
    });
    inst.castShadow = true;
    group.add(inst);
    const [t3, k3] = spec.studs.points[3];
    anchors.studs = new THREE.Vector3(t3 - 0.5, last.lift(t3) - 0.03, k3 * last.width(t3) + 0.015);
  }
  if (spec.lugs) {
    const geo = new THREE.BoxGeometry(0.038, 0.02, 0.045);
    const cells = [];
    for (let t = 0.05; t < 0.97; t += 0.075) for (const k of [-0.62, -0.2, 0.2, 0.62]) cells.push([t, k]);
    const inst = new THREE.InstancedMesh(geo, material('rubber', spec.lugs.color), cells.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    cells.forEach(([t, k], i) => {
      e.set(0, (k > 0 ? 1 : -1) * 0.35, 0);
      q.setFromEuler(e);
      m4.compose(new THREE.Vector3(t - 0.5, last.lift(t) - 0.007, k * last.width(t)), q, new THREE.Vector3(1, 1, 1));
      inst.setMatrixAt(i, m4);
    });
    group.add(inst);
  }

  // ---- Small details.
  if (spec.pullTab) {
    const top = upperPoint(last, 0.002, thetaCut(last, 0.002), 1);
    const pts = [
      top.clone().add(new THREE.Vector3(0.012, -0.05, 0)),
      top.clone().add(new THREE.Vector3(-0.004, 0.02, 0)),
      top.clone().add(new THREE.Vector3(0.006, 0.065, 0)),
      top.clone().add(new THREE.Vector3(0.02, 0.022, 0)),
      top.clone().add(new THREE.Vector3(0.024, -0.04, 0)),
    ];
    const g = tube(pts, 0.006, false, 8);
    g.translate(0, 0, 0); g.scale(1, 1, 2.6);
    add(g, material('calf', spec.pullTab.color), 'pull-tab');
    anchors.pullTab = top.clone().add(new THREE.Vector3(-0.01, 0.05, 0));
  }
  if (spec.bow) {
    const tb = Math.max(0.05, throat - 0.005);
    const p = upperPoint(last, tb, PI2, 1);
    const bm = material('calf', spec.bow.color);
    for (const s of [-1, 1]) {
      const lobe = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), bm);
      lobe.scale.set(0.012, 0.009, 0.026);
      lobe.position.copy(p).add(new THREE.Vector3(0.004, 0.006, s * 0.024));
      lobe.rotation.x = s * 0.3;
      group.add(lobe);
    }
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.009, 12, 8), bm);
    knot.position.copy(p).add(new THREE.Vector3(0.004, 0.008, 0));
    group.add(knot);
    anchors.bow = knot.position.clone().add(new THREE.Vector3(0, 0.012, 0));
  }
  if (spec.zip) {
    const t = spec.zip.t;
    const tc = thetaCut(last, t);
    const pts = [];
    for (let i = 0; i <= 12; i++) pts.push(onUpper(last, t, lerp(0.14, tc - 0.02, i / 12), -1, 0.004));
    add(tube(pts, 0.004, false, 6), material('metal', spec.zip.color));
    anchors.zip = pts[8].clone().add(new THREE.Vector3(0, 0, -0.012));
  }

  // ---- Generic anchors from the spec.
  for (const [name, a] of Object.entries(spec.anchors || {})) {
    if (anchors[name] && !('t' in a) && !('sole' in a)) continue;
    if ('sole' in a) {
      const t = a.sole;
      anchors[name] = a.under
        ? new THREE.Vector3(t - 0.5, last.lift(t) - 0.02, last.width(t) * 0.75)
        : new THREE.Vector3(t - 0.5, last.lift(t) + last.soleThick(t) * 0.5, last.width(t) + 0.012);
    } else if ('t' in a) {
      let th = a.theta;
      if (th === 'top') th = Math.min(thetaCut(last, a.t), PI2) - 0.001;
      if (th === 'strap') { anchors[name] = anchors.strap.clone(); continue; }
      anchors[name] = onUpper(last, a.t, Math.min(th, thetaCut(last, a.t)), a.side, 0.012);
    } else if ('lace' in a && parts.lacePoints) {
      const { ptsL, ptsR } = parts.lacePoints;
      const i = Math.round(a.lace * (ptsL.length - 1));
      anchors[name] = ptsL[i].clone().add(ptsR[i]).multiplyScalar(0.5).add(new THREE.Vector3(0, 0.014, 0));
    }
  }
  if (!anchors.heel) anchors.heel = onUpper(last, 0.03, 0.6, 1, 0.012);

  // ---- Normalise: length 1 along x, sole on y = 0, centred on x and z.
  group.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(group);
  const size = box.getSize(new THREE.Vector3());
  const s = 1 / size.x;
  const cx = (box.min.x + box.max.x) / 2, cz = (box.min.z + box.max.z) / 2;
  const inner = new THREE.Group();
  while (group.children.length) inner.add(group.children[0]);
  inner.position.set(-cx * s, -box.min.y * s, -cz * s);
  inner.scale.setScalar(s);
  group.add(inner);
  for (const k of Object.keys(anchors)) {
    const v = anchors[k];
    anchors[k] = new THREE.Vector3((v.x - cx) * s, (v.y - box.min.y) * s, (v.z - cz) * s);
  }
  group.userData = { slug, height: size.y * s, width: size.z * s, anchors };
  return { group, anchors };
}
