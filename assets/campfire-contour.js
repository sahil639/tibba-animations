/* ══════════════════════════════════════════════════════════════════════════
   The campfire, in contour line
   ─────────────────────────────────────────────────────────────────────────
   The same fire as assets/campfire.js, drawn the way the hero draws its
   mountain: nothing but lines of equal height on a dark ground, warm white
   for the land and the site's orange where it burns.

     stones & logs   sliced into horizontal rings, every few centimetres, by
                     intersecting their triangles with a stack of planes. A
                     depth-only copy of each solid stands behind the lines so
                     rings on the far side are hidden — the same trick the
                     hero uses, and what stops it reading as wireframe.
     the fire        contour lines of a moving flame field, re-extracted
                     with marching squares every frame. The outer lines are
                     deep orange, the innermost nearly white: in a contour
                     drawing, the hottest place is simply the highest ground.
     ground          dotted contours of the soil around the pit, flowing
                     slowly — the hero's dotted low ground.
     smoke           faint dotted contours of a second, slower field above
                     the flames.
     embers          orange points, climbing.

   The cursor behaves as it does on the lit fire: the flame and smoke lean
   away from it, its movement becomes wind, and a quick pass fans the fire.
   Here the field itself bends, so the lines redraw around the hand.
   ═════════════════════════════════════════════════════════════════════════ */
import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

export const K = {
  size: 1,        // fire height
  levels: 7,      // contour lines in the flame
  weight: 1,      // line weight multiplier
  push: 1,
  wind: 1,
  embers: 1,
  smoke: 1,
};

const BG = new THREE.Color('#161617');
const INK = new THREE.Color('#e8e3dc');
const ACCENT = new THREE.Color('#e85d3d');

/* ── noise, in JS, for the flame and smoke fields ──────────────────────── */
function h2(x, y) { let n = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263); n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967295; }
function vn(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), u = x - xi, v = y - yi;
  const su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v);
  const a = h2(xi, yi), b = h2(xi + 1, yi), c = h2(xi, yi + 1), d = h2(xi + 1, yi + 1);
  return (a + (b - a) * su) + ((c + (d - c) * su) - (a + (b - a) * su)) * sv;
}
function fbm(x, y, o = 4) { let s = 0, a = 0.5; for (let i = 0; i < o; i++) { s += a * vn(x, y); x *= 2.03; y *= 2.03; a *= 0.5; } return s; }

/* ── marching squares ─────────────────────────────────────────────────────
   Grid of values G (nx × ny), one level, calls emit(x0,y0,x1,y1) in grid
   coordinates for each segment. Saddles resolved by the cell average. */
function march(G, nx, ny, level, emit) {
  const L = (a, b) => (level - a) / ((b - a) || 1e-6);
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const a = G[j * nx + i], b = G[j * nx + i + 1], c = G[(j + 1) * nx + i + 1], d = G[(j + 1) * nx + i];
    let k = 0; if (a > level) k |= 1; if (b > level) k |= 2; if (c > level) k |= 4; if (d > level) k |= 8;
    if (k === 0 || k === 15) continue;
    const top = [i + L(a, b), j], right = [i + 1, j + L(b, c)], bot = [i + L(d, c), j + 1], left = [i, j + L(a, d)];
    const E = (p, q) => emit(p[0], p[1], q[0], q[1]);
    switch (k) {
      case 1: case 14: E(left, top); break;
      case 2: case 13: E(top, right); break;
      case 3: case 12: E(left, right); break;
      case 4: case 11: E(right, bot); break;
      case 6: case 9: E(top, bot); break;
      case 7: case 8: E(left, bot); break;
      case 5: case 10: {
        const mid = (a + b + c + d) / 4 > level;
        if ((k === 5) === mid) { E(left, top); E(right, bot); } else { E(top, right); E(left, bot); }
        break;
      }
    }
  }
}

/* ── slicing a mesh into horizontal rings ─────────────────────────────── */
function slice(geo, matrix, step, out) {
  const p = geo.attributes.position, idx = geo.index;
  const n = idx ? idx.count : p.count;
  const A = new THREE.Vector3(), B = new THREE.Vector3(), Cc = new THREE.Vector3();
  const tri = [A, B, Cc];
  for (let t = 0; t < n; t += 3) {
    for (let k = 0; k < 3; k++) tri[k].fromBufferAttribute(p, idx ? idx.getX(t + k) : t + k).applyMatrix4(matrix);
    const lo = Math.min(A.y, B.y, Cc.y), hi = Math.max(A.y, B.y, Cc.y);
    for (let y = Math.ceil(lo / step) * step; y <= hi; y += step) {
      const pts = [];
      for (let e = 0; e < 3; e++) {
        const P = tri[e], Q = tri[(e + 1) % 3];
        if ((P.y - y) * (Q.y - y) < 0) {
          const f = (y - P.y) / (Q.y - P.y);
          pts.push(P.x + (Q.x - P.x) * f, y, P.z + (Q.z - P.z) * f);
        }
      }
      if (pts.length === 6) out.push(...pts);
    }
  }
}

export function mountContourFire(section, canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setClearColor(BG, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = BG;
  scene.fog = new THREE.Fog(BG, 7, 14);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60);
  const camHome = new THREE.Vector3(0, 2.6, 8.6), look = new THREE.Vector3(0, 0.7, 0);
  camera.position.copy(camHome); camera.lookAt(look);

  const mats = [];
  const lineMat = (color, width, o = {}) => {
    const m = new LineMaterial({ color, linewidth: width, transparent: true, depthWrite: false, fog: true, ...o });
    m.userData.w = width; mats.push(m); return m;
  };
  function lines(positions, mat) {
    const g = new LineSegmentsGeometry(); g.setPositions(positions);
    const l = new LineSegments2(g, mat); l.computeLineDistances(); l.frustumCulled = false;
    scene.add(l); return l;
  }

  /* ── solids: depth only ─────────────────────────────────────────────── */
  const depthMat = new THREE.MeshBasicMaterial({ colorWrite: false, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2 });
  const solids = [];
  function solid(geo, matrix) {
    const m = new THREE.Mesh(geo, depthMat);
    m.matrixAutoUpdate = false; m.matrix.copy(matrix); m.renderOrder = -1;
    scene.add(m); solids.push({ geo, matrix });
  }

  const rng = (() => { let s = 17; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  /* stones: the same faceted rocks as the lit fire */
  const STONES = 9;
  for (let i = 0; i < STONES; i++) {
    const a = (i / STONES) * Math.PI * 2 + rng() * 0.25;
    const g = new THREE.IcosahedronGeometry(1, 2);
    const pos = g.attributes.position, key = new Map();
    for (let k = 0; k < pos.count; k++) {
      const x = pos.getX(k), y = pos.getY(k), z = pos.getZ(k);
      const id = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
      if (!key.has(id)) key.set(id, 0.86 + rng() * 0.24);
      const f = key.get(id); pos.setXYZ(k, x * f, y * f * 0.62, z * f);
    }
    const s = 0.34 + rng() * 0.2, r = 1.55 + rng() * 0.18;
    const M = new THREE.Matrix4().compose(
      new THREE.Vector3(Math.cos(a) * r, s * 0.42, Math.sin(a) * r),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rng() * 0.3, rng() * 6.28, rng() * 0.3)),
      new THREE.Vector3(s * (1.1 + rng() * 0.4), s, s * (0.9 + rng() * 0.3)));
    solid(g, M);
  }
  /* logs */
  function log(len, rad, from, to) {
    const g = new THREE.CylinderGeometry(rad * 0.92, rad, len, 18, 1);
    const A = new THREE.Vector3(...from), B = new THREE.Vector3(...to);
    const M = new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(0.5),
      new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()),
      new THREE.Vector3(1, 1, 1));
    solid(g, M);
  }
  log(2.1, 0.12, [-1.05, 0.13, -0.55], [1.05, 0.13, -0.5]);
  log(1.7, 0.11, [-0.7, 0.12, 0.45], [0.8, 0.12, 0.3]);
  log(1.1, 0.1, [0.15, 0.1, 0.55], [0.55, 0.1, -0.2]);
  const TEEPEE = 6, apex = [0.02, 1.62, 0.02];
  for (let i = 0; i < TEEPEE; i++) {
    const a = (i / TEEPEE) * Math.PI * 2 + 0.3, r = 0.78 + (i % 2) * 0.12;
    log(1.95, 0.085 + (i % 3) * 0.01, [Math.cos(a) * r, 0.02, Math.sin(a) * r],
        [apex[0] + Math.cos(a) * 0.06, apex[1] - (i % 2) * 0.12, apex[2] + Math.sin(a) * 0.06]);
  }

  /* ── the solids, as rings ─────────────────────────────────────────────
     Split by distance from the fire: rings close to it are lit orange and
     flicker with the flame, the rest are the page's warm white. That split
     is the firelight, in a drawing that has no light. */
  const cool = [], warm = [];
  for (const s of solids) {
    const segs = []; slice(s.geo, s.matrix, 0.05, segs);
    for (let i = 0; i < segs.length; i += 6) {
      const mx = (segs[i] + segs[i + 3]) / 2, my = (segs[i + 1] + segs[i + 4]) / 2, mz = (segs[i + 2] + segs[i + 5]) / 2;
      const d = Math.hypot(mx, (my - 0.6) * 1.2, mz);
      (d < 1.35 ? warm : cool).push(...segs.slice(i, i + 6));
    }
  }
  const coolMat = lineMat(INK, 1.1, { opacity: 0.72 });
  const warmMat = lineMat(ACCENT.clone(), 1.25, { opacity: 0.95 });
  lines(cool, coolMat);
  lines(warm, warmMat);

  /* ── ground: dotted contours of the soil around the pit ──────────────── */
  {
    const N = 120, R = 6.5, G = new Float32Array(N * N);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const x = (i / (N - 1) * 2 - 1) * R, z = (j / (N - 1) * 2 - 1) * R;
      const r = Math.hypot(x, z);
      /* a shallow pit where the fire sits, a raised lip where the stones
         are, and uneven soil beyond */
      G[j * N + i] = -Math.exp(-r * r * 0.9) * 0.9 + Math.exp(-Math.pow(r - 1.6, 2) * 3) * 0.35
                   + (fbm(x * 0.35 + 3, z * 0.35 - 1) - 0.5) * 1.1 + r * 0.05;
    }
    const segs = [];
    for (let l = -0.8; l <= 0.7; l += 0.1) {
      march(G, N, N, l, (x0, y0, x1, y1) => {
        const X = v => (v / (N - 1) * 2 - 1) * R;
        const ax = X(x0), az = X(y0), bx = X(x1), bz = X(y1);
        /* keep the ground out from under the stones and logs */
        if (Math.hypot(ax, az) < 1.25) return;
        segs.push(ax, 0.002, az, bx, 0.002, bz);
      });
    }
    const groundMat = lineMat(INK, 1.0, { opacity: 0.32, dashed: true, dashSize: 0.05, gapSize: 0.07 });
    groundMat.userData.flow = true;
    lines(segs, groundMat);
  }

  /* ── live fields: fire and smoke ─────────────────────────────────────── */
  function liveLines(maxSegs, mat) {
    const g = new LineSegmentsGeometry();
    g.setPositions(new Float32Array(maxSegs * 6));
    g.setColors(new Float32Array(maxSegs * 6));
    const l = new LineSegments2(g, mat); l.frustumCulled = false; scene.add(l);
    return { l, g, max: maxSegs,
      pos: g.attributes.instanceStart.data.array, col: g.attributes.instanceColorStart.data.array };
  }
  const fireMat = lineMat(new THREE.Color(1, 1, 1), 2.3, { vertexColors: true, opacity: 1 });
  const fire = liveLines(9000, fireMat);
  fire.l.renderOrder = 4;             /* drawn over the warm rings it lights */
  const smokeMat = lineMat(INK, 1.0, { opacity: 0.22, dashed: true, dashSize: 0.04, gapSize: 0.06 });
  const smoke = liveLines(4000, smokeMat);

  const FX = 56, FY = 90, FG = new Float32Array(FX * FY);
  const SX = 36, SY = 50, SG = new Float32Array(SX * SY);
  const RAMP = [
    new THREE.Color('#8e2a10'), new THREE.Color('#c23a14'), ACCENT, new THREE.Color('#f07a3a'),
    new THREE.Color('#f7a54f'), new THREE.Color('#fbd27a'), new THREE.Color('#fff1cf'),
  ];

  /* pointer state, in world units on the upright plane through the fire */
  const P = { x: 9, y: 9, on: 0, inside: false, vx: 0, fan: 0 };
  const wind = { x: 0 };

  function buildFire(t) {
    const H = 3.0 * K.size * (1 + P.fan * 0.42), W = 1.0;
    /* how far the column leans at its tip: wind, plus a shove away from a
       near pointer — measured from the middle of the flame */
    const dx = 0 - P.x, dy = H * 0.5 - P.y, r = Math.hypot(dx, dy) + 1e-3;
    const near = Math.exp(-r * r * 0.9) * P.on * K.push;
    const lean = wind.x * 0.9 + (dx / r) * near * 1.2 + Math.sin(t * 1.3) * 0.05;
    const speed = 1.7 + P.fan * 0.8;
    for (let j = 0; j < FY; j++) {
      const v = j / (FY - 1);
      const drift = (vn(v * 2.2 + 11, t * 1.4) - 0.5) * 0.5 * v;
      const cx = lean * v * v + drift;
      const w = 0.95 * Math.pow(1 - v, 0.7) + 0.04;
      for (let i = 0; i < FX; i++) {
        const u = (i / (FX - 1) * 2 - 1) * 1.35;
        const n1 = fbm(u * 1.8 + 4.1, v * 2.6 - t * speed, 3);
        const n2 = fbm(u * 4.0 - 2.3, v * 5.0 - t * speed * 1.7, 2);
        let f = (1 - Math.abs(u - cx) / w) * 0.95 + (n1 - 0.5) * 1.0 + (n2 - 0.5) * 0.45 - v * 0.45;
        f -= Math.max(0, (v - 0.25) / 0.75) * (1 - n2) * 0.55;
        f *= Math.min(1, v / 0.05);
        FG[j * FX + i] = f;
      }
    }
    let n = 0;
    const L = Math.max(2, Math.min(RAMP.length, Math.round(K.levels)));
    const life = ignite;
    for (let k = 0; k < L; k++) {
      const level = 0.03 + (k / (L - 1)) * 0.72;
      const c = RAMP[Math.round(k / (L - 1) * (RAMP.length - 1))];
      march(FG, FX, FY, level + (1 - life) * 0.9, (x0, y0, x1, y1) => {
        if (n >= fire.max) return;
        const X = a => (a / (FX - 1) * 2 - 1) * 1.35 * W, Y = b => 0.1 + b / (FY - 1) * H;
        const o = n * 6;
        fire.pos[o] = X(x0); fire.pos[o + 1] = Y(y0); fire.pos[o + 2] = 0;
        fire.pos[o + 3] = X(x1); fire.pos[o + 4] = Y(y1); fire.pos[o + 5] = 0;
        fire.col[o] = fire.col[o + 3] = c.r; fire.col[o + 1] = fire.col[o + 4] = c.g; fire.col[o + 2] = fire.col[o + 5] = c.b;
        n++;
      });
    }
    fire.g.attributes.instanceStart.data.needsUpdate = true;
    fire.g.attributes.instanceColorStart.data.needsUpdate = true;
    fire.g.instanceCount = n;
  }

  function buildSmoke(t) {
    const base = 2.1 * K.size, H = 3.6, W = 1.6;
    for (let j = 0; j < SY; j++) {
      const v = j / (SY - 1);
      const y = base + v * H;
      const dx = 0 - P.x, dy = y - P.y, r = Math.hypot(dx, dy) + 1e-3;
      const near = Math.exp(-r * r * 0.5) * P.on * K.push;
      const cx = wind.x * 2.0 * v + (dx / r) * near * 1.4 * v + Math.sin(t * 0.4 + v * 3) * 0.3 * v + v * v * 0.5;
      for (let i = 0; i < SX; i++) {
        const u = (i / (SX - 1) * 2 - 1) * W;
        const spread = 0.25 + v * 0.9;
        const col = Math.exp(-Math.pow((u - cx) / spread, 2));
        const n = fbm(u * 1.4 + 7, v * 2.2 - t * 0.35, 3);
        SG[j * SX + i] = col * (0.5 + n * 0.9) * (1 - v * 0.8) * Math.min(1, v * 6) * K.smoke * ignite;
      }
    }
    let n = 0;
    for (const level of [0.28, 0.42]) {
      march(SG, SX, SY, level, (x0, y0, x1, y1) => {
        if (n >= smoke.max) return;
        const X = a => (a / (SX - 1) * 2 - 1) * W, Y = b => base + b / (SY - 1) * H;
        const o = n * 6;
        smoke.pos[o] = X(x0); smoke.pos[o + 1] = Y(y0); smoke.pos[o + 2] = -0.2;
        smoke.pos[o + 3] = X(x1); smoke.pos[o + 4] = Y(y1); smoke.pos[o + 5] = -0.2;
        n++;
      });
    }
    smoke.g.attributes.instanceStart.data.needsUpdate = true;
    smoke.g.instanceCount = n;
    smoke.l.computeLineDistances();
  }

  /* ── embers: orange points ───────────────────────────────────────────── */
  const EMB = 220;
  const eg = new THREE.BufferGeometry();
  const seeds = new Float32Array(EMB * 4); for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
  eg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(EMB * 3), 3));
  eg.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
  const EU = { uTime: { value: 0 }, uLife: { value: 0 }, uScale: { value: 400 }, uWind: { value: 0 },
               uPtr: { value: new THREE.Vector2(9, 9) }, uOn: { value: 0 }, uPush: { value: 1 }, uFan: { value: 0 },
               uCol: { value: ACCENT.clone() } };
  const emberPts = new THREE.Points(eg, new THREE.ShaderMaterial({
    uniforms: EU, transparent: true, depthWrite: false,
    vertexShader: `attribute vec4 aSeed; uniform float uTime, uLife, uScale, uWind, uOn, uPush, uFan; uniform vec2 uPtr;
      varying float vAge; varying float vFl;
      void main(){
        float life = 1.8 + aSeed.x * 2.4;
        float age = fract(uTime / life + aSeed.y);
        float a = aSeed.z * 6.2832, r = aSeed.w * 0.5;
        vec3 p = vec3(cos(a) * r, 0.35, sin(a) * r * 0.7);
        p.y += age * (2.4 + aSeed.x * 2.2) * (1.0 + uFan * 0.35);
        p.xz += vec2(cos(a), sin(a)) * age * (0.15 + step(0.85, aSeed.w) * 0.9);
        p.x += sin(uTime * (1.2 + aSeed.x) + aSeed.y * 30.0) * 0.28 * age;
        vec2 d = p.xy - uPtr; float rr = length(d) + 1e-3;
        p.xy += (d / rr) * exp(-rr * rr * 1.6) * uOn * uPush * 1.4 * age * age;
        p.x += uWind * 1.6 * age * age;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vAge = age; vFl = 0.6 + 0.4 * sin(uTime * (14.0 + aSeed.z * 20.0) + aSeed.x * 50.0);
        gl_PointSize = (0.02 + aSeed.z * 0.02) * uScale / -mv.z * uLife;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `uniform vec3 uCol; varying float vAge; varying float vFl;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.3, d);
        a *= smoothstep(0.0, 0.06, vAge) * (1.0 - smoothstep(0.6, 1.0, vAge)) * vFl;
        vec3 c = mix(vec3(1.0, 0.85, 0.55), uCol, smoothstep(0.1, 0.5, vAge));
        gl_FragColor = vec4(c, a);
        #include <colorspace_fragment>
      }`,
  }));
  emberPts.frustumCulled = false;
  scene.add(emberPts);

  /* ── sizing ────────────────────────────────────────────────────────── */
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.fov = w / h < 1 ? 48 : 34; camera.updateProjectionMatrix();
    for (const m of mats) m.resolution.set(w, h);
    EU.uScale.value = h * dpr * 0.5 / Math.tan(camera.fov * Math.PI / 360);
  }
  resize(); new ResizeObserver(resize).observe(canvas);

  /* ── pointer ───────────────────────────────────────────────────────── */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const hit = new THREE.Vector3(); let lastX = 0, lastY = 0, lastT = 0;
  section.addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    if (!ray.ray.intersectPlane(plane, hit)) return;
    const now = performance.now(), dt = Math.max(8, now - lastT) / 1000;
    if (P.inside) {
      const vx = (hit.x - lastX) / dt, vy = (hit.y - lastY) / dt, sp = Math.min(12, Math.hypot(vx, vy));
      P.vx += (Math.max(-12, Math.min(12, vx)) - P.vx) * 0.35;
      const near = Math.exp(-Math.pow(Math.hypot(hit.x, hit.y - 1), 2) * 0.35);
      P.fan = Math.min(1.6, P.fan + sp * near * dt * 0.9);
    }
    lastX = hit.x; lastY = hit.y; lastT = now; P.inside = true;
    P.x = hit.x; P.y = hit.y;
  }, { passive: true });
  section.addEventListener('pointerleave', () => { P.inside = false; });

  /* ── the run ───────────────────────────────────────────────────────── */
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let raf = 0, visible = false, t0 = performance.now(), prev = t0, ignite = 0, flow = 0;
  function frame(now) {
    raf = visible ? requestAnimationFrame(frame) : 0;
    const dt = Math.min(0.05, (now - prev) / 1000); prev = now;
    const t = reduced ? 3 : (now - t0) / 1000;
    ignite = reduced ? 1 : Math.min(1, ignite + dt / 2.4);
    const life = ignite * ignite * (3 - 2 * ignite);

    P.on += ((P.inside ? 1 : 0) - P.on) * Math.min(1, dt * 4);
    if (!P.inside) P.vx *= Math.pow(0.1, dt);
    wind.x += (P.vx * 0.07 * K.wind - wind.x) * Math.min(1, dt * 3);
    wind.x *= Math.pow(0.35, dt);
    P.fan *= Math.pow(0.25, dt);

    buildFire(t);
    buildSmoke(t);

    /* the firelight on the near rings: breathing with the flame */
    const f = 0.78 + 0.14 * Math.sin(t * 9.3) * Math.sin(t * 5.7 + 1.3) + 0.08 * Math.sin(t * 23.0);
    warmMat.opacity = (0.35 + 0.6 * f * (1 + P.fan * 0.3)) * life + 0.25 * (1 - life);
    warmMat.color.copy(INK).lerp(ACCENT, life * (0.75 + 0.25 * f));
    flow += dt;
    for (const m of mats) {
      m.linewidth = m.userData.w * K.weight;
      if (m.userData.flow) m.dashOffset = -flow * 0.08;
    }
    smokeMat.dashOffset = -flow * 0.12;

    EU.uTime.value = t; EU.uLife.value = life; EU.uWind.value = wind.x; EU.uFan.value = P.fan;
    EU.uPtr.value.set(P.x, P.y); EU.uOn.value = P.on; EU.uPush.value = K.push;
    eg.setDrawRange(0, Math.round(EMB * K.embers));

    const px = P.inside ? ndc.x : 0, py = P.inside ? ndc.y : 0;
    camera.position.x += (camHome.x + px * 0.35 - camera.position.x) * Math.min(1, dt * 1.5);
    camera.position.y += (camHome.y + py * 0.18 - camera.position.y) * Math.min(1, dt * 1.5);
    camera.lookAt(look);
    renderer.render(scene, camera);
  }

  function setVisible(v, ratio = 1) {
    const was = visible; visible = v;
    if (visible && !was) {
      if (ratio < 0.6 && ignite >= 1) ignite = 0.35;
      prev = performance.now();
      if (!raf) raf = requestAnimationFrame(frame);
    }
    section.classList.toggle('is-lit', visible);
  }
  new IntersectionObserver(([e]) => setVisible(e.isIntersecting, e.intersectionRatio), { threshold: [0, 0.25, 0.6] }).observe(section);
  const check = () => {
    const r = section.getBoundingClientRect(), on = r.bottom > 0 && r.top < innerHeight;
    if (on !== visible) setVisible(on, on ? 0.3 : 0);
  };
  addEventListener('scroll', check, { passive: true }); addEventListener('resize', check); check();

  return {
    K,
    /** what the fire is doing right now — for checking it from the console */
    state() { return { ignite, visible, fireSegs: fire.g.instanceCount, smokeSegs: smoke.g.instanceCount, fan: P.fan, wind: wind.x }; },
    relight() { ignite = 0; },
    step(n = 1, dt = 1 / 60) {
      const kv = visible, kr = raf; visible = false;
      for (let i = 0; i < n; i++) frame(prev + dt * 1000);
      visible = kv; raf = kr;
    },
  };
}
