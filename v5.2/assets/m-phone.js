/* the iPhone's screens in turn (assets/m-phone.css): 1 → 2 → … → 1, a
   crossfade every 2.8 s, only while the phone is on screen; with reduced
   motion it stays on the first screen */
if (matchMedia('(max-width: 760px)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.querySelectorAll('.m-phone').forEach(ph => {
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
