// Contour-line mountains for the four case studies, seen from the home hero's camera.
// needs fit-curve: npm i --no-save fit-curve@0.2.0 ; run from the repo root: node tools/make-case-mountains.mjs
// Landforms: SITE_PEAKS[1..4] from the site's landform.js (the clients' own summits).
// node make.mjs <outdir>
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { SITE_PEAKS, clonePeak, prepareLandform, coneAt } from '../sandbox/assets/landform.js';
const require = createRequire(import.meta.url);
const fitCurve = require('fit-curve');

const OUT = process.argv[2] || 'exports/case-mountains/peak-only';
fs.mkdirSync(OUT, { recursive: true });

const W = 1200, H = 900;
const NEUTRAL = '#9299B5';
const CASES = [
  { key: 'firstpost', name: 'Firstpost', peak: 2, colour: '#E05555' },
  { key: 'groww', name: 'Groww', peak: 1, colour: '#4DD9C0' },
  { key: 'breathe-esg', name: 'Breathe ESG', peak: 3, colour: '#4CAF70' },
  { key: 'shyft', name: 'Shyft', peak: 4, colour: '#7B8FF5' },
];
// one camera for all four: the hero's angle (elev 30°, azim 6°, fov 50°)
const CAM = { elev: 30, azim: 6, fov: 50, dist: 118, tgtY: 9 };
const INTERVAL = 1.5;          // world units between contours, shared
const INDEX_EVERY = 5;
const W_MINOR = 1.25, W_INDEX = 2.0;
const EXT = 80, STEP = 0.3, BLUR = 1.4;
const VEXAG = 1.3;   // shared height scale: the clients' summits as steep as the home massif reads
const ZOOM = 1.55;   // shared image scale (a longer lens from the same station)

function field(p) {
  const n = Math.round(2 * EXT / STEP) + 1;
  const g = new Float32Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = -EXT + i * STEP, z = -EXT + j * STEP;
    g[j * n + i] = coneAt(p, x, z) * VEXAG;
  }
  // separable gaussian: takes the grain out, keeps spurs and gullies
  const r = Math.ceil(BLUR * 3 / STEP), k = [];
  let s = 0; for (let t = -r; t <= r; t++) { const v = Math.exp(-((t * STEP) ** 2) / (2 * BLUR * BLUR)); k.push(v); s += v; }
  for (let t = 0; t < k.length; t++) k[t] /= s;
  const tmp = new Float32Array(n * n), out = new Float32Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    let a = 0; for (let t = -r; t <= r; t++) { const ii = Math.min(n - 1, Math.max(0, i + t)); a += g[j * n + ii] * k[t + r]; } tmp[j * n + i] = a;
  }
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    let a = 0; for (let t = -r; t <= r; t++) { const jj = Math.min(n - 1, Math.max(0, j + t)); a += tmp[jj * n + i] * k[t + r]; } out[j * n + i] = a;
  }
  return { n, g: out };
}
function sample(F, x, z) {
  const fx = (x + EXT) / STEP, fz = (z + EXT) / STEP;
  if (fx < 0 || fz < 0 || fx >= F.n - 1 || fz >= F.n - 1) return 0;
  const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, n = F.n, g = F.g;
  const a = g[j * n + i], b = g[j * n + i + 1], c = g[(j + 1) * n + i], d = g[(j + 1) * n + i + 1];
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}

// marching squares with edge-keyed chaining
function contours(F, L) {
  const { n, g } = F, NH = n * n;
  const pt = new Map(), adj = new Map();
  const edgePt = (id) => {
    if (pt.has(id)) return id;
    let i, j, i2, j2;
    if (id < NH) { j = Math.floor(id / n); i = id % n; i2 = i + 1; j2 = j; }
    else { const q = id - NH; j = Math.floor(q / n); i = q % n; i2 = i; j2 = j + 1; }
    const a = g[j * n + i], b = g[j2 * n + i2], t = (L - a) / (b - a);
    pt.set(id, [-EXT + (i + (i2 - i) * t) * STEP, -EXT + (j + (j2 - j) * t) * STEP]);
    return id;
  };
  const link = (a, b) => { edgePt(a); edgePt(b); (adj.get(a) || adj.set(a, []).get(a)).push(b); (adj.get(b) || adj.set(b, []).get(b)).push(a); };
  for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
    const v0 = g[j * n + i], v1 = g[j * n + i + 1], v2 = g[(j + 1) * n + i + 1], v3 = g[(j + 1) * n + i];
    const c = (v0 > L ? 1 : 0) | (v1 > L ? 2 : 0) | (v2 > L ? 4 : 0) | (v3 > L ? 8 : 0);
    if (c === 0 || c === 15) continue;
    const top = j * n + i, bot = (j + 1) * n + i, left = NH + j * n + i, right = NH + j * n + i + 1;
    const center = (v0 + v1 + v2 + v3) / 4 > L;
    switch (c) {
      case 1: case 14: link(left, top); break;
      case 2: case 13: link(top, right); break;
      case 3: case 12: link(left, right); break;
      case 4: case 11: link(right, bot); break;
      case 6: case 9: link(top, bot); break;
      case 7: case 8: link(left, bot); break;
      case 5: if (center) { link(left, bot); link(top, right); } else { link(left, top); link(right, bot); } break;
      case 10: if (center) { link(left, top); link(right, bot); } else { link(left, bot); link(top, right); } break;
    }
  }
  const seen = new Set(), lines = [];
  const walk = (start) => {
    const ids = [start]; seen.add(start);
    let cur = start;
    for (;;) { const nx = (adj.get(cur) || []).find(e => !seen.has(e)); if (nx === undefined) break; seen.add(nx); ids.push(nx); cur = nx; }
    return ids;
  };
  for (const [id, nb] of adj) if (nb.length === 1 && !seen.has(id)) lines.push({ ids: walk(id), closed: false });
  for (const id of adj.keys()) if (!seen.has(id)) { const ids = walk(id); lines.push({ ids, closed: true }); }
  return lines.map(l => ({ closed: l.closed, pts: l.ids.map(id => pt.get(id)) }));
}

function chaikin(p, closed, it) {
  for (let k = 0; k < it; k++) {
    const o = []; const m = p.length;
    if (!closed) o.push(p[0]);
    for (let i = 0; i < (closed ? m : m - 1); i++) {
      const a = p[i], b = p[(i + 1) % m];
      o.push([a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25], [a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75]);
    }
    if (!closed) o.push(p[m - 1]);
    p = o;
  }
  return p;
}
function resample(p, closed, step) {
  const q = closed ? [...p, p[0]] : p; const o = [q[0]]; let acc = 0;
  for (let i = 1; i < q.length; i++) {
    let a = q[i - 1]; const b = q[i]; let d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    while (acc + d >= step) { const t = (step - acc) / d; a = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; o.push(a); d = Math.hypot(b[0] - a[0], b[1] - a[1]); acc = 0; }
    acc += d;
  }
  if (!closed) o.push(q[q.length - 1]);
  return o;
}
const len = (p) => { let s = 0; for (let i = 1; i < p.length; i++) s += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return s; };

function camera(sx, sz) {
  const e = CAM.elev * Math.PI / 180, a = CAM.azim * Math.PI / 180;
  const tgt = [sx, CAM.tgtY, sz];
  const pos = [tgt[0] + CAM.dist * Math.cos(e) * Math.sin(a), tgt[1] + CAM.dist * Math.sin(e), tgt[2] + CAM.dist * Math.cos(e) * Math.cos(a)];
  const f = norm(sub(tgt, pos)), r = norm(cross(f, [0, 1, 0])), u = cross(r, f);
  const fl = ZOOM * (H / 2) / Math.tan(CAM.fov * Math.PI / 360);
  return { pos, project: (P) => { const d = sub(P, pos); const zc = dot(d, f); return [fl * dot(d, r) / zc, -fl * dot(d, u) / zc]; } };
}
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(...a); return [a[0] / l, a[1] / l, a[2] / l]; };

function visible(F, P, cam, maxH) {
  const d = sub(cam.pos, P), L = Math.hypot(...d), u = [d[0] / L, d[1] / L, d[2] / L];
  for (let t = 0.6; t < L; t += 0.35) {
    const y = P[1] + u[1] * t; if (y > maxH) return true;
    if (sample(F, P[0] + u[0] * t, P[2] + u[2] * t) > y + 0.04) return false;
  }
  return true;
}

function bez(points, closed) {
  const segs = fitCurve(points, 0.18);   // squared-pixel error
  if (closed && segs.length > 1) {          // make the seam tangent-continuous
    const p0 = segs[0][0], h1 = segs[0][1], h2 = segs[segs.length - 1][2];
    const t = norm([h1[0] - h2[0], h1[1] - h2[1], 0]);
    const l1 = Math.hypot(h1[0] - p0[0], h1[1] - p0[1]), l2 = Math.hypot(h2[0] - p0[0], h2[1] - p0[1]);
    segs[0][1] = [p0[0] + t[0] * l1, p0[1] + t[1] * l1];
    segs[segs.length - 1][2] = [p0[0] - t[0] * l2, p0[1] - t[1] * l2];
    segs[segs.length - 1][3] = p0;
  }
  return segs;
}
const f1 = (v) => (Math.round(v * 10) / 10).toString();

const report = [];
for (const C of CASES) {
  const p = prepareLandform(clonePeak(SITE_PEAKS[C.peak]));
  p.x = 0; p.z = 0;   // the summit on its own, centred
  const F = field(p);
  let maxH = 0, sx = 0, sz = 0;
  for (let j = 0; j < F.n; j++) for (let i = 0; i < F.n; i++) if (F.g[j * F.n + i] > maxH) { maxH = F.g[j * F.n + i]; sx = -EXT + i * STEP; sz = -EXT + j * STEP; }
  const cam = camera(sx, sz);
  const levels = [];
  for (let n = 1; n * INTERVAL < maxH; n++) {
    const L = n * INTERVAL, runs = [];
    for (const c of contours(F, L)) {
      if (c.pts.length < 6 || len(c.pts) < 4) continue;
      let pts = resample(chaikin(c.pts, c.closed, 3), c.closed, 0.35);
      // split by visibility, in screen space
      const vis = pts.map(q => visible(F, [q[0], L + 0.12, q[1]], cam, maxH + 0.5));
      const all = vis.every(Boolean);
      const scr = pts.map(q => cam.project([q[0], L, q[1]]));
      if (all && c.closed) { runs.push({ pts: scr, closed: true }); continue; }
      // rotate a closed ring so it starts at a hidden point
      let order = [...scr.keys()];
      if (c.closed) { const h = vis.indexOf(false); order = [...order.slice(h), ...order.slice(0, h)]; }
      let cur = [];
      for (const k of order) { if (vis[k]) cur.push(scr[k]); else { if (cur.length) runs.push({ pts: cur, closed: false }); cur = []; } }
      if (cur.length) runs.push({ pts: cur, closed: false });
    }
    const kept = runs.filter(r => len(r.pts) > 12);
    if (kept.length) levels.push({ n, L, runs: kept });
  }
  // frame it: same scale for all, centred on its own bounds
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const l of levels) for (const r of l.runs) for (const q of r.pts) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
  const ox = W / 2 - (x0 + x1) / 2, oy = H / 2 - (y0 + y1) / 2;
  const top3 = new Set(levels.slice(-3).map(l => l.n));
  let anchors = 0;
  const paths = levels.map(l => {
    let d = '';
    for (const r of l.runs) {
      const pts = r.pts.map(q => [q[0] + ox, q[1] + oy]);
      if (r.closed) pts.push(pts[0]);
      const segs = bez(pts, r.closed);
      d += `M${f1(segs[0][0][0])} ${f1(segs[0][0][1])}`;
      for (const s of segs) d += `C${f1(s[1][0])} ${f1(s[1][1])} ${f1(s[2][0])} ${f1(s[2][1])} ${f1(s[3][0])} ${f1(s[3][1])}`;
      if (r.closed) d += 'Z';
      anchors += segs.length + (r.closed ? 0 : 1);
    }
    const stroke = top3.has(l.n) ? C.colour : NEUTRAL;
    const w = l.n % INDEX_EVERY === 0 ? W_INDEX : W_MINOR;
    return `<path id="contour-${String(l.n).padStart(2, '0')}" stroke="${stroke}" stroke-width="${w}" d="${d}"/>`;
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none" stroke-linecap="round" stroke-linejoin="round">\n<title>Mountain – ${C.name}</title>\n<rect width="${W}" height="${H}" fill="#000" stroke="none"/>\n${paths.join('\n')}\n</svg>\n`;
  const file = path.join(OUT, `mountain-${C.key}.svg`);
  fs.writeFileSync(file, svg);
  report.push({ case: C.name, levels: levels.length, top3: [...top3], anchors, kb: +(svg.length / 1024).toFixed(1), bbox: [Math.round(x1 - x0), Math.round(y1 - y0)], maxH: +maxH.toFixed(1) });
}
console.log(JSON.stringify(report, null, 1));
