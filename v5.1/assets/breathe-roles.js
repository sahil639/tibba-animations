/* Breathe ESG, the roles (assets/breathe-roles.css): the org chart builds
   itself and the cards arrive, once, the first time the block is seen —
   the same on phones and desktop */
document.querySelectorAll('.br-roles').forEach(box => {
  const org = box.querySelector('.bm-org');
  const io = new IntersectionObserver(es => {
    if (!es[0].isIntersecting) return;
    io.disconnect();
    box.classList.add('in'); if (org) org.classList.add('in');
  }, { threshold: .25 });
  io.observe(box);
});
