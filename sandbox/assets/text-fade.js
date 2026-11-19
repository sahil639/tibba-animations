/* ══════════════════════════════════════════════════════════════════════════
   The text fade-in on scroll (Nov 2026) — one implementation for the About
   page's "Who we are" on desktop (about-description.html) and on phones
   (about-mobile.html). It is the "fade-in" preset of the text-scroll-reveal
   component, without React:

     · every word starts dim and comes up to full, one after another in
       reading order, as the passage rises through the screen;
     · progress runs from the passage's top at `start` of the screen to its
       foot at `end` (0.82 → 0.42 on desktop, as the component has it);
     · each word takes its own share of that progress, smoothed by a light
       spring (stiffness 150, damping 28, mass .22, as the component's);
     · nothing is pinned or sticky: the page scrolls as it always does;
     · only opacity changes, and only on the words whose value moved; the
       loop runs while the spring is moving and the passage is near the
       screen, and sleeps otherwise;
     · prefers-reduced-motion: the words are simply there.

   In about.html the section is an iframe as tall as its content, so the
   scroll is the top page's: progress is measured against that window.

   Use: <script src="assets/text-fade.js" defer></script>, then
        tibbaTextFade(element, { dim, start, end })
   where element holds the paragraphs (its text nodes are split into words).
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  function split(root) {
    const words = [];
    root.querySelectorAll('p').forEach(p => {
      const walk = node => [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(tok => {
            if (!tok) return;
            if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'tf-w'; w.textContent = tok;
            words.push(w); frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
      walk(p);
    });
    return words;
  }

  window.tibbaTextFade = function (root, opts) {
    const o = Object.assign({ dim: 0.16, start: 0.82, end: 0.42 }, opts || {});
    if (!root || root.dataset.tf) return;
    root.dataset.tf = '1';
    const words = split(root);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;   // shown as they are
    const N = words.length;
    /* each word's turn: in reading order over the first 78% of the progress,
       taking at least 14% of it (or 1.8 words' worth) */
    const span = Math.max(0.14, 1.8 / N);
    const at = words.map((w, i) => { const a = i / N * 0.78; return [a, Math.min(1, a + span)]; });

    /* the window that scrolls: this one, or the top page's when framed */
    let host = null, win = window;
    try { if (window.frameElement && window.top.innerHeight) { host = window.frameElement; win = window.top; } } catch (e) {}
    const target = () => {
      const r = root.getBoundingClientRect(), off = host ? host.getBoundingClientRect().top : 0;
      const vh = win.innerHeight;
      return Math.min(1, Math.max(0, (vh * o.start - (r.top + off)) / (vh * (o.start - o.end) + r.height)));
    };

    const shown = new Float32Array(N).fill(-1);
    function paint(s) {
      for (let i = 0; i < N; i++) {
        const [a, b] = at[i], k = Math.min(1, Math.max(0, (s - a) / (b - a)));
        const v = Math.round((o.dim + (1 - o.dim) * k) * 1000) / 1000;
        if (shown[i] !== v) { shown[i] = v; words[i].style.opacity = v; }
      }
    }

    /* the spring, stepped only while it moves */
    let s = target(), v = 0, last = 0, raf = 0, near = true;
    const K = 150, D = 28, M = 0.22;
    function step(now) {
      raf = 0;
      const dt = Math.min(0.05, last ? (now - last) / 1000 : 1 / 60); last = now;
      const x = target();
      for (let i = 0; i < 4; i++) { const h = dt / 4; v += ((K * (x - s) - D * v) / M) * h; s += v * h; }
      if (Math.abs(x - s) < 1e-4 && Math.abs(v) < 1e-3) { s = x; v = 0; }
      paint(s);
      if (v !== 0 || s !== x) raf = requestAnimationFrame(step); else last = 0;
    }
    const wake = () => { if (near && !raf) raf = requestAnimationFrame(step); };
    paint(s);
    new IntersectionObserver(([e]) => { near = e.isIntersecting; if (near) wake(); }, { rootMargin: '25% 0px' }).observe(root);
    win.addEventListener('scroll', wake, { passive: true });
    win.addEventListener('resize', wake);
  };
})();
