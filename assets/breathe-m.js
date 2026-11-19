/* Breathe ESG on phones (Nov 2026): the motion for assets/breathe-m.css.
   Desktop never runs any of it. */
if (matchMedia('(max-width: 760px)').matches) {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* the design-system rows drift only while the panel is on screen */
  const ds = document.querySelector('.bm-ds');
  if (ds) new IntersectionObserver(es => ds.classList.toggle('run', es[0].isIntersecting)).observe(ds);

  /* the org chart builds itself once, the first time it is seen */
  const org = document.querySelector('.bm-org');
  if (org) {
    const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { org.classList.add('in'); io.disconnect(); } }, { threshold: .35 });
    io.observe(org);
  }

  /* wireframe ↔ high fidelity: a tap opens the other one in a circle from the finger */
  const ba = document.querySelector('.bm-ba');
  if (ba) {
    const pic = ba.querySelector('.pic'), hint = ba.querySelector('.hint em');
    const flip = e => {
      const r = pic.getBoundingClientRect();
      if (e && e.clientX) { pic.style.setProperty('--x', ((e.clientX - r.left) / r.width * 100) + '%'); pic.style.setProperty('--y', ((e.clientY - r.top) / r.height * 100) + '%'); }
      const on = ba.classList.toggle('on');
      pic.setAttribute('aria-pressed', on);
      hint.textContent = on ? 'Tap to see the wireframe' : 'Tap to see the high fidelity';
    };
    pic.addEventListener('click', flip);
    pic.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } });
  }

  /* the fist bump: scrolling brings the two fists together — they meet as
     the frame reaches the middle of the screen, and a green glow goes off
     behind them; scrolling back pulls them apart and rearms it */
  const fist = document.querySelector('.bm-fist');
  if (fist) {
    const t = fist.querySelector('.f-tibba'), b = fist.querySelector('.f-breathe');
    /* how far apart they start: knuckle to knuckle (236, 325) → (369, 156) on a 618 frame; each fist travels half */
    const DX = (369 - 236) / 618 / 2, DY = (156 - 325) / 618 / 2;
    let on = false, raf = 0, bumped = false;
    const ease = p => 1 - Math.pow(1 - p, 2.2);
    const draw = () => {
      raf = 0;
      const r = fist.getBoundingClientRect(), vh = innerHeight, w = r.width;
      /* 0 as the frame's top comes up past the bottom fifth, 1 when its middle reaches the screen's middle */
      const p = Math.max(0, Math.min(1, (vh * .92 - r.top) / (vh * .92 - (vh / 2 - r.height / 2))));
      const k = still ? (p > .5 ? 1 : 0) : ease(p);
      /* the CSS places them where they meet; until then each is half the
         gap back along the line of the bump */
      const x = -DX * w * (1 - k) * 1.02, y = -DY * w * (1 - k) * 1.02;
      t.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      b.style.transform = `translate3d(${-x}px, ${-y}px, 0)`;
      if (p >= 1 && !bumped) { bumped = true; fist.classList.remove('bump'); void fist.offsetWidth; fist.classList.add('bump'); }
      if (p < .85 && bumped) { bumped = false; fist.classList.remove('bump'); }
    };
    const ask = () => { if (on && !raf) raf = requestAnimationFrame(draw); };
    new IntersectionObserver(es => { on = es[0].isIntersecting; ask(); }, { rootMargin: '20% 0px' }).observe(fist);
    addEventListener('scroll', ask, { passive: true });
    addEventListener('resize', ask);
    draw();
  }
}
