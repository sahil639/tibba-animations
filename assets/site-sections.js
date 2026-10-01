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
     variants  [{ file, label }] — the page(s) that can fill it
     frame     the height of the window it is shown in (default 100vh);
               Brands sits in 75vh so it reads as contained, not a screen
     nav       the navbar label that scrolls to it (optional)
     gate      true: scrolling waits for the page's "ready" (the loader)

   PAGE_CSS is injected into a section's page when it is framed, to make
   the pages read as one site: F37 everywhere, no second navbar, and the
   standalone pages' lead-in spacers taken out so sections meet edge to
   edge.
   ═════════════════════════════════════════════════════════════════════════ */
export const HOME_SECTIONS = [
  { id: 'opening', label: 'Loader → Hero → Metrics', folder: 'Loader · Hero section · Metrics', nav: null, gate: true,
    variants: [{ file: 'site-hero.html', label: 'Loader, Active Peak and Metrics as one scene' },
               { file: 'site-hero.html?noloader', label: 'Same, without the loader' }] },
  { id: 'brands', label: 'Brands', folder: 'Brands section', frame: '75vh',
    variants: [{ file: 'brands-mosaic.html', label: 'Brands — mosaic' }, { file: 'brands.html', label: 'Brands' }] },
  { id: 'summits', label: 'Our summits', folder: 'Our summits', nav: 'Work',
    variants: [{ file: 'summits-v3.html', label: 'Summits v3' }, { file: 'summits-v2.html', label: 'Summits v2' }, { file: 'summits-four.html', label: 'Four Summits' }] },
  { id: 'cases', label: 'Extra case studies', folder: 'Extra case studies', nav: 'Cases',
    variants: [{ file: 'case-studies-reel.html', label: 'Case reel' }] },
  { id: 'services', label: 'Our services', folder: 'Our services', nav: 'Services',
    variants: [{ file: 'services-compass-v4.html', label: 'Compass v4' }, { file: 'services-compass-v3.html', label: 'Compass v3' },
               { file: 'services-topo.html', label: 'Shifting Topo' }] },
  { id: 'testimonials', label: 'Testimonials', folder: 'Our testimonials', nav: 'Voices',
    variants: [{ file: 'testimonials-topo.html', label: 'Testimonials — topo' }] },
  { id: 'studio', label: 'Our studio', folder: 'Our studio', nav: 'Studio',
    variants: [{ file: 'studio-polaroids.html', label: 'Polaroids' }] },
  { id: 'footer', label: 'Footer', folder: 'Footer', nav: 'Contact',
    variants: [{ file: 'footer.html', label: 'Footer — skyline' }, { file: 'footer-meadow.html', label: 'Footer — green range' },
               { file: 'footer-mountain.html', label: 'Footer — snow peak' }] },
];

export const ABOUT_SECTIONS = [
  { id: 'about-hero', label: 'About us — hero', folder: 'About us — hero', nav: 'About',
    variants: [{ file: 'about-hero.html', label: 'About us — hero' }] },
  { id: 'about-description', label: 'Description', folder: 'About us — description', nav: 'Who we are',
    variants: [{ file: 'about-description.html', label: 'About us — description' }] },
  { id: 'about-foundations', label: 'Foundations', folder: 'About us — foundations', nav: 'Foundation',
    variants: [{ file: 'about-foundations.html', label: 'About us — foundations' }] },
  { id: 'about-team', label: 'Team', folder: 'About us — team', nav: 'Team',
    variants: [{ file: 'about-team.html', label: 'About us — team' }] },
  { id: 'footer', label: 'Footer', folder: 'Footer', nav: 'Contact',
    variants: [{ file: 'footer.html', label: 'Footer — skyline' }, { file: 'footer-meadow.html', label: 'Footer — green range' },
               { file: 'footer-mountain.html', label: 'Footer — snow peak' }] },
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
  'studio-polaroids.html': `#reset { display: none !important; }`,
};

/* the ticker along the navbar's foot, in the studio's voice */
export const TICKER = 'Tibba — a higher place  ·  Design for founders who climb  ·  30+ products shipped  ·  $400M unlocked for our clients  ·  Now taking on new climbs for 2027';

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
