// Material library for procedural shoes (values from the design review).
import * as THREE from 'three';

const hasDOM = typeof document !== 'undefined';
const cache = new Map();

export function lighten(hex, k) {
  return new THREE.Color(hex).lerp(new THREE.Color('#ffffff'), k);
}

let jute;
function juteTexture() {
  if (!hasDOM) return null;
  if (jute) return jute;
  const c = document.createElement('canvas');
  c.width = 64; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#c9a877'; g.fillRect(0, 0, 64, 256);
  for (let y = 0; y < 256; y += 16) {
    for (let x = 0; x < 64; x += 8) {
      g.fillStyle = (x / 8 + y / 16) % 2 ? '#b8935e' : '#d6b88a';
      g.beginPath();
      g.ellipse(x + 4, y + 8, 5, 7, 0.6, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = 'rgba(80,55,25,0.35)'; g.fillRect(0, y, 64, 2);
  }
  jute = new THREE.CanvasTexture(c);
  jute.wrapS = jute.wrapT = THREE.RepeatWrapping;
  jute.repeat.set(30, 6);
  jute.colorSpace = THREE.SRGBColorSpace;
  return jute;
}

/**
 * material(kind, color, { vertexColors })
 * kinds: calf, polished, patent, suede, nubuck, knit, canvas, rubber, gum, crepe, jute, metal, lining, elastic, lace, stitch, dark
 */
export function material(kind, color = '#888888', { vertexColors = false } = {}) {
  const key = `${kind}|${color}|${vertexColors}`;
  if (cache.has(key)) return cache.get(key);
  const base = new THREE.Color(color);
  const p = { color: vertexColors ? 0xffffff : base, vertexColors, roughness: 0.5, metalness: 0 };
  switch (kind) {
    case 'calf': Object.assign(p, { roughness: 0.42, clearcoat: 0.25, clearcoatRoughness: 0.35 }); break;
    case 'polished': Object.assign(p, { roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.18 }); break;
    case 'patent': Object.assign(p, { roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.06 }); break;
    case 'suede':
    case 'nubuck': Object.assign(p, { roughness: 0.92, sheen: 0.45, sheenRoughness: 0.8, sheenColor: lighten(color, 0.2) }); break;
    case 'knit': Object.assign(p, { roughness: 0.85, sheen: 0.35, sheenRoughness: 0.7, sheenColor: lighten(color, 0.15) }); break;
    case 'canvas': Object.assign(p, { roughness: 0.9, sheen: 0.25, sheenRoughness: 0.9, sheenColor: lighten(color, 0.1) }); break;
    case 'rubber': Object.assign(p, { roughness: 0.7 }); break;
    case 'gum': Object.assign(p, { roughness: 0.62, color: new THREE.Color('#B9773E') }); break;
    case 'crepe': Object.assign(p, { roughness: 0.85, color: new THREE.Color('#D9C29A') }); break;
    case 'jute': Object.assign(p, { roughness: 0.95, color: 0xffffff, map: juteTexture() || null }); if (!p.map) p.color = new THREE.Color('#C9A877'); break;
    case 'metal': Object.assign(p, { metalness: 1, roughness: 0.35, color: new THREE.Color(color || '#B8B4AA') }); break;
    case 'lining': Object.assign(p, { roughness: 0.8, side: THREE.BackSide }); break;
    case 'elastic': Object.assign(p, { roughness: 0.8 }); break;
    case 'lace': Object.assign(p, { roughness: 0.75 }); break;
    case 'stitch': Object.assign(p, { roughness: 0.7 }); break;
    default: break;
  }
  const m = new THREE.MeshPhysicalMaterial(p);
  cache.set(key, m);
  return m;
}
