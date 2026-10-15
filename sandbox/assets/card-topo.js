/* ══════════════════════════════════════════════════════════════════════════
   Card topo — a live contour field behind one card
   ─────────────────────────────────────────────────────────────────────────
   Tile topo's idea (assets/tile-topo.js) as a card background that is
   always on: a heightfield drifting under marching squares, drawn as
   hairlines in the card's tone. Each card owns a SETTINGS object the page
   can change live (the panel writes straight into it), so every card can
   carry its own animation:

     const t = CardTopo.attach(el, {
       on: true,          // draw it at all
       pattern: 'peak',   // peak · ridge · basin · twin · drift
       seed: 3,           // the landform's own variation
       speed: 0.5,        // how fast the ground drifts (0 = still)
       levels: 10,        // density: how many contour lines
       scale: 1,          // the size of the landforms (higher = more, smaller)
       opacity: 0.5,      // the lines' overall strength
       width: 1,          // px line weight
       colour: '#FF4B1F', // the highest line, and the tint of the rest
       tint: 0.35,        // 0 = the lower lines are gray, 1 = all in colour
       fade: 0,           // 0–1: set by the page for an entrance (multiplies opacity)
     });
     t.settings.levels = 14;     // takes effect on the next frame
     t.reseed(); t.redraw();

   Only cards on screen animate (an IntersectionObserver gates the loop),
   and reduced motion draws one still frame.
   ═════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PATTERNS = ['peak', 'ridge', 'basin', 'twin', 'drift'];

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
  const hexRgb = c => {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(c).trim());
    if (!m) return [255, 75, 31];
    const n = parseInt(m[1], 16); return [n >> 16 & 255, n >> 8 & 255, n & 255];
  };

  const DEFAULTS = { on: true, pattern: 'peak', seed: 1, speed: 0.5, levels: 10, scale: 1, opacity: 0.5, width: 1,
    colour: '#FF4B1F', tint: 0.35, fade: 1 };

  function attach(el, opts = {}) {
    const S = Object.assign({}, DEFAULTS, opts);
    let V, noise;
    function reseed() {
      let s = ((S.seed | 0) * 9301 + 49297) >>> 0;
      const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
      V = { dir: rnd() * Math.PI * 2, px: 0.3 + rnd() * 0.4, py: 0.3 + rnd() * 0.4, qx: 0.2 + rnd() * 0.6, qy: 0.2 + rnd() * 0.6, sign: rnd() < 0.5 ? -1 : 1 };
      noise = makeNoise((S.seed | 0) + 11);
    }
    reseed();

    const cv = document.createElement('canvas');
    cv.className = 'card-topo';
    cv.setAttribute('aria-hidden', 'true');
    cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:block';
    el.prepend(cv);
    const ctx = cv.getContext('2d');
    let W = 0, H = 0, dpr = 1, cols = 0, rows = 0, F = new Float32Array(0);
    const cell = 8;

    function size() {
      const r = el.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      dpr = Math.min(matchMedia('(max-width: 760px), (pointer: coarse)').matches ? 1.5 : 2, devicePixelRatio || 1);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      cols = Math.ceil(W / cell) + 1; rows = Math.ceil(H / cell) + 1;
      F = new Float32Array(cols * rows);
    }

    function field(x, y, t) {
      const aspect = W / H, k = S.scale;
      const n = noise(x * 2.2 * k + Math.cos(V.dir) * t * 0.25, y * 2.2 * k + Math.sin(V.dir) * t * 0.25);
      const dx = (x / aspect - V.px) * k, dy = (y - V.py) * k;
      switch (S.pattern) {
        case 'peak':  return Math.exp(-(dx * dx + dy * dy) * (3.4 + Math.sin(t * 0.6) * 0.6)) * 1.1 + n * 0.45;
        case 'ridge': {
          const c = Math.cos(V.dir), si = Math.sin(V.dir), across = dx * si - dy * c;
          return Math.exp(-across * across * 9) * 0.9 + n * 0.55 + Math.sin((dx * c + dy * si) * 4 + t * 0.5) * 0.08;
        }
        case 'basin': return 1 - Math.exp(-(dx * dx + dy * dy) * 3.2) * 0.9 + n * 0.4;
        case 'twin': {
          const ex = (x / aspect - V.qx) * k, ey = (y - V.qy) * k;
          return Math.exp(-(dx * dx + dy * dy) * 7) + Math.exp(-(ex * ex + ey * ey) * 9) * 0.8 + n * 0.4;
        }
        default: return n * 1.4;
      }
    }

    const lerp = (a, b, va, vb, lv) => a + (b - a) * ((lv - va) / ((vb - va) || 1e-6));
    function draw(t) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const alpha = S.opacity * S.fade;
      if (!S.on || alpha <= 0.002 || !W) return;
      const sh = Math.min(W, H);
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) F[j * cols + i] = field((i * cell) / sh, (j * cell) / sh, t);
      let lo = Infinity, hi = -Infinity;
      for (let i = 0; i < F.length; i++) { if (F[i] < lo) lo = F[i]; if (F[i] > hi) hi = F[i]; }
      ctx.lineWidth = S.width;
      const [r, g, b] = hexRgb(S.colour), levels = Math.max(1, Math.round(S.levels));
      for (let L = 1; L <= levels; L++) {
        const lv = lo + (hi - lo) * (L / (levels + 1)), u = L / levels, top = L === levels;
        /* low lines gray and faint, rising toward the colour at the top */
        const m = top ? 1 : S.tint * u;
        const cr = Math.round(233 + (r - 233) * m), cg = Math.round(236 + (g - 236) * m), cb = Math.round(242 + (b - 242) * m);
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},${(alpha * (top ? 1 : 0.35 + 0.65 * u)).toFixed(3)})`;
        ctx.beginPath();
        for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cols - 1; i++) {
          const a = F[j * cols + i], bb = F[j * cols + i + 1], c = F[(j + 1) * cols + i + 1], d = F[(j + 1) * cols + i];
          const idx = (a > lv ? 8 : 0) | (bb > lv ? 4 : 0) | (c > lv ? 2 : 0) | (d > lv ? 1 : 0);
          if (idx === 0 || idx === 15) continue;
          const x0 = i * cell, y0 = j * cell;
          const T = [lerp(x0, x0 + cell, a, bb, lv), y0], R = [x0 + cell, lerp(y0, y0 + cell, bb, c, lv)];
          const B = [lerp(x0, x0 + cell, d, c, lv), y0 + cell], Lf = [x0, lerp(y0, y0 + cell, a, d, lv)];
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
    }

    let raf = 0, visible = false, t = (S.seed | 0) * 7.3, last = 0;
    function loop(now) {
      raf = 0;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
      if (!REDUCED) t += dt * S.speed * V.sign;
      draw(t);
      if (visible && !REDUCED) raf = requestAnimationFrame(loop); else last = 0;
    }
    const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); }, { rootMargin: '80px' }).observe(el);
    new ResizeObserver(() => { size(); kick(); }).observe(el);
    size();

    return { settings: S, canvas: cv, reseed() { reseed(); kick(); }, redraw: kick };
  }

  global.CardTopo = { attach, PATTERNS, DEFAULTS };
})(window);
