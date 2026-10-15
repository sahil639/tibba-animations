/* ══════════════════════════════════════════════════════════════════════════
   Three peaks — the Shifting Topo centrepiece
   ─────────────────────────────────────────────────────────────────────────
   Three mountains, one per company stage, drawn the way the hero draws its
   peak: contour line only, the hero's ink ramp (dark at the foot, pale at
   the top), an index contour every fifth line, and orange rings on the
   summit of the stage that is selected.

       01  Early-stage startup   — the smallest peak
       02  Mid-size company      — medium
       03  Established company   — the largest

   ── how it is drawn ───────────────────────────────────────────────────────
   One heightfield holds all three peaks. Contours are traced through it by
   marching squares at a fixed interval, so every peak shares one survey
   and the taller the peak, the more lines it has. Each line is a screen-
   space ribbon (LineSegments2) so its weight is set in CSS px, as in the
   hero. The ground under them is drawn into the depth buffer only — it is
   never seen, but it hides the back of each mountain behind its front the
   way a solid would, and the page's own background shows through.

   ── the view ──────────────────────────────────────────────────────────────
   A fixed isometric camera (35.264° elevation, 45° round). No hover, no
   parallax, no drift. The orthographic frame is fitted to the contours'
   own bounds every resize, with padding, so no peak is ever cropped.

   Every value is THREE_PEAKS_CONFIG, below; rebuild() re-reads it.
   ═════════════════════════════════════════════════════════════════════════ */
import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

export const THREE_PEAKS_CONFIG = {
  /* One entry per stage, in stage order. height and radius are world units
     (heights are relative to each other — that is what reads as small,
     medium, large). x/z place the summit on the ground in SCREEN terms:
     x runs left → right across the frame, z runs back (−) to front (+). */
  peaks: [
    { label: 'Early-stage startup', height: 3.6, radius: 3.8, x: -10.5, z: 1.5,  seed: 11 },
    { label: 'Mid-size company',    height: 6.4, radius: 5.2, x: -1.2,  z: -0.5, seed: 23 },
    { label: 'Established company', height: 10,  radius: 6.8, x: 10.2,  z: 0.8,  seed: 37 },
  ],
  heightScale: 1,        // multiplies every peak's height at once
  spacing: 1,            // multiplies every peak's x/z at once (spreads or packs the three)

  /* the landform: how far each peak strays from a plain cone */
  shape: {
    sharp: 1.55,         // profile exponent: 1 = conical, 2 = rounded dome
    ridges: 0.2,         // spur lobes round each peak (0 = circular contours)
    noise: 0.32,         // domain-warp wander of the contours
  },

  contour: {
    interval: 0.42,      // world units between contours — smaller = denser
    lineWidth: 1.35,     // CSS px, the hero's minor contour
    indexEvery: 5,       // every Nth line is an index contour …
    indexWidth: 2.4,     // … at this weight (CSS px)
    summitRings: 3,      // top N contours of the selected peak go orange
    resolution: 240,     // marching-squares grid across the long side
  },

  view: { elev: 35.264, azim: 45, padding: 0.08 },   // isometric; padding = fraction of the frame

  colour: { ink: '#9FB0E8', accent: '#FF4B1F' },
  inactive: 0.42,        // line opacity of the two peaks not selected
  fade: 0.9,             // s, the cross-fade when the stage changes
};

/* the hero's 'peak' ramp (range-scene.js CT_PALETTES.peak), mixed toward
   the ink exactly as its contour shader does: mix(palette(t) × 1.7, ink, .52) */
const RAMP = [[0.170, 0.180, 0.225], [0.400, 0.425, 0.520], [0.640, 0.670, 0.775], [0.845, 0.870, 0.955]];
function ramp(t, ink) {
  t = Math.sqrt(Math.min(1, Math.max(0, t)));
  const seg = t < 0.34 ? [0, t / 0.34] : t < 0.70 ? [1, (t - 0.34) / 0.36] : [2, (t - 0.70) / 0.30];
  const a = RAMP[seg[0]], b = RAMP[seg[0] + 1], u = seg[1];
  return [0, 1, 2].map(k => Math.min(1, (a[k] + (b[k] - a[k]) * u) * 1.7) * 0.48 + ink[k] * 0.52);
}

/* a small value noise for the contours' wander */
const hash = (x, y, s) => {
  let n = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 2147483647);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};
const vnoise = (x, y, s) => {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy, s), b = hash(ix + 1, iy, s), c = hash(ix, iy + 1, s), d = hash(ix + 1, iy + 1, s);
  return a + (b - a) * ux + (c - a) * uy + (d - c - b + a) * ux * uy;
};
const fbm = (x, y, s) => { let v = 0, a = 0.5, f = 1; for (let i = 0; i < 4; i++) { v += a * vnoise(x * f, y * f, s + i); a *= 0.5; f *= 2.07; } return v - 0.5; };

export function createThreePeaks(canvas, opts = {}) {
  const C = THREE_PEAKS_CONFIG;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -500, 500);
  const group = new THREE.Group();
  scene.add(group);

  /* HTML labels on the summits, one per stage */
  const labelHost = opts.labels || null;
  const labels = labelHost ? C.peaks.map((p, i) => {
    const el = document.createElement('span');
    el.className = 'tp-label';
    el.innerHTML = `<b>${String(i + 1).padStart(2, '0')}</b><span>${p.label}</span>`;
    labelHost.appendChild(el);
    return el;
  }) : [];

  let stage = 0;
  let built = [];            // per peak: { lines, rings, top: Vector3 }
  let surface = null;

  /* ── the field ─────────────────────────────────────────────────────── */
  /* screen-aligned x/z → world ground: x along the camera's right, z along
     its forward flattened onto the ground (toward the viewer is +) */
  const peaksNow = () => {
    const a = C.view.azim * Math.PI / 180, rx = Math.cos(a), rz = -Math.sin(a), fx = Math.sin(a), fz = Math.cos(a);
    return C.peaks.map(p => {
      const X = p.x * C.spacing, Z = p.z * C.spacing;
      return { ...p, x: X * rx + Z * fx, z: X * rz + Z * fz, height: p.height * C.heightScale };
    });
  };
  function heightOne(p, x, z) {
    const S = C.shape;
    const w = p.radius * 0.35 * S.noise;
    const wx = x + w * fbm(x * 0.35, z * 0.35, p.seed), wz = z + w * fbm(x * 0.35 + 9, z * 0.35 - 4, p.seed + 5);
    const dx = wx - p.x, dz = wz - p.z;
    const th = Math.atan2(dz, dx);
    const lobes = 1 + S.ridges * (Math.sin(th * 3 + p.seed) * 0.6 + Math.sin(th * 5 - p.seed * 0.7) * 0.4);
    const d = Math.hypot(dx, dz) / (p.radius * lobes);
    if (d >= 1) return 0;
    return p.height * Math.pow(1 - d, S.sharp) * (1 - 0.15 * d * d);
  }

  /* ── build: field → contours → ribbons ────────────────────────────── */
  function build() {
    built.forEach(b => { group.remove(b.lines, b.rings); b.lines.geometry.dispose(); b.rings.geometry.dispose(); });
    if (surface) { group.remove(surface); surface.geometry.dispose(); }
    built = [];
    const P = peaksNow();
    const ink = new THREE.Color(C.colour.ink), inkA = [ink.r, ink.g, ink.b];

    /* the window: every peak's full footprint, and a margin */
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    P.forEach(p => { const r = p.radius * 1.35; x0 = Math.min(x0, p.x - r); x1 = Math.max(x1, p.x + r); z0 = Math.min(z0, p.z - r); z1 = Math.max(z1, p.z + r); });
    const long = Math.max(x1 - x0, z1 - z0), step = long / C.contour.resolution;
    const NX = Math.ceil((x1 - x0) / step) + 1, NZ = Math.ceil((z1 - z0) / step) + 1;
    const H = new Float32Array(NX * NZ), OWN = new Uint8Array(NX * NZ);
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
      const x = x0 + i * step, z = z0 + j * step;
      let h = 0, best = 0, own = 0;
      P.forEach((p, k) => { const v = heightOne(p, x, z); h = Math.max(h, v); if (v > best) { best = v; own = k; } });
      H[j * NX + i] = h; OWN[j * NX + i] = own;
    }

    /* the occluder: the same field as a mesh, depth only */
    const sg = new THREE.PlaneGeometry(x1 - x0, z1 - z0, NX - 1, NZ - 1);
    sg.rotateX(-Math.PI / 2); sg.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
    const sp = sg.attributes.position;
    for (let k = 0; k < sp.count; k++) {
      const i = Math.round((sp.getX(k) - x0) / step), j = Math.round((sp.getZ(k) - z0) / step);
      sp.setY(k, H[Math.min(NZ - 1, Math.max(0, j)) * NX + Math.min(NX - 1, Math.max(0, i))]);
    }
    surface = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ colorWrite: false, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2 }));
    surface.renderOrder = 0;
    group.add(surface);

    /* contours per peak: positions + colours, the summit rings apart */
    const I = C.contour.interval;
    const acc = P.map(() => ({ pos: [], col: [], idxPos: [], idxCol: [], ring: [] }));
    const levels = P.map(p => Math.floor(p.height / I - 1e-6));
    const maxL = Math.max(...levels);
    const lerp = (a, b, va, vb, L) => a + (b - a) * ((L - va) / ((vb - va) || 1e-6));
    for (let L = 1; L <= maxL; L++) {
      const lv = L * I;
      for (let j = 0; j < NZ - 1; j++) for (let i = 0; i < NX - 1; i++) {
        const a = H[j * NX + i], b = H[j * NX + i + 1], c = H[(j + 1) * NX + i + 1], d = H[(j + 1) * NX + i];
        const code = (a > lv ? 8 : 0) | (b > lv ? 4 : 0) | (c > lv ? 2 : 0) | (d > lv ? 1 : 0);
        if (code === 0 || code === 15) continue;
        const X = x0 + i * step, Z = z0 + j * step;
        const e = [
          [lerp(X, X + step, a, b, lv), Z],               // top    a–b
          [X + step, lerp(Z, Z + step, b, c, lv)],        // right  b–c
          [lerp(X, X + step, d, c, lv), Z + step],        // bottom d–c
          [X, lerp(Z, Z + step, a, d, lv)],               // left   a–d
        ];
        const segs = {
          1: [[3, 2]], 2: [[2, 1]], 3: [[3, 1]], 4: [[0, 1]], 5: [[3, 0], [2, 1]], 6: [[0, 2]], 7: [[3, 0]],
          8: [[3, 0]], 9: [[0, 2]], 10: [[3, 2], [0, 1]], 11: [[0, 1]], 12: [[3, 1]], 13: [[2, 1]], 14: [[3, 2]],
        }[code];
        /* the cell belongs to whichever peak its highest corner does */
        const m = Math.max(a, b, c, d);
        const k = OWN[m === a ? j * NX + i : m === b ? j * NX + i + 1 : m === c ? (j + 1) * NX + i + 1 : (j + 1) * NX + i];
        if (L > levels[k]) continue;
        const A = acc[k], t = L / Math.max(1, levels[k]);
        const col = ramp(t, inkA);
        const isRing = L > levels[k] - C.contour.summitRings;
        const isIdx = L % C.contour.indexEvery === 0;
        for (const [u, v] of segs) {
          const s = [e[u][0], lv + 0.02, e[u][1], e[v][0], lv + 0.02, e[v][1]];
          if (isRing) A.ring.push(...s);
          else if (isIdx) { A.idxPos.push(...s); A.idxCol.push(...col, ...col); }
          else { A.pos.push(...s); A.col.push(...col, ...col); }
        }
      }
    }

    const res = new THREE.Vector2(canvas.clientWidth || 1, canvas.clientHeight || 1);
    const mat = (w, colours) => new LineMaterial({ linewidth: w, vertexColors: !!colours, color: colours ? 0xffffff : 0xffffff,
      transparent: true, opacity: 1, resolution: res, worldUnits: false, depthTest: true, depthWrite: false });
    P.forEach((p, k) => {
      const A = acc[k];
      const make = (pos, col, w) => {
        const g = new LineSegmentsGeometry(); g.setPositions(pos.length ? pos : [0, -99, 0, 0, -99, 0]);
        if (col) g.setColors(col.length ? col : [0, 0, 0, 0, 0, 0]);
        const m = new LineSegments2(g, mat(w, col)); m.renderOrder = 2; group.add(m); return m;
      };
      const lines = make(A.pos, A.col, C.contour.lineWidth);
      const index = make(A.idxPos, A.idxCol, C.contour.indexWidth);
      const rings = make(A.ring, null, C.contour.lineWidth * 1.2);
      rings.renderOrder = 3;
      built.push({ lines, index, rings, top: new THREE.Vector3(p.x, p.height, p.z), levels: levels[k], alpha: 1 });
    });
    /* index contours rode along as a third mesh; keep them with the lines */
    built.forEach(b => { b.lines.userData.index = b.index; });
    fit();
    paint(0);
  }

  /* ── colour and opacity for the selected stage ─────────────────────── */
  const accent = new THREE.Color(), inkTop = new THREE.Color();
  function paint(dur) {
    accent.set(C.colour.accent);
    const ink = new THREE.Color(C.colour.ink), top = ramp(1, [ink.r, ink.g, ink.b]);
    inkTop.setRGB(top[0], top[1], top[2]);
    built.forEach((b, k) => {
      const on = k === stage, target = on ? 1 : C.inactive;
      const ringCol = on ? accent : inkTop;
      const mats = [b.lines.material, b.index.material, b.rings.material];
      if (!dur || REDUCED || !window.gsap) {
        mats.forEach(m => { m.opacity = target; });
        b.rings.material.color.copy(ringCol);
      } else {
        window.gsap.to(mats, { opacity: target, duration: dur, ease: 'power2.inOut' });
        window.gsap.to(b.rings.material.color, { r: ringCol.r, g: ringCol.g, b: ringCol.b, duration: dur, ease: 'power2.inOut' });
      }
      if (labels[k]) labels[k].classList.toggle('on', on);
    });
  }

  /* ── the fixed isometric frame, fitted to the contours ────────────── */
  const _v = new THREE.Vector3();
  function fit() {
    const W = canvas.clientWidth || 1, Hh = canvas.clientHeight || 1;
    renderer.setSize(W, Hh, false);
    const e = C.view.elev * Math.PI / 180, a = C.view.azim * Math.PI / 180;
    camera.position.set(Math.sin(a) * Math.cos(e) * 100, Math.sin(e) * 100, Math.cos(a) * Math.cos(e) * 100);
    camera.up.set(0, 1, 0);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    /* the bounds of everything drawn, in camera space */
    let l = Infinity, r = -Infinity, b = Infinity, t = -Infinity;
    const P = peaksNow();
    P.forEach(p => {
      const R = p.radius * 1.3;
      for (let k = 0; k < 24; k++) {
        const th = k / 24 * Math.PI * 2;
        for (const y of [0, p.height]) {
          _v.set(p.x + Math.cos(th) * (y ? 0 : R), y, p.z + Math.sin(th) * (y ? 0 : R)).applyMatrix4(camera.matrixWorldInverse);
          l = Math.min(l, _v.x); r = Math.max(r, _v.x); b = Math.min(b, _v.y); t = Math.max(t, _v.y);
        }
      }
    });
    const pad = C.view.padding, cx = (l + r) / 2, cy = (b + t) / 2;
    let hw = (r - l) / 2 / (1 - 2 * pad), hh = (t - b) / 2 / (1 - 2 * pad);
    if (hw / hh > W / Hh) hh = hw * Hh / W; else hw = hh * W / Hh;
    camera.left = cx - hw; camera.right = cx + hw; camera.top = cy + hh; camera.bottom = cy - hh;
    camera.updateProjectionMatrix();
    built.forEach(bb => [bb.lines, bb.index, bb.rings].forEach(m => m.material.resolution.set(W, Hh)));
  }

  function placeLabels() {
    if (!labels.length) return;
    const W = canvas.clientWidth, Hh = canvas.clientHeight;
    built.forEach((b, k) => {
      _v.copy(b.top).project(camera);
      labels[k].style.transform = `translate3d(${((_v.x * 0.5 + 0.5) * W).toFixed(1)}px, ${((-_v.y * 0.5 + 0.5) * Hh).toFixed(1)}px, 0)`;
    });
  }

  /* only draws when something changed: the scene is still */
  let dirty = true;
  const ro = new ResizeObserver(() => { fit(); dirty = true; });
  ro.observe(canvas);
  (function loop() {
    requestAnimationFrame(loop);
    const tweening = window.gsap && built.some(b => window.gsap.isTweening(b.lines.material));
    if (!dirty && !tweening) return;
    dirty = false;
    renderer.render(scene, camera);
    placeLabels();
  })();

  build();
  return {
    CONFIG: C,
    /** Select stage i (0–2): its peak comes forward and takes the orange rings. */
    setStage(i, dur = C.fade) { stage = i; paint(dur); dirty = true; },
    /** Re-read THREE_PEAKS_CONFIG and rebuild the contours. */
    rebuild() { build(); paint(0); dirty = true; },
    /** Only re-read colours, opacities and line widths — cheap, no retrace. */
    restyle() {
      built.forEach(b => { b.lines.material.linewidth = C.contour.lineWidth; b.index.material.linewidth = C.contour.indexWidth; b.rings.material.linewidth = C.contour.lineWidth * 1.2; });
      paint(0); dirty = true;
    },
    reframe() { fit(); dirty = true; },
    get stage() { return stage; },
    levels: () => built.map(b => b.levels),
  };
}
