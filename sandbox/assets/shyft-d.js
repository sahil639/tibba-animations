/* Shyft & Mindhouse on desktop (Nov 2026): the behaviour for assets/shyft-d.css.
   Phones never run any of it (they have assets/shyft-m.js). */
if (matchMedia('(min-width: 761px)').matches) {
  /* Shyft Pass: the three points move between the card and the site */
  const dev = document.querySelector('.cf-devbox'), cols = dev && dev.parentElement.querySelector('.cf-devbox ~ .cf-cols');
  if (dev && cols) cols.after(dev);

  /* Post launch optimisation: each result in its own stat box, the same
     bracket-cornered card as the metrics at the top of the page */
  document.querySelectorAll('.cf-kpis').forEach(k => {
    k.classList.add('d-kpis');
    [...k.children].forEach(d => {
      d.classList.add('cf-metric', 'on');
      if (!d.querySelector('.v')) d.classList.add('light');
      d.insertAdjacentHTML('beforeend', '<i></i><i></i><i></i><i></i>');
    });
  });

  /* Onboarding: the iPhone's screens in turn, as on phones — a crossfade
     every 2.8 s while it is on screen; with reduced motion, the first */
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('.m-phone.d-on').forEach(ph => {
      const shots = [...ph.querySelectorAll('.screen img')];
      if (shots.length < 2) return;
      let i = 0, t = 0;
      const next = () => { shots[i].classList.remove('on'); i = (i + 1) % shots.length; shots[i].classList.add('on'); };
      new IntersectionObserver(([e]) => {
        clearInterval(t);
        if (e.isIntersecting) { shots.forEach(s => { s.loading = 'eager'; }); t = setInterval(next, 2800); }
      }).observe(ph);
    });
  }
}
