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
        note: 'Sections assembled end to end', state: 'stub' },
    ],
  },

  sections: [
    { id: 'hero', label: 'Hero section',
      note: 'Every animation that has been built for the top of the page.',
      pages: [
        { id: 'hero-ridge',   label: 'Contour Ridge', file: 'topo-hero.html',
          note: 'Cursor-reactive ridge with a tuning panel', state: 'live' },
        { id: 'hero-scroll',  label: 'Scroll hero', file: 'topo-hero-scroll.html',
          note: 'The ridge wired into a scrolling page', state: 'live' },
        { id: 'hero-summits', label: 'Three summits', file: 'topo-peaks.html',
          note: 'Kilimanjaro, Fuji and the Matterhorn', state: 'live' },
        { id: 'hero-range',   label: 'Range', file: 'tibba-range.html',
          note: 'Scroll-driven Three.js range with case cards', state: 'live' },
        { id: 'hero-peak',    label: 'Peak', file: 'tibba-peak.html',
          note: 'One massif; the summit opens the tibba definition', state: 'live' },
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

    { id: 'services', label: 'Our services',
      note: 'What the studio sells, as a section.',
      pages: [ { id: 'services-01', label: 'Our services', file: 'services-section.html', note: '', state: 'stub' } ] },

    { id: 'testimonials', label: 'Our testimonials',
      note: 'What clients say.',
      pages: [ { id: 'testimonials-01', label: 'Our testimonials', file: 'testimonials.html', note: '', state: 'stub' } ] },

    { id: 'studio', label: 'Our studio',
      note: 'Who we are, on the home page.',
      pages: [ { id: 'studio-01', label: 'Our studio', file: 'studio-section.html', note: '', state: 'stub' } ] },

    { id: 'footer', label: 'Footer',
      note: 'The bottom of every page.',
      pages: [ { id: 'footer-01', label: 'Footer', file: 'footer.html', note: '', state: 'stub' } ] },

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
      pages: [ { id: 'about-01', label: 'About us', file: 'about.html', note: '', state: 'stub' } ] },

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
        { id: 'misc-dither', label: 'Dither Lab', file: 'dither-lab.html',
          note: 'A separate experiment in the same folder', state: 'live' },
      ] },
  ],
};

/* every page, flat and in index order — what the nav and the prev/next walk */
window.TIBBA_PAGES = [window.TIBBA_SITE.feature, ...window.TIBBA_SITE.sections]
  .flatMap(s => s.pages.map(p => ({ ...p, section: s.id, sectionLabel: s.label })));
