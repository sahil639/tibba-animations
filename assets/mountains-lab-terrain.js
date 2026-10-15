/* ══════════════════════════════════════════════════════════════════════════
   Mountains Lab — the terrain (no drawing in here)
   ─────────────────────────────────────────────────────────────────────────
   A square heightfield, n × n samples over `extent` world units, built in
   two layers so a mountain can always be re-shaped from its parameters
   without losing the hand work on top of it:

     B   base     the landform (assets/landform.js — the generator the site's
                  own peaks are made with) on the same ground noise the
                  site's range scene lays down
     D   sculpt   every brush stroke, erosion pass and imported depth map,
                  as height added to the base
     M   mask     0..1 per sample; 1 protects it from brushes and erosion

     H = max(0, B + D)   — exactly how range-scene.js's mh() combines them

   Units are the site's: a summit of ~40, a cell of about one. Everything
   here is plain arrays and loops, so it runs the same in a test as on a
   page.
   ═════════════════════════════════════════════════════════════════════════ */
import { fbm, fbmN, coneAt, prepareLandform, peakFromPreset } from './landform.js';

export function createTerrain({ n = 257, extent = 260 } = {}) {
  const T = {
    n, extent, cell: extent / (n - 1),
    B: new Float32Array(n * n), D: new Float32Array(n * n), M: new Float32Array(n * n), H: new Float32Array(n * n),
    maxH: 1, landform: null, useLandform: true, scale: { height: 1, width: 1 }, ground: 6,
    peak: null,
  };
  const idx = (i, j) => j * T.n + i;
  const X = i => -T.extent / 2 + i * T.cell;

  /* ── the base ─────────────────────────────────────────────────────────── */
  T.rebuildBase = function () {
    T.peak = T.useLandform && T.landform ? prepareLandform(peakFromPreset({ landform: T.landform, scale: T.scale }, 0, 0)) : null;
    const { n, B } = T;
    for (let j = 0; j < n; j++) {
      const z = X(j);
      for (let i = 0; i < n; i++) {
        const x = X(i);
        B[j * n + i] = T.ground * (fbm(x * .058 + 1.7, z * .058 + 2.3) - .45) + (T.peak ? coneAt(T.peak, x, z) : 0);
      }
    }
    T.recompute();
  };
  T.recompute = function () {
    const { B, D, H } = T; let m = 0;
    for (let i = 0; i < H.length; i++) { const h = B[i] + D[i]; H[i] = h > 0 ? h : 0; if (H[i] > m) m = H[i]; }
    T.maxH = Math.max(1, m);
  };

  /* ── resolution ───────────────────────────────────────────────────────── */
  T.resize = function (n2) {
    if (n2 === T.n) return;
    const resample = src => { const out = new Float32Array(n2 * n2);
      for (let j = 0; j < n2; j++) for (let i = 0; i < n2; i++) out[j * n2 + i] = bil(src, T.n, i / (n2 - 1) * (T.n - 1), j / (n2 - 1) * (T.n - 1));
      return out; };
    T.D = resample(T.D); T.M = resample(T.M);
    T.n = n2; T.cell = T.extent / (n2 - 1);
    T.B = new Float32Array(n2 * n2); T.H = new Float32Array(n2 * n2);
    T.rebuildBase();
  };
  function bil(a, n, gx, gz) {
    const i = Math.max(0, Math.min(n - 2, Math.floor(gx))), j = Math.max(0, Math.min(n - 2, Math.floor(gz)));
    const fx = gx - i, fz = gz - j;
    const p = a[j * n + i], q = a[j * n + i + 1], r = a[(j + 1) * n + i], s = a[(j + 1) * n + i + 1];
    return p + (q - p) * fx + (r - p) * fz + (s - r - q + p) * fx * fz;
  }
  /** a field at a world point (local to the terrain) */
  T.at = (x, z, a = T.H) => bil(a, T.n, (x + T.extent / 2) / T.cell, (z + T.extent / 2) / T.cell);
  T.inside = (x, z) => Math.abs(x) <= T.extent / 2 && Math.abs(z) <= T.extent / 2;

  /** the highest point, for the camera */
  T.summit = function () {
    let m = -1, k = 0; for (let i = 0; i < T.H.length; i++) if (T.H[i] > m) { m = T.H[i]; k = i; }
    return { x: X(k % T.n), z: X(Math.floor(k / T.n)), h: m };
  };

  /* ── brushes ──────────────────────────────────────────────────────────────
     A dab is one stamp of the brush at a point; a stroke is dabs spaced
     along the pointer's path. Every tool writes into D (or M), scaled by
     what the mask leaves of each sample. */
  const TOOLS = ['raise', 'lower', 'smooth', 'noise', 'crease', 'ridge', 'flatten', 'valley', 'mask', 'unmask'];
  T.TOOLS = TOOLS;
  T.dab = function (tool, x, z, o) {
    const pts = [[x, z]];
    if (o.sym === 'x' || o.sym === 'xz') pts.push([-x, z]);
    if (o.sym === 'z' || o.sym === 'xz') pts.push([x, -z]);
    if (o.sym === 'xz') pts.push([-x, -z]);
    pts.forEach(([px, pz]) => stamp(tool, px, pz, o));
    T.recompute();
  };
  function stamp(tool, px, pz, o) {
    const { n, cell, D, M, H } = T, r = o.size, s = o.strength;
    const ci = (px + T.extent / 2) / cell, cj = (pz + T.extent / 2) / cell, rr = r / cell;
    const i0 = Math.max(1, Math.floor(ci - rr)), i1 = Math.min(n - 2, Math.ceil(ci + rr));
    const j0 = Math.max(1, Math.floor(cj - rr)), j1 = Math.min(n - 2, Math.ceil(cj + rr));
    const hard = o.hardness;
    const k = Math.max(1, Math.round(1.6 / cell));         // the neighbourhood smooth and crease read
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const d = Math.hypot(i - ci, j - cj) / rr; if (d >= 1) continue;
      /* falloff: soft at hardness 0 (a dome), a flat-topped stamp at 1 */
      const e = Math.min(1, (1 - d) / Math.max(.02, 1 - hard));
      const w = e * e * (3 - 2 * e);
      const q = j * n + i;
      if (tool === 'mask')   { M[q] = Math.min(1, M[q] + s * w * .35); continue; }
      if (tool === 'unmask') { M[q] = Math.max(0, M[q] - s * w * .35); continue; }
      const free = 1 - M[q]; if (free <= 0) continue;
      const h = H[q];
      const ii = Math.min(n - 1, i + k), io = Math.max(0, i - k), jj = Math.min(n - 1, j + k), jo = Math.max(0, j - k);
      const avg = (H[j * n + ii] + H[j * n + io] + H[jj * n + i] + H[jo * n + i]) * .25;
      let dh = 0;
      switch (tool) {
        case 'raise':   dh = s * .9 * w; break;
        case 'lower':   dh = -s * .9 * w; break;
        case 'smooth':  dh = (avg - h) * Math.min(1, s * .8) * w; break;
        case 'noise':   dh = (fbmN(X(i) * .16 + o.seed, X(j) * .16 - o.seed, 3) - .5) * 2.4 * s * w; break;
        case 'crease':  dh = (h - avg) * s * 1.2 * w; break;
        case 'ridge':   dh = s * w * (.25 + Math.max(0, Math.min(1.5, (h - avg) * 1.6))) * .9; break;
        case 'flatten': dh = (o.flatH - h) * Math.min(1, s * .6) * w; break;
        case 'valley':  { const v = Math.pow(1 - d, .6); dh = -s * 1.1 * v * Math.min(1, w * 2) + (avg - h) * .15 * w; break; }
      }
      D[q] += dh * free;
    }
  }

  /* ── erosion ───────────────────────────────────────────────────────────────
     Each works on a copy of H and hands the difference back through
     applyHeights(), so the mask limits it the same way it limits a brush. */
  T.applyHeights = function (W) {
    const { H, D, M } = T;
    for (let i = 0; i < H.length; i++) D[i] += (W[i] - H[i]) * (1 - M[i]);
    T.recompute();
  };

  /* wind: material creeps downhill wherever a slope is steeper than it can
     hold, and the lee of every ridge is softened a little */
  T.thermal = function (iters = 2, amt = 1, wind = [1, 0]) {
    const { n, cell } = T, W = T.H.slice(), dlt = new Float32Array(n * n);
    const talus = cell * .62, rate = .22 * amt;
    const wi = Math.sign(wind[0]), wj = Math.sign(wind[1]);
    for (let it = 0; it < iters; it++) {
      dlt.fill(0);
      for (let j = 1; j < n - 1; j++) for (let i = 1; i < n - 1; i++) {
        const q = j * n + i, h = W[q];
        const nb = [q - 1, q + 1, q - n, q + n];
        for (let a = 0; a < 4; a++) {
          const dd = h - W[nb[a]];
          if (dd > talus) { const mv = (dd - talus) * rate * .25; dlt[q] -= mv; dlt[nb[a]] += mv; }
        }
        const up = (j - wj) * n + (i - wi);
        if (W[up] > h) dlt[q] += (W[up] - h) * .012 * amt;
      }
      for (let q = 0; q < W.length; q++) W[q] = Math.max(0, W[q] + dlt[q]);
    }
    T.applyHeights(W);
  };

  /* river: droplets run downhill, picking up ground where they speed up and
     dropping it where they slow — channels cut, fans spread at their feet */
  T.hydraulic = function (drops = 2000, amt = 1, seed = 1) {
    const { n } = T, W = T.H.slice();
    let st = (seed * 2654435761) >>> 0 || 1;
    const rnd = () => { st ^= st << 13; st >>>= 0; st ^= st >>> 17; st ^= st << 5; st >>>= 0; return st / 4294967296; };
    const inertia = .05, capF = 4, minCap = .01, dep = .3, ero = .3 * amt, evap = .02, grav = 4, R = 2;
    const hg = (x, z) => {
      const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j, q = j * n + i;
      const a = W[q], b = W[q + 1], c = W[q + n], d = W[q + n + 1];
      return { h: a * (1 - fx) * (1 - fz) + b * fx * (1 - fz) + c * (1 - fx) * fz + d * fx * fz,
               gx: (b - a) * (1 - fz) + (d - c) * fz, gz: (c - a) * (1 - fx) + (d - b) * fx };
    };
    for (let k = 0; k < drops; k++) {
      let x = 2 + rnd() * (n - 5), z = 2 + rnd() * (n - 5), dx = 0, dz = 0, sp = 1, water = 1, sed = 0;
      for (let life = 0; life < 40; life++) {
        const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j;
        const g = hg(x, z);
        dx = dx * inertia - g.gx * (1 - inertia); dz = dz * inertia - g.gz * (1 - inertia);
        const len = Math.hypot(dx, dz); if (len < 1e-6) break;
        dx /= len; dz /= len; x += dx; z += dz;
        if (x < 2 || z < 2 || x > n - 3 || z > n - 3) break;
        const dh = hg(x, z).h - g.h;
        const cap = Math.max(-dh * sp * water * capF, minCap);
        const q = j * n + i;
        if (sed > cap || dh > 0) {
          const a = dh > 0 ? Math.min(dh, sed) : (sed - cap) * dep;
          sed -= a;
          W[q] += a * (1 - fx) * (1 - fz); W[q + 1] += a * fx * (1 - fz); W[q + n] += a * (1 - fx) * fz; W[q + n + 1] += a * fx * fz;
        } else {
          const a = Math.min((cap - sed) * ero, -dh);
          let wsum = 0;
          for (let b = -R; b <= R; b++) for (let c = -R; c <= R; c++) wsum += Math.max(0, R - Math.hypot(b, c));
          for (let b = -R; b <= R; b++) for (let c = -R; c <= R; c++) {
            const w = Math.max(0, R - Math.hypot(b, c)) / wsum; if (!w) continue;
            const p = (j + b) * n + (i + c), take = Math.min(W[p], a * w);
            W[p] -= take; sed += take;
          }
        }
        sp = Math.sqrt(Math.max(0, sp * sp + dh * grav)); water *= 1 - evap;
      }
    }
    T.applyHeights(W);
  };

  /* glacial: where the ice would gather — the high valleys that collect the
     most flow — the floor is ground down and widened toward a U */
  T.glacial = function (amt = 1) {
    const { n, H } = T, N = n * n;
    const order = new Uint32Array(N); for (let i = 0; i < N; i++) order[i] = i;
    order.sort((a, b) => H[b] - H[a]);
    const acc = new Float32Array(N).fill(1);
    for (let k = 0; k < N; k++) {
      const q = order[k], i = q % n, j = (q - i) / n;
      if (i < 1 || j < 1 || i > n - 2 || j > n - 2) continue;
      let lo = q, lh = H[q];
      for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) { const p = q + b * n + c; if (H[p] < lh) { lh = H[p]; lo = p; } }
      if (lo !== q) acc[lo] += acc[q];
    }
    let maxA = 1; for (let i = 0; i < N; i++) if (acc[i] > maxA) maxA = acc[i];
    const blur = boxBlur(boxBlur(H, n, 4), n, 4), W = H.slice(), lm = Math.log(maxA);
    for (let q = 0; q < N; q++) {
      const v = Math.max(0, Math.min(1, (Math.log(acc[q]) / lm - .32) / .45));
      const band = Math.max(0, Math.min(1, (H[q] / T.maxH - .12) / .3));
      const g = v * band * .5 * amt;
      if (g <= 0) continue;
      const floor = Math.min(H[q], blur[q]) - .6 * v;
      W[q] = Math.max(0, H[q] + (floor - H[q]) * g);
    }
    T.applyHeights(W);
  };
  function boxBlur(src, n, r) {
    const tmp = new Float32Array(n * n), out = new Float32Array(n * n);
    for (let j = 0; j < n; j++) { let s = 0, c = 0;
      for (let i = -r; i < n; i++) {
        if (i + r < n) { s += src[j * n + i + r]; c++; }
        if (i - r - 1 >= 0) { s -= src[j * n + i - r - 1]; c--; }
        if (i >= 0) tmp[j * n + i] = s / c;
      } }
    for (let i = 0; i < n; i++) { let s = 0, c = 0;
      for (let j = -r; j < n; j++) {
        if (j + r < n) { s += tmp[(j + r) * n + i]; c++; }
        if (j - r - 1 >= 0) { s -= tmp[(j - r - 1) * n + i]; c--; }
        if (j >= 0) out[j * n + i] = s / c;
      } }
    return out;
  }

  /* ── depth maps ───────────────────────────────────────────────────────────
     lum: n × n values 0..1 (already resampled to the grid). 'replace' turns
     the landform off and makes the map the whole mountain; 'add' lays it on
     top of what is there. */
  T.importDepth = function (lum, height, mode) {
    if (mode === 'replace') { T.useLandform = false; T.ground = 0; T.rebuildBase(); T.D.fill(0); }
    for (let i = 0; i < T.D.length; i++) T.D[i] += lum[i] * height;
    T.recompute();
  };

  /* ── states ───────────────────────────────────────────────────────────── */
  T.snapshot = () => ({ n: T.n, D: T.D.slice(), M: T.M.slice() });
  T.restore = s => { if (s.n !== T.n) return false; T.D.set(s.D); T.M.set(s.M); T.recompute(); return true; };

  /** how convex each sample is — positive on a ridge, negative in a gully */
  T.ridges = function (out) {
    const { n, H, cell } = T, k = Math.max(1, Math.round(2 / cell));
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const a = H[j * n + Math.min(n - 1, i + k)], b = H[j * n + Math.max(0, i - k)], c = H[Math.min(n - 1, j + k) * n + i], d = H[Math.max(0, j - k) * n + i];
      out[j * n + i] = (H[j * n + i] - (a + b + c + d) * .25) / (k * cell);
    }
    return out;
  };

  return T;
}
