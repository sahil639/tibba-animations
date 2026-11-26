/* The MVP design page's steps (Nov 2026): one particle canvas
   (assets/particle-morph.js) travels the steps' frame. As the reader scrolls,
   the step nearest the middle of the screen becomes the current one: the
   canvas glides into that step's picture cell while its particles flow out
   of the last step's picture and into this one's. Each step names its
   picture in data-pic on its row. Without WebGL 2 the grey panels stay. */
(() => {
  const box = document.querySelector('.sv-zz[data-morph]');
  if (!box || !window.ParticleMorph) return;
  const rows = [...box.querySelectorAll('.sv-zz-row')];
  const cells = rows.map(r => r.querySelector('.sv-zz-pic'));
  const srcs = rows.map(r => r.dataset.pic);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = matchMedia('(max-width: 760px)').matches;

  const cv = document.createElement('canvas');
  cv.className = 'sv-zz-morph'; cv.setAttribute('aria-hidden', 'true');
  box.appendChild(cv);
  const pm = ParticleMorph(cv, { images: srcs, settings: {
    count: small ? 16000 : 30000, trigger: 'none', playback: 'loop', duration: reduce ? 0.05 : 1.7, hold: 0, stagger: .35,
    style: 'flow', amp: .5, mapping: 'nearest', easing: 'inout',
    size: small ? 1.6 : 1.4, sizeVar: .45, opacity: .95, jitter: .2,
    transparent: true, padding: .08, fit: 'contain', hover: !small, hoverMode: 'repel', radius: .18, strength: .5 } });
  if (!pm) { cv.remove(); return; }
  box.classList.add('morphing');

  /* the canvas sits over a cell: placed at once the first time, glided after */
  let at = -1, want = 0;
  const place = (i, glide) => {
    const c = cells[i], b = box.getBoundingClientRect(), r = c.getBoundingClientRect();
    cv.style.transition = glide && !reduce ? '' : 'none';
    cv.style.left = (r.left - b.left) + 'px'; cv.style.top = (r.top - b.top) + 'px';
    cv.style.width = r.width + 'px'; cv.style.height = r.height + 'px';
    if (!glide) { void cv.offsetWidth; cv.style.transition = ''; }
  };
  place(0, false);
  /* a morph already running can't be redirected: ask again until it lands */
  const settle = () => {
    if (want === at) return;
    if (pm.state().images < srcs.length) { setTimeout(settle, 150); return; }
    if (at < 0) { at = 0; if (want === 0) return; }
    if (pm.goto(want)) { at = want; place(want, true); } else setTimeout(settle, 120);
  };
  const pick = () => {
    const mid = innerHeight / 2; let best = 0, bd = 1e9;
    rows.forEach((r, i) => { const q = r.getBoundingClientRect(), d = Math.abs((q.top + q.bottom) / 2 - mid); if (d < bd) { bd = d; best = i; } });
    if (best !== want) { want = best; settle(); }
  };
  let tick = false;
  addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(() => { tick = false; pick(); }); } }, { passive: true });
  addEventListener('resize', () => place(Math.max(0, at), false));
  settle(); pick();
})();
