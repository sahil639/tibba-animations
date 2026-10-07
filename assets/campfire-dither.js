/* ══════════════════════════════════════════════════════════════════════════
   Campfire, dithered — the footer's fire as a one-bit / ASCII drawing
   ─────────────────────────────────────────────────────────────────────────
   A campfire built for a screen of cells rather than pixels: crossed logs
   with their cut ends showing rings, a flame field that sways and licks,
   embers climbing out of it, and the logs lit by the fire's flicker. It is
   drawn at the resolution of the grid itself and then put on screen one
   cell at a time, either as

     dither   an ordered (Bayer) dot per cell, lit or not — the reference's
              pixel campfire
     ascii    a character per cell, from a ramp of increasing ink

   in one of two palettes: 'warm' (ink for the wood, the site's orange
   running to pale gold through the flame) or 'mono' (ink only).

     const fire = mountDitherFire(canvas, { mode: 'dither', palette: 'warm' });
     fire.K.cell = 6;              // live
     fire.features()               // where the flame, core and logs are, in CSS px

   The static layer (the wood) is drawn once per size; only the flame, the
   light and the embers are recomputed each frame, and only while on screen.
   ═════════════════════════════════════════════════════════════════════════ */
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

function h2(x, y) { let n = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263); n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967295; }
function vn(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), u = x - xi, v = y - yi, su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v);
  const a = h2(xi, yi), b = h2(xi + 1, yi), c = h2(xi, yi + 1), d = h2(xi + 1, yi + 1);
  return a + (b - a) * su + (c - a) * sv + (a - b - c + d) * su * sv;
}
const fbm = (x, y) => vn(x, y) * 0.55 + vn(x * 2.1 + 7, y * 2.1 - 3) * 0.3 + vn(x * 4.3 - 2, y * 4.3 + 9) * 0.15;
const clamp01 = t => t < 0 ? 0 : t > 1 ? 1 : t;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));

export const DITHER_DEFAULTS = {
  mode: 'dither',        // dither · ascii
  palette: 'warm',       // warm · mono
  cell: 5,               // px per cell
  dot: 0.78,             // dither: the dot's share of its cell
  contrast: 1.15,
  flame: 1,              // flame height
  speed: 1,
  embers: 1,             // 0..2
  light: 1,              // how much the fire lights the wood
  wood: 1,               // the wood's brightness (lower = sparser dots, so the flame reads apart from it)
  ink: '#e8e3dc', accent: '#FF4B1F', gold: '#FFD9A0',
  x: 0.5, y: 0.74,       // where the fire's base sits, share of the canvas
  scale: 1,              // overall size
  ramp: ' .,:;-=+*#%@',
};

export function mountDitherFire(canvas, opts = {}) {
  const K = Object.assign({}, DITHER_DEFAULTS, opts);
  const ctx = canvas.getContext('2d');
  const off = document.createElement('canvas'), octx = off.getContext('2d', { willReadFrequently: true });
  let W = 0, H = 0, dpr = 1, gw = 0, gh = 0, S = new Float32Array(0), L = new Float32Array(0), HT = new Float32Array(0);
  let cellUsed = 0, geo = null;
  const ptr = { x: -1e4, y: -1e4, k: 0, kt: 0 };
  /* a click on the flame blows it apart: it scatters as sparks, goes out,
     and then lights again from nothing — G is how much fire there is */
  const LIFE = { scatter: 0.9, dark: 0.7, regrow: 2.4 };
  let G = 1, out = null;                       // out: seconds since the click, while it relights
  const BURST = Array.from({ length: 160 }, () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 1, max: 1 }));

  /* the fire's frame, in CSS px */
  function layout() {
    const s = Math.min(W * 0.62, H * 0.8) * 0.5 * K.scale;
    geo = { cx: W * K.x, base: H * K.y, s };
  }
  /* the logs: [x0, y0, x1, y1, radius] in units of s from the base; the
     first end is the cut end that faces the viewer */
  const LOGS = [
    [-1.0, 0.42, 0.22, -0.2, 0.17],     // front left, cut end toward us
    [1.02, 0.36, -0.26, -0.22, 0.16],   // front right
    [0.12, 0.78, 0.0, -0.12, 0.17],     // straight at the viewer
    [0.8, -0.34, -0.12, 0.02, 0.12],    // back right
    [-0.82, -0.3, 0.16, 0.02, 0.12],    // back left
  ];

  /* ── the wood, drawn once per size into the grid-resolution layer ──── */
  function drawStatic() {
    const C = K.cell, g = geo;
    gw = Math.ceil(W / C); gh = Math.ceil(H / C);
    off.width = gw; off.height = gh;
    octx.setTransform(1 / C, 0, 0, 1 / C, 0, 0);
    octx.fillStyle = '#000'; octx.fillRect(0, 0, W, H);
    /* the ground, a soft pool */
    const pool = octx.createRadialGradient(g.cx, g.base, 0, g.cx, g.base, g.s * 1.6);
    pool.addColorStop(0, 'rgba(255,255,255,.16)'); pool.addColorStop(1, 'rgba(255,255,255,0)');
    octx.save(); octx.translate(g.cx, g.base); octx.scale(1, 0.32); octx.translate(-g.cx, -g.base);
    octx.fillStyle = pool; octx.beginPath(); octx.arc(g.cx, g.base, g.s * 1.6, 0, Math.PI * 2); octx.fill(); octx.restore();
    /* logs, back to front (furthest up the screen first) */
    const logs = LOGS.map(l => l).sort((a, b) => Math.min(a[1], a[3]) - Math.min(b[1], b[3]));
    logs.forEach(([x0, y0, x1, y1, r]) => {
      const ax = g.cx + x0 * g.s, ay = g.base + y0 * g.s, bx = g.cx + x1 * g.s, by = g.base + y1 * g.s;
      const R = r * g.s, dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len;
      /* the barrel: lit along its top, shadowed under */
      const grad = octx.createLinearGradient(ax + nx * R, ay + ny * R, ax - nx * R, ay - ny * R);
      grad.addColorStop(0, 'rgb(70,70,70)'); grad.addColorStop(0.4, 'rgb(185,185,185)'); grad.addColorStop(0.78, 'rgb(245,245,245)'); grad.addColorStop(1, 'rgb(120,120,120)');
      octx.fillStyle = grad;
      octx.beginPath();
      octx.moveTo(ax + nx * R, ay + ny * R); octx.lineTo(bx + nx * R * 0.85, by + ny * R * 0.85);
      octx.lineTo(bx - nx * R * 0.85, by - ny * R * 0.85); octx.lineTo(ax - nx * R, ay - ny * R); octx.closePath(); octx.fill();
      /* bark: a few dark streaks along it */
      octx.strokeStyle = 'rgba(0,0,0,.45)'; octx.lineWidth = Math.max(1, R * 0.08);
      for (let k = -2; k <= 2; k++) {
        const o = k * R * 0.32;
        octx.beginPath(); octx.moveTo(ax + nx * o + dx * 0.08, ay + ny * o + dy * 0.08); octx.lineTo(ax + nx * o + dx * (0.45 + 0.1 * k), ay + ny * o + dy * (0.45 + 0.1 * k)); octx.stroke();
      }
      /* the cut end, with its rings */
      const ang = Math.atan2(dy, dx);
      octx.save(); octx.translate(ax, ay); octx.rotate(ang);
      octx.fillStyle = 'rgb(205,205,205)'; octx.beginPath(); octx.ellipse(0, 0, R * 0.45, R, 0, 0, Math.PI * 2); octx.fill();
      octx.strokeStyle = 'rgb(10,10,10)'; octx.lineWidth = Math.max(1.5 * C, R * 0.11);
      for (let k = 1; k <= 3; k++) { octx.beginPath(); octx.ellipse(0, 0, R * 0.45 * k / 3.4, R * k / 3.4, 0, 0, Math.PI * 2); octx.stroke(); }
      octx.restore();
    });
    const d = octx.getImageData(0, 0, gw, gh).data;
    S = new Float32Array(gw * gh); L = new Float32Array(gw * gh); HT = new Float32Array(gw * gh);
    for (let i = 0; i < gw * gh; i++) S[i] = d[i * 4] / 255;
    cellUsed = C;
  }

  /* ── embers ──────────────────────────────────────────────────────── */
  const EMB = Array.from({ length: 70 }, () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1 }));
  function spawn(e) {
    const g = geo; e.x = g.cx + (Math.random() - 0.5) * g.s * 0.4; e.y = g.base - g.s * 0.3;
    e.vx = (Math.random() - 0.5) * 18; e.vy = -(40 + Math.random() * 70) * K.flame; e.max = 1.2 + Math.random() * 2; e.life = 0;
  }
  EMB.forEach(e => { e.life = 99; });

  function resize() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height); dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    layout(); drawStatic();
  }

  /* ── a frame ─────────────────────────────────────────────────────── */
  let t = 0, last = 0, raf = 0, visible = false;
  function frame(now) {
    raf = visible && !REDUCED ? requestAnimationFrame(frame) : 0;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
    t += dt * K.speed;
    if (K.cell !== cellUsed) { layout(); drawStatic(); }
    const g = geo, C = K.cell;
    ptr.k += (ptr.kt - ptr.k) * (1 - Math.exp(-dt * 3));
    if (out !== null) {
      out += dt;
      const a = LIFE.scatter, b = a + LIFE.dark, c = b + LIFE.regrow;
      if (out < a) G = Math.pow(1 - out / a, 2);
      else if (out < b) G = 0;
      else if (out < c) { const q = (out - b) / LIFE.regrow; G = q * q * (3 - 2 * q); }
      else { G = 1; out = null; }
    }
    const flick = 0.82 + 0.1 * Math.sin(t * 9.1) * Math.sin(t * 5.3 + 1) + 0.08 * Math.sin(t * 21);
    const fh = g.s * 1.55 * K.flame * (1 + ptr.k * 0.25) * (0.94 + 0.06 * flick) * Math.max(0.02, G);
    const lightR2 = Math.pow(g.s * 1.25, 2);
    /* the wood, lit by the fire */
    const fy = g.base - g.s * 0.35;
    for (let j = 0; j < gh; j++) {
      const y = (j + 0.5) * C;
      for (let i = 0; i < gw; i++) {
        const k = j * gw + i, x = (i + 0.5) * C;
        const d2 = (x - g.cx) ** 2 + ((y - fy) * 1.4) ** 2;
        const lit = 0.62 + K.light * 0.7 * flick * G * Math.exp(-d2 / lightR2);
        L[k] = S[k] * lit * K.wood; HT[k] = 0;
      }
    }
    /* the flame: only inside its box */
    const x0 = Math.max(0, Math.floor((g.cx - g.s * 0.9) / C)), x1 = Math.min(gw - 1, Math.ceil((g.cx + g.s * 0.9) / C));
    const y0 = Math.max(0, Math.floor((g.base - g.s * 0.1 - fh * 1.1) / C)), y1 = Math.min(gh - 1, Math.ceil((g.base + g.s * 0.05) / C));
    for (let j = y0; j <= y1; j++) {
      const y = (j + 0.5) * C, v = (g.base - g.s * 0.1 - y) / fh;
      if (v < -0.08 || v > 1.15) continue;
      for (let i = x0; i <= x1; i++) {
        const x = (i + 0.5) * C, u = (x - g.cx) / (g.s * 0.62);
        const vv = Math.max(0, v);
        const n = fbm(u * 1.8 + 3, vv * 2.4 - t * 2.1);
        const sway = Math.sin(t * 1.6 + vv * 3.2) * 0.12 * vv + (n - 0.5) * 0.5 * vv;
        /* a teardrop: full in the lower third, licking to a point */
        const w = 0.62 * Math.pow(1 - Math.min(1, vv), 0.72) * (0.55 + 0.9 * Math.sqrt(Math.min(1, vv * 3 + 0.12))) * (0.8 + 0.4 * n) + 0.02;
        const d = Math.abs(u - sway) / w;
        let F = Math.pow(clamp01(1 - d), 0.7) * clamp01((v + 0.08) / 0.16);
        F *= 0.62 + 0.62 * fbm(u * 3.6 - 5, vv * 4.4 - t * 3.3);
        if (G < 1) F *= clamp01(G * 1.6 - (1 - G) * (n - 0.3));          // breaking up as it goes
        /* licks: detached tongues near the top */
        if (vv > 0.55) F *= clamp01(1.4 - (vv - 0.55) * 2.2 + (fbm(u * 5, vv * 6 - t * 4) - 0.5) * 1.6);
        if (F <= 0.01) continue;
        const k = j * gw + i;
        const heat = clamp01(F * 1.25);
        if (heat > HT[k]) HT[k] = heat;
        L[k] = Math.max(L[k], clamp01(F * 1.15));
      }
    }
    /* embers */
    const nE = Math.round(EMB.length * clamp01(K.embers / 2) * G);
    /* the scattered sparks */
    BURST.forEach(e => {
      if (e.life >= e.max) return;
      e.life += dt; e.vy += 30 * dt; e.vx *= 1 - dt * 1.4; e.vy *= 1 - dt * 1.2;
      e.x += e.vx * dt; e.y += e.vy * dt;
      const i = Math.floor(e.x / C), j = Math.floor(e.y / C);
      if (i < 0 || j < 0 || i >= gw || j >= gh) return;
      const k = j * gw + i, a = clamp01(1 - e.life / e.max);
      L[k] = Math.max(L[k], a); HT[k] = Math.max(HT[k], a * (0.5 + 0.5 * a));
    });
    EMB.forEach((e, n) => {
      if (n >= nE) return;
      e.life += dt * K.speed;
      if (e.life > e.max) { spawn(e); if (Math.random() < 0.5) e.life = Math.random() * e.max; }
      e.x += (e.vx + Math.sin(t * 3 + n) * 14) * dt * K.speed; e.y += e.vy * dt * K.speed;
      const i = Math.floor(e.x / C), j = Math.floor(e.y / C);
      if (i < 0 || j < 0 || i >= gw || j >= gh) return;
      const k = j * gw + i, a = clamp01(1 - e.life / e.max);
      L[k] = Math.max(L[k], a); HT[k] = Math.max(HT[k], a * 0.8);
    });
    draw();
  }

  /* ── on screen ───────────────────────────────────────────────────── */
  function draw() {
    const C = K.cell, mono = K.palette === 'mono';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const ink = hex(K.ink), acc = hex(K.accent), gold = hex(K.gold);
    /* colour buckets so the fill style changes a handful of times, not per cell */
    const B = 8, buckets = Array.from({ length: B + 1 }, () => []);
    const ramp = K.ramp, ascii = K.mode === 'ascii';
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
      const k = j * gw + i;
      let l = clamp01((L[k] - 0.5) * K.contrast + 0.5);
      if (l <= 0.02) continue;
      if (ascii) { const ci = Math.min(ramp.length - 1, Math.floor(l * ramp.length)); if (ci <= 0) continue; buckets[mono || HT[k] < 0.08 ? 0 : 1 + Math.min(B - 1, Math.floor(HT[k] * B))].push(i, j, ci); }
      else { if (l <= BAYER[(j & 3) * 4 + (i & 3)]) continue; buckets[mono || HT[k] < 0.08 ? 0 : 1 + Math.min(B - 1, Math.floor(HT[k] * B))].push(i, j, 0); }
    }
    const sz = Math.max(1, C * K.dot), pad = (C - sz) / 2;
    if (ascii) { ctx.font = `${Math.round(C * 1.3)}px ui-monospace, 'SFMono-Regular', Menlo, monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; }
    buckets.forEach((list, b) => {
      if (!list.length) return;
      let col;
      if (b === 0) col = `rgb(${ink.join(',')})`;
      else {
        const h = (b - 0.5) / B;                        // orange at the edge, pale gold at the core
        const m = h < 0.6 ? 0 : (h - 0.6) / 0.4;
        col = `rgb(${acc.map((v, q) => Math.round(v + (gold[q] - v) * m)).join(',')})`;
      }
      ctx.fillStyle = col;
      for (let n = 0; n < list.length; n += 3) {
        const x = list[n] * C, y = list[n + 1] * C;
        if (ascii) ctx.fillText(ramp[list[n + 2]], x + C / 2, y + C / 2);
        else ctx.fillRect(x + pad, y + pad, sz, sz);
      }
    });
  }

  /* ── the pointer fans the flame a little ─────────────────────────── */
  const host = canvas.parentElement || canvas;
  host.addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    const d = Math.hypot(x - geo.cx, (y - geo.base + geo.s * 0.6) * 1.2) / (geo.s * 1.4);
    ptr.kt = clamp01(1 - d);
  }, { passive: true });
  host.addEventListener('pointerleave', () => { ptr.kt = 0; canvas.style.cursor = ''; });
  const onFlame = e => {
    const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, g = geo;
    return Math.abs(x - g.cx) < g.s * 0.75 && y < g.base + g.s * 0.2 && y > g.base - g.s * 1.9;
  };
  host.addEventListener('pointermove', e => { if (K.blowOut !== false) canvas.style.cursor = onFlame(e) && G > 0.5 ? 'pointer' : ''; }, { passive: true });
  host.addEventListener('click', e => {
    if (K.blowOut === false) return;                           // a page can keep its fire lit
    if (out !== null || !onFlame(e) || e.target.closest('a, button, input')) return;
    out = 0;
    const g = geo, fh = g.s * 1.55 * K.flame;
    BURST.forEach(p => {
      const a = Math.random() * Math.PI * 2, sp = (60 + Math.random() * 220) * (g.s / 160);
      p.x = g.cx + (Math.random() - 0.5) * g.s * 0.5; p.y = g.base - g.s * 0.1 - Math.random() * fh * 0.7;
      p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp - 40; p.life = 0; p.max = 0.6 + Math.random() * 1.1;
    });
    kick();
  });

  const kick = () => { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); }, { rootMargin: '60px' }).observe(canvas);
  new ResizeObserver(() => { resize(); if (REDUCED) frame(performance.now()); }).observe(canvas);
  resize();
  if (REDUCED) frame(performance.now());

  return {
    K,
    relayout() { layout(); drawStatic(); kick(); },
    /* where the parts of the fire are, for an overlay to point at (CSS px) */
    features() {
      const g = geo, fh = g.s * 1.55 * K.flame;
      const end = i => ({ x: g.cx + LOGS[i][0] * g.s, y: g.base + LOGS[i][1] * g.s, r: LOGS[i][4] * g.s });
      return {
        base: { x: g.cx, y: g.base }, s: g.s,
        tip: { x: g.cx + Math.sin(t * 1.6 + 3) * g.s * 0.05, y: g.base - g.s * 0.1 - fh * 0.82 },
        core: { x: g.cx, y: g.base - g.s * 0.1 - fh * 0.25 },
        logs: LOGS.map((_, i) => end(i)),
        heat: () => { let s = 0, n = 0; for (let i = 0; i < HT.length; i++) if (HT[i] > 0) { s += HT[i]; n++; } return n ? s / n : 0; },
        t,
      };
    },
  };
}
