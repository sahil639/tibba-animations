/* Shyft & Mindhouse on phones (Nov 2026): the behaviour for assets/shyft-m.css.
   Desktop never runs any of it. */
if (matchMedia('(max-width: 760px)').matches) {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* the moving rows only move while on screen */
  const seen = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('run', e.isIntersecting)));
  document.querySelectorAll('.sm-flow, .sm-heads').forEach(el => seen.observe(el));

  /* card carousels: native horizontal scrolling (a vertical swipe stays
     the page's); the dots follow the card nearest the left edge */
  document.querySelectorAll('.sm-cards').forEach(box => {
    const track = box.querySelector('.sm-track'), cards = [...track.children];
    const dots = box.querySelector('.sm-dots');
    dots.innerHTML = cards.map(() => '<i></i>').join('');
    const pips = [...dots.children];
    let raf = 0;
    const mark = () => {
      raf = 0;
      const step = cards[1] ? cards[1].offsetLeft - cards[0].offsetLeft : 1;
      const end = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
      const i = end ? cards.length - 1 : Math.round(track.scrollLeft / step);
      pips.forEach((p, k) => p.classList.toggle('on', k === i));
    };
    track.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(mark); }, { passive: true });
    mark();
  });

  /* Shyft Pass: the switcher moves under "Storytelling to drive
     conversions" and its options read dweb / mweb */
  const dev = document.querySelector('.cf-devbox'), cols = dev && dev.parentElement.querySelector('.cf-devbox ~ .cf-cols');
  if (dev && cols) {
    cols.after(dev);
    const b = dev.querySelectorAll('.cf-ba-switch button');
    b.forEach(btn => { btn.textContent = btn.dataset.v === 'desktop' ? 'dweb' : 'mweb'; });
  }

  /* the pass card: it tilts toward the finger holding it, a shine follows
     the finger and the shadow slides the other way; let go and it eases
     back flat. touch-action: none on the card keeps the page still. */
  const pass = document.querySelector('.sm-pass');
  if (pass) {
    const card = pass.querySelector('.pc'), MAX = 16;
    let tx = 0, ty = 0, rx = 0, ry = 0, mx = 50, my = 50, so = 0, tso = 0, held = null, raf = 0;
    const aim = e => {
      const r = card.getBoundingClientRect();
      const px = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), py = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
      ty = (px - .5) * 2 * MAX; tx = -(py - .5) * 2 * MAX * .8; mx = px * 100; my = py * 100;
    };
    const frame = () => {
      const k = held != null ? .18 : .08;                      /* follows quickly, settles softly */
      rx += (tx - rx) * k; ry += (ty - ry) * k; so += (tso - so) * .12;
      card.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateZ(0)`;
      card.style.setProperty('--mx', mx + '%'); card.style.setProperty('--my', my + '%');
      card.style.setProperty('--so', so.toFixed(3));
      card.style.setProperty('--ga', (115 + ry * 2.2).toFixed(1) + 'deg');
      card.style.setProperty('--sx', (-ry * 1.1).toFixed(1) + 'px'); card.style.setProperty('--sy', (14 + rx * 1.1).toFixed(1) + 'px');
      const busy = held != null || Math.abs(rx) > .02 || Math.abs(ry) > .02 || so > .005;
      raf = busy ? requestAnimationFrame(frame) : 0;
    };
    const go = () => { if (!raf) raf = requestAnimationFrame(frame); };
    card.addEventListener('pointerdown', e => {
      held = e.pointerId; try { card.setPointerCapture(e.pointerId); } catch (_) {}
      pass.classList.add('used'); tso = 1; aim(e); go();
    });
    card.addEventListener('pointermove', e => { if (held === e.pointerId) { aim(e); go(); } });
    const off = e => { if (held !== e.pointerId) return; held = null; tx = ty = 0; tso = 0; go(); };
    card.addEventListener('pointerup', off);
    card.addEventListener('pointercancel', off);
    card.addEventListener('lostpointercapture', off);
    card.addEventListener('contextmenu', e => e.preventDefault());
    if (still) card.style.transition = 'none';
  }
}
