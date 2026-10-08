/* ══════════════════════════════════════════════════════════════════════════
   The work — every project, and where its pictures live
   ─────────────────────────────────────────────────────────────────────────
   Website v3 is built around the studio's real work. This file says which
   projects there are and where each one's images are kept, so every page
   that shows work (the home sections, the case studies) reads the same list.

   ── where the images go ──────────────────────────────────────────────────
     assets/work/<folder>/<name>.webp      (or .jpg, or .png — tried in turn)

     <folder>   the project's folder, below (groww, firstpost, …)
     <name>     cover            the project's lead image (16:10 is ideal)
                <figure slug>    each case-study plate, named from its label
                                 in assets/cases.js: "Groww Feed" → groww-feed

   Until a file exists its slot shows a placeholder in the project's colour —
   a contour plate with the name of the image it is waiting for — so the
   layout is finished either way, and dropping a file in is all it takes.

     TibbaWork.img(folder, name, alt, ratio)   → the HTML for one slot
     TibbaWork.slug('Groww Feed')              → 'groww-feed'
   ═════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  const DIR = 'assets/work/';
  const EXT = ['webp', 'jpg', 'png'];

  /* the four summits — the deep case studies (data in assets/cases.js) */
  const SUMMITS = [
    { key: 'groww', folder: 'groww', file: 'case-groww-v2.html', year: '2024 — now', sector: 'Fintech',
      hi: 'boost engagement', line: 'How we helped Groww boost engagement on their app' },
    { key: 'firstpost', folder: 'firstpost', file: 'case-firstpost-v2.html', year: '2023', sector: 'News & media',
      hi: '2x their traffic', line: 'How we helped Firstpost 2x their traffic through a strategic redesign' },
    { key: 'breathe-esg', folder: 'breathe-esg', file: 'case-breathe-esg-v2.html', year: '2023', sector: 'SaaS',
      hi: 'accelerate sales', line: 'How we helped Breathe ESG accelerate sales, streamline releases and elevate customer experience' },
    { key: 'shyft-and-mindhouse', folder: 'shyft-mindhouse', file: 'case-shyft-mindhouse-v2.html', year: '2023', sector: 'Health',
      hi: 'grow their business', line: 'How we helped Shyft & Mindhouse grow their business and supercharge product led growth' },
  ];

  /* the climbs between the summits — no deep page, a cover and a line each */
  const MORE = [
    { folder: 'apnaklub', client: 'Apnaklub', sector: 'Commerce', colour: '#C9A227', year: '2022',
      line: 'Research into users and market, and an app designed to reach product–market fit.', tags: 'App design · B2B ecommerce' },
    { folder: 'indian-express', client: 'The Indian Express', sector: 'News & media', colour: '#D8D2C4', year: '2021',
      line: 'A brand new mobile app for the flagship product, and a monetisation strategy to go with it.', tags: 'App · Website · News' },
    { folder: 'cipher-docs', client: "Zeta's Cipher Docs", sector: 'Fintech', colour: '#8C7CF0', year: '2022',
      line: 'A documentation portal rebuilt from scratch, tested with the developers who use it.', tags: 'Docs portal · Fintech' },
    { folder: 'urban-company', client: 'Urban Company', sector: 'Services', colour: '#E8E3DC', year: '2016',
      line: 'The first market versions of the apps, and research brought into the design workflow.', tags: 'App design · Urban services' },
    { folder: 'zomato', client: 'Zomato', sector: 'Foodtech', colour: '#E23744', year: '2015',
      line: "The first version of Zomato's food delivery app, and more products besides.", tags: 'App · Website · Foodtech' },
    { folder: 'hdfc-smartbuy', client: "HDFC's Smart Buy", sector: 'Fintech', colour: '#3F6FD8', year: '2019',
      line: 'Layouts designed and tested for the bank’s rewards platform.', tags: 'App design · Rewards' },
  ];

  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const slug = s => String(s).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  /* one slot: tries .webp, .jpg, .png; when none is there it becomes the
     placeholder (the class does the drawing, the label says what's missing) */
  function img(folder, name, alt, ratio, cls) {
    const base = DIR + folder + '/' + name;
    return `<div class="wk-img${cls ? ' ' + cls : ''}"${ratio ? ` style="--ratio:${ratio}"` : ''} data-wait="${esc(folder + ' / ' + name)}">`
      + `<img src="${base}.${EXT[0]}" data-base="${base}" data-try="0" alt="${esc(alt || '')}" loading="lazy" decoding="async" onerror="TibbaWork.next(this)" onload="this.parentNode.classList.add('in')"></div>`;
  }
  function next(el) {
    const i = +el.dataset.try + 1;
    if (i < EXT.length) { el.dataset.try = i; el.src = el.dataset.base + '.' + EXT[i]; return; }
    el.parentNode.classList.add('ph');
    el.remove();
  }

  global.TibbaWork = { DIR, SUMMITS, MORE, img, next, slug, esc };
})(window);
