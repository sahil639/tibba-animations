/* ══════════════════════════════════════════════════════════════════════════
   The site map
   ─────────────────────────────────────────────────────────────────────────
   One list, read by the index, the collapsible nav every page carries, and
   the New tags (assets/whats-new.js), which track what each browser has seen
   by page id.
   Adding a page means adding a line here — nothing else knows the structure.

   id      stable key. What a browser has seen is stored against it, so
           renaming an id makes that page New again for everyone; renaming
           `label` or `file` is free.
   file    the html file, relative to the repo root.
   note    the one-line description shown on the index card.
   state   'live'  — a real design
           'stub'  — scaffolded, nothing designed into it yet
   updated when the page last changed in a way worth flagging — ISO time,
           with offset. Written by hand on purpose: a site-wide edit (a
           favicon, a shared stylesheet) touches every file, and a date read
           off git would mark the whole site as new. Pages changed within the
           last 48 hours get the index's "Since your last visit" section and
           a New tag (assets/whats-new.js).
   change  one short line saying what changed, shown beside that tag
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
    { id: 'loader', label: 'Loader',
      note: 'The first screen, before the hero',
      pages: [
        { id: 'loader-01', label: 'Loader', file: 'loader.html',
          note: 'The Active Peak plan view filling from the valley floor to the orange summit, 0 to 100', state: 'live' },
      ] },

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
      pages: [ { id: 'metrics-01', updated: '2026-09-29T12:00:00+07:00', change: 'Brick-bond cluster; opens on scroll down, closes on scroll up', label: 'Metrics', file: 'metrics.html',
                 note: "Active Peak's third state; four HUD boxes in one brick-bond cluster, open on the way down, close on the way up", state: 'live' } ] },

    { id: 'brands', label: 'Brands section',
      note: 'The logo wall.',
      pages: [ { id: 'brands-01', updated: '2026-09-29T12:00:00+07:00', change: "The clients' colour logos, gray until hovered", label: 'Brands', file: 'brands.html',
                 note: 'Fourteen tiles and a title filling the viewport; each plays its own contour field on hover', state: 'live' },
               { id: 'brands-mosaic', updated: '2026-09-30T12:00:00+07:00', change: 'Mobile: one screen of drifting brick-bond rows', label: 'Brands — mosaic', file: 'brands-mosaic.html',
                 note: 'The same brands in boxes of composed, varied sizes on a written six-by-five grid', state: 'live' } ] },

    { id: 'summits', label: 'Our summits',
      note: 'The case-study range. Working copies of the two animations that fit it.',
      pages: [
        { id: 'summits-peaks', label: 'Three summits', file: 'summits-peaks.html',
          note: 'Copy of the hero page, free to diverge', state: 'live' },
        { id: 'summits-range', updated: '2026-09-28T12:03:28+07:00', change: 'Rebuilt in the Active Peak style, with a summit trail', label: 'Range', file: 'summits-range.html',
          note: 'Active Peak, station for station, with the four cases in its aside column and a trail to the summit', state: 'live' },
        { id: 'summits-range-l2', updated: '2026-09-28T12:03:28+07:00', change: 'New: the cases in four cards up the peak', label: 'Range – L2', file: 'summits-range-l2.html',
          note: 'The same climb, the cases in four containers up the right flank, each with its own entrance', state: 'live' },
        { id: 'summits-four', updated: '2026-09-29T12:00:00+07:00', change: 'One summit in focus at a time; each trail draws once', label: 'Four Summits', file: 'summits-four.html',
          note: 'One summit centred at a time, the camera walking between them; each trail draws base-to-peak once, card beside the peak', state: 'live' },
        { id: 'summits-v2', updated: '2026-09-30T12:00:00+07:00', change: 'New: a country round the summits, Three Summits camera, cards', label: 'Summits v2', file: 'summits-v2.html',
          note: 'The four summits in a connected range, the Three Summits camera, winding shadowed trails, a rail and editorial cards', state: 'live' },
        { id: 'summits-v3', updated: '2026-09-30T12:00:00+07:00', change: 'New: v2 without cards, copy bottom-left', label: 'Summits v3', file: 'summits-v3.html',
          note: 'Summits v2 with no cards: the copy bottom-left names the summit in focus', state: 'live' },
      ] },

    { id: 'case-studies', label: 'Extra case studies',
      note: 'The work that does not get a summit.',
      pages: [ { id: 'case-studies-01', label: 'Extra case studies', file: 'case-studies.html', note: '', state: 'stub' },
               { id: 'case-studies-reel', updated: '2026-09-29T12:00:00+07:00', change: 'One title, inside the active plate only', label: 'Case reel', file: 'case-studies-reel.html',
                 note: 'The six extra cases on the Work Reel, in black, with an altitude tape that slides with the scroll', state: 'live' } ] },

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
      pages: [ { id: 'services-01', updated: '2026-09-28T12:03:28+07:00', change: 'Rebuilt on tibba.design\'s services layout', label: 'Our services', file: 'services-section.html',
                 note: "tibba.design's layout: stage tabs, a service grid, the detail beside it, recent work", state: 'live' },
               { id: 'services-topo', updated: '2026-09-29T12:00:00+07:00', change: 'Three hero-style peaks, sized by stage; grouped subtitles', label: 'Shifting Topo', file: 'services-topo.html',
                 note: 'Three contour peaks, smallest to largest by company stage, fixed isometric; services either side with grouped subtitles', state: 'live' },
               { id: 'services-topo-v2', updated: '2026-09-30T12:00:00+07:00', change: 'New: the earlier stepped-slab Shifting Topo, kept', label: 'Shifting Topo v2', file: 'services-topo-v2.html',
                 note: 'The previous Shifting Topo: a stepped block of land that re-forms per stage', state: 'live' },
               { id: 'services-compass', updated: '2026-09-29T12:00:00+07:00', change: 'Vector rings removed; subtitles grouped per side', label: 'Compass', file: 'services-compass.html',
                 note: 'A HUD compass: click or turn it to a stage, and its services appear either side', state: 'live' },
               { id: 'services-compass-v2', updated: '2026-09-30T12:00:00+07:00', change: 'New: every service boxed, compass held still', label: 'Compass v2', file: 'services-compass-v2.html',
                 note: 'Services as boxed brick bonds either side of a compass that never moves', state: 'live' },
               { id: 'services-compass-v3', updated: '2026-09-30T12:00:00+07:00', change: 'New: tabs and compass left, services right; one-screen mobile', label: 'Compass v3', file: 'services-compass-v3.html',
                 note: 'Tabs, blurb and compass on the left, the service columns on the right; fits one phone screen', state: 'live' } ] },

    { id: 'testimonials', label: 'Our testimonials',
      note: 'What clients say.',
      pages: [ { id: 'testimonials-01', label: 'Our testimonials', file: 'testimonials.html', note: '', state: 'stub' },
               { id: 'testimonials-topo', updated: '2026-09-28T19:09:00+07:00', change: 'New: masked quote reveals over a live contour field', label: 'Testimonials — topo', file: 'testimonials-topo.html',
                 note: "The final site's quotes, one pinned scene: masked word reveals, a live contour field per client, parallax", state: 'live' } ] },

    { id: 'studio', label: 'Our studio',
      note: 'Who we are, on the home page.',
      pages: [ { id: 'studio-01', label: 'Our studio', file: 'studio-section.html',
                 note: 'The section that sits between the testimonials and the footer', state: 'live' },
               { id: 'studio-photos', label: 'Photographs', file: 'studio-photos.html',
                 note: 'Seven photographs staggered around a centred title', state: 'live' },
               { id: 'studio-polaroids', updated: '2026-09-29T12:00:00+07:00', change: 'No tape, spring entrance, bakeable layout, team photos', label: 'Polaroids', file: 'studio-polaroids.html',
                 note: 'The team and studio life as polaroids that spring in from the sides; layout editable and bakeable on the panel', state: 'live' } ] },

    { id: 'footer', label: 'Footer',
      note: 'The bottom of every page.',
      pages: [
        { id: 'footer-01', updated: '2026-09-28T11:06:00+07:00', change: 'Fix to the generated skyline', label: 'Footer — skyline', file: 'footer.html',
          note: 'The footer on the generated paper skyline', state: 'live' },
        { id: 'footer-meadow', updated: '2026-09-29T12:00:00+07:00', change: 'New: the reference layout over a mossy green range', label: 'Footer — green range', file: 'footer-meadow.html',
          note: 'Form, sections and links in three columns over a range of moss-grown mountains that part under the cursor', state: 'live' },
        { id: 'footer-peak', updated: '2026-09-28T19:09:00+07:00', change: 'Layered depth, survey lines, new layout; no load-in', label: 'Footer — snow peak', file: 'footer-mountain.html',
          note: 'Granite spires in three layered depths, survey lines on the rock, the footer laid out around the peak', state: 'live' },
      ] },

    { id: 'about-hero', label: 'About us — hero',
      note: 'The top of the about page.',
      pages: [ { id: 'about-hero-01', updated: '2026-09-29T12:00:00+07:00', change: 'New: the About hero in the new type system', label: 'About us — hero', file: 'about-hero.html', note: "The question, the definition and the flagged summit, set in the description page's type", state: 'live' } ] },

    { id: 'about-description', label: 'About us — description',
      note: 'The studio in prose.',
      pages: [ { id: 'about-description-01', updated: '2026-09-29T12:00:00+07:00', change: 'Large, left-aligned, revealed as it scrolls past', label: 'About us — description', file: 'about-description.html',
                 note: 'The studio in prose, large and left-aligned, revealed word by word as it scrolls past', state: 'live' } ] },

    { id: 'about-team', label: 'About us — team',
      note: 'The people.',
      pages: [ { id: 'about-team-01', updated: '2026-09-29T12:00:00+07:00', change: 'New: each member between two contour mountains', label: 'About us — team', file: 'about-team.html', note: 'Each member between two contour mountains; the portrait dithers on hover', state: 'live' } ] },

    { id: 'about', label: 'About us',
      note: 'The whole about page, its sections assembled.',
      pages: [ { id: 'about-01', updated: '2026-09-28T10:50:31+07:00', change: 'Interactive campfire added above the footer', label: 'About us', file: 'about.html',
                 note: 'The definition, the studio in prose, the foundation and the team', state: 'live' },
               { id: 'about-campfire', updated: '2026-09-29T12:00:00+07:00', change: 'New: tent and campfire at night, smoke into the section above', label: 'Campsite', file: 'about-campfire.html',
                 note: 'An isometric night diorama in the Sylva manner: a lit tent, a campfire, moss, and smoke that climbs into the section above', state: 'live' },
               { id: 'about-campfire-contour', updated: '2026-09-28T11:19:18+07:00', change: 'Controls, looser rocks, calmer hover, real smoke', label: 'Campfire — contour', file: 'about-campfire-contour.html',
                 note: 'The campfire again, drawn in the hero\'s contour lines', state: 'live' },
               { id: 'about-campfire-lowpoly', updated: '2026-09-28T19:09:00+07:00', change: 'New: the first campfire re-cut as facets', label: 'Campfire — low-poly', file: 'about-campfire-lowpoly.html',
                 note: 'The first campfire re-cut as facets: twenty-faced stones, hex logs, crystal flames', state: 'live' },
               { id: 'about-campfire-hd', updated: '2026-09-28T19:09:00+07:00', change: 'New: lights, coals, streak sparks, haze, orbit', label: 'Campfire — high detail', file: 'about-campfire-hd.html',
                 note: 'Two flickering lights, coals, streak sparks, heat haze, grade, and a camera you can drag round', state: 'live' } ] },

    { id: 'about-foundations', label: 'About us — foundations',
      note: 'What the studio is built on.',
      pages: [ { id: 'about-foundations-01', updated: '2026-09-29T12:00:00+07:00', change: 'New: the two foundation cards, in 3D', label: 'About us — foundations', file: 'about-foundations.html', note: 'Agile and Creating value as two 3D cards that tilt toward the pointer, layered over their contours', state: 'live' } ] },

    { id: 'contact', label: 'Contact page',
      note: 'The way in.',
      pages: [ { id: 'contact-01', updated: '2026-09-29T12:00:00+07:00', change: 'The carabiner redrawn as an offset D', label: 'Contact page', file: 'contact.html',
                 note: 'A 3D carabiner drops in on a string and answers a click; the ways in down the right; no footer', state: 'live' } ] },

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
