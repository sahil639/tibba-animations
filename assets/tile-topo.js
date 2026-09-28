/* ══════════════════════════════════════════════════════════════════════════
   Tile topo — a live contour field inside one box, on hover
   ─────────────────────────────────────────────────────────────────────────
   The brands wall asks for every block to play "its own" topo animation
   when it is hovered. Fourteen full-screen Topo Lines canvases would be
   absurd, so this is the same idea at a tile's scale: a small heightfield,
   marching squares over it every frame, drawn as hairline segments.

   Each tile gets its own landform from its seed — a single peak, a ridge, a
   basin, a pair of summits or a drifting field — with its own scale, drift
   direction, speed and number of contour levels, so no two blocks move the
   same way. Only a hovered tile runs; it fades out on leave and its loop
   stops once it is invisible, so an idle wall costs nothing.

     TileTopo.attach(el, { seed, colour })
   ═════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function makeNoise(seed) {
    const h = (x, y) => {
      let n = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 1274126177);
      n = Math.imul(n ^ (n >>> 13), 1274126177);
      return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
    };
    const vn = (x, y) => {
      const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
      const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
      const a = h(ix, iy), b = h(ix + 1, iy), c = h(ix, iy + 1), d = h(ix + 1, iy + 1);
      return a + (b - a) * ux + (c - a) * uy + (d - c - b + a) * ux * uy;
    };
    return (x, y) => vn(x, y) * 0.62 + vn(x * 2.1 + 5.3, y * 2.1 - 1.7) * 0.28 + vn(x * 4.3, y * 4.3) * 0.1;
  }

  const PATTERNS = ['peak', 'ridge', 'basin', 'twin', 'drift'];

  function attach(el, o) {
    const seed = o.seed | 0;
    let s = (seed * 9301 + 49297) >>> 0;
    const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    const V = {
      pattern: o.pattern || PATTERNS[seed % PATTERNS.length],
      scale: 0.6 + rnd() * 0.9,
      speed: (0.35 + rnd() * 0.5) * (rnd() < 0.5 ? -1 : 1),
      dir: rnd() * Math.PI * 2,
      levels: 7 + Math.floor(rnd() * 6),
      px: 0.3 + rnd() * 0.4, py: 0.35 + rnd() * 0.35,
      qx: 0.2 + rnd() * 0.6, qy: 0.2 + rnd() * 0.6,
    };
    const noise = makeNoise(seed + 11);

    const cv = document.createElement('canvas');
    cv.className = 'tile-topo';
    cv.setAttribute('aria-hidden', 'true');
    el.prepend(cv);
    const ctx = cv.getContext('2d');
    let W = 0, H = 0, dpr = 1, cols = 0, rows = 0, cell = 9, F = new Float32Array(0);

    function size() {
      const r = el.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      dpr = Math.min(2, devicePixelRatio || 1);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      cols = Math.ceil(W / cell) + 1; rows = Math.ceil(H / cell) + 1;
      F = new Float32Array(cols * rows);
    }

    function field(x, y, t) {
      /* x, y normalised to the tile's short side, so shapes are not
         stretched on a wide block */
      const k = V.scale, n = noise(x * 2.2 * k + Math.cos(V.dir) * t * 0.25, y * 2.2 * k + Math.sin(V.dir) * t * 0.25);
      const aspect = W / H;
      const dx = (x / aspect) - V.px, dy = y - V.py;
      switch (V.pattern) {
        case 'peak':  return Math.exp(-(dx * dx + dy * dy) * (3.4 + Math.sin(t * 0.6) * 0.6)) * 1.1 + n * 0.45;
        case 'ridge': {
          const c = Math.cos(V.dir), si = Math.sin(V.dir);
          const across = dx * si - dy * c;
          return Math.exp(-across * across * 9) * 0.9 + n * 0.55 + Math.sin((dx * c + dy * si) * 4 + t * 0.5) * 0.08;
        }
        case 'basin': return 1 - Math.exp(-(dx * dx + dy * dy) * 3.2) * 0.9 + n * 0.4;
        case 'twin': {
          const ex = (x / aspect) - V.qx, ey = y - V.qy;
          return Math.exp(-(dx * dx + dy * dy) * 7) + Math.exp(-(ex * ex + ey * ey) * 9) * 0.8 + n * 0.4;
        }
        default: return n * 1.4;
      }
    }

    const lerp = (a, b, va, vb, lv) => a + (b - a) * ((lv - va) / ((vb - va) || 1e-6));
    function draw(t) {
      const sh = Math.min(W, H);
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        F[j * cols + i] = field((i * cell) / sh, (j * cell) / sh, t);
      }
      let lo = Infinity, hi = -Infinity;
      for (let i = 0; i < F.length; i++) { if (F[i] < lo) lo = F[i]; if (F[i] > hi) hi = F[i]; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 1;
      const col = o.colour || '#FF4B1F';
      for (let L = 1; L <= V.levels; L++) {
        const lv = lo + (hi - lo) * (L / (V.levels + 1));
        const top = L === V.levels;
        ctx.strokeStyle = top ? col : 'rgba(233,236,242,' + (0.1 + 0.18 * (L / V.levels)).toFixed(3) + ')';
        ctx.globalAlpha = top ? 0.8 : 1;
        ctx.beginPath();
        for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cols - 1; i++) {
          const a = F[j * cols + i], b = F[j * cols + i + 1], c = F[(j + 1) * cols + i + 1], d = F[(j + 1) * cols + i];
          const idx = (a > lv ? 8 : 0) | (b > lv ? 4 : 0) | (c > lv ? 2 : 0) | (d > lv ? 1 : 0);
          if (idx === 0 || idx === 15) continue;
          const x0 = i * cell, y0 = j * cell;
          const T = [lerp(x0, x0 + cell, a, b, lv), y0];
          const R = [x0 + cell, lerp(y0, y0 + cell, b, c, lv)];
          const B = [lerp(x0, x0 + cell, d, c, lv), y0 + cell];
          const Lf = [x0, lerp(y0, y0 + cell, a, d, lv)];
          const seg = (p, q) => { ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); };
          switch (idx) {
            case 1: case 14: seg(Lf, B); break;
            case 2: case 13: seg(B, R); break;
            case 3: case 12: seg(Lf, R); break;
            case 4: case 11: seg(T, R); break;
            case 5: seg(Lf, T); seg(B, R); break;
            case 6: case 9: seg(T, B); break;
            case 7: case 8: seg(Lf, T); break;
            case 10: seg(T, R); seg(Lf, B); break;
          }
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    let raf = 0, on = false, t = rnd() * 50, last = 0, stopAt = 0;
    function loop(now) {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
      if (!REDUCED) t += dt * V.speed;
      draw(t);
      if (on || now < stopAt) raf = requestAnimationFrame(loop);
      else { raf = 0; last = 0; }
    }
    function enter() {
      on = true; el.classList.add('topo-on');
      if (!W) size();
      if (!raf) raf = requestAnimationFrame(loop);
    }
    function leave() {
      on = false; el.classList.remove('topo-on');
      stopAt = performance.now() + 700;          // run through the fade-out
    }
    el.addEventListener('pointerenter', enter);
    el.addEventListener('pointerleave', leave);
    el.addEventListener('focus', enter);
    el.addEventListener('blur', leave);
    new ResizeObserver(() => { size(); if (!raf) draw(t); }).observe(el);
    return { variation: V, enter, leave };
  }

  global.TileTopo = { attach, PATTERNS };
})(window);
