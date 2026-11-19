/* Breathe ESG on phones (Nov 2026): the motion for assets/breathe-m.css.
   Desktop never runs any of it. */
if (matchMedia('(max-width: 760px)').matches) {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* the design-system rows drift only while the panel is on screen */
  const ds = document.querySelector('.bm-ds');
  if (ds) new IntersectionObserver(es => ds.classList.toggle('run', es[0].isIntersecting)).observe(ds);

}
