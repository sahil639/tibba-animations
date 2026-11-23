/* ══════════════════════════════════════════════════════════════════════════
   Site sections — what the stitched landings are made of
   ─────────────────────────────────────────────────────────────────────────
   One registry for Website v2 (the home landing), the About page
   and the Modular Website hub. Each section names the folder its design
   lives in and the pages that can fill it (`variants`, first = default),
   so a section always shows the live, latest page of that design — the
   landings never copy a section, they frame it.

     id        stable key (the Modular hub stores layouts by it)
     label     what it is called in the nav hub
     folder    the playground folder it comes from
     variants  [{ file, label }] — the page(s) that can fill it; new ones go
               on the END (the Modular hub saves a choice by its index)
     frame     the height of the window it is shown in (default 100vh);
               Brands sits in 85vh so it reads as contained, not a screen
     mobile    { file, frame } used in place of the default variant on a
               phone (≤760px), where that variant's layout does not fit
     nav       the navbar label that scrolls to it (optional)
     gate      true: scrolling waits for the page's "ready" (the loader)

   PAGE_CSS is injected into a section's page when it is framed, to make
   the pages read as one site: Vend Sans everywhere, no second navbar, and the
   standalone pages' lead-in spacers taken out so sections meet edge to
   edge.
   ═════════════════════════════════════════════════════════════════════════ */
/* one footer for every landing: the About landing shows whichever the home
   page shows (see about.html) */
const FOOTER = { id: 'footer', label: 'Footer', folder: 'Footer', nav: 'Contact', fit: true,
    variants: [{ file: 'footer-dusk-grid.html', label: 'Footer — dusk grid' }] };

export const HOME_SECTIONS = [
  { id: 'opening', label: 'Loader → Hero → Metrics', folder: 'Loader · Hero section · Metrics', nav: null, gate: true,
    variants: [{ file: 'site-hero.html', label: 'Loader, Active Peak and Metrics as one scene' },
               { file: 'site-hero.html?noloader', label: 'Same, without the loader' }] },
  { id: 'brands', label: 'Brands', folder: 'Brands section', frame: '85vh',
    /* a phone gets the mosaic's own rows (the grid does not fit one) */
    variants: [{ file: 'brands.html', label: 'Brands' }, ] },
  { id: 'summits', label: 'Our summits', folder: 'Our summits', nav: 'Work',
    variants: [] },
  { id: 'cases', label: 'Extra case studies', folder: 'Extra case studies', nav: 'Cases', navMinor: true,
    variants: [] },
  { id: 'services', label: 'Our services', folder: 'Our services', nav: 'Services',
    variants: [{ file: 'services-gear-bags-v2.html', label: 'Gear tiers — bags v2' }] },
  { id: 'testimonials', label: 'Testimonials', folder: 'Our testimonials', nav: 'Voices', navMinor: true,
    variants: [{ file: 'testimonials-topo.html', label: 'Testimonials — topo' }] },
  { id: 'studio', label: 'Our studio', folder: 'Our studio', nav: 'Studio', navMinor: true,
    variants: [] },
  FOOTER,
];

/* Website v3: the same opening (loader → hero → stats), then the work
   itself — four summits stacked, each led by its imagery; the brands; the
   index of everything else — and only then services, voices, studio and
   the footer. The images come from assets/work/ (assets/work.js). */
export const V3_SECTIONS = [
  { id: 'opening', label: 'Loader → Hero → Metrics', folder: 'Loader · Hero section · Metrics', nav: null, gate: true,
    variants: [{ file: 'site-hero.html', label: 'Loader, Active Peak and Metrics as one scene' },
               { file: 'site-hero.html?noloader', label: 'Same, without the loader' }] },
  /* Nov 2026: back on desktop, where the phone has it (after the numbers):
     the plain grid, brands.html, as desktop had it before the review */
  { id: 'brands', label: 'Brands', folder: 'Brands section', frame: '80vh',
    variants: [{ file: 'brands.html', label: 'Brands' }, ] },
  { id: 'work', label: 'Our summits', folder: 'Our summits', nav: 'Work',
    /* a phone gets Base Camp without the layering: one range, no depth
       layers, no Rive per card — the same section at a fraction of the work */
    variants: [{ file: 'summits-basecamp-layered.html', label: 'Base Camp, layered' },
               ] },
  { id: 'more', label: 'More work', folder: 'Extra case studies',
    variants: [{ file: 'work-index.html', label: 'The index' }, ] },
  { id: 'services', label: 'Our services', folder: 'Our services', nav: 'Services',
    variants: [{ file: 'services-gear-bags-v2.html', label: 'Gear tiers — bags v2' },
               ] },
  { id: 'testimonials', label: 'Testimonials', folder: 'Our testimonials',
    variants: [{ file: 'testimonials-topo.html', label: 'Testimonials — topo' }] },
  { id: 'studio', label: 'Our studio', folder: 'Our studio',
    variants: [{ file: 'studio-team.html', label: 'Team Tibba — photos round the title' }, ] },
  { id: 'footer', label: 'Footer', folder: 'Footer', nav: 'Contact', fit: true,
    variants: [{ file: 'footer-dusk-grid.html', label: 'Footer — dusk grid' }, ] },
];
export const V3_LINKS = [{ label: 'Work', target: 'work' }, { label: 'Services', target: 'services' }, { label: 'About', href: 'about.html' }, { label: 'Contact', target: 'footer' }];

export const ABOUT_SECTIONS = [
  { id: 'about-hero', label: 'About us — hero', folder: 'About us — hero', nav: 'About',
    variants: [{ file: 'about-hero.html', label: 'About us — hero' }] },
  { id: 'about-description', label: 'Description', folder: 'About us — description', nav: 'Who we are',
    variants: [{ file: 'about-description.html', label: 'About us — description' }] },
  /* Nov 2026: the numbers are gone (the home page has them); the team comes
     straight after the description, then the foundations */
  { id: 'about-team', label: 'Team', folder: 'About us — team', nav: 'Team',
    variants: [{ file: 'about-team.html', label: 'About us — team' }] },
  { id: 'about-foundations', label: 'Foundations', folder: 'About us — foundations', nav: 'Foundation', navMinor: true,
    variants: [{ file: 'about-foundations.html', label: 'About us — foundations' }] },
  FOOTER,
];

/* Vend Sans everywhere, and only the landing's own navbar */
const SITE_CSS = `html, body { font-family: 'Vend Sans', system-ui, sans-serif; }
  /* phones and touch screens: no live background blur (each one re-blurs
     everything behind it on every frame of a scroll) — the plates keep their
     tint, which is most of the look */
  @media (max-width: 760px), (pointer: coarse) {
    *, *::before, *::after { -webkit-backdrop-filter: none !important; backdrop-filter: none !important; }
  }
  .mono, [class*="mono"] { font-family: 'Vend Sans', system-ui, sans-serif !important; }
  #ca-header, #hero-logo { display: none !important; }`;
export const PAGE_CSS = {
  '*': SITE_CSS,
  'about-description.html': `.lead { display: none !important; } .after { height: 12vh !important; }`,
  'about-foundations.html': `body > div[style*="30vh"] { height: 6vh !important; }`,
  'about-team.html': `body > div[style*="20vh"] { height: 4vh !important; }`,
  /* the footer page's own intro and the services slide-over are playground furniture */
  /* the plain grid, fitted to the section's 85vh window; the closing
     question on a grey tile */
  /* the grid fills its 80vh window, so its hairline closes the foot as it opens the top */
  'brands.html': `#brands { height: 100vh !important; min-height: 0 !important; }
    .tile.cta { background: #1d1d20 !important; } .tile.cta:hover { background: #232327 !important; }`,
};

/* the strip along the navbar's foot: working with the studio */
export const TICKER = 'Have a summit in mind? Let’s climb it together  ·  Now taking on new projects for 2027  ·  Write to hello@tibba.design  ·  Founders, product teams, first launches and redesigns';

/* the navbar's links, the same on every page; Contact goes to the footer */
export const HOME_LINKS = [{ label: 'Work', target: 'summits' }, { label: 'Services', target: 'services' }, { label: 'About', href: 'about.html' }, { label: 'Contact', target: 'footer' }];
export const ABOUT_LINKS = [{ label: 'Work', href: 'index.html#work' }, { label: 'Services', href: 'index.html#services' }, { label: 'About', target: 'about-hero' }, { label: 'Contact', target: 'footer' }];

/* the Modular hub's layout, stored per browser: [{ id, on, variant }] */
export const LAYOUT_KEY = 'tibba.site.home';
/* Website v3's own layout — the Modular hub arranges v3 now */
export const V3_LAYOUT_KEY = 'tibba.site.v3';
export function loadLayout(list = HOME_SECTIONS, key = LAYOUT_KEY) {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(key) || 'null'); } catch {}
  return resolveLayout(saved, list);
}
/* a saved layout over the registry: unknown ids dropped, new sections
   added (on) where the registry has them — straight after the section
   before them — and variants clamped to what exists */
export function resolveLayout(saved, list = HOME_SECTIONS) {
  const byId = Object.fromEntries(list.map(s => [s.id, s]));
  const out = [];
  (Array.isArray(saved) ? saved : []).forEach(e => {
    const s = byId[e.id]; if (!s || out.some(o => o.id === e.id)) return;
    out.push({ id: e.id, on: e.on !== false, variant: Math.min(s.variants.length - 1, Math.max(0, e.variant | 0)) });
  });
  list.forEach((s, i) => {
    if (out.some(o => o.id === s.id)) return;
    const prev = i ? out.findIndex(o => o.id === list[i - 1].id) : -1;
    out.splice(prev + 1, 0, { id: s.id, on: true, variant: 0 });
  });
  return out;
}
export function sectionsFor(layout, list = HOME_SECTIONS) {
  const byId = Object.fromEntries(list.map(s => [s.id, s]));
  return layout.filter(e => e.on).map(e => ({ ...byId[e.id], file: byId[e.id].variants[e.variant].file }));
}
