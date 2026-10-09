/* ══════════════════════════════════════════════════════════════════════════
   The four summits, as the Our Summits sections tell them
   ─────────────────────────────────────────────────────────────────────────
   One list for Summits A (top-view peaks) and Summits B (hover reveal):
   the band's words (as summits-v3.html), two outcome numbers each, and the
   images — the cover and the case study's own plates, so each slot fills
   the moment its file lands in assets/work/<client>/ (assets/work.js).
   Needs assets/work.js and assets/cases.js loaded first.
   ═════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  const W = global.TibbaWork, CASES = global.TIBBA_CASES || {};
  const WORDS = {
    groww: { tags: 'Fintech · App · Website', title: 'How we helped Groww <span class="hi">boost engagement</span> on their app',
      stats: [{ n: '3', l: 'Launches — the feed, Stories and the XIRR calculator' }, { n: '1', l: 'Year embedded with the growth team' }] },
    firstpost: { tags: 'News & media · App · Website', title: 'How we helped Firstpost <span class="hi">2x their traffic</span> through a strategic redesign',
      stats: [{ n: '2x', l: 'Website traffic' }, { n: '30%', l: 'Increase in average session duration' }] },
    'breathe-esg': { tags: 'SaaS · ESG · Dashboard', title: 'How we helped Breathe ESG <span class="hi">accelerate sales</span>, streamline releases and elevate customer experience',
      stats: [{ n: '8', l: 'Weeks of design sprints, brief to platform' }, { n: '1000', l: 'Listed companies now required to report ESG' }] },
    'shyft-and-mindhouse': { tags: 'Fitness · Mental health · App', title: 'How we helped Shyft &amp; Mindhouse <span class="hi">grow their business</span> and supercharge product led growth',
      stats: [{ n: '70%', l: 'Decrease in sales team intervention' }, { n: '15x', l: 'Increase in direct purchases via the landing page' }] },
  };
  const ALT = ['4,820', '5,360', '6,190', '7,050'];

  global.TIBBA_SUMMITS = W.SUMMITS.map((s, i) => {
    const c = CASES[s.key] || {}, w = WORDS[s.key];
    const plates = (c.blocks || []).filter(b => b.k === 'figure').map(b => b.label);
    return {
      i, key: s.key, folder: s.folder, file: s.file, year: s.year, sector: s.sector, alt: ALT[i],
      client: c.client || s.key, colour: c.colour || '#FF4B1F', tags: w.tags, title: w.title, stats: w.stats,
      /* the cover, then the plates — what fills the boxes beside each summit */
      imgs: [{ name: 'cover', alt: (c.client || '') + ' — the work' }]
        .concat(plates.slice(0, 3).map(l => ({ name: W.slug(l), alt: l }))),
    };
  });

  /* one image slot (its placeholder takes --c, the summit's colour, from
     whatever holds it) */
  global.TIBBA_SUMMITS.slot = (s, k, ratio, cls) => {
    const m = s.imgs[k % s.imgs.length];
    return W.img(s.folder, m.name, m.alt, ratio, cls);
  };

  /* links inside the site open in the top window */
  global.TIBBA_SUMMITS.link = (root) => root.addEventListener('click', e => {
    const a = e.target.closest('a[href]'); if (!a || window.top === window) return;
    e.preventDefault(); window.top.location.href = new URL(a.getAttribute('href'), location.href).href;
  });
})(window);
