/* ══════════════════════════════════════════════════════════════════════════
   Brand logos — the client artwork, shared by both brand walls
   ─────────────────────────────────────────────────────────────────────────
   brands.html and brands-mosaic.html both read this. The files are the
   colour logos in assets/logos/, each viewBox cropped tight to its ink so
   no logo carries its own invisible margin into the layout.

   ── how they look ─────────────────────────────────────────────────────────
   Grayscale by default, the original colour on hover of the tile (or its
   keyboard focus). Both states are CSS filters driven by variables, so the
   whole wall answers to LOGO_CONFIG below.

   ── how they are sized ────────────────────────────────────────────────────
   Not to one width or one height — a long wordmark and a square mark set
   to the same height look nothing alike. Each logo gets the same AREA
   instead: width = √(area × ratio), height = √(area ÷ ratio), which is what
   makes a wide and a compact logo carry the same optical weight. Then it is
   clamped to the max width / max height, and nudged by its own `weight`
   (a solid block like HDFC's reads heavier than a hairline serif).

   ── usage ────────────────────────────────────────────────────────────────
     <img class="brand-logo" data-logo="zomato" ...>   (or BrandLogos.img(key))
     BrandLogos.size(root)   — sizes every .brand-logo inside root to its tile
     BrandLogos.apply()      — pushes LOGO_CONFIG's look into the CSS vars
   Sizing re-runs on resize by itself once size() has been called.
   ═════════════════════════════════════════════════════════════════════════ */
(function () {
  /* ── LOGO_CONFIG — every tunable ──────────────────────────────────────── */
  const LOGO_CONFIG = {
    /* size: the side of the square each logo's area equals, as a fraction
       of its tile's shorter side. 0.3 → a logo covers (0.3 × side)². */
    size: 0.3,
    maxWidth: 0.66,        // fraction of the tile's width
    maxHeight: 0.26,       // fraction of the tile's height
    maxWidthPx: 240,       // hard caps, px — so a huge tile never gets a billboard
    maxHeightPx: 72,
    grayscale: 1,          // 0 = full colour at rest, 1 = fully gray
    restOpacity: 0.62,     // how far back the logos sit at rest
    hoverDuration: 0.5,    // seconds, gray → colour
    hoverEase: 'cubic-bezier(.22,1,.36,1)',
  };

  /* key → file, aspect ratio (of the cropped viewBox), optical weight
     (1 = neutral; < 1 shrinks a heavy mark, > 1 grows a light one), and
     `lift`: extra brightness in the gray state for a logo whose ink is
     dark (policybazaar's navy would vanish on black otherwise). */
  const LOGOS = {
    'zomato':               { name: 'Zomato',               ratio: 4.63,  weight: 0.92 },
    'paytm':                { name: 'Paytm',                ratio: 3.11,  weight: 0.88 },
    'groww':                { name: 'Groww',                ratio: 3.75,  weight: 0.96 },
    'breatheesg':           { name: 'Breathe ESG',          ratio: 7.72,  weight: 1.04 },
    'urban-company':        { name: 'Urban Company',        ratio: 3.51,  weight: 0.95 },
    'hdfc-bank':            { name: 'HDFC Bank',            ratio: 5.94,  weight: 0.84, lift: 1.5 },
    'the-times-of-india':   { name: 'The Times of India',   ratio: 14.18, weight: 1.16 },
    'policybazaar':         { name: 'Policybazaar',         ratio: 6.02,  weight: 1.0,  lift: 2.6 },
    'the-indian-express':   { name: 'The Indian Express',   ratio: 9.84,  weight: 1.1 },
    'shyft':                { name: 'Shyft',                ratio: 2.31,  weight: 0.84 },
    'apnaklub':             { name: 'Apnaklub',             ratio: 4.48,  weight: 0.98 },
    'simsim':               { name: 'simsim',               ratio: 4.07,  weight: 0.92 },
    'bombay-shirt-company': { name: 'Bombay Shirt Company', ratio: 8.02,  weight: 1.0 },
    'firstpost':            { name: 'Firstpost',            ratio: 4.31,  weight: 0.9 },
  };
  const file = k => 'assets/logos/' + k + '.svg';

  /* ── the look, as CSS variables ─────────────────────────────────────── */
  const css = `
    .brand-logo {
      display: block; margin: 0 auto; max-width: none; object-fit: contain;
      filter: grayscale(var(--logo-gray, 1)) brightness(var(--logo-lift, 1));
      opacity: var(--logo-rest, .62);
      transition: filter var(--logo-dur, .5s) var(--logo-ease, ease), opacity var(--logo-dur, .5s) var(--logo-ease, ease);
    }
    :is(.tile, .b, [data-logo-host]):is(:hover, :focus-visible) .brand-logo { filter: grayscale(0) brightness(1); opacity: 1; }
    @media (hover: none) { .brand-logo { filter: grayscale(0) brightness(1); opacity: .9; } }`;
  const st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  function apply() {
    const s = document.documentElement.style, c = LOGO_CONFIG;
    s.setProperty('--logo-gray', c.grayscale);
    s.setProperty('--logo-rest', c.restOpacity);
    s.setProperty('--logo-dur', c.hoverDuration + 's');
    s.setProperty('--logo-ease', c.hoverEase);
  }

  function img(key, extra = '') {
    const L = LOGOS[key];
    return `<img class="brand-logo" data-logo="${key}" src="${file(key)}" alt="${L.name}" draggable="false"${L.lift ? ` style="--logo-lift:${L.lift}"` : ''} ${extra}>`;
  }

  /* size one logo against the box it sits in */
  function fit(el, box, over) {
    const L = LOGOS[el.dataset.logo]; if (!L) return;
    const c = over ? { ...LOGO_CONFIG, ...over } : LOGO_CONFIG, W = box.width, H = box.height;
    const side = Math.min(W, H) * c.size * L.weight;
    let w = side * Math.sqrt(L.ratio), h = side / Math.sqrt(L.ratio);
    const mw = Math.min(W * c.maxWidth, c.maxWidthPx), mh = Math.min(H * c.maxHeight, c.maxHeightPx);
    const k = Math.min(1, mw / w, mh / h);
    w *= k; h *= k;
    el.style.width = w.toFixed(1) + 'px'; el.style.height = h.toFixed(1) + 'px';
  }

  const roots = new Set();
  /* the tile is the logo's nearest [data-logo-host], else its parent's parent */
  /* over: optional LOGO_CONFIG overrides for this root only (e.g. the
     mobile rows, whose tiles want bigger marks) */
  const overrides = new Map();
  function size(root = document, over) {
    roots.add(root);
    if (over) overrides.set(root, over);
    over = overrides.get(root);
    root.querySelectorAll('.brand-logo').forEach(el => {
      const host = el.closest('[data-logo-host]') || el.parentElement.parentElement;
      fit(el, host.getBoundingClientRect(), over);
    });
  }
  let raf = 0;
  addEventListener('resize', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => roots.forEach(r => size(r))); });

  /* ── the panel section: the same controls on both brand pages ─────── */
  const R = (id, label, min, max, step, val, unit = '') => `<div class="row"><label>${label}<i id="v-${id}">${val}${unit}</i></label><input type="range" id="s-${id}" min="${min}" max="${max}" step="${step}" value="${val}" data-unit="${unit}"></div>`;
  window.logoPanel = () => {
    const c = LOGO_CONFIG;
    return `<p class="tune-sub">Logos</p>
      ${R('lg-size', 'Optical size', .1, .6, .01, c.size)}
      ${R('lg-mw', 'Max width', .2, 1, .01, c.maxWidth, '× tile')}
      ${R('lg-mh', 'Max height', .1, .6, .01, c.maxHeight, '× tile')}
      ${R('lg-mwp', 'Max width cap', 60, 400, 5, c.maxWidthPx, 'px')}
      ${R('lg-mhp', 'Max height cap', 16, 140, 2, c.maxHeightPx, 'px')}
      ${R('lg-gray', 'Grayscale', 0, 1, .05, c.grayscale)}
      ${R('lg-rest', 'Rest opacity', .2, 1, .02, c.restOpacity)}
      ${R('lg-dur', 'Hover duration', 0, 1.5, .05, c.hoverDuration, 's')}
      <div class="row inline"><label>Config<i></i></label><button class="tune-btn" id="lg-copy">Copy config</button></div>`;
  };
  window.bindLogoPanel = (el) => {
    const c = LOGO_CONFIG, map = { 'lg-size': 'size', 'lg-mw': 'maxWidth', 'lg-mh': 'maxHeight', 'lg-mwp': 'maxWidthPx',
      'lg-mhp': 'maxHeightPx', 'lg-gray': 'grayscale', 'lg-rest': 'restOpacity', 'lg-dur': 'hoverDuration' };
    Object.entries(map).forEach(([id, key]) => {
      const inp = el.querySelector('#s-' + id); if (!inp) return;
      inp.addEventListener('input', () => {
        c[key] = +inp.value; el.querySelector('#v-' + id).textContent = inp.value + inp.dataset.unit;
        window.BrandLogos.refresh();
      });
    });
    const cp = el.querySelector('#lg-copy');
    if (cp) cp.addEventListener('click', async () => {
      const txt = 'const LOGO_CONFIG = ' + JSON.stringify(c, null, 2) + ';';
      try { await navigator.clipboard.writeText(txt); } catch { console.log(txt); }
    });
  };

  apply();
  window.BrandLogos = { LOGO_CONFIG, LOGOS, img, size, apply, file,
    /** Re-read LOGO_CONFIG: look and sizes both. */
    refresh() { apply(); roots.forEach(r => size(r)); } };
})();
