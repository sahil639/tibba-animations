/* Shyft & Mindhouse, Designing for Shyft Pass (Nov 2026): the pass card at
   both widths (it was phones only). A finger holds and tilts it; on desktop
   the mouse does the same just by moving over it. Styles: shyft-pass.css. */
{
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hint = document.querySelector('.sm-pass .hint');
  if (hint && matchMedia('(hover: hover)').matches) hint.textContent = 'Move over the card';
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
    card.addEventListener('pointermove', e => {
      if (held === e.pointerId) { aim(e); go(); return; }
      /* a mouse: the card follows it while it is over the card, no press needed */
      if (e.pointerType === 'mouse') { pass.classList.add('used'); tso = 1; aim(e); go(); }
    });
    card.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && held == null) { tx = ty = 0; tso = 0; go(); } });
    const off = e => { if (held !== e.pointerId) return; held = null; tx = ty = 0; tso = 0; go(); };
    card.addEventListener('pointerup', off);
    card.addEventListener('pointercancel', off);
    card.addEventListener('lostpointercapture', off);
    card.addEventListener('contextmenu', e => e.preventDefault());
    if (still) card.style.transition = 'none';
  }
}
