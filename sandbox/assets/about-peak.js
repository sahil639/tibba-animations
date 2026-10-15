/* ══════════════════════════════════════════════════════════════════════════
   About — the peak
   ─────────────────────────────────────────────────────────────────────────
   A mountain with one sharp summit, drawn as its contour lines: the height
   field is sliced at even heights (marching squares), each slice is a closed
   ring, and the rings are painted bottom to top, each filled with the page's
   black before it is stroked, so a higher ring hides the far side of the ones
   under it and the stack reads as a solid mountain. Canvas 2D, no library.

   The load: the camera starts high and far, looking straight down on the
   rings as a map, and flies down and in to a low, close view of the peak.

   After it lands the peak answers the pointer:
     · the ridge lines near the pointer take a subtle ordered dither (only
       the lines: the background stays clear, the fill stays black)
     · the ring under the pointer gives up a short stretch of itself to a
       stream of random characters that settle, one by one, into the words
       "tibba design studio" — and close back into a line when left
   On a touch screen a tap does the same for a moment.

     PEAK            every tunable (the panel writes here)
     mountPeak(canvas, host) → { replay() }
   ═════════════════════════════════════════════════════════════════════════ */

export const PEAK = {
  levels: 40,        // contour rings (dense, as on the home page's summits)
  intro: 4.2,        // seconds, the flight from the map to the peak
  endPitch: 14,      // degrees above the horizon at the end
  endYaw: -22,       // degrees round the peak at the end
  endDist: 2.6,      // how close the camera ends (world units)
  dither: 0.55,      // strength of the hover dither (0 = off)
  ditherR: 170,      // its radius round the pointer, px
  text: 'tibba design studio',
  /* the summits' ink (assets/range-scene.js): a cool blue low down, the
     range's lavender through the body, near-white on the summit */
  inkLow: [96, 110, 168], inkMid: [170, 184, 238], inkTop: [240, 243, 250],
  dot: true,         // the glowing, pulsing dot on the summit
  accent: '#FF4B1F',
};

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const rad = d => d * Math.PI / 180;

/* ── the ground: value noise, a sharp summit on a ridge ──────────────── */
function noise2(seed = 3) {
  const h = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453; return s - Math.floor(s); };
  const n = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    return lerp(lerp(h(xi, yi), h(xi + 1, yi), u), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u), v) * 2 - 1;
  };
  return (x, y) => n(x, y) * .55 + n(x * 2.1, y * 2.1) * .28 + n(x * 4.3, y * 4.3) * .17;
}
const fbm = noise2(5);
function height(x, z) {
  const a = -0.38, c = Math.cos(a), s = Math.sin(a);
  const rx = x * c + z * s, rz = -x * s + z * c;
  const r = Math.hypot(rx / 0.9, rz / 0.62);
  let h = Math.pow(Math.max(0, 1 - r), 1.55);                       // the cone: a cusp at the top
  const spine = Math.max(0, 1 - Math.abs(rz) / 0.3) * Math.pow(Math.max(0, 1 - Math.abs(rx) / 1.05), 1.3);
  h = Math.max(h, 0.5 * spine * spine);                              // the ridge running through it
  const sh = (cx, cz, rr, k) => k * Math.pow(Math.max(0, 1 - Math.hypot(x - cx, z - cz) / rr), 1.5);
  h = Math.max(h, sh(-0.5, 0.18, 0.5, 0.42), sh(0.52, -0.22, 0.42, 0.3));  // shoulders
  const away = 1 - Math.exp(-r * 5);                                 // keep the very top clean and sharp
  /* rugged, as the home page's summits are: the rings wander and break */
  h += away * (0.14 * fbm(x * 3.2 + 11, z * 3.2 + 5) + 0.06 * (1 - Math.abs(fbm(x * 6 + 3, z * 6 - 2))) + 0.035 * fbm(x * 11 - 7, z * 11 + 4)) * Math.sqrt(Math.max(0, h));
  const e = Math.max(Math.abs(x), Math.abs(z));
  return Math.max(0, h) * clamp((1 - e) / 0.22, 0, 1);
}

/* ── slicing: marching squares, stitched into closed rings ───────────── */
function slice(levels) {
  const N = 150, V = new Float32Array((N + 1) * (N + 1));
  let max = 0;
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) { const v = height(-1 + 2 * i / N, -1 + 2 * j / N); V[j * (N + 1) + i] = v; if (v > max) max = v; }
  for (let k = 0; k < V.length; k++) V[k] /= max;
  const at = (i, j) => V[j * (N + 1) + i];
  const X = i => -1 + 2 * i / N;
  const out = [];
  for (let l = 0; l < levels; l++) {
    const L = 0.035 + (0.985 - 0.035) * l / (levels - 1);
    const pt = new Map(), adj = new Map();
    const edge = (i, j, horiz) => {
      const id = ((j * (N + 1) + i) << 1) | (horiz ? 0 : 1);
      if (!pt.has(id)) {
        const a = at(i, j), b = horiz ? at(i + 1, j) : at(i, j + 1), t = (L - a) / (b - a);
        pt.set(id, horiz ? [lerp(X(i), X(i + 1), t), X(j)] : [X(i), lerp(X(j), X(j + 1), t)]);
      }
      return id;
    };
    const link = (a, b) => { (adj.get(a) || adj.set(a, []).get(a)).push(b); (adj.get(b) || adj.set(b, []).get(b)).push(a); };
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const v0 = at(i, j), v1 = at(i + 1, j), v2 = at(i + 1, j + 1), v3 = at(i, j + 1);
      const c = (v0 > L) | (v1 > L) << 1 | (v2 > L) << 2 | (v3 > L) << 3;
      if (c === 0 || c === 15) continue;
      const e0 = () => edge(i, j, true), e1 = () => edge(i + 1, j, false), e2 = () => edge(i, j + 1, true), e3 = () => edge(i, j, false);
      const mid = (v0 + v1 + v2 + v3) / 4 > L;
      switch (c) {
        case 1: case 14: link(e3(), e0()); break;
        case 2: case 13: link(e0(), e1()); break;
        case 3: case 12: link(e3(), e1()); break;
        case 4: case 11: link(e1(), e2()); break;
        case 6: case 9: link(e0(), e2()); break;
        case 7: case 8: link(e3(), e2()); break;
        case 5: if (mid) { link(e0(), e1()); link(e2(), e3()); } else { link(e3(), e0()); link(e1(), e2()); } break;
        case 10: if (mid) { link(e3(), e0()); link(e1(), e2()); } else { link(e0(), e1()); link(e2(), e3()); } break;
      }
    }
    const seen = new Set();
    for (const start of adj.keys()) {
      if (seen.has(start)) continue;
      const ring = []; let prev = -1, cur = start;
      while (cur !== undefined && !seen.has(cur)) {
        seen.add(cur); ring.push(pt.get(cur));
        const nb = adj.get(cur); const nx = nb[0] !== prev ? nb[0] : nb[1];
        prev = cur; cur = nx;
      }
      if (ring.length > 8) out.push({ l, L, frac: l / (levels - 1), pts: ring });
    }
  }
  return out;
}

/* the ink up the height: blue-grey at the foot, lavender, white at the top */
function ink(f) {
  const a = PEAK.inkLow, b = PEAK.inkMid, c = PEAK.inkTop;
  const m = (p, q, t) => [0, 1, 2].map(i => Math.round(lerp(p[i], q[i], t)));
  const col = f < .62 ? m(a, b, Math.pow(f / .62, .8)) : m(b, c, (f - .62) / .38);
  const al = .62 + .38 * Math.pow(f, .6);
  return `rgba(${col[0]},${col[1]},${col[2]},${al.toFixed(3)})`;
}
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + .5) / 16);
const GLYPHS = '!<>-_\\/[]{}=+*^?#%&$@0123456789abcdefghijklmnopqrstuvwxyz';

export function mountPeak(canvas, host) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  let rings = slice(PEAK.levels);
  const H_WORLD = 0.9;
  let W = 0, Hh = 0, dpr = 1, narrow = false;
  function resize() {
    W = host.clientWidth; Hh = host.clientHeight; narrow = W < 760;
    dpr = Math.min(devicePixelRatio || 1, 1.75);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(Hh * dpr);
  }
  resize(); new ResizeObserver(resize).observe(host);

  /* the camera: from the map, straight down and far, to the peak, low and close */
  let t0 = performance.now(), landed = REDUCED;
  const ptr = { x: -1e4, y: -1e4, in: false, sx: 0, sy: 0, tap: 0 };
  function cam(now) {
    const k = REDUCED ? 1 : ease(clamp((now - t0) / (PEAK.intro * 1000), 0, 1));
    if (k >= 1 && !landed) { landed = true; host.classList.add('peak-live'); }
    const par = landed ? 1 : 0;
    const pitch = rad(lerp(88, PEAK.endPitch, k) - ptr.sy * 1.5 * par);
    const yaw = rad(lerp(0, PEAK.endYaw, k) + ptr.sx * 3 * par);
    const dist = lerp(7.2, PEAK.endDist, k);
    const T = [0, lerp(0, H_WORLD * 0.52, k), 0];
    const pos = [T[0] + dist * Math.cos(pitch) * Math.sin(yaw), T[1] + dist * Math.sin(pitch), T[2] + dist * Math.cos(pitch) * Math.cos(yaw)];
    const f = [T[0] - pos[0], T[1] - pos[1], T[2] - pos[2]], fl = Math.hypot(...f); f[0] /= fl; f[1] /= fl; f[2] /= fl;
    const r = [-f[2], 0, f[0]], rl = Math.hypot(...r); r[0] /= rl; r[2] /= rl;          // fwd × up
    const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
    /* phones: sized by the width (a tall screen would make it huge), the peak in the top third */
    const focal = (narrow ? W * .62 : Hh / 2) / Math.tan(rad(30) / 2);
    const cx = narrow ? W * .5 : W * .71, cy = narrow ? Hh * .4 : Hh * .5;
    return { pos, f, r, u, focal, cx, cy };
  }
  function project(c, x, y, z, o) {
    const vx = x - c.pos[0], vy = y - c.pos[1], vz = z - c.pos[2];
    const zc = vx * c.f[0] + vy * c.f[1] + vz * c.f[2];
    if (zc < .05) return false;
    o[0] = c.cx + c.focal * (vx * c.r[0] + vy * c.r[1] + vz * c.r[2]) / zc;
    o[1] = c.cy - c.focal * (vx * c.u[0] + vy * c.u[1] + vz * c.u[2]) / zc;
    return true;
  }

  /* the hover: which ring, where on it, and the words it gives up */
  let hov = null;          // { ring, idx, t0, sx, sy }
  function pick(proj) {
    let best = null, bd = 18 * 18;
    for (let n = proj.length - 1; n >= 0; n--) {
      const P = proj[n]; if (!P) continue;
      for (let i = 0; i < P.length; i += 2) {
        const dx = P[i] - ptr.x, dy = P[i + 1] - ptr.y, d = dx * dx + dy * dy;
        if (d < bd) { bd = d; best = { n, i: i >> 1 }; }
      }
      if (best && best.n === n) break;            // the highest ring near the pointer wins: it is the one on top
    }
    return best;
  }

  /* where along a projected ring the words sit: a window of arc length round the anchor */
  function window_(P, idx, len) {
    const n = P.length >> 1, cum = new Float32Array(n + 1);
    for (let i = 1; i <= n; i++) { const a = (i - 1) % n, b = i % n; cum[i] = cum[i - 1] + Math.hypot(P[b * 2] - P[a * 2], P[b * 2 + 1] - P[a * 2 + 1]); }
    const total = cum[n]; if (total < len * 1.15) return null;
    const s0 = cum[idx] - len / 2;
    const at = s => {
      s = ((s % total) + total) % total;
      let lo = 0, hi = n; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; }
      const a = lo % n, b = (lo + 1) % n, t = (s - cum[lo]) / Math.max(1e-6, cum[lo + 1] - cum[lo]);
      const x = lerp(P[a * 2], P[b * 2], t), y = lerp(P[a * 2 + 1], P[b * 2 + 1], t);
      return [x, y, Math.atan2(P[b * 2 + 1] - P[a * 2 + 1], P[b * 2] - P[a * 2])];
    };
    return { s0, len, total, at, cum, n };
  }

  const tmp = [0, 0];
  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden || !W) return;
    ptr.sx += ((ptr.in ? (ptr.x / W - .5) * 2 : 0) - ptr.sx) * .05;
    ptr.sy += ((ptr.in ? (ptr.y / Hh - .5) * 2 : 0) - ptr.sy) * .05;
    const c = cam(now);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, Hh);

    /* project every ring once */
    const proj = rings.map(R => {
      const P = new Float32Array(R.pts.length * 2), y = R.L * H_WORLD;
      for (let i = 0; i < R.pts.length; i++) { if (!project(c, R.pts[i][0], y, R.pts[i][1], tmp)) return null; P[i * 2] = tmp[0]; P[i * 2 + 1] = tmp[1]; }
      return P;
    });

    /* the hover target (after landing) */
    const active = landed && (ptr.in || now < ptr.tap);
    if (active) {
      const p = pick(proj);
      if (!p) { if (hov && Math.hypot(hov.sx - ptr.x, hov.sy - ptr.y) > 40) hov = null; }
      else if (!hov || hov.ring !== p.n || Math.hypot(hov.sx - ptr.x, hov.sy - ptr.y) > 90) hov = { ring: p.n, idx: p.i, t0: now, sx: ptr.x, sy: ptr.y };
    } else hov = null;

    ctx.font = `500 ${narrow ? 11 : 12.5}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
    const adv = ctx.measureText('m').width * 1.06, txt = PEAK.text, tlen = adv * txt.length;
    let win = null;
    if (hov && proj[hov.ring]) win = window_(proj[hov.ring], hov.idx, tlen + adv * 1.5);

    /* the rings, bottom to top: fill with black, then the line */
    ctx.lineJoin = 'round';
    for (let n = 0; n < rings.length; n++) {
      const P = proj[n]; if (!P) continue;
      const m = P.length >> 1;
      ctx.beginPath(); ctx.moveTo(P[0], P[1]);
      for (let i = 1; i < m; i++) ctx.lineTo(P[i * 2], P[i * 2 + 1]);
      ctx.closePath();
      ctx.fillStyle = '#030303'; ctx.fill();
      ctx.strokeStyle = ink(rings[n].frac); ctx.lineWidth = lerp(1.2, 2.9, Math.pow(rings[n].frac, .8));
      if (win && n === hov.ring) {
        /* the line, less the stretch the words take */
        ctx.beginPath();
        const STEP = 2, from = win.s0 + win.len, to = win.s0 + win.total;
        let first = true;
        for (let s = from; s <= to; s += STEP) { const q = win.at(s); if (first) { ctx.moveTo(q[0], q[1]); first = false; } else ctx.lineTo(q[0], q[1]); }
        ctx.stroke();
      } else ctx.stroke();
    }

    /* the dither: only the lines near the pointer, in an ordered pattern */
    if (active && PEAK.dither > 0) dither(ptr.x, ptr.y, PEAK.ditherR, PEAK.dither * clamp((now - (hov ? hov.t0 - 400 : now)) / 400, .6, 1));

    /* the summit's dot: a white core in a soft glow, two rings pulsing out */
    if (PEAK.dot && project(c, 0, H_WORLD * 1.0, 0, tmp)) {
      const k = REDUCED ? 1 : clamp((now - t0) / (PEAK.intro * 1000) * 1.4 - .4, 0, 1);
      if (k > 0) {
        ctx.save(); ctx.globalAlpha = k;
        const g = ctx.createRadialGradient(tmp[0], tmp[1], 0, tmp[0], tmp[1], 26);
        g.addColorStop(0, 'rgba(238,241,248,.55)'); g.addColorStop(.35, 'rgba(159,176,232,.22)'); g.addColorStop(1, 'rgba(159,176,232,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(tmp[0], tmp[1], 26, 0, 7); ctx.fill();
        for (let q = 0; q < 2; q++) {
          const ph = ((now / 1800) + q * .5) % 1;
          ctx.strokeStyle = `rgba(238,241,248,${(.7 * (1 - ph)).toFixed(3)})`; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.arc(tmp[0], tmp[1], 4.5 + ph * 22, 0, 7); ctx.stroke();
        }
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(tmp[0], tmp[1], 3.6, 0, 7); ctx.fill();
        ctx.restore();
      }
    }

    /* the words: random characters settling, left to right, into the text */
    if (win) {
      const pad = adv * .75, e = win.at(win.s0 + pad), f = win.at(win.s0 + win.len - pad);
      const flip = f[0] < e[0];                          // keep the words reading left to right
      const age = now - hov.t0;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let k = 0; k < txt.length; k++) {
        const kk = flip ? txt.length - 1 - k : k;
        const q = win.at(win.s0 + pad + (k + .5) * adv);
        const settle = 140 + kk * 42;
        const done = age > settle + 260;
        const ch = txt[kk] === ' ' ? ' ' : done ? txt[kk] : GLYPHS[(Math.floor(now / 55) * 7 + kk * 13) % GLYPHS.length];
        if (ch === ' ' || age < kk * 18) continue;
        ctx.save(); ctx.translate(q[0], q[1]); ctx.rotate(q[2] + (flip ? Math.PI : 0));
        ctx.fillStyle = done ? '#fff' : PEAK.accent;
        ctx.fillText(ch, 0, 0);
        ctx.restore();
      }
    }
  }

  function dither(x, y, r, amt) {
    const x0 = Math.max(0, Math.floor((x - r) * dpr)), y0 = Math.max(0, Math.floor((y - r) * dpr));
    const x1 = Math.min(canvas.width, Math.ceil((x + r) * dpr)), y1 = Math.min(canvas.height, Math.ceil((y + r) * dpr));
    const w = x1 - x0, h = y1 - y0; if (w <= 0 || h <= 0) return;
    const img = ctx.getImageData(x0, y0, w, h), d = img.data, R2 = (r * dpr) * (r * dpr), cx = x * dpr - x0, cy = y * dpr - y0;
    const cell = Math.max(1, Math.round(dpr));          // one dither cell per css pixel
    for (let j = 0; j < h; j++) {
      const dy = j - cy;
      for (let i = 0; i < w; i++) {
        const o = (j * w + i) * 4;
        if (d[o + 3] === 0) continue;                    // background: untouched
        const dx = i - cx, q = (dx * dx + dy * dy) / R2; if (q > 1) continue;
        const lum = Math.max(d[o], d[o + 1], d[o + 2]) / 255; if (lum < .03) continue; // the black fill: untouched
        const k = amt * (1 - q * q);
        const th = BAYER[(((j + y0) / cell | 0) & 3) * 4 + (((i + x0) / cell | 0) & 3)];
        const on = lum * 1.25 > th ? 1 : 0;
        /* keep the line's own hue: only its brightness is dithered */
        const mx = Math.max(d[o], d[o + 1], d[o + 2], 1), v = lerp(mx / 255, on ? 1 : 3 / 255, k) * 255 / mx;
        d[o] *= v; d[o + 1] *= v; d[o + 2] *= v;
      }
    }
    ctx.putImageData(img, x0, y0);
  }

  host.addEventListener('pointermove', e => { const b = canvas.getBoundingClientRect(); ptr.x = e.clientX - b.left; ptr.y = e.clientY - b.top; ptr.in = e.pointerType === 'mouse'; });
  host.addEventListener('pointerleave', () => { ptr.in = false; });
  host.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse') return;
    const b = canvas.getBoundingClientRect(); ptr.x = e.clientX - b.left; ptr.y = e.clientY - b.top; ptr.tap = performance.now() + 2600; hov = null;
  });
  requestAnimationFrame(frame);
  return {
    replay() { t0 = performance.now(); landed = REDUCED; host.classList.remove('peak-live'); hov = null; },
    rebuild() { rings = slice(PEAK.levels); },
  };
}
