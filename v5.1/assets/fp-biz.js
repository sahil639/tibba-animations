/* the ad-format ticker (assets/fp-biz.css): moving only while on screen */
document.querySelectorAll('.fp-biz').forEach(box => {
  new IntersectionObserver(([e]) => box.classList.toggle('run', e.isIntersecting), { rootMargin: '10% 0px' }).observe(box);
});
