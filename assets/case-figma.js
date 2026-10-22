/* ══════════════════════════════════════════════════════════════════════════
   Case study — the Figma-built variations: the moving parts
   ─────────────────────────────────────────────────────────────────────────
   1. Stages. Every slide is drawn in the design's own 1380 × 776.25
      coordinates (.cf-stage) and scaled here to the width it is given.

   2. The phone columns (Groww, the slide after Groww Stories). Four columns
      of iPhones, five phones each, looped (each column is its five, twice,
      so it wraps seamlessly). Still until pointed at; while the pointer is
      over the slide the columns run — neighbours in opposite directions —
      easing up to speed, and easing to a stop where they are when it
      leaves. On touch, a tap starts and stops them.

      The columns stand where the design puts them: x is where each column
      sits on the slide, y0 where its first phone starts (both in design
      pixels). Images: assets/work/groww-figma/phone-NN.webp.
   ═════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── 1. stages ─────────────────────────────────────────────────────── */
  const W = 1380;
  const fit = () => document.querySelectorAll('.cf-slide').forEach(s => {
    const st = s.querySelector('.cf-stage'); if (st) st.style.setProperty('--k', (s.clientWidth / W).toFixed(5));
  });
  new ResizeObserver(fit).observe(document.documentElement);
  fit();

  /* ── 2. the phone columns ──────────────────────────────────────────── */
  const box = document.querySelector('.cf-phones');
  if (!box) return;
  const DIR = 'assets/work/groww-figma/';
  const PH = 584.515, GAP = 49, STEP = PH + GAP, LOOP = STEP * 5;
  const COLUMNS = [
    { x: 24.91,   y0: -373.87, dir: -1, phones: ['01', '02', '06', '03', '15'] },
    { x: 372.10,  y0: -583.87, dir:  1, phones: ['03', '04', '03', '15', '06'] },
    { x: 725.21,  y0: -340.87, dir: -1, phones: ['05', '06', '02', '07', '04'] },
    { x: 1078.33, y0: -512.88, dir:  1, phones: ['07', '15', '07', '05', '01'] },
  ];
  const stage = box.querySelector('.cf-stage');
  const cols = COLUMNS.map(c => {
    const el = document.createElement('div');
    el.className = 'cf-col';
    el.style.left = c.x + 'px';
    /* five, then the same five again, so the loop has no seam */
    el.innerHTML = [...c.phones, ...c.phones].map(n => `<img src="${DIR}phone-${n}.webp" alt="" draggable="false" loading="lazy" decoding="async">`).join('');
    stage.appendChild(el);
    return { el, c, off: 0 };
  });
  box.setAttribute('aria-label', 'Groww Stories on iPhone — point at the slide to set the columns moving');

  const SPEED = 70;                    // design px per second at full speed
  let on = false, v = 0, last = 0, raf = 0;
  /* wrap the travel into one set's length, (−LOOP, 0]: with two sets in
     the column the slide is always covered, and at rest (off = 0) each
     column stands exactly where the design has it */
  const place = k => {
    const w = ((k.off % LOOP) - LOOP) % LOOP;
    k.el.style.transform = `translate3d(0, ${(k.c.y0 + w).toFixed(2)}px, 0)`;
  };
  cols.forEach(place);

  function tick(now) {
    const dt = last ? Math.min(.05, (now - last) / 1000) : 0; last = now;
    const target = on ? SPEED : 0;
    v += (target - v) * (1 - Math.exp(-dt * (on ? 2.6 : 3.4)));   // ease up, ease to a stop
    cols.forEach(k => { k.off += k.c.dir * v * dt; place(k); });
    if (on || v > .4) raf = requestAnimationFrame(tick);
    else { raf = 0; last = 0; v = 0; }
  }
  const go = state => {
    if (REDUCED) return;
    on = state;
    if (!raf) { last = 0; raf = requestAnimationFrame(tick); }
  };
  box.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') go(true); });
  box.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch') go(false); });
  box.addEventListener('pointerup', e => { if (e.pointerType === 'touch') go(!on); });
})();
