/* ══════════════════════════════════════════════════════════════════════════
   Case study — screens in their devices
   ─────────────────────────────────────────────────────────────────────────
   The iPhone and MacBook of the Misc · Prototype page (assets/prototype.js),
   with set screens instead of uploads. Two uses:

   .cf-ba        before / after (Firstpost, Overall impact). Shows the before,
                 and the first time it is on screen blooms into the after with
                 the prototype's contour transition. The switch under the
                 devices plays it either way; each screen scrolls on its own.

   .cf-scrolly   a linear scroll (Shyft & Mindhouse, Shyft Pass). The devices
                 hold still while the page scrolls past, and the page's scroll
                 runs both screens from top to bottom.

   The screens come from the element's data-screens, as JSON:
     { "phone:after": "…webp", "desktop:after": "…webp", "phone:before": … }
   ═════════════════════════════════════════════════════════════════════════ */
import { mountPrototype } from './prototype.js';

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── before / after ───────────────────────────────────────────────────── */
document.querySelectorAll('.cf-ba').forEach(box => {
  const stage = box.querySelector('.cf-proto');
  const P = mountPrototype(stage, null, { screens: JSON.parse(box.dataset.screens), captions: false });
  P.setStyle('contour');
  P.S.duration = 1.6;
  P.S.show = 'before';
  P.setMode('compare');            // starts on the before

  const btns = [...box.querySelectorAll('.cf-ba-switch button')];
  const mark = which => btns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === which)));
  mark('before');
  btns.forEach(b => b.addEventListener('click', () => {
    played = true;
    mark(b.dataset.v);
    if (REDUCED) P.setT(b.dataset.v === 'after' ? 1 : 0);
    else b.dataset.v === 'after' ? P.toAfter() : P.toBefore();
  }));

  /* the first time it is well on screen, the before becomes the after */
  let played = false;
  new IntersectionObserver(([e], io) => {
    if (!e.isIntersecting || played) return;
    io.disconnect(); played = true;
    setTimeout(() => { mark('after'); REDUCED ? P.setT(1) : P.toAfter(); }, 700);
  }, { threshold: .55 }).observe(stage);
});

/* ── the linear scroll ────────────────────────────────────────────────── */
const runs = [...document.querySelectorAll('.cf-scrolly')].map(box => {
  const stage = box.querySelector('.cf-proto');
  mountPrototype(stage, null, { screens: JSON.parse(box.dataset.screens), captions: false });
  return { box, screens: [...stage.querySelectorAll('.proto-scroll')] };
});
if (runs.length) {
  let raf = 0;
  const run = () => {
    raf = 0;
    const vh = innerHeight;
    runs.forEach(({ box, screens }) => {
      const r = box.getBoundingClientRect();
      const span = Math.max(1, r.height - vh * .84);
      const k = Math.min(1, Math.max(0, (vh * .08 - r.top) / span));
      /* eased at both ends, so each screen settles at its top and its foot */
      const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      screens.forEach(s => { s.scrollTop = e * (s.scrollHeight - s.clientHeight); });
    });
  };
  const ask = () => { if (!raf) raf = requestAnimationFrame(run); };
  addEventListener('scroll', ask, { passive: true });
  addEventListener('resize', ask);
  /* the screens' heights are known once their images arrive */
  runs.forEach(({ screens }) => screens.forEach(s => s.querySelectorAll('img').forEach(i => i.addEventListener('load', ask))));
  ask();
}
