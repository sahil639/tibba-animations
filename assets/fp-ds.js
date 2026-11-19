/* Firstpost's design-system plate on phones (see assets/fp-ds.css): .in the
   first time it is seen (the pieces rise in, the specimens type out), .run
   while it is on screen (the loops play; off screen they pause). */
if (matchMedia('(max-width: 760px)').matches) {
  document.querySelectorAll('.fpds').forEach(fig => {
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting) fig.classList.add('in');
      fig.classList.toggle('run', e.isIntersecting);
    }, { threshold: .02 }).observe(fig);
    /* the typed specimens start once their own card has arrived */
    fig.querySelectorAll('.type').forEach(t => t.style.setProperty('--i', t.closest('.t').style.getPropertyValue('--i')));
  });
}
