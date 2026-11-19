// Shared three.js stage: one renderer, one WebGL context, render on demand.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildShoe } from '../shoes/build.js';

const STUDIO = '#D5D9DC';
const DARK_STAGE = '#20262D';

function cycloramaGeometry() {
  // Profile in (z, y): floor toward the camera, curved sweep (r = 1.2) into a back wall.
  const prof = [];
  const wallZ = -3, r = 1.2;
  for (let z = 10; z > wallZ + r; z -= 0.5) prof.push([z, 0]);
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16) * (Math.PI / 2);
    prof.push([wallZ + r - Math.sin(a) * r, r - Math.cos(a) * r]);
  }
  for (let y = r + 0.5; y <= 10; y += 0.5) prof.push([wallZ, y]);
  const W = 60, segX = 2;
  const pos = [], idx = [];
  prof.forEach(([z, y]) => { for (let i = 0; i <= segX; i++) pos.push(-W / 2 + (W * i) / segX, y, z); });
  for (let j = 0; j < prof.length - 1; j++) for (let i = 0; i < segX; i++) {
    const a = j * (segX + 1) + i, b = a + segX + 1;
    idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

function cycloramaMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uFloor: { value: new THREE.Color(STUDIO) }, uTop: { value: new THREE.Color(STUDIO) } },
    vertexShader: 'varying float vY; void main(){ vY = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 uFloor;\nuniform vec3 uTop;\nvarying float vY;\nvoid main(){\n float k = smoothstep(0.0, 4.0, vY);\n gl_FragColor = vec4(mix(uFloor, uTop, k), 1.0);\n #include <colorspace_fragment>\n}',
    toneMapped: false,
    depthWrite: true,
    side: THREE.DoubleSide,
  });
}

export function themeStageColor(hex) {
  const dark = document.documentElement.dataset.theme === 'dark';
  return dark ? new THREE.Color(hex).lerp(new THREE.Color(DARK_STAGE), 0.8) : new THREE.Color(hex);
}

/**
 * createStage(el) -> Stage. The canvas is appended to `el` and sized to it.
 */
export function createStage(el, { tier = 'full' } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, tier === 'light' ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  renderer.domElement.className = 'stage-canvas';
  el.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(24, 1, 0.05, 80);
  camera.position.set(0, 0.6, 4);

  const key = new THREE.DirectionalLight('#fff6ec', 2.2);
  key.position.set(-2.2, 3.1, 2.2);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.radius = 6;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.01;
  const sc = key.shadow.camera;
  sc.left = -3; sc.right = 3; sc.top = 3; sc.bottom = -3; sc.near = 0.5; sc.far = 10;
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight('#e8f0ff', 0.8);
  rim.position.set(2.5, 2, -3);
  scene.add(rim);
  const top = new THREE.DirectionalLight('#ffffff', 0.5);
  top.position.set(0, 4, 0.5);
  scene.add(top);

  const cycMat = cycloramaMaterial();
  const cyc = new THREE.Mesh(cycloramaGeometry(), cycMat);
  cyc.renderOrder = -1;
  scene.add(cyc);
  const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(40, 20), new THREE.ShadowMaterial({ opacity: 0.35 }));
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.0006;
  shadowPlane.receiveShadow = true;
  scene.add(shadowPlane);

  let tint = new THREE.Color(STUDIO);
  function applyTint(c) {
    tint = c.clone();
    cycMat.uniforms.uFloor.value.copy(c);
    cycMat.uniforms.uTop.value.copy(c).lerp(new THREE.Color('#ffffff'), 0.06);
  }
  applyTint(themeStageColor(STUDIO));

  const cache = new Map();
  const frameCbs = new Set();
  let dirty = true, running = true, w = 1, h = 1;

  function getShoe(slug, quality = 'high') {
    const k = `${slug}:${quality}`;
    if (!cache.has(k)) cache.set(k, buildShoe(slug, { quality }));
    return cache.get(k);
  }

  const stage = {
    scene, camera, renderer, key,
    get size() { return { w, h }; },
    get tint() { return tint.clone(); },
    getShoe,
    /** Adds a fresh clone of a shoe (shares geometry/materials) to the scene. */
    addShoe(slug, quality = 'high') {
      const { group, anchors } = getShoe(slug, quality);
      const g = group.clone(true);
      g.userData = { ...group.userData, anchors };
      g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      scene.add(g);
      dirty = true;
      return g;
    },
    remove(obj) { scene.remove(obj); dirty = true; },
    setTint(hex) { applyTint(themeStageColor(hex)); dirty = true; },
    setTintColor(c) { applyTint(c); dirty = true; },
    requestRender() { dirty = true; },
    onFrame(cb) { frameCbs.add(cb); return () => frameCbs.delete(cb); },
    resize() {
      const r = el.getBoundingClientRect();
      w = Math.max(1, Math.round(r.width)); h = Math.max(1, Math.round(r.height));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      dirty = true;
    },
    /** World point -> CSS pixels relative to the stage element. */
    project(v) {
      const p = v.clone().project(camera);
      return { x: (p.x * 0.5 + 0.5) * w, y: (-p.y * 0.5 + 0.5) * h, visible: p.z < 1 };
    },
    /** Returns the first shoe group hit at element-relative pixel (x, y). */
    pick(x, y, groups) {
      const ray = new THREE.Raycaster();
      ray.setFromCamera(new THREE.Vector2((x / w) * 2 - 1, -(y / h) * 2 + 1), camera);
      const hits = ray.intersectObjects(groups, true);
      if (!hits.length) return null;
      let o = hits[0].object;
      while (o && !groups.includes(o)) o = o.parent;
      return o;
    },
    renderNow() {
      for (const cb of frameCbs) cb();
      renderer.render(scene, camera);
      dirty = false;
    },
    dispose() { running = false; renderer.dispose(); renderer.domElement.remove(); },
  };

  const ro = new ResizeObserver(() => stage.resize());
  ro.observe(el);
  stage.resize();

  (function loop() {
    if (!running) return;
    if (dirty) stage.renderNow();
    requestAnimationFrame(loop);
  })();

  document.addEventListener('soleora:theme', () => { applyTint(themeStageColor(stage.baseTint || STUDIO)); dirty = true; });
  return stage;
}

/** Places the camera so `obj` fills `fill` of the viewport width with its base at `baseAt` of the height. */
export function frameObject(stage, obj, { fill = 0.42, baseAt = 0.62, yaw = -35, pitch = 12, out = {} } = {}) {
  const cam = stage.camera;
  const len = 1; // shoes are normalised to length 1
  const projected = len * (Math.abs(Math.cos((yaw * Math.PI) / 180)) * 0.9 + 0.25);
  const vfov = (cam.fov * Math.PI) / 180;
  const visW = (d) => 2 * d * Math.tan(vfov / 2) * cam.aspect;
  const d = projected / (fill * visW(1));
  const pr = (pitch * Math.PI) / 180;
  // Vertical offset so the sole line (y = 0) sits at `baseAt` of the frame height (0 = top).
  const visH = 2 * d * Math.tan(vfov / 2);
  const target = new THREE.Vector3(obj.position.x, (baseAt - 0.5) * visH * Math.cos(pr), obj.position.z);
  const pos = new THREE.Vector3(target.x, target.y + Math.sin(pr) * d, target.z + Math.cos(pr) * d);
  out.position = pos; out.target = target;
  return out;
}
