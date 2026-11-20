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

/* Designing to overcome the challenges (desktop, Nov 2026): each card's
   header is a ticker — its topic's line icons, in the page's lavender
   circles, sliding past on a loop. That slide is the only motion; the card
   itself is still. Phones keep their header images (shyft-m.css). */
if (matchMedia('(min-width: 761px)').matches) {
  const P = d => `<path d="${d}"/>`;
  const C = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}"/>`;
  const ICONS = {
    person: C(12, 8, 3.5) + P('M5 20c.8-3.6 3.6-6 7-6s6.2 2.4 7 6'),
    search: C(10.5, 10.5, 6) + P('M15 15l5 5'),
    heart: P('M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z'),
    chat: P('M4 6h16v10H9l-5 4z'),
    pin: P('M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11z') + C(12, 10, 2.2),
    globe: C(12, 12, 8.5) + P('M3.5 12h17M12 3.5c2.6 2.8 2.6 14.2 0 17M12 3.5c-2.6 2.8-2.6 14.2 0 17'),
    calendar: P('M4.5 6.5h15v13h-15zM4.5 10.5h15M8.5 4v4M15.5 4v4'),
    book: P('M4 5.5c3-1 5.5-.6 8 1v13c-2.5-1.6-5-2-8-1zM20 5.5c-3-1-5.5-.6-8 1v13c2.5-1.6 5-2 8-1z'),
    bulb: P('M9 17h6M10 20.5h4M12 3.5a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2h5c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3.5z'),
    info: C(12, 12, 8.5) + P('M12 11v5.5M12 7.8v.4'),
    play: C(12, 12, 8.5) + P('M10 8.8v6.4l5.2-3.2z'),
    question: C(12, 12, 8.5) + P('M9.6 9.6a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.6M12 16.8v.4'),
    users: C(9, 9, 3) + P('M3.5 19c.6-3 2.8-5 5.5-5s4.9 2 5.5 5') + C(16.5, 8.5, 2.5) + P('M15.5 13.6c2.6.1 4.4 2 5 4.9'),
    tag: P('M3.5 12V4.5H11l9.5 9.5-7.5 7.5zM7.8 8.2h.4'),
    coin: C(12, 12, 8.5) + P('M9 8.5h6M9 11h6M9.5 8.5c3.5 0 3.5 5 0 5H9l5 4'),
    clock: C(12, 12, 8.5) + P('M12 7.5V12l3 2'),
    gift: P('M4 9.5h16v4H4zM5.5 13.5v7h13v-7M12 9.5v11M12 9.5c-1.8-3.6-5.5-3.2-5-.8.3 1.2 3 .8 5 .8zM12 9.5c1.8-3.6 5.5-3.2 5-.8-.3 1.2-3 .8-5 .8z'),
    check: C(12, 12, 8.5) + P('M8 12.2l2.8 2.8L16.2 9.6'),
    wallet: P('M4 7.5h14.5v12H4zM4 7.5l11-3.5v3.5M15 12.5h5.5v3.5H15z'),
  };
  const SETS = [['person', 'search', 'heart', 'chat', 'pin', 'globe', 'calendar'],
                ['book', 'bulb', 'info', 'play', 'question', 'users', 'heart'],
                ['tag', 'coin', 'clock', 'gift', 'check', 'wallet', 'calendar']];
  const svg = k => `<span class="tk-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[k]}</svg></span>`;
  document.querySelectorAll('.d-over .sm-card').forEach((card, i) => {
    const set = SETS[i % SETS.length], one = set.map(svg).join('');
    card.insertAdjacentHTML('afterbegin', `<div class="tk" aria-hidden="true"><div class="tk-row" style="--dur:${18 + i * 3}s">${one}${one}</div></div>`);
  });
  /* the tickers only run while on screen */
  const io = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('run', e.isIntersecting)));
  document.querySelectorAll('.d-over .tk').forEach(t => io.observe(t));
}
