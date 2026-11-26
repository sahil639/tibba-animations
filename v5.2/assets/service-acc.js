/* The steps on a service page, one open at a time (Nov 2026) — see the
   .sv-acc block in assets/service-page.css. A click (or Enter / Space) on a
   step opens it and shows its picture. While the box is on screen the steps
   play on by themselves, one every --acc-t (the scan line marks the time);
   they stop for good once the reader picks one, and never run under
   reduced motion. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('[data-acc]').forEach(box => {
    const items = [...box.querySelectorAll('.sv-acc-list > li')];
    const pics = [...box.querySelectorAll('.sv-acc-pic')];
    const scan = box.querySelector('.sv-acc-scan');
    const T = parseFloat(getComputedStyle(box).getPropertyValue('--acc-t')) * 1000 || 6000;
    let cur = 0, timer = null, picked = false, seen = false;
    const open = i => {
      cur = i;
      items.forEach((li, k) => { li.classList.toggle('on', k === i); li.querySelector('button').setAttribute('aria-expanded', String(k === i)); });
      pics.forEach((p, k) => p.classList.toggle('on', k === i));
    };
    const restartScan = () => { if (!scan) return; scan.style.animation = 'none'; void scan.offsetWidth; scan.style.animation = ''; };
    const play = () => {
      if (reduce || picked || timer) return;
      box.classList.add('play'); restartScan();
      timer = setInterval(() => { open((cur + 1) % items.length); }, T);
    };
    const stop = () => { clearInterval(timer); timer = null; box.classList.remove('play'); };
    items.forEach((li, i) => li.querySelector('button').addEventListener('click', () => { picked = true; stop(); open(i); }));
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(es => es.forEach(e => { seen = e.isIntersecting; if (seen) play(); else stop(); }), { threshold: 0.4 }).observe(box);
    }
  });
})();
