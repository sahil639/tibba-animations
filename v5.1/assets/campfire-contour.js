/* ══════════════════════════════════════════════════════════════════════════
   The campfire, in contour line
   ─────────────────────────────────────────────────────────────────────────
   The same fire as assets/campfire.js, drawn the way the hero draws its
   mountain: nothing but lines of equal height on a dark ground, warm white
   for the land and the site's orange where it burns.

     stones & logs   sliced into horizontal rings by intersecting their
                     triangles with a stack of planes. A depth-only copy of
                     each solid stands behind the lines so rings on the far
                     side are hidden — the hero's trick, and what stops it
                     reading as wireframe.
     the fire        contour lines of a moving flame field, re-extracted
                     with marching squares every frame, deep red at the edge
                     to pale gold at the core.
     smoke           soft puffs that climb, drift and thin out, with a few
                     dotted contour wisps curling up through them.
     ground          dotted contours of the soil around the pit, flowing.
     embers          orange points, climbing.

   Every animation has its own clock, so each can be slowed, sped up or
   stopped on its own, and "pause all" stops every clock without the jump a
   wall-clock animation makes when it resumes.
   ═════════════════════════════════════════════════════════════════════════ */
import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

export const K = {
  /* everything */
  paused: reduced, speed: 1,
  /* fire */
  fireOn: true, size: 1, fireSpeed: 1, levels: 7, flicker: true,
  /* embers */
  embersOn: true, embers: 1, emberSpeed: 1,
  /* smoke */
  smokeOn: true, smoke: 1, smokeOpacity: 1, smokeSpeed: 1, wisps: true,
  /* ground */
  flowOn: true, flowSpeed: 1,
  /* rocks */
  rocks: 9, randomness: 0.5, rockSeed: 17,
  /* cursor */
  cursorOn: true, push: 1, wind: 1, ease: 0.45,
  /* lines */
  weight: 1,
  /* sticks: 0 = the tidy teepee, toward 1 = thrown together by hand */
  stickMess: 0, stickSeed: 5,
  /* the viewing angle: degrees above the ground, degrees round the fire,
     distance — the defaults are the original camera exactly */
  camElev: 12.45, camAzim: 0, camDist: 8.81,
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
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/* ── marching squares ─────────────────────────────────────────────────── */
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
  const A = new THREE.Vector3(), B = new THREE.Vector3(), Cc = new THREE.Vector3(), tri = [A, B, Cc];
  for (let t = 0; t < n; t += 3) {
    for (let k = 0; k < 3; k++) tri[k].fromBufferAttribute(p, idx ? idx.getX(t + k) : t + k).applyMatrix4(matrix);
    const lo = Math.min(A.y, B.y, Cc.y), hi = Math.max(A.y, B.y, Cc.y);
    for (let y = Math.ceil(lo / step) * step; y <= hi; y += step) {
      const pts = [];
      for (let e = 0; e < 3; e++) {
        const P = tri[e], Q = tri[(e + 1) % 3];
        if ((P.y - y) * (Q.y - y) < 0) { const f = (y - P.y) / (Q.y - P.y); pts.push(P.x + (Q.x - P.x) * f, y, P.z + (Q.z - P.z) * f); }
      }
      if (pts.length === 6) out.push(...pts);
    }
  }
}

function seeded(seed) { let s = (seed * 9301 + 49297) % 233280 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

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
  function makeLines(positions, mat, parent = scene) {
    const g = new LineSegmentsGeometry(); g.setPositions(positions.length ? positions : [0, 0, 0, 0, 0, 0]);
    const l = new LineSegments2(g, mat); l.computeLineDistances(); l.frustumCulled = false;
    if (!positions.length) l.visible = false;
    parent.add(l); return l;
  }

  /* ── solids: depth only ─────────────────────────────────────────────── */
  const depthMat = new THREE.MeshBasicMaterial({ colorWrite: false, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2 });
  function depthMesh(geo, matrix, parent) {
    const m = new THREE.Mesh(geo, depthMat);
    m.matrixAutoUpdate = false; m.matrix.copy(matrix); m.renderOrder = -1;
    parent.add(m); return { geo, matrix };
  }

  /* logs — the teepee and the three lying across the pit. stickMess pulls
     them out of their pattern: every stick's angle round the fire, its
     reach, its lean, where it meets the others, its length and thickness
     loosen together, and with enough of it a stick or two has fallen
     outward and lies on the ground. */
  const logSolids = [];
  let logGroup = new THREE.Group(); scene.add(logGroup);
  function log(len, rad, from, to) {
    const g = new THREE.CylinderGeometry(rad * 0.92, rad, len, 18, 1);
    const A = new THREE.Vector3(...from), B = new THREE.Vector3(...to);
    const M = new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(0.5),
      new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()), new THREE.Vector3(1, 1, 1));
    logSolids.push(depthMesh(g, M, logGroup));
  }
  function buildLogs() {
    logGroup.traverse(o => o.geometry && o.geometry.dispose()); scene.remove(logGroup);
    logGroup = new THREE.Group(); scene.add(logGroup); logSolids.length = 0;
    const m = clamp(K.stickMess, 0, 1), rnd = seeded(K.stickSeed), j = a => (rnd() - 0.5) * 2 * a * m;
    /* the three lying across the pit */
    [[2.1, 0.12, [-1.05, 0.13, -0.55], [1.05, 0.13, -0.5]], [1.7, 0.11, [-0.7, 0.12, 0.45], [0.8, 0.12, 0.3]], [1.1, 0.1, [0.15, 0.1, 0.55], [0.55, 0.1, -0.2]]]
      .forEach(([len, rad, A, B]) => {
        const rot = j(0.9), c = Math.cos(rot), sn = Math.sin(rot), sh = [j(0.35), j(0.35)];
        const T = p => [p[0] * c - p[2] * sn + sh[0], p[1] + Math.abs(j(0.06)), p[0] * sn + p[2] * c + sh[1]];
        log(len * (1 + j(0.25)), rad * (1 + j(0.3)), T(A), T(B));
      });
    /* the teepee */
    const TEEPEE = 6 + Math.round(m * rnd() * 2), apex = [0.02 + j(0.25), 1.62 + j(0.25), 0.02 + j(0.25)];
    for (let i = 0; i < TEEPEE; i++) {
      const a = (i / TEEPEE) * Math.PI * 2 + 0.3 + j(Math.PI / TEEPEE * 1.4), r = (0.78 + (i % 2) * 0.12) * (1 + j(0.35));
      const rad = (0.085 + (i % 3) * 0.01) * (1 + j(0.35));
      const foot = [Math.cos(a) * r, 0.02, Math.sin(a) * r];
      if (m > 0.35 && rnd() < (m - 0.35) * 0.45) {
        /* fallen: lying outward from the pit */
        const L2 = 1.2 + rnd() * 0.7, b = a + j(0.8);
        log(L2, rad, [foot[0], rad, foot[2]], [foot[0] + Math.cos(b) * L2, rad, foot[2] + Math.sin(b) * L2]);
        continue;
      }
      const top = [apex[0] + Math.cos(a) * (0.06 + Math.abs(j(0.22))), apex[1] - (i % 2) * 0.12 + j(0.3), apex[2] + Math.sin(a) * (0.06 + Math.abs(j(0.22)))];
      const len = Math.hypot(top[0] - foot[0], top[1] - foot[1], top[2] - foot[2]) * (1.05 + Math.abs(j(0.25)));
      log(len, rad, foot, top);
    }
  }
  buildLogs();

  /* ── rocks ────────────────────────────────────────────────────────────
     Built from one randomness dial, R in 0..1. At 0 they are a tidy ring of
     like-sized stones; toward 1 every property loosens at once — size,
     proportions, how craggy each one is, how far it sits in or out, how
     unevenly they are spaced, how much they tilt and sink — and a scatter of
     pebbles appears outside the ring. Loosening all of them together is what
     reads as natural: vary only the size and it still looks like a pattern
     with different-sized beads on it.

     Stones are kept from swallowing each other: each is nudged outward
     until it clears the ones already placed. */
  const coolMat = lineMat(INK, 1.1, { opacity: 0.72 });
  const warmMat = lineMat(ACCENT.clone(), 1.25, { opacity: 0.95 });
  let rockGroup = null, ringGroup = null;

  function buildRocks() {
    if (rockGroup) { rockGroup.traverse(o => o.geometry && o.geometry.dispose()); scene.remove(rockGroup); }
    rockGroup = new THREE.Group(); scene.add(rockGroup);
    const rnd = seeded(K.rockSeed), R = clamp(K.randomness, 0, 1);
    const jit = (amt) => (rnd() - 0.5) * 2 * amt;
    const placed = [], solids = [];
    const N = Math.round(K.rocks);
    const pebbles = Math.round(R * R * 7);

    for (let i = 0; i < N + pebbles; i++) {
      const pebble = i >= N;
      const g = new THREE.IcosahedronGeometry(1, 2);
      const pos = g.attributes.position, key = new Map();
      const crag = 0.10 + R * 0.28;
      for (let k = 0; k < pos.count; k++) {
        const x = pos.getX(k), y = pos.getY(k), z = pos.getZ(k);
        const id = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
        if (!key.has(id)) key.set(id, 1 - crag * 0.5 + rnd() * crag);
        const f = key.get(id); pos.setXYZ(k, x * f, y * f, z * f);
      }
      let s = pebble ? 0.1 + rnd() * 0.12 : 0.34 * (1 + jit(0.12 + R * 0.55));
      s = clamp(s, 0.08, 0.72);
      const squash = clamp(0.62 * (1 + jit(R * 0.45)), 0.38, 0.95);
      const ax = 1 + jit(0.12 + R * 0.5), az = 1 + jit(0.1 + R * 0.4);

      let a, r;
      if (pebble) { a = rnd() * Math.PI * 2; r = 2.05 + rnd() * 0.9; }
      else {
        a = (i / N) * Math.PI * 2 + jit((Math.PI / N) * (0.15 + R * 0.85));
        r = 1.55 + jit(0.06 + R * 0.34);
      }
      /* nudge outward until clear of the stones already placed */
      for (let tries = 0; tries < 24; tries++) {
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        const hit = placed.find(p => Math.hypot(p.x - x, p.z - z) < (p.s + s) * 0.95);
        if (!hit) break;
        r += 0.05;
      }
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      placed.push({ x, z, s });
      const tilt = 0.05 + R * 0.35;
      const M = new THREE.Matrix4().compose(
        new THREE.Vector3(x, s * squash * (0.72 - rnd() * R * 0.3), z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(jit(tilt), rnd() * 6.28, jit(tilt))),
        new THREE.Vector3(s * ax, s * squash, s * az));
      solids.push(depthMesh(g, M, rockGroup));
    }
    buildRings(solids);
  }

  /* The rings, split by distance from the fire: near ones take the orange
     and breathe with the flame — the firelight, in a drawing without light. */
  function buildRings(rockSolids) {
    if (ringGroup) { ringGroup.traverse(o => o.geometry && o.geometry.dispose()); scene.remove(ringGroup); }
    ringGroup = new THREE.Group(); scene.add(ringGroup);
    const cool = [], warm = [];
    for (const s of [...logSolids, ...rockSolids]) {
      const segs = []; slice(s.geo, s.matrix, 0.05, segs);
      for (let i = 0; i < segs.length; i += 6) {
        const mx = (segs[i] + segs[i + 3]) / 2, my = (segs[i + 1] + segs[i + 4]) / 2, mz = (segs[i + 2] + segs[i + 5]) / 2;
        const d = Math.hypot(mx, (my - 0.6) * 1.2, mz);
        (d < 1.35 ? warm : cool).push(...segs.slice(i, i + 6));
      }
    }
    makeLines(cool, coolMat, ringGroup);
    makeLines(warm, warmMat, ringGroup);
  }
  buildRocks();

  /* ── ground: dotted contours of the soil around the pit ──────────────── */
  const groundMat = lineMat(INK, 1.0, { opacity: 0.32, dashed: true, dashSize: 0.05, gapSize: 0.07 });
  {
    const N = 120, RR = 6.5, G = new Float32Array(N * N);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const x = (i / (N - 1) * 2 - 1) * RR, z = (j / (N - 1) * 2 - 1) * RR, r = Math.hypot(x, z);
      G[j * N + i] = -Math.exp(-r * r * 0.9) * 0.9 + Math.exp(-Math.pow(r - 1.6, 2) * 3) * 0.35
                   + (fbm(x * 0.35 + 3, z * 0.35 - 1) - 0.5) * 1.1 + r * 0.05;
    }
    const segs = [];
    for (let l = -0.8; l <= 0.7; l += 0.1) {
      march(G, N, N, l, (x0, y0, x1, y1) => {
        const X = v => (v / (N - 1) * 2 - 1) * RR;
        const ax = X(x0), az = X(y0), bx = X(x1), bz = X(y1);
        if (Math.hypot(ax, az) < 1.25) return;
        segs.push(ax, 0.002, az, bx, 0.002, bz);
      });
    }
    makeLines(segs, groundMat);
  }

  /* ── live fields: fire and smoke wisps ───────────────────────────────── */
  function liveLines(maxSegs, mat, colors) {
    const g = new LineSegmentsGeometry();
    g.setPositions(new Float32Array(maxSegs * 6));
    if (colors) g.setColors(new Float32Array(maxSegs * 6));
    const l = new LineSegments2(g, mat); l.frustumCulled = false; scene.add(l);
    return { l, g, max: maxSegs, pos: g.attributes.instanceStart.data.array,
             col: colors ? g.attributes.instanceColorStart.data.array : null };
  }
  const fireMat = lineMat(new THREE.Color(1, 1, 1), 2.3, { vertexColors: true, opacity: 1 });
  const fire = liveLines(9000, fireMat, true);
  fire.l.renderOrder = 4;
  const wispMat = lineMat(INK, 1.0, { opacity: 0.2, dashed: true, dashSize: 0.045, gapSize: 0.06 });
  const wisps = liveLines(4000, wispMat, false);

  const FX = 56, FY = 90, FG = new Float32Array(FX * FY);
  const SX = 40, SY = 60, SG = new Float32Array(SX * SY);
  const RAMP = [
    new THREE.Color('#8e2a10'), new THREE.Color('#c23a14'), ACCENT, new THREE.Color('#f07a3a'),
    new THREE.Color('#f7a54f'), new THREE.Color('#fbd27a'), new THREE.Color('#fff1cf'),
  ];

  /* ── the pointer ─────────────────────────────────────────────────────
     Three layers, so the fire answers a hand without twitching at it:
       P   the raw pointer, exactly where the mouse is;
       M   a first follower that trails it;
       S   a second follower that trails M — two cascaded easings give a
           soft start and a soft stop, and a short, natural delay, where one
           easing would still start the instant the mouse did.
     The fire only ever reads S. On top of that its lean has a speed limit,
     so however fast the hand moves the flame cannot snap. */
  const P = { x: 9, y: 9, inside: false, vx: 0, fan: 0 };
  const M = { x: 9, y: 9 }, S = { x: 9, y: 9, on: 0, wind: 0, fan: 0, lean: 0 };

  function buildFire(t, dt) {
    const H = 3.0 * K.size * (1 + S.fan * 0.3), W = 1.0;
    /* the lean the fire is heading for: wind, plus a gentle shove away from
       a near hand, measured from the middle of the flame */
    const dx = 0 - S.x, dy = H * 0.5 - S.y, r = Math.hypot(dx, dy) + 1e-3;
    const near = Math.exp(-r * r * 0.7) * S.on * K.push;
    const want = S.wind * 0.7 + (dx / r) * near * 0.5;
    const k = 1 - Math.exp(-dt / Math.max(0.05, K.ease));
    const stepMax = dt * 0.9;                                   // lean speed limit
    S.lean = clamp(S.lean + clamp((want - S.lean) * k, -stepMax, stepMax), -0.8, 0.8);
    const lean = S.lean + (K.flicker ? Math.sin(t * 1.3) * 0.05 : 0);
    const speed = 1.7 + S.fan * 0.5;
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
    const L = clamp(Math.round(K.levels), 2, RAMP.length);
    for (let q = 0; q < L; q++) {
      const level = 0.03 + (q / (L - 1)) * 0.72;
      const c = RAMP[Math.round(q / (L - 1) * (RAMP.length - 1))];
      march(FG, FX, FY, level + (1 - ignite) * 0.9, (x0, y0, x1, y1) => {
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

  /* Wisps: a slow smoke field whose noise is carried UP the column, so the
     contours curl and climb rather than shimmer in place, and widen and
     fade as they rise — smoke dissipating. */
  function buildWisps(t) {
    const base = 2.0 * K.size, H = 4.2, W = 1.9;
    for (let j = 0; j < SY; j++) {
      const v = j / (SY - 1);
      const y = base + v * H;
      const dx = 0 - S.x, dy = y - S.y, r = Math.hypot(dx, dy) + 1e-3;
      const near = Math.exp(-r * r * 0.45) * S.on * K.push;
      const cx = S.wind * 1.6 * v + (dx / r) * near * 0.7 * v
               + Math.sin(t * 0.35 + v * 3.2) * 0.28 * v + v * v * 0.45;
      const spread = 0.22 + v * 0.95;
      for (let i = 0; i < SX; i++) {
        const u = (i / (SX - 1) * 2 - 1) * W;
        const col = Math.exp(-Math.pow((u - cx) / spread, 2));
        const n = fbm(u * 1.3 + 7 + Math.sin(v * 4 + t * 0.3) * 0.4, v * 2.0 - t * 0.45, 3);
        SG[j * SX + i] = col * (0.45 + n * 0.95) * (1 - v * 0.85) * Math.min(1, v * 6) * K.smoke * ignite;
      }
    }
    let n = 0;
    for (const level of [0.26, 0.4, 0.55]) {
      march(SG, SX, SY, level, (x0, y0, x1, y1) => {
        if (n >= wisps.max) return;
        const X = a => (a / (SX - 1) * 2 - 1) * W, Y = b => base + b / (SY - 1) * H;
        const o = n * 6;
        wisps.pos[o] = X(x0); wisps.pos[o + 1] = Y(y0); wisps.pos[o + 2] = -0.2;
        wisps.pos[o + 3] = X(x1); wisps.pos[o + 4] = Y(y1); wisps.pos[o + 5] = -0.2;
        n++;
      });
    }
    wisps.g.attributes.instanceStart.data.needsUpdate = true;
    wisps.g.instanceCount = n;
    wisps.l.computeLineDistances();
  }

  /* ── GPU particles: embers and smoke puffs ────────────────────────────
     Stateless: each point knows where it is from its own clock and seed,
     so there is nothing to update per particle on the CPU. */
  const PU = {
    uEmberT: { value: 0 }, uSmokeT: { value: 0 }, uLife: { value: 0 }, uScale: { value: 400 },
    uWind: { value: 0 }, uPtr: { value: new THREE.Vector2(9, 9) }, uOn: { value: 0 }, uPush: { value: 1 },
    uFan: { value: 0 }, uSize: { value: 1 }, uSmokeOp: { value: 1 }, uCol: { value: ACCENT.clone() },
  };
  function points(n, vs, fs) {
    const g = new THREE.BufferGeometry();
    const seeds = new Float32Array(n * 4); for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
    const p = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: PU, vertexShader: vs, fragmentShader: fs, transparent: true, depthWrite: false }));
    p.frustumCulled = false; scene.add(p); return p;
  }
  const PUSH = `
    vec3 pushed(vec3 p, float age, float amt){
      vec2 d = p.xy - uPtr; float rr = length(d) + 1e-3;
      p.xy += (d / rr) * exp(-rr * rr * 1.2) * uOn * uPush * amt * age * age;
      p.x += uWind * amt * age * age;
      return p;
    }`;

  const EMB = 220;
  const embers = points(EMB, `attribute vec4 aSeed;
      uniform float uEmberT, uLife, uScale, uWind, uOn, uPush, uFan, uSize; uniform vec2 uPtr;
      varying float vAge; varying float vFl;
      ${PUSH}
      void main(){
        float t = uEmberT;
        float life = 1.8 + aSeed.x * 2.4;
        float age = fract(t / life + aSeed.y);
        float a = aSeed.z * 6.2832, r = aSeed.w * 0.5;
        vec3 p = vec3(cos(a) * r, 0.35, sin(a) * r * 0.7);
        p.y += age * (2.4 + aSeed.x * 2.2) * uSize * (1.0 + uFan * 0.25);
        p.xz += vec2(cos(a), sin(a)) * age * (0.15 + step(0.85, aSeed.w) * 0.9);
        p.x += sin(t * (1.2 + aSeed.x) + aSeed.y * 30.0) * 0.28 * age;
        p = pushed(p, age, 0.9);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vAge = age; vFl = 0.6 + 0.4 * sin(t * (14.0 + aSeed.z * 20.0) + aSeed.x * 50.0);
        gl_PointSize = (0.02 + aSeed.z * 0.02) * uScale / -mv.z * uLife;
        gl_Position = projectionMatrix * mv;
      }`, `uniform vec3 uCol; varying float vAge; varying float vFl;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.3, d);
        a *= smoothstep(0.0, 0.06, vAge) * (1.0 - smoothstep(0.6, 1.0, vAge)) * vFl;
        vec3 c = mix(vec3(1.0, 0.85, 0.55), uCol, smoothstep(0.1, 0.5, vAge));
        gl_FragColor = vec4(c, a);
        #include <colorspace_fragment>
      }`);

  /* Smoke puffs: soft, warm-grey, very faint. Each rises slowly, sways on a
     slow sine, spreads and grows as it climbs, and thins to nothing — the
     column dissipating rather than being cut off. */
  const PUFFS = 70;
  const puffs = points(PUFFS, `attribute vec4 aSeed;
      uniform float uSmokeT, uLife, uScale, uWind, uOn, uPush, uSize; uniform vec2 uPtr;
      varying float vAge; varying float vSeed;
      ${PUSH}
      void main(){
        float t = uSmokeT;
        float life = 6.0 + aSeed.x * 4.0;
        float age = fract(t / life + aSeed.y);
        /* born above the flame's tip, not inside it — overlapping the fire
           the puffs pile up into a bright cone */
        vec3 p = vec3((aSeed.z - 0.5) * 0.35, 2.7 * uSize, (aSeed.w - 0.5) * 0.25);
        p.y += age * (3.6 + aSeed.x * 1.2);
        /* two slow sways at different rates, so the column meanders */
        p.x += sin(t * 0.35 + aSeed.y * 12.0) * 0.32 * age + sin(t * 0.13 + aSeed.x * 7.0) * 0.18 * age;
        p.x += age * age * 0.45;                                  /* a faint prevailing drift */
        p.z += (aSeed.w - 0.5) * age * 0.8;
        p = pushed(p, age, 1.4);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vAge = age; vSeed = aSeed.x;
        gl_PointSize = (0.35 + age * 1.9 + aSeed.z * 0.3) * uScale / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`, `uniform float uSmokeT, uSmokeOp, uLife; varying float vAge; varying float vSeed;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
        return mix(mix(h(i), h(i+vec2(1,0)), u.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), u.x), u.y); }
      void main(){
        vec2 q = gl_PointCoord - 0.5;
        float d = length(q);
        float n = n2(q * 5.0 + vec2(vSeed * 17.0, uSmokeT * 0.25 - vAge * 3.0)) * 0.6
                + n2(q * 11.0 - vec2(uSmokeT * 0.2, vSeed * 9.0)) * 0.4;
        float a = smoothstep(0.5, 0.08, d) * (0.35 + n * 0.9);
        a *= smoothstep(0.0, 0.3, vAge) * (1.0 - smoothstep(0.35, 1.0, vAge));
        /* very faint on purpose: dozens of these overlap at any point in the
           column, and smoke that reads as solid reads as a spotlight */
        a *= 0.026 * uSmokeOp * uLife;
        gl_FragColor = vec4(vec3(0.62, 0.60, 0.57), a);
        #include <colorspace_fragment>
      }`);
  puffs.renderOrder = 1;

  /* ── sizing ────────────────────────────────────────────────────────── */
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.fov = w / h < 1 ? 48 : 34; camera.updateProjectionMatrix();
    for (const m of mats) m.resolution.set(w, h);
    PU.uScale.value = h * dpr * 0.5 / Math.tan(camera.fov * Math.PI / 360);
  }
  resize(); new ResizeObserver(resize).observe(canvas);

  /* ── pointer input ─────────────────────────────────────────────────── */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const hit = new THREE.Vector3(); let lastX = 0, lastY = 0, lastT = 0;
  section.addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    if (!ray.ray.intersectPlane(plane, hit)) return;
    const now = performance.now(), dt = Math.max(16, now - lastT) / 1000;
    if (P.inside) {
      const vx = clamp((hit.x - lastX) / dt, -8, 8), sp = Math.min(8, Math.hypot(hit.x - lastX, hit.y - lastY) / dt);
      P.vx += (vx - P.vx) * 0.2;
      const near = Math.exp(-Math.pow(Math.hypot(hit.x, hit.y - 1), 2) * 0.35);
      P.fan = Math.min(1, P.fan + sp * near * dt * 0.35);        /* gentler than it was */
    }
    lastX = hit.x; lastY = hit.y; lastT = now; P.inside = true;
    P.x = hit.x; P.y = hit.y;
  }, { passive: true });
  section.addEventListener('pointerleave', () => { P.inside = false; });

  /* ── the run ───────────────────────────────────────────────────────── */
  let raf = 0, visible = false, prev = performance.now(), ignite = reduced ? 1 : 0;
  const clk = { fire: 3, ember: 3, smoke: 3, flow: 0 };

  function frame(now) {
    raf = visible ? requestAnimationFrame(frame) : 0;
    /* Never negative. A frame's timestamp is when the frame STARTED, and can
       land a hair before a performance.now() taken just earlier (on
       becoming visible, say). A negative dt turns every eased follower
       below into one that runs backwards and overshoots — values that grow
       instead of settling. */
    const dt = Math.max(0, Math.min(0.05, (now - prev) / 1000)); prev = Math.max(prev, now);
    const run = K.paused ? 0 : K.speed;

    /* each animation on its own clock */
    clk.fire += dt * run * K.fireSpeed;
    clk.ember += dt * run * K.emberSpeed;
    clk.smoke += dt * run * K.smokeSpeed;
    if (K.flowOn) clk.flow += dt * run * K.flowSpeed;
    ignite = Math.min(1, ignite + dt / 2.4);
    const life = ignite * ignite * (3 - 2 * ignite);

    /* pointer: raw → M → S, each an eased follower (see above) */
    const k1 = 1 - Math.exp(-dt / Math.max(0.04, K.ease * 0.6));
    const k2 = 1 - Math.exp(-dt / Math.max(0.04, K.ease));
    const active = P.inside && K.cursorOn;
    M.x += (P.x - M.x) * k1; M.y += (P.y - M.y) * k1;
    S.x += (M.x - S.x) * k2; S.y += (M.y - S.y) * k2;
    S.on += ((active ? 1 : 0) - S.on) * k2;
    P.vx *= Math.exp(-dt / 0.3);
    P.fan *= Math.exp(-dt / 0.9);
    S.wind += ((active ? clamp(P.vx * 0.03 * K.wind, -0.3, 0.3) : 0) - S.wind) * k2;
    S.fan += ((active ? P.fan : 0) - S.fan) * k2;

    fire.l.visible = K.fireOn;
    if (K.fireOn) buildFire(clk.fire, dt);
    wisps.l.visible = K.smokeOn && K.wisps;
    if (wisps.l.visible) buildWisps(clk.smoke);
    puffs.visible = K.smokeOn;
    embers.visible = K.embersOn;

    /* the firelight on the near rings */
    const t = clk.fire;
    const f = K.flicker ? 0.78 + 0.14 * Math.sin(t * 9.3) * Math.sin(t * 5.7 + 1.3) + 0.08 * Math.sin(t * 23.0) : 0.9;
    const lit = K.fireOn ? life : 0;
    warmMat.opacity = (0.35 + 0.6 * f * (1 + S.fan * 0.2)) * lit + 0.72 * (1 - lit);
    warmMat.color.copy(INK).lerp(ACCENT, lit * (0.75 + 0.25 * f));
    for (const m of mats) m.linewidth = m.userData.w * K.weight;
    groundMat.dashOffset = -clk.flow * 0.08;
    wispMat.dashOffset = -clk.smoke * 0.12;
    wispMat.opacity = 0.3 * K.smokeOpacity;

    PU.uEmberT.value = clk.ember; PU.uSmokeT.value = clk.smoke; PU.uLife.value = life;
    PU.uWind.value = S.wind; PU.uFan.value = S.fan; PU.uSize.value = K.size;
    PU.uPtr.value.set(S.x, S.y); PU.uOn.value = S.on; PU.uPush.value = K.push;
    PU.uSmokeOp.value = K.smokeOpacity;
    embers.geometry.setDrawRange(0, Math.round(EMB * K.embers));
    puffs.geometry.setDrawRange(0, Math.round(PUFFS * clamp(K.smoke, 0, 1)));

    /* the camera drifts a little with the eased pointer — never the raw one */
    const px = active ? clamp(ndc.x, -1, 1) : 0, py = active ? clamp(ndc.y, -1, 1) : 0;
    const kc = 1 - Math.exp(-dt / 1.2);
    {
      const el = K.camElev * Math.PI / 180, az = K.camAzim * Math.PI / 180;
      camHome.set(Math.sin(az) * Math.cos(el) * K.camDist, look.y + Math.sin(el) * K.camDist, Math.cos(az) * Math.cos(el) * K.camDist);
    }
    camera.position.x += (camHome.x + px * 0.22 - camera.position.x) * kc;
    camera.position.y += (camHome.y + py * 0.1 - camera.position.y) * kc;
    camera.position.z += (camHome.z - camera.position.z) * kc;
    camera.lookAt(look);
    renderer.render(scene, camera);
  }

  function setVisible(v, ratio = 1) {
    const was = visible; visible = v;
    if (visible && !was) {
      if (ratio < 0.6 && ignite >= 1 && !reduced) ignite = 0.35;
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
    rebuildRocks: buildRocks,
    /* new sticks (and the rings, which are sliced from them) */
    rebuildLogs() { buildLogs(); buildRocks(); },
    restick() { K.stickSeed = (K.stickSeed * 7 + 11) % 997; buildLogs(); buildRocks(); },
    reshuffle() { K.rockSeed = (K.rockSeed * 7 + 13) % 997; buildRocks(); },
    relight() { ignite = 0; },
    state() { return { ignite, visible, fireSegs: fire.g.instanceCount, wispSegs: wisps.g.instanceCount, fan: S.fan, wind: S.wind, lean: S.lean, on: S.on }; },
    step(n = 1, dt = 1 / 60) {
      const kv = visible, kr = raf; visible = false;
      for (let i = 0; i < n; i++) frame(prev + dt * 1000);
      visible = kv; raf = kr;
    },
  };
}
