// Low-level procedural geometry for Soleora shoes.
// Convention while building: x from -0.5 (heel) to +0.5 (toe), y up, z = width.
// t = x + 0.5 runs 0 (heel) -> 1 (toe). Everything is normalised later in build.js.
import * as THREE from 'three';

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const smoothstep = (a, b, v) => {
  const x = clamp((v - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
};
export const lerp = (a, b, k) => a + (b - a) * k;

/** 1D Catmull-Rom through [[t, v], ...]. Outside the range: clamp, or `after` past the end. */
export function curve(points, { after } = {}) {
  const pts = points.slice().sort((a, b) => a[0] - b[0]);
  return (t) => {
    if (t <= pts[0][0]) return pts[0][1];
    const last = pts[pts.length - 1];
    if (t >= last[0]) return after !== undefined ? after : last[1];
    let i = 0;
    while (i < pts.length - 2 && t > pts[i + 1][0]) i++;
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const k = (t - p1[0]) / (p2[0] - p1[0]);
    // Tangents scaled to segment length (non-uniform Catmull-Rom on values).
    const m1 = (p2[1] - p0[1]) / Math.max(1e-6, p2[0] - p0[0]) * (p2[0] - p1[0]);
    const m2 = (p3[1] - p1[1]) / Math.max(1e-6, p3[0] - p1[0]) * (p2[0] - p1[0]);
    const k2 = k * k, k3 = k2 * k;
    return (2 * k3 - 3 * k2 + 1) * p1[1] + (k3 - 2 * k2 + k) * m1 + (-2 * k3 + 3 * k2) * p2[1] + (k3 - k2) * m2;
  };
}

/**
 * Builds the shape functions of a last (the foot form a shoe is made on).
 * spec.last: { heelW, waistW, ballW, toeExp, heelExp, toeShift, roof:[[t,h]], topline:[[t,h]],
 *              heelHeight, heelLen, toeSpring, sole:{ thick:[[t,h]], inset } }
 */
export function makeLast(spec) {
  const L = spec.last;
  const baseW = curve([[0.0, L.heelW], [0.18, L.heelW * 1.03], [0.45, L.waistW], [0.7, L.ballW], [0.85, L.ballW * 0.93], [1.0, L.toeW ?? L.ballW * 0.55]]);
  const width = (t) => {
    const cap = t < 0.5 ? Math.pow(Math.sin(Math.PI * clamp(t, 0, 0.5)), L.heelExp ?? 0.35)
      : Math.pow(Math.sin(Math.PI * clamp(t, 0.5, 1)), L.toeExp ?? 0.45);
    return baseW(t) * cap;
  };
  const ramp = L.ballT ?? 0.62;
  const lift = (t) => (L.heelHeight ?? 0) * (1 - smoothstep((L.heelLen ?? 0.25) * 0.95, ramp, t))
    + (L.toeSpring ?? 0.02) * Math.pow(smoothstep(0.8, 1, t), 2);
  const soleThick = curve(L.soleThick ?? [[0, 0.035], [1, 0.03]]);
  const roof = curve(L.roof);
  const collar = curve(L.topline, { after: Infinity });
  // Laced shoes: in the lace region the opening is a narrow gap a fixed depth below the roof.
  const topline = !L.lace ? collar : (t) => {
    const { from, to, gap } = L.lace;
    if (t > to) return Infinity;
    const laceT = roof(t) - gap * (1 - smoothstep(to - 0.05, to, t)) - 0.0005;
    if (t >= from) return laceT;
    const c = Math.min(collar(t), roof(t) - 0.002);
    if (t < from - 0.16) return c;
    return lerp(c, laceT, smoothstep(from - 0.16, from + 0.02, t));
  };
  const base = (t) => lift(t) + soleThick(t) - 0.004;
  const inset = L.inset ?? 0.006;
  const power = L.boxiness ?? 0.55;
  return { width, lift, soleThick, roof, topline, base, inset, power, spec: L };
}

/** Angle where the upper's wall reaches the topline (PI/2 = closed over the top). */
export function thetaCut(last, t) {
  const H = last.roof(t), T = last.topline(t);
  if (!(T < H)) return Math.PI / 2;
  const r = clamp(T / H, 0, 1);
  return Math.asin(Math.pow(r, 1 / last.power));
}

/** Point on the upper surface. side: -1 medial, +1 lateral. theta 0 = at the sole, PI/2 = top centre. */
export function upperPoint(last, t, theta, side = 1, grow = 0) {
  const w = Math.max(0, last.width(t) - last.inset) + grow;
  const H = last.roof(t) + grow;
  const s = Math.sin(theta);
  const y = last.base(t) + H * Math.pow(Math.max(0, s), last.power);
  const z = side * Math.cos(theta) * w;
  return new THREE.Vector3(t - 0.5, y, z);
}

/** Outward surface normal by finite differences. */
export function upperNormal(last, t, theta, side = 1) {
  const e = 1e-3;
  const p = upperPoint(last, t, theta, side);
  const pt = upperPoint(last, clamp(t + e, 0, 1), theta, side).sub(upperPoint(last, clamp(t - e, 0, 1), theta, side));
  const pa = upperPoint(last, t, theta + e, side).sub(upperPoint(last, t, theta - e, side));
  const n = new THREE.Vector3().crossVectors(pt, pa).normalize();
  // Make it point away from the shoe's centre line.
  const c = new THREE.Vector3(p.x, last.base(t) + last.roof(t) * 0.35, 0);
  if (n.dot(p.clone().sub(c)) < 0) n.negate();
  return n;
}

/** A point slightly lifted off the upper surface. */
export function onUpper(last, t, theta, side = 1, lift = 0.004) {
  return upperPoint(last, t, theta, side).add(upperNormal(last, t, theta, side).multiplyScalar(lift));
}

/**
 * Side wall of the upper as an indexed grid. Optional `range` limits t; `paint(t, y, theta, side)` returns
 * a THREE.Color or null for vertex colours.
 */
export function upperSide(last, side, { segT = 90, segA = 22, t0 = 0, t1 = 1, base, paint, grow = 0, thetaMin, thetaMax } = {}) {
  const pos = [], col = [], uv = [], idx = [], nor = [];
  const baseCol = new THREE.Color(base ?? '#ffffff');
  for (let i = 0; i <= segT; i++) {
    const t = lerp(t0, t1, i / segT);
    const tc = thetaMax ? thetaMax(t) : thetaCut(last, t);
    const ta = thetaMin ? thetaMin(t) : 0;
    for (let j = 0; j <= segA; j++) {
      const th = lerp(ta, tc, j / segA);
      const p = upperPoint(last, t, th, side, grow);
      pos.push(p.x, p.y, p.z);
      uv.push(t, j / segA);
      let c = baseCol;
      const pc = paint && paint(t, p.y, th, side);
      if (pc) c = pc.isColor ? pc : baseCol.clone().lerp(pc.color, pc.k);
      col.push(c.r, c.g, c.b);
      const n = upperNormal(last, clamp(t, 0.002, 0.998), clamp(th, 0.002, Math.PI / 2), side);
      nor.push(n.x, n.y, n.z);
    }
  }
  const row = segA + 1;
  for (let i = 0; i < segT; i++) {
    for (let j = 0; j < segA; j++) {
      const a = i * row + j, b = (i + 1) * row + j, c = a + 1, d = b + 1;
      if (side > 0) idx.push(a, b, c, b, d, c);
      else idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  return g;
}

/** Arched band across the top of the foot between t0..t1 (straps, tongue). */
export function topBand(last, { t0, t1, grow = 0.006, segT = 8, segA = 40, thetaFrom = 0, heightScale = 1, raise = () => 0 }) {
  const pos = [], idx = [];
  for (let i = 0; i <= segT; i++) {
    const t = lerp(t0, t1, i / segT);
    for (let j = 0; j <= segA; j++) {
      const k = j / segA;
      const th = lerp(thetaFrom, Math.PI - thetaFrom, k);
      const side = th <= Math.PI / 2 ? -1 : 1;
      const tt = th <= Math.PI / 2 ? th : Math.PI - th;
      const w = Math.max(0, last.width(t) - last.inset) + grow;
      const H = (last.roof(t) + grow) * heightScale + raise(t);
      const y = last.base(t) + H * Math.pow(Math.sin(tt), last.power);
      pos.push(t - 0.5, y, side * Math.cos(tt) * w);
    }
  }
  const row = segA + 1;
  for (let i = 0; i < segT; i++) for (let j = 0; j < segA; j++) {
    const a = i * row + j, b = (i + 1) * row + j;
    idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // Ensure outward-facing winding (normals point up at the top centre).
  const n = g.getAttribute('normal');
  const mid = Math.floor(segT / 2) * row + Math.floor(segA / 2);
  if (n.getY(mid) < 0) { g.setIndex(idx.map((v, i) => idx[i - (i % 3) + (2 - (i % 3))])); g.computeVertexNormals(); }
  return g;
}

/** Closed outline of the footprint (x, z) for t in [ta, tb], scaled by `grow`. */
export function footprint(last, ta = 0, tb = 1, n = 90, grow = 0) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = lerp(ta, tb, i / n);
    pts.push(new THREE.Vector2(t - 0.5, -(last.width(t) + grow)));
  }
  for (let i = n; i >= 0; i--) {
    const t = lerp(ta, tb, i / n);
    pts.push(new THREE.Vector2(t - 0.5, last.width(t) + grow));
  }
  return pts;
}

/**
 * Extrudes the footprint between two height functions bottom(t) and top(t).
 * The shape is built in (x, z) and stretched vertically per vertex, so soles follow heel lift and drop.
 */
export function slab(last, { bottom, top, ta = 0.003, tb = 0.997, grow = 0, bevel = 0.006, taper = 1, taperAt = null }) {
  const outline = footprint(last, ta, tb, 90, grow);
  const shape = new THREE.Shape(outline.map((v) => new THREE.Vector2(v.x, v.y)));
  const depth = 1;
  const g = new THREE.ExtrudeGeometry(shape, {
    depth, steps: 1, curveSegments: 1,
    bevelEnabled: bevel > 0, bevelThickness: bevel * 0.6, bevelSize: bevel, bevelSegments: 2,
  });
  const p = g.getAttribute('position');
  const bt = bevel > 0 ? bevel * 0.6 : 0;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), z0 = p.getY(i);
    const lvl = clamp((p.getZ(i) + bt) / (depth + 2 * bt), 0, 1);
    const t = clamp(x + 0.5, 0, 1);
    let zz = z0;
    if (taper !== 1 && taperAt) {
      // Shrink the bottom toward a point (stilettos, block heels).
      const k = lerp(taper, 1, lvl);
      x = taperAt.x + (x - taperAt.x) * k;
      zz = z0 * k;
    }
    const y = lerp(bottom(t), top(t), lvl);
    p.setXYZ(i, x, y, zz);
  }
  g.computeVertexNormals();
  return g;
}

/** Tube through world-space points. */
export function tube(points, radius = 0.004, closed = false, radial = 8) {
  const c = new THREE.CatmullRomCurve3(points, closed, 'centripetal');
  return new THREE.TubeGeometry(c, Math.max(8, points.length * 4), radius, radial, closed);
}

/** Points along the topline edge from the throat on one side, round the heel, to the throat on the other. */
export function toplinePoints(last, tEnd, n = 40, lift = 0.0) {
  const pts = [];
  for (let i = n; i >= 0; i--) {
    const t = (i / n) * tEnd;
    pts.push(onUpper(last, t, thetaCut(last, t), -1, lift));
  }
  for (let i = 1; i <= n; i++) {
    const t = (i / n) * tEnd;
    pts.push(onUpper(last, t, thetaCut(last, t), 1, lift));
  }
  return pts;
}

/** Last t at which the upper is still open on top (the throat). */
export function throatT(last) {
  let t = 0;
  for (let i = 0; i <= 400; i++) {
    const tt = i / 400;
    if (last.topline(tt) < last.roof(tt)) t = tt;
  }
  return t;
}
