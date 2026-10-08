/* ══════════════════════════════════════════════════════════════════════════
   Site sections — what the stitched landings are made of
   ─────────────────────────────────────────────────────────────────────────
   One registry for Final Website v2 (the home landing), the About landing
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
   the pages read as one site: F37 everywhere, no second navbar, and the
   standalone pages' lead-in spacers taken out so sections meet edge to
   edge.
   ═════════════════════════════════════════════════════════════════════════ */
/* one footer for every landing: the About landing shows whichever the home
   page shows (see about-landing.html) */
const FOOTER = { id: 'footer', label: 'Footer', folder: 'Footer', nav: 'Contact',
    variants: [{ file: 'footer.html', label: 'Footer — skyline' }, { file: 'footer-meadow.html', label: 'Footer — green range' },
               { file: 'footer-mountain.html', label: 'Footer — snow peak' },
               { file: 'footer-campfire.html', label: 'Footer — campfire (all references)' },
               { file: 'footer-society.html', label: 'Footer — window cards' },
               { file: 'footer-vca.html', label: 'Footer — glowing fire' },
               { file: 'footer-heron.html', label: 'Footer — blueprint grid' },
               { file: 'footer-timeline.html', label: 'Footer — timeline of fires' },
               { file: 'footer-hackfirst.html', label: 'Footer — split screen' },
               { file: 'footer-cult.html', label: 'Footer — fire diagram' },
               { file: 'footer-human.html', label: 'Footer — orange field' },
               { file: 'footer-sylvan.html', label: 'Footer — fires that grow' },
               { file: 'footer-breaver.html', label: 'Footer — flame band' },
               { file: 'footer-jijo.html', label: 'Footer — dusk' },
               { file: 'footer-pengon.html', label: 'Footer — halftone camp' },
               { file: 'footer-dithered.html', label: 'Footer A — campfire, dithered' },
               { file: 'footer-contour-fire.html', label: 'Footer B — contour ridge fire' },
               { file: 'footer-analytical.html', label: 'Footer C — analytical campfire' },
               { file: 'footer-dusk-marshmallow.html', label: 'Footer — dusk, marshmallow' },
               { file: 'footer-blueprint-dusk.html', label: 'Footer — blueprint dusk' },
               { file: 'footer-dusk-grid.html', label: 'Footer — dusk grid' }] };

export const HOME_SECTIONS = [
  { id: 'opening', label: 'Loader → Hero → Metrics', folder: 'Loader · Hero section · Metrics', nav: null, gate: true,
    variants: [{ file: 'site-hero.html', label: 'Loader, Active Peak and Metrics as one scene' },
               { file: 'site-hero.html?noloader', label: 'Same, without the loader' }] },
  { id: 'brands', label: 'Brands', folder: 'Brands section', frame: '85vh',
    /* a phone gets the mosaic's own rows (the grid does not fit one) */
    mobile: { file: 'brands-mosaic.html', frame: '78vh' },
    variants: [{ file: 'brands.html', label: 'Brands' }, { file: 'brands-mosaic.html', label: 'Brands — mosaic' }] },
  { id: 'summits', label: 'Our summits', folder: 'Our summits', nav: 'Work',
    variants: [{ file: 'summits-v3.html', label: 'Summits v3' }, { file: 'summits-v2.html', label: 'Summits v2' }, { file: 'summits-four.html', label: 'Four Summits' }] },
  { id: 'cases', label: 'Extra case studies', folder: 'Extra case studies', nav: 'Cases', navMinor: true,
    variants: [{ file: 'case-studies-reel.html', label: 'Case reel' }] },
  { id: 'services', label: 'Our services', folder: 'Our services', nav: 'Services',
    variants: [{ file: 'services-compass-v4.html', label: 'Compass v4' }, { file: 'services-compass-v3.html', label: 'Compass v3' },
               { file: 'services-topo.html', label: 'Shifting Topo' },
               { file: 'services-compass-v5.html', label: 'Compass v5 — reference layout' }, { file: 'services-compass-v6.html', label: 'Compass v6 — half compass' },
               { file: 'services-compass-v7.html', label: 'Compass v7 — on a surface' }, { file: 'services-gear.html', label: 'Gear tiers' }] },
  { id: 'testimonials', label: 'Testimonials', folder: 'Our testimonials', nav: 'Voices', navMinor: true,
    variants: [{ file: 'testimonials-topo.html', label: 'Testimonials — topo' }] },
  { id: 'studio', label: 'Our studio', folder: 'Our studio', nav: 'Studio', navMinor: true,
    variants: [{ file: 'studio-polaroids.html', label: 'Polaroids' }, { file: 'studio-frames.html', label: 'Framed prints' }, { file: 'studio-polaroid-frames.html', label: 'Framed polaroids' }] },
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
  { id: 'work', label: 'Selected work', folder: 'Website v3', nav: 'Work',
    variants: [{ file: 'work-summits.html', label: 'Four summits, stacked' }] },
  { id: 'brands', label: 'Brands', folder: 'Brands section', frame: '85vh',
    mobile: { file: 'brands-mosaic.html', frame: '78vh' },
    variants: [{ file: 'brands.html', label: 'Brands' }, { file: 'brands-mosaic.html', label: 'Brands — mosaic' }] },
  { id: 'more', label: 'More work', folder: 'Website v3',
    variants: [{ file: 'work-index.html', label: 'The index' }, { file: 'case-studies-reel.html', label: 'Case reel' }] },
  { id: 'services', label: 'Our services', folder: 'Our services', nav: 'Services',
    variants: [{ file: 'services-gear.html', label: 'Gear tiers' }, { file: 'services-compass-v4.html', label: 'Compass v4' }] },
  { id: 'testimonials', label: 'Testimonials', folder: 'Our testimonials',
    variants: [{ file: 'testimonials-topo.html', label: 'Testimonials — topo' }] },
  { id: 'studio', label: 'Our studio', folder: 'Our studio',
    variants: [{ file: 'studio-polaroid-frames.html', label: 'Framed polaroids' }, { file: 'studio-frames.html', label: 'Framed prints' }] },
  { id: 'footer', label: 'Footer', folder: 'Footer', nav: 'Contact',
    variants: [{ file: 'footer-dusk-grid.html', label: 'Footer — dusk grid' }, { file: 'footer-blueprint-dusk.html', label: 'Footer — blueprint dusk' },
               { file: 'footer-campfire.html', label: 'Footer — campfire' }] },
];
export const V3_LINKS = [{ label: 'Work', target: 'work' }, { label: 'Services', target: 'services' }, { label: 'About', href: 'about-landing.html' }, { label: 'Contact', target: 'footer' }];

export const ABOUT_SECTIONS = [
  { id: 'about-hero', label: 'About us — hero', folder: 'About us — hero', nav: 'About',
    variants: [{ file: 'about-hero.html', label: 'About us — hero' }] },
  { id: 'about-description', label: 'Description', folder: 'About us — description', nav: 'Who we are',
    variants: [{ file: 'about-description.html', label: 'About us — description' }] },
  { id: 'about-foundations', label: 'Foundations', folder: 'About us — foundations', nav: 'Foundation', navMinor: true,
    variants: [{ file: 'about-foundations.html', label: 'About us — foundations' }] },
  { id: 'about-team', label: 'Team', folder: 'About us — team', nav: 'Team',
    variants: [{ file: 'about-team.html', label: 'About us — team' }] },
  FOOTER,
];

/* F37 everywhere, and only the landing's own navbar */
const SITE_CSS = `html, body { font-family: 'F37 Analog', system-ui, sans-serif; }
  .mono, [class*="mono"] { font-family: 'F37 Analog', system-ui, sans-serif !important; }
  #ca-header, #hero-logo { display: none !important; }`;
export const PAGE_CSS = {
  '*': SITE_CSS,
  'about-description.html': `.lead { display: none !important; } .after { height: 12vh !important; }`,
  'about-foundations.html': `body > div[style*="30vh"] { height: 6vh !important; }`,
  'about-team.html': `body > div[style*="20vh"] { height: 4vh !important; }`,
  /* the footer page's own intro and the services slide-over are playground furniture */
  'footer.html': `#approach { display: none !important; } .panel-tab, .panel-veil, .panel { display: none !important; }`,
  'footer-meadow.html': `.panel-tab, .panel-veil, .panel { display: none !important; }`,
  'footer-mountain.html': `.panel-tab, .panel-veil, .panel { display: none !important; }`,
  'case-studies-reel.html': `.after { display: none !important; }`,
  /* the plain grid, fitted to the section's 85vh window; the closing
     question on a grey tile */
  'brands.html': `#brands { height: 85vh !important; min-height: 0 !important; }
    .tile.cta { background: #1d1d20 !important; } .tile.cta:hover { background: #232327 !important; }`,
  'studio-polaroids.html': `#reset { display: none !important; }`,
  'studio-polaroid-frames.html': `#reset { display: none !important; }`,
  'studio-frames.html': `.studio { padding-top: 8vh !important; }`,
};

/* the strip along the navbar's foot: working with the studio */
export const TICKER = 'Have a summit in mind? Let’s climb it together  ·  Now taking on new projects for 2027  ·  Write to hello@tibba.design  ·  Founders, product teams, first launches and redesigns';

/* the navbar's links, the same on every page; Contact goes to the footer */
export const HOME_LINKS = [{ label: 'Work', target: 'summits' }, { label: 'Services', target: 'services' }, { label: 'About', href: 'about-landing.html' }, { label: 'Contact', target: 'footer' }];
export const ABOUT_LINKS = [{ label: 'Work', href: 'final-website-v2.html#summits' }, { label: 'Services', href: 'final-website-v2.html#services' }, { label: 'About', target: 'about-hero' }, { label: 'Contact', target: 'footer' }];

/* the Modular hub's layout, stored per browser: [{ id, on, variant }] */
export const LAYOUT_KEY = 'tibba.site.home';
export function loadLayout(list = HOME_SECTIONS) {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(LAYOUT_KEY) || 'null'); } catch {}
  return resolveLayout(saved, list);
}
/* a saved layout over the registry: unknown ids dropped, new sections
   appended (on), variants clamped to what exists */
export function resolveLayout(saved, list = HOME_SECTIONS) {
  const byId = Object.fromEntries(list.map(s => [s.id, s]));
  const out = [];
  (Array.isArray(saved) ? saved : []).forEach(e => {
    const s = byId[e.id]; if (!s || out.some(o => o.id === e.id)) return;
    out.push({ id: e.id, on: e.on !== false, variant: Math.min(s.variants.length - 1, Math.max(0, e.variant | 0)) });
  });
  list.forEach(s => { if (!out.some(o => o.id === s.id)) out.push({ id: s.id, on: true, variant: 0 }); });
  return out;
}
export function sectionsFor(layout, list = HOME_SECTIONS) {
  const byId = Object.fromEntries(list.map(s => [s.id, s]));
  return layout.filter(e => e.on).map(e => ({ ...byId[e.id], file: byId[e.id].variants[e.variant].file }));
}
