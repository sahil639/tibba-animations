/* ══════════════════════════════════════════════════════════════════════════
   The mark, in five forms — and the move between them
   ─────────────────────────────────────────────────────────────────────────
   The studio mark (assets/brand/favicon.svg) read as what it is: a mountain
   peak, with an upward arrow cut out of it as negative space. This file
   keeps that reading and varies the mountain:

     0  the mark itself — one peak, summit to the right
     1  the same peak turned the other way — summit to the left
     2  one tall peak, summit centred
     3  the main peak with a smaller one at its shoulder
     4  a range: small, main, medium

   The arrow is the constant. Its outline is stored as barycentric
   coordinates of the ORIGINAL triangle, and re-mapped into whichever
   triangle is the main peak of a form — so it keeps the same place in the
   mountain (low, pointing at the summit) however the mountain changes.

   The move: the current form sinks down into its base line and the next
   rises out of the same base — both on easing curves, no spring and no
   overshoot, so the change reads as one smooth breath. Secondary peaks
   follow the main one by a beat. `speed` scales every duration at once;
   `fastSpeed` is what the high-speed option switches it to.

     const m = mountLogoMorph(host, LOGO_MORPH);   // reads cfg live
     m.to(i)      go to form i            m.next()   the next form
     m.cycle(on)  keep cycling (hover)    m.forms    the five forms
   ═════════════════════════════════════════════════════════════════════════ */

/* the easings on offer, as cubic-béziers */
export const MORPH_EASES = {
  'In-out (sine)':  [0.37, 0, 0.63, 1],
  'In-out (cubic)': [0.65, 0, 0.35, 1],
  'In-out (quint)': [0.83, 0, 0.17, 1],
  'Out (expo)':     [0.16, 1, 0.3, 1],
  'In (cubic)':     [0.32, 0, 0.67, 0],
  'Linear':         [0, 0, 1, 1],
};

export const LOGO_MORPH = {
  collapse: 0.32,         // s, the current form sinking into its base
  rise: 0.5,              // s, the next form rising out of it
  collapseEase: 'In (cubic)',
  riseEase: 'In-out (cubic)',
  overlap: 0,             // 0–0.9: how much of the sink the rise may overlap (0 = strictly one then the other)
  follow: 0.06,           // s, secondary peaks' lag behind the main one
  hoverEvery: 0.9,        // s between forms while the pointer is on the mark
  speed: 1,               // multiplies the pace of everything above
  fastSpeed: 2.6,         // the pace the high-speed option uses
  fast: false,            // high-speed option
  colour: '#ffffff',
};
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = t => ((ax * t + bx) * t + cx) * t, Y = t => ((ay * t + by) * t + cy) * t;
  return x => { if (x <= 0) return 0; if (x >= 1) return 1; let lo = 0, hi = 1, t = x;
    for (let i = 0; i < 22; i++) { const v = X(t); if (Math.abs(v - x) < 1e-5) break; if (v < x) lo = t; else hi = t; t = (lo + hi) / 2; } return Y(t); };
}
const easeOf = name => bezier(...(MORPH_EASES[name] || MORPH_EASES['In-out (cubic)']));

/* the original mark, in its own 48-wide frame (favicon.svg's path) */
const BASE = 28;
const T0 = { a: [8, 28], b: [39.0383, 28], c: [28.2219, 8] };
const ARROW = [[15.0685, 24.6037], [26.2673, 20.151], [34.3324, 24.5768], [27.5681, 12.0807]];

function bary(p, t) {
  const [ax, ay] = t.a, [bx, by] = t.b, [cx, cy] = t.c;
  const d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
  const u = ((by - cy) * (p[0] - cx) + (cx - bx) * (p[1] - cy)) / d;
  const v = ((cy - ay) * (p[0] - cx) + (ax - cx) * (p[1] - cy)) / d;
  return [u, v, 1 - u - v];
}
const ARROW_B = ARROW.map(p => bary(p, T0));
/* the arrow keeps its left/right orientation relative to the summit: for
   a peak leaning the other way, the base corners are swapped so the arrow
   mirrors with the mountain rather than staying put */
function arrowIn(t) {
  return ARROW_B.map(([u, v, w]) => [u * t.a[0] + v * t.b[0] + w * t.c[0], u * t.a[1] + v * t.b[1] + w * t.c[1]]);
}

/* peaks: x0/x1 base corners, ax/ay summit. `main` carries the arrow. */
export const FORMS = [
  [{ x0: 8, x1: 39.04, ax: 28.22, ay: 8, main: true }],
  [{ x0: 39.04, x1: 8, ax: 18.8, ay: 8, main: true }],
  [{ x0: 10, x1: 38, ax: 24, ay: 4, main: true }],
  [{ x0: 4, x1: 23, ax: 12, ay: 17 }, { x0: 13, x1: 43, ax: 30, ay: 6, main: true }],
  [{ x0: 2, x1: 19, ax: 10, ay: 17.5 }, { x0: 30, x1: 46, ax: 38.5, ay: 14 }, { x0: 11, x1: 37, ax: 24, ay: 5, main: true }],
];

const tri = p => ({ a: [p.x0, BASE], b: [p.x1, BASE], c: [p.ax, p.ay] });
function peakPath(p) {
  const t = tri(p);
  let d = `M${t.a[0]} ${t.a[1]}L${t.b[0]} ${t.b[1]}L${t.c[0]} ${t.c[1]}Z`;
  if (p.main) d += 'M' + arrowIn(t).map(q => q[0].toFixed(3) + ' ' + q[1].toFixed(3)).join('L') + 'Z';
  return d;
}

export function mountLogoMorph(host, cfg = LOGO_MORPH) {
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  host.innerHTML = `<svg viewBox="0 2 48 27" aria-hidden="true" style="display:block;width:100%;height:100%;overflow:visible"><g></g></svg>`;
  const g = host.querySelector('g');
  let form = 0, busy = false, queued = null, timer = 0;
  let peaks = [];            // { el, s, v, delay }

  function draw(i) {
    g.innerHTML = '';
    peaks = FORMS[i].map((p, k) => {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      el.setAttribute('d', peakPath(p));
      el.setAttribute('fill', cfg.colour);
      el.setAttribute('fill-rule', 'evenodd');
      g.appendChild(el);
      /* secondary peaks rise a beat after the main one */
      return { el, s: 0, v: 0, delay: p.main ? 0 : cfg.follow * (k + 1) };
    });
    /* the main peak last, so it sits over its neighbours */
    peaks.filter((_, k) => FORMS[i][k].main).forEach(p => g.appendChild(p.el));
  }
  const setS = (p, s) => p.el.setAttribute('transform', `translate(0 ${BASE}) scale(1 ${Math.max(0, s).toFixed(4)}) translate(0 ${-BASE})`);

  const pace = () => Math.max(0.05, cfg.fast ? cfg.fastSpeed : cfg.speed);

  function run(next) {
    if (REDUCED) { form = next; draw(form); peaks.forEach(p => setS(p, 1)); return; }
    busy = true;
    const sp = pace(), dSink = Math.max(0.01, cfg.collapse / sp), dRise = Math.max(0.01, cfg.rise / sp);
    const eIn = easeOf(cfg.collapseEase), eOut = easeOf(cfg.riseEase);
    const t0 = performance.now(), from = peaks.map(p => p.s);
    /* 1 — sink into the base; 2 — the next form rises from it. With overlap
       the rise starts before the sink has quite finished. */
    const riseAt = dSink * (1 - Math.min(0.9, cfg.overlap));
    let swapped = false;
    (function frame(now) {
      const t = (now - t0) / 1000;
      if (!swapped) {
        const k = Math.min(1, t / dSink);
        peaks.forEach((p, i) => setS(p, from[i] * (1 - eIn(k))));
        if (t >= riseAt) { swapped = true; form = next; draw(form); peaks.forEach(p => setS(p, 0)); }
        return requestAnimationFrame(frame);
      }
      const tr = t - riseAt;
      let moving = false;
      peaks.forEach(p => {
        const k = Math.min(1, Math.max(0, (tr - p.delay / sp) / dRise));   // secondary peaks lag a beat
        p.s = eOut(k); setS(p, p.s);
        if (k < 1) moving = true;
      });
      if (moving) return requestAnimationFrame(frame);
      busy = false;
      if (queued !== null && queued !== form) { const q = queued; queued = null; run(q); } else queued = null;
    })(t0);
  }

  function to(i) {
    i = ((i % FORMS.length) + FORMS.length) % FORMS.length;
    if (busy) { queued = i; return; }
    if (i !== form) run(i);
  }
  function cycle(on) {
    clearInterval(timer);
    if (on) { to(form + 1); timer = setInterval(() => to(form + 1), cfg.hoverEvery / pace() * 1000); }
  }

  draw(0); peaks.forEach(p => { p.s = 1; setS(p, 1); });
  host.addEventListener('pointerenter', () => cycle(true));
  host.addEventListener('pointerleave', () => cycle(false));
  return { to, next: () => to(form + 1), cycle, get form() { return form; }, forms: FORMS };
}
