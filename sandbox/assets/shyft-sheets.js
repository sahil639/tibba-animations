/* Shyft Design System: the bottomsheet and empty-state stacks, at both widths (Nov 2026; they were phones only). */
/* the bottomsheet stack (see shyft-sheets.css): one sequence on the compositor
   (transforms and opacity only), one easing throughout. The nine fly in
   from alternate sides, overlapping 170ms apart, all settled by 1800ms;
   the full sheet fades in on top, the Figma panel rises under it, and
   only then the caption fades in. Replay runs all of it again. */
{
  document.querySelectorAll('.sm-sheets').forEach(box => {
    const sheets = [...box.querySelectorAll('.sh')], last = sheets.pop(), panel = box.querySelector('.sp-panel'), cap = box.querySelector('figcaption');
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const EASE = 'cubic-bezier(.22, 1, .36, 1)', IN = 440;
    const GAP = (1800 - IN) / Math.max(1, sheets.length - 1);   /* the last of them settles at 1800ms, however many */
    let live = [];
    const play = () => {
      live.forEach(a => a.cancel()); live = [];
      box.classList.remove('done'); box.classList.add('go');
      if (still) { sheets.forEach(s => s.querySelector('i').style.opacity = .72); box.classList.add('done'); return; }
      const run = (el, frames, opt) => { const a = el.animate(frames, { fill: 'both', easing: EASE, ...opt }); live.push(a); return a; };
      sheets.forEach((s, k) => {
        const at = k * GAP, from = k % 2 ? 'translate3d(160%, 0, 0)' : 'translate3d(-160%, 0, 0)';   /* 1 left, 2 right, … */
        run(s, [{ transform: from, opacity: 0 }, { opacity: 1, offset: .3 }, { transform: 'translate3d(0, 0, 0)', opacity: 1 }], { duration: IN, delay: at });
        /* veiled as the next one lands on it (the ninth, as the full sheet arrives) */
        run(s.querySelector('i'), [{ opacity: 0 }, { opacity: .72 }], { duration: 260, delay: at + GAP + IN * .6, easing: 'ease-out' });
      });
      const settled = (sheets.length - 1) * GAP + IN;          /* 1800 */
      run(last, [{ transform: 'translate3d(0, 8px, 0) scale(.98)', opacity: 0 }, { transform: 'translate3d(0, 0, 0) scale(1)', opacity: 1 }], { duration: 300, delay: settled + 40 });
      run(panel, [{ transform: 'translate3d(0, 18px, 0)', opacity: 0 }, { transform: 'translate3d(0, 0, 0)', opacity: 1 }], { duration: 320, delay: settled + 220 });
      const end = run(cap, [{ opacity: 0, transform: 'translate3d(0, 6px, 0)' }, { opacity: 1, transform: 'none' }], { duration: 380, delay: settled + 560, easing: 'ease-out' });
      end.finished.then(() => box.classList.add('done')).catch(() => {});
    };
    const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { io.disconnect(); play(); } }, { threshold: .3 });
    io.observe(box);
    box.querySelector('.replay').addEventListener('click', play);
  });
}
