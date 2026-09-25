/* ══════════════════════════════════════════════════════════════════════════
   The site map
   ─────────────────────────────────────────────────────────────────────────
   One list, read by three things: the index, the collapsible nav every page
   carries, and the comments panel (which files a note against a page id).
   Adding a page means adding a line here — nothing else knows the structure.

   id      stable key. Notes are filed against it, so renaming an id orphans
           that page's notes; renaming `label` or `file` is free.
   file    the html file, relative to the repo root.
   note    the one-line description shown on the index card.
   state   'live'  — a real design
           'stub'  — scaffolded, nothing designed into it yet
   ═════════════════════════════════════════════════════════════════════════ */
window.TIBBA_SITE = {
  /* The assembled site. Kept out of the ordinary run of sections because it is
     not a section — it is where all of them end up. */
  feature: {
    id: 'final', label: 'Tibba Design Studio — final website',
    note: 'The whole site, every section assembled in order. The thing all the work below feeds into.',
    pages: [
      { id: 'final-website', label: 'Final website', file: 'final-website.html',
        note: 'Loader, hero and its three scroll states, metrics, brands, the four-summit walk, services, testimonials', state: 'live' },
    ],
  },

  sections: [
    { id: 'hero', label: 'Hero section',
      note: 'The animations built for the top of the page. Named for what each one\n             actually is: the landform first, then what distinguishes it.',
      pages: [
        { id: 'hero-ridge',   label: 'Ridge — cursor', file: 'topo-hero.html',
          note: 'One ridge; the scene tilts and bulges under the pointer', state: 'live' },
        { id: 'hero-scroll',  label: 'Ridge — scroll', file: 'topo-hero-scroll.html',
          note: 'The same ridge, turning and locking aside as the page scrolls', state: 'live' },
        { id: 'hero-summits', label: 'Summits — three', file: 'topo-peaks.html',
          note: 'Kilimanjaro, Fuji and the Matterhorn, one at a time', state: 'live' },
        { id: 'hero-range',   label: 'Range — case walk', file: 'tibba-range.html',
          note: 'Five summits; the scroll climbs each client in turn', state: 'live' },
        { id: 'hero-peak',    label: 'Peak — definition', file: 'tibba-peak.html',
          note: 'One massif; clicking the summit opens the tibba definition', state: 'live' },
        { id: 'hero-active2', label: 'Active Peak 2', file: 'active-peak-2.html',
          note: 'The same scene with the redraw put back on the front of it', state: 'live' },
        { id: 'hero-active',  label: 'Active Peak', file: 'active-peak.html',
          note: 'The production hero, on its own, with every control — the playground', state: 'live' },
      ] },

    { id: 'metrics', label: 'Metrics',
      note: 'Years, products shipped, revenue unlocked.',
      pages: [ { id: 'metrics-01', label: 'Metrics', file: 'metrics.html', note: '', state: 'stub' } ] },

    { id: 'brands', label: 'Brands section',
      note: 'The logo wall.',
      pages: [ { id: 'brands-01', label: 'Brands', file: 'brands.html', note: '', state: 'stub' } ] },

    { id: 'summits', label: 'Our summits',
      note: 'The case-study range. Working copies of the two animations that fit it.',
      pages: [
        { id: 'summits-peaks', label: 'Three summits', file: 'summits-peaks.html',
          note: 'Copy of the hero page, free to diverge', state: 'live' },
        { id: 'summits-range', label: 'Range', file: 'summits-range.html',
          note: 'Copy of the hero page, free to diverge', state: 'live' },
      ] },

    { id: 'case-studies', label: 'Extra case studies',
      note: 'The work that does not get a summit.',
      pages: [ { id: 'case-studies-01', label: 'Extra case studies', file: 'case-studies.html', note: '', state: 'stub' } ] },

    /* The four summits, each at full length. All four are one template and four
       data objects — the layout is assets/case.js and assets/case.css, and the
       copy is assets/cases.js. Adding a fifth means a data entry and a shell. */
    { id: 'case-pages', label: 'Case study pages',
      note: 'The four summits at full length, off one template.',
      pages: [
        { id: 'case-groww', label: 'Groww', file: 'case-groww.html',
          note: 'Feed, Stories and the XIRR calculator', state: 'live' },
        { id: 'case-firstpost', label: 'Firstpost', file: 'case-firstpost.html',
          note: 'The video-first pivot, and what it returned', state: 'live' },
        { id: 'case-breathe', label: 'Breathe ESG', file: 'case-breathe-esg.html',
          note: 'A platform redesigned in eight weeks of sprints', state: 'live' },
        { id: 'case-shyft', label: 'Shyft & Mindhouse', file: 'case-shyft-mindhouse.html',
          note: 'Two sister brands, and the therapy flow', state: 'live' },
      ] },

    { id: 'services', label: 'Our services',
      note: 'What the studio sells, as a section.',
      pages: [ { id: 'services-01', label: 'Our services', file: 'services-section.html', note: '', state: 'stub' } ] },

    { id: 'testimonials', label: 'Our testimonials',
      note: 'What clients say.',
      pages: [ { id: 'testimonials-01', label: 'Our testimonials', file: 'testimonials.html', note: '', state: 'stub' } ] },

    { id: 'studio', label: 'Our studio',
      note: 'Who we are, on the home page.',
      pages: [ { id: 'studio-01', label: 'Our studio', file: 'studio-section.html',
                 note: 'The section that sits between the testimonials and the footer', state: 'live' } ] },

    { id: 'footer', label: 'Footer',
      note: 'The bottom of every page.',
      pages: [
        { id: 'footer-01', label: 'Footer — skyline', file: 'footer.html',
          note: 'The footer on the generated paper skyline', state: 'live' },
        { id: 'footer-peak', label: 'Footer — snow peak', file: 'footer-mountain.html',
          note: 'The same footer against a lit, snow-capped massif', state: 'live' },
      ] },

    { id: 'about-hero', label: 'About us — hero',
      note: 'The top of the about page.',
      pages: [ { id: 'about-hero-01', label: 'About us — hero', file: 'about-hero.html', note: '', state: 'stub' } ] },

    { id: 'about-description', label: 'About us — description',
      note: 'The studio in prose.',
      pages: [ { id: 'about-description-01', label: 'About us — description', file: 'about-description.html', note: '', state: 'stub' } ] },

    { id: 'about-team', label: 'About us — team',
      note: 'The people.',
      pages: [ { id: 'about-team-01', label: 'About us — team', file: 'about-team.html', note: '', state: 'stub' } ] },

    { id: 'about', label: 'About us',
      note: 'The whole about page, its sections assembled.',
      pages: [ { id: 'about-01', label: 'About us', file: 'about.html',
                 note: 'The definition, the studio in prose, the foundation and the team', state: 'live' } ] },

    { id: 'about-foundations', label: 'About us — foundations',
      note: 'What the studio is built on.',
      pages: [ { id: 'about-foundations-01', label: 'About us — foundations', file: 'about-foundations.html', note: '', state: 'stub' } ] },

    { id: 'contact', label: 'Contact page',
      note: 'The way in.',
      pages: [ { id: 'contact-01', label: 'Contact page', file: 'contact.html', note: '', state: 'stub' } ] },

    { id: 'services-page', label: 'Services page',
      note: 'Services at full length, on their own page.',
      pages: [ { id: 'services-page-01', label: 'Services page', file: 'services-page.html', note: '', state: 'stub' } ] },

    { id: 'misc', label: 'Miscellaneous animations',
      note: 'Experiments that have not found a section yet.',
      pages: [
        { id: 'misc-diagonal', label: 'Diagonal Roll', file: 'misc-diagonal-roll.html',
          note: 'Objects crossing on one diagonal, forever', state: 'live' },
        { id: 'misc-cardfan', label: 'Card Fan', file: 'misc-card-fan.html',
          note: 'A hand on an arc that springs and bounces back', state: 'live' },
        { id: 'misc-topo', label: 'Topo Lines', file: 'topo-lines.html',
          note: 'Contours re-extracted every frame from a moving noise field', state: 'live' },
        { id: 'misc-dither', label: 'Dither Lab', file: 'dither-lab.html',
          note: 'A separate experiment in the same folder', state: 'live' },
        { id: 'misc-prototype', label: 'Prototype', file: 'misc-prototype.html',
          note: 'Screens inside the iPhone and MacBook frames, with a before/after mode', state: 'live' },
        { id: 'misc-reel', label: 'Work Reel', file: 'misc-work-reel.html',
          note: 'Nine turned labels along the floor; scroll opens one plate at a time', state: 'live' },
        { id: 'misc-sylva', label: 'Sylva Living World', file: 'misc-sylva-living-world.html',
          note: "ThreeUI's moss-root world, living-green, from its registered source", state: 'live' },
      ] },
  ],
};

/* every page, flat and in index order — what the nav and the prev/next walk */
window.TIBBA_PAGES = [window.TIBBA_SITE.feature, ...window.TIBBA_SITE.sections]
  .flatMap(s => s.pages.map(p => ({ ...p, section: s.id, sectionLabel: s.label })));
