/* Blog post rail (Nov 2026) — see assets/blog.css.
     · contents: built from the article's h2s; the heading being read is lit,
       the ones above it brighten, the rail fills to the reading position
     · share: LinkedIn, X, email and copy-link, for this page's address
     · mode: dark / light, remembered in this browser (when it can be)
     · videos: play only while on screen (and never under reduced motion)
     · footer frame: as tall as its content, links open in this window */
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* contents */
  const heads = $$('.bl-article h2[id]:not(.bl-more-h)');
  const list = $('.bl-toc ol'), fill = $('.bl-toc-fill');
  if (list) list.innerHTML = heads.map(h => `<li><a href="#${h.id}">${h.textContent}</a></li>`).join('');
  const links = list ? $$('a', list) : [];
  const article = $('.bl-article');
  let ticking = false;
  const update = () => {
    ticking = false;
    const line = innerHeight * .3;
    let on = -1;
    heads.forEach((h, i) => { if (h.getBoundingClientRect().top <= line) on = i; });
    links.forEach((a, i) => { a.classList.toggle('on', i === on); a.classList.toggle('read', i < on); });
    if (on >= 0) links[on].setAttribute('aria-current', 'true'); links.forEach((a, i) => { if (i !== on) a.removeAttribute('aria-current'); });
    if (fill && article && links.length) {
      /* the rail fills to the lit item: its share of the list, plus how far through its section we are */
      const r = article.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (line - r.top) / Math.max(1, r.height - innerHeight * .5)));
      fill.style.height = (p * 100).toFixed(2) + '%';
    }
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener('resize', update);
  update();

  /* share */
  const url = location.href.split('#')[0], title = document.title.replace(/ — Tibba Design Studio$/, '');
  const enc = encodeURIComponent;
  const hrefs = {
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`,
    x: `https://x.com/intent/tweet?url=${enc(url)}&text=${enc(title)}`,
    mail: `mailto:?subject=${enc(title)}&body=${enc(url)}`,
  };
  $$('.bl-share-btn[data-share]').forEach(b => {
    const k = b.dataset.share;
    if (hrefs[k]) { b.href = hrefs[k]; return; }
    if (k === 'copy') b.addEventListener('click', async () => {
      const tip = $('.bl-copied', b);
      try { await navigator.clipboard.writeText(url); tip.textContent = 'Link copied'; }
      catch (e) { tip.textContent = 'Couldn’t copy'; }
      tip.classList.add('on'); clearTimeout(b._t); b._t = setTimeout(() => tip.classList.remove('on'), 1600);
    });
  });

  /* mode */
  const root = document.documentElement;
  const btns = $$('.bl-mode-sw button');
  const show = m => btns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
  show(root.dataset.mode || 'dark');
  btns.forEach(b => b.addEventListener('click', () => {
    const m = b.dataset.mode; root.dataset.mode = m; show(m);
    try { localStorage.setItem('tibba.blog.mode', m); } catch (e) {}
  }));

  /* videos */
  const vids = $$('video.bl-video');
  if (!reduce && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      const v = e.target;
      if (e.isIntersecting) { if (v.preload === 'none') v.preload = 'auto'; const p = v.play(); if (p) p.catch(() => {}); }
      else v.pause();
    }), { threshold: .35 });
    vids.forEach(v => io.observe(v));
  }

  /* footer frame */
  $$('iframe.bl-foot').forEach(f => {
    const fit = () => { try { const h = f.contentDocument.body.scrollHeight; if (h > 0) f.style.height = h + 'px'; } catch (e) {} };
    const ready = () => {
      try {
        const d = f.contentDocument; if (!d || !d.body || d.querySelector('base[target]')) return;
        const b = d.createElement('base'); b.target = '_top'; d.head.prepend(b);
        new ResizeObserver(fit).observe(d.body);
      } catch (e) {}
      fit();
    };
    f.addEventListener('load', ready);
    try { if (f.contentDocument.readyState === 'complete' && f.contentDocument.URL !== 'about:blank') ready(); } catch (e) {}
  });
})();
