/* ══════════════════════════════════════════════════════════════════════════
   The work reel — a scroll-driven horizontal run of clients
   ─────────────────────────────────────────────────────────────────────────
   What the reference actually does, which is not what it looks like at
   first glance: the nine labels are NOT a list that slides past a window.
   They sit in one row, and the active item's image OPENS between its own
   label and the next one, pushing everything after it to the right.

   That is what produces the motion the whole thing is recognised by. The
   strip drifts left a little on every step while each image opens a much
   wider gap, so the active label walks left to right across the screen even
   though the row underneath it is travelling the other way. Slide a row of
   labels past a fixed image and you get something that looks vaguely
   similar and moves completely wrong.

   One number keeps it honest: the open width is shared. An item's image is
   open by 1 - |a - i|, so mid-transition the outgoing image is closing by
   exactly as much as the incoming one is opening and the total never
   changes. Without that the row jolts sideways at every handover.
   ═════════════════════════════════════════════════════════════════════════ */

export const ITEMS = [
  { label: 'Breathe ESG',     src: 'assets/reel/breathe-esg.svg' },
  { label: 'Groww',           src: 'assets/reel/groww.svg' },
  { label: 'Firstpost',       src: 'assets/reel/firstpost.svg' },
  { label: 'Shyft Mindhouse', src: 'assets/reel/shyft.svg' },
  { label: 'Northwind',       src: 'assets/reel/northwind.svg' },
  { label: 'Casa Ferro',      src: 'assets/reel/casa-ferro.svg' },
  { label: 'Lumen Health',    src: 'assets/reel/lumen-health.svg' },
  { label: 'Atlas Foods',     src: 'assets/reel/atlas-foods.svg' },
  { label: 'Verano Studio',   src: 'assets/reel/verano.svg' },
];

export const P = {
  /* the shape of every handover. Default is a symmetric ease-in-out — slow
     to leave, slow to arrive, quick through the middle. */
  bezier: [0.65, 0.00, 0.35, 1.00],

  /* ── the three lengths, and why they are not constants ─────────────────
     Measured off the reference they are 207, 670 and 45, which advances the
     active label 162px a step. Those hold at the width the reference was
     shot at, about 2000px. Copy them onto a 1024px window and by the sixth
     item the active label is at x=860 and its plate — 207 further along and
     670 wide — is entirely off the right of the screen.

     So the lengths are derived from the window instead, and the drift falls
     out of one requirement: the LAST item's label and plate must still fit
     on screen.

     At 2000px that reproduces the measured slot (208 against 207) and the
     measured plate (670) exactly. It does NOT reproduce the measured drift:
     45 puts the ninth plate about 220px past the right edge, so the
     reference lets its last item run off and this does not. That is a
     deliberate difference, not a miss — on a 1024px window the same 45
     loses the plate entirely from the sixth item on. Turn "Fit to window"
     off in the panel to drive the three lengths by hand. */
  auto: true,
  labelW: 207,      // the slot each label occupies
  imageW: 670,      // how wide an image opens
  drift: 45,        // how far the whole row slides left per step
  startX: 50,       // where the first label sits before anything has moved
  dwell: 0.00,      // fraction of each step spent parked on an item
};

/* ── cubic-bezier, solved rather than approximated ──────────────────────────
   CSS gets this for free; a scroll-driven value does not, because there is
   no transition to hand it to — the position IS the progress. Newton first,
   then bisection for the few inputs where the curve is too flat for Newton
   to converge. */
function bezier(x1, y1, x2, y2) {
  const A = (a, b) => 1 - 3 * b + 3 * a, B = (a, b) => 3 * b - 6 * a, C = a => 3 * a;
  const calc = (t, a, b) => ((A(a, b) * t + B(a, b)) * t + C(a)) * t;
  const slope = (t, a, b) => 3 * A(a, b) * t * t + 2 * B(a, b) * t + C(a);

  return function (x) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    if (x1 === y1 && x2 === y2) return x;          // the identity curve
    let t = x;
    for (let i = 0; i < 8; i++) {
      const d = slope(t, x1, x2);
      if (Math.abs(d) < 1e-6) break;
      const err = calc(t, x1, x2) - x;
      if (Math.abs(err) < 1e-7) return calc(t, y1, y2);
      t -= err / d;
    }
    let lo = 0, hi = 1; t = x;
    for (let i = 0; i < 24; i++) {
      const v = calc(t, x1, x2);
      if (Math.abs(v - x) < 1e-7) break;
      if (v > x) hi = t; else lo = t;
      t = (lo + hi) / 2;
    }
    return calc(t, y1, y2);
  };
}

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const clamp01 = v => clamp(v, 0, 1);

export function mountWorkReel(root) {
  const strip = root.querySelector('.reel-strip');
  const scope = root.closest('.reel-scope') || root.parentElement;

  /* ── markup ─────────────────────────────────────────────────────────── */
  strip.innerHTML = ITEMS.map((it, i) => `
    <div class="reel-item" data-i="${i}">
      <div class="reel-label"><span>${it.label}</span></div>
      <div class="reel-shot"><img src="${it.src}" alt="" draggable="false"></div>
    </div>`).join('');

  const items  = [...strip.querySelectorAll('.reel-item')];
  const labels = [...strip.querySelectorAll('.reel-label')];
  const shots  = [...strip.querySelectorAll('.reel-shot')];
  const imgs   = [...strip.querySelectorAll('.reel-shot img')];

  let ease = bezier(...P.bezier);
  let active = 0;

  /* ── fitting the row to the window ──────────────────────────────────── */
  function fit() {
    if (!P.auto) return;
    const vw = root.clientWidth || innerWidth;
    const margin = 40;
    P.startX = Math.round(clamp(vw * 0.048, 18, 70));
    P.labelW = Math.round(clamp(vw * 0.104, 96, 230));
    P.imageW = Math.round(clamp(vw * 0.335, 240, 760));
    /* the advance the last plate can afford, and the drift that produces it */
    const steps = Math.max(1, ITEMS.length - 1);
    const advance = (vw - margin - P.startX - P.labelW - P.imageW) / steps;
    P.drift = Math.round(clamp(P.labelW - advance, 0, P.labelW - 12));
    root.style.setProperty('--reel-label-w', P.labelW + 'px');
    root.style.setProperty('--reel-shot-h', 'min(78vh, 760px)');
  }

  function apply(a) {
    /* the row's own travel: a slow leftward drift, one step at a time */
    const x = P.startX - a * P.drift;
    strip.style.transform = `translate3d(${x}px, 0, 0)`;

    for (let i = 0; i < items.length; i++) {
      /* shared open width — the closing image gives up exactly what the
         opening one takes, so the row never jolts at a handover */
      const open = clamp01(1 - Math.abs(a - i));
      shots[i].style.width = (P.imageW * open) + 'px';
      imgs[i].style.width = P.imageW + 'px';
      /* the plate slides rather than squashes: the panel is the window */
      imgs[i].style.transform = `translateX(${(open - 1) * P.imageW * 0.18}px)`;
      imgs[i].style.opacity = String(clamp01(open * 1.6));

      const near = clamp01(1 - Math.abs(a - i));
      labels[i].style.setProperty('--near', near.toFixed(3));
    }

    const next = Math.round(a);
    if (next !== active) {
      active = next;
      root.dataset.active = String(active);
      const live = root.querySelector('.reel-live');
      if (live) live.textContent = `${ITEMS[active].label}, ${active + 1} of ${ITEMS.length}`;
    }
  }

  /* ── the conductor ──────────────────────────────────────────────────────
     Scroll position straight to an item index. Each whole step is one
     handover, eased on its own so the curve shapes the transition rather
     than the whole run — a single ease across nine items would crawl in the
     middle and never settle on anything. */
  function onScroll() {
    const travel = scope.offsetHeight - innerHeight;
    const p = travel > 0 ? clamp01(-scope.getBoundingClientRect().top / travel) : 0;

    const steps = ITEMS.length - 1;
    const raw = p * steps;
    const seg = Math.min(steps - 1, Math.floor(raw));
    let t = raw - seg;

    /* an optional flat at each end of a step, so an item can be looked at */
    if (P.dwell > 0) {
      const d = Math.min(0.45, P.dwell);
      t = clamp01((t - d) / Math.max(1e-4, 1 - d * 2));
    }

    apply(seg + ease(t));
    if (window.__reelReadout) window.__reelReadout(p, seg, t);
  }

  fit();
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { fit(); onScroll(); });
  new ResizeObserver(() => { fit(); onScroll(); }).observe(root);
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  onScroll();

  return {
    P, ITEMS,
    setBezier(b) { P.bezier = b.slice(); ease = bezier(...P.bezier); onScroll(); },
    fit() { fit(); onScroll(); },
    refresh() { root.style.setProperty('--reel-label-w', P.labelW + 'px'); onScroll(); },
  };
}
