/* ══════════════════════════════════════════════════════════════════════════
   The footer's skyline
   ─────────────────────────────────────────────────────────────────────────
   A black ridge across the top of the footer, generated rather than drawn, so
   no two loads get quite the same horizon. It is 2D canvas, not WebGL: it is
   a silhouette — one fill, no shading, no depth — and asking for a third GL
   context on a page that already has two to draw a filled polygon would be
   the expensive way to do a cheap thing.

   ── the ripple ────────────────────────────────────────────────────────────
   On hover the ridge pixelates in a ring travelling out from the pointer, and
   resolves behind it.

   Done by keeping two copies of the silhouette: one at full resolution and
   one at a block-sized fraction of it, both drawn once when the ridge is
   generated. A frame is then the full-resolution copy, with the small copy
   scaled back up — smoothing off, so it lands as hard blocks — and clipped to
   the ring. Nothing is sampled per pixel and no image data is read back; the
   whole effect is two drawImage calls and a clip, which is what lets it run
   on pointermove without costing anything.
   ═════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  const BLOCK = 13;         // pixels per block at the ripple's coarsest
  const SPEED = 900;        // how fast the ring travels, px a second
  const BAND  = 170;        // how wide the pixelated ring is
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function build(canvas) {
    const ctx = canvas.getContext('2d');
    const full = document.createElement('canvas');
    const fctx = full.getContext('2d');
    const small = document.createElement('canvas');
    const sctx = small.getContext('2d');

    let W = 0, H = 0, dpr = 1;
    let ripples = [];
    let raf = 0, last = performance.now();

    /* ── the ridge itself ────────────────────────────────────────────────
       A run of peaks across the width, each with its own height and a couple
       of steps on its flanks, joined by valleys. Straight segments only: the
       reference's skyline is folded paper, not a smooth curve, and a spline
       through these points would round off exactly the corners that give it
       its character. */
    function silhouette(w, h) {
      const pts = [];
      let x = 0;
      const base = h;                       // the bottom of the canvas
      pts.push([0, base]);
      /* a peak every 130–260px, so the count follows the width rather than
         being fixed — the same ridge on a phone would be one huge mountain */
      while (x < w) {
        const span = 130 + Math.random() * 130;
        const peak = h * (0.30 + Math.random() * 0.62);
        const px = x + span * (0.35 + Math.random() * 0.3);

        /* a step on the way up, on about half of them */
        if (Math.random() < 0.5) {
          pts.push([x + span * 0.18, base - peak * (0.25 + Math.random() * 0.2)]);
        }
        pts.push([px, base - peak]);
        if (Math.random() < 0.5) {
          pts.push([px + span * 0.2, base - peak * (0.42 + Math.random() * 0.25)]);
        }
        x += span;
        pts.push([x, base - h * (0.05 + Math.random() * 0.16)]);   // the valley
      }
      pts.push([w, base]);
      return pts;
    }

    function draw() {
      const pts = silhouette(W, H);
      fctx.setTransform(1, 0, 0, 1, 0, 0);
      fctx.clearRect(0, 0, full.width, full.height);
      fctx.scale(dpr, dpr);
      fctx.fillStyle = getComputedStyle(canvas).getPropertyValue('--ridge') || '#161617';
      fctx.beginPath();
      fctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) fctx.lineTo(pts[i][0], pts[i][1]);
      fctx.closePath();
      fctx.fill();

      /* the blocky copy, made by drawing the full one into a small canvas —
         the browser's own downscale is the averaging step, for free */
      sctx.setTransform(1, 0, 0, 1, 0, 0);
      sctx.clearRect(0, 0, small.width, small.height);
      sctx.drawImage(full, 0, 0, small.width, small.height);
    }

    function resize() {
      const r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      dpr = Math.min(2, devicePixelRatio || 1);
      W = r.width; H = r.height;
      canvas.width = full.width = Math.round(W * dpr);
      canvas.height = full.height = Math.round(H * dpr);
      small.width = Math.max(1, Math.round(W / BLOCK));
      small.height = Math.max(1, Math.round(H / BLOCK));
      draw();
      paint();
    }

    function paint() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(full, 0, 0);

      if (!ripples.length) return;
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.imageSmoothingEnabled = false;       // the whole point: hard blocks
      for (const rp of ripples) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
        ctx.arc(rp.x, rp.y, Math.max(0, rp.r - BAND), 0, Math.PI * 2, true);
        ctx.clip('evenodd');
        ctx.globalAlpha = rp.a;
        ctx.drawImage(small, 0, 0, small.width, small.height, 0, 0, W, H);
        ctx.restore();
      }
      ctx.restore();
    }

    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      let alive = false;
      for (const rp of ripples) {
        rp.r += SPEED * dt;
        /* it fades on its way out rather than stopping at a radius — a ring
           that simply vanishes at its limit reads as a clipping bug */
        rp.a = Math.max(0, 1 - rp.r / (Math.max(W, H) * 1.15));
        if (rp.a > 0.01) alive = true;
      }
      ripples = ripples.filter(rp => rp.a > 0.01);
      paint();
      raf = alive ? requestAnimationFrame(frame) : 0;
    }

    canvas.addEventListener('pointermove', e => {
      if (REDUCED) return;
      const r = canvas.getBoundingClientRect();
      const last2 = ripples[ripples.length - 1];
      /* one ripple per gesture, not one per event: pointermove fires far more
         often than a ring is worth starting, and a stack of them overlapping
         washes the whole ridge out into blocks */
      if (last2 && last2.r < 90) return;
      ripples.push({ x: e.clientX - r.left, y: e.clientY - r.top, r: 0, a: 1 });
      if (ripples.length > 3) ripples.shift();
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
    }, { passive: true });

    new ResizeObserver(resize).observe(canvas);
    resize();

    /* a fresh horizon on every load, and on demand from the tuning panel */
    return { regenerate() { draw(); paint(); } };
  }

  global.mountFooterRange = build;
})(window);
