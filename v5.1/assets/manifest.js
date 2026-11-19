/* the copy's manifest: only its own pages (tools/make-sandbox.mjs) */
window.TIBBA_SITE = {
 "feature": {
  "id": "final",
  "label": "Tibba Design Studio — the websites",
  "note": "Website v5.1 is the one live version (the only thing deployed). Website v3 is the working copy it is built from; v1 and v2 are in the Archive.",
  "pages": [
   {
    "id": "website-v3",
    "updated": "2026-10-23T18:00:00+07:00",
    "change": "Phones: stats straight under the hero (no turn), plain Base Camp without Rive, off-screen sections paused, smoother scroll",
    "label": "Website v3",
    "file": "website-v3.html",
    "note": "Loader, hero and stats as v2, then the work: four summits stacked and image-led, brands, the index of everything else, gear-tier services, voices, studio, footer",
    "state": "live"
   },
   {
    "id": "website-v3-mobile",
    "updated": "2026-10-23T22:00:00+07:00",
    "change": "New: Website v3 for phones as one native-scrolling page — no 3D, no frames",
    "label": "Website v3 — phone",
    "file": "website-v3-mobile.html",
    "note": "What a phone gets when it opens Website v3: every section in one ordinary page, the hero mountain drawn once as ridgelines, services as tap-to-open tiers, swipeable testimonials and studio photos",
    "state": "live"
   }
  ]
 },
 "sections": [
  {
   "id": "hero",
   "label": "Hero section",
   "note": "The animations built for the top of the page. Named for what each one\n             actually is: the landform first, then what distinguishes it.",
   "pages": [
    {
     "id": "site-hero",
     "updated": "2026-10-07T17:15:00+07:00",
     "change": "The summit's rings open the definition on hover",
     "label": "Site hero",
     "file": "site-hero.html",
     "note": "The home page's opening: the loader fills the plan view, flies down into the hero (rings open the definition), then turns aside for the metrics",
     "state": "live"
    }
   ]
  },
  {
   "id": "brands",
   "label": "Brands section",
   "note": "The logo wall.",
   "pages": [
    {
     "id": "brands-01",
     "updated": "2026-10-07T17:15:00+07:00",
     "change": "Firstpost's own logo",
     "label": "Brands",
     "file": "brands.html",
     "note": "Fourteen tiles and a title filling the viewport; each plays its own contour field on hover",
     "state": "live"
    }
   ]
  },
  {
   "id": "summits",
   "label": "Our summits",
   "note": "The case-study range. Working copies of the two animations that fit it.",
   "pages": [
    {
     "id": "summits-basecamp",
     "updated": "2026-10-14T17:46:00+07:00",
     "change": "Soft silhouettes: the background summits fade to clear at the top instead of cutting hard across the card",
     "label": "1 · Base Camp",
     "file": "summits-basecamp.html",
     "note": "Stacking cards over the range. The summit in focus is close, tall and lit with a glowing dot; the rest are lower, dimmer, thinner, cooler and sparser. Each card plays its project’s Rive thumbnail while active or hovered. Panel: contours, depth, style, animation, focus, Rive. Phones: the scene above one panel",
     "state": "live"
    },
    {
     "id": "summits-basecamp-layered",
     "updated": "2026-10-14T15:18:00+07:00",
     "change": "New: Base Camp with the ridges shaded in layers and a raised front view",
     "label": "1b · Base Camp, layered",
     "file": "summits-basecamp-layered.html",
     "note": "A copy of Base Camp: far ridges sink darker and near ones stand as lighter silhouettes; the front view raised 15° (desktop); phones keep their locked settings",
     "state": "live"
    }
   ]
  },
  {
   "id": "case-studies",
   "label": "Extra case studies",
   "note": "The work that does not get a summit.",
   "pages": [
    {
     "id": "work-index",
     "updated": "2026-10-08T16:31:00+07:00",
     "change": "New: every other project as an index; covers follow the pointer",
     "label": "v3 · More work",
     "file": "work-index.html",
     "note": "A row per project; hovering one brings its cover up beside the pointer, leaning into its motion; covers inline on touch screens",
     "state": "live"
    }
   ]
  },
  {
   "id": "case-pages",
   "label": "Case study pages",
   "note": "The four summits at full length, off one template.",
   "pages": [
    {
     "id": "case-groww-v2",
     "updated": "2026-10-19T18:00:00+07:00",
     "change": "Redesigned on the editorial template: a four-column grid, one container system (hero, full, half, card), large statements, captions",
     "label": "Just. Case Study – Groww v1",
     "file": "groww-casestudy.html",
     "note": "The editorial template (assets/case-editorial.js): a small centred cover, the meta line, the title as a statement, the ledger; rows, copy-and-image pairs and full-width containers; Other projects",
     "state": "live"
    },
    {
     "id": "case-groww-figma",
     "updated": "2026-11-04T18:00:00+07:00",
     "change": "The thumbnail as the hero and on the next-case cards; the home page’s footer",
     "label": "Just. Case Study – Groww v4",
     "file": "groww-casestudy.html",
     "note": "Built from the Figma frame (node 1459:6620): the big GROWW hero, metric cards (two reveal on hover), the facts, the Groww logo slide, the feed, the publisher icons, Stories with its portrait (a reel to come), four columns of iPhones that run in alternate directions while pointed at, XIRR, Keep climbing",
     "state": "live"
    },
    {
     "id": "case-firstpost-v2",
     "updated": "2026-10-19T18:00:00+07:00",
     "change": "Redesigned on the editorial template: a four-column grid, one container system (hero, full, half, card), large statements, captions",
     "label": "Just. Case Study – Firstpost v1",
     "file": "firstpost-casestudy.html",
     "note": "The same system, Firstpost’s colour and numbers",
     "state": "live"
    },
    {
     "id": "case-breathe-esg-v2",
     "updated": "2026-10-19T18:00:00+07:00",
     "change": "Redesigned on the editorial template: a four-column grid, one container system (hero, full, half, card), large statements, captions",
     "label": "Just. Case Study – Breathe ESG v1",
     "file": "breathe-esg-casestudy.html",
     "note": "The same system, with the scattered cards, the globe and the burst-and-reader kept",
     "state": "live"
    },
    {
     "id": "case-shyft-mindhouse-v2",
     "updated": "2026-10-19T18:00:00+07:00",
     "change": "Redesigned on the editorial template: a four-column grid, one container system (hero, full, half, card), large statements, captions",
     "label": "Just. Case Study – Shyft & Mindhouse v1",
     "file": "shyft-and-mindhouse-casestudy.html",
     "note": "The same system, Shyft & Mindhouse’s colour and story",
     "state": "live"
    },
    {
     "id": "case-firstpost-figma",
     "updated": "2026-11-04T18:00:00+07:00",
     "change": "Built from the new Figma design: the thumbnail hero, text and 2x plates, the home footer",
     "label": "Just. Case Study – Firstpost v3",
     "file": "firstpost-casestudy.html",
     "note": "Built from the Figma frame (node 1481:4435): the project thumbnail as the hero, the words as text, every plate the frame’s own render at 2x, the next three cases by their thumbnails, and the home page’s footer",
     "state": "live"
    },
    {
     "id": "case-breathe-esg-figma",
     "updated": "2026-11-04T18:00:00+07:00",
     "change": "Built from the new Figma design: the thumbnail hero, text and 2x plates, the home footer",
     "label": "Just. Case Study – Breathe ESG v3",
     "file": "breathe-esg-casestudy.html",
     "note": "Built from the Figma frame (node 1498:5349): the project thumbnail as the hero, the words as text, every plate the frame’s own render at 2x, the next three cases by their thumbnails, and the home page’s footer",
     "state": "live"
    },
    {
     "id": "case-shyft-mindhouse-figma",
     "updated": "2026-11-04T18:00:00+07:00",
     "change": "Built from the new Figma design: the thumbnail hero, text and 2x plates, the home footer",
     "label": "Just. Case Study – Shyft & Mindhouse v3",
     "file": "shyft-and-mindhouse-casestudy.html",
     "note": "Built from the Figma frame (node 1498:6281): the project thumbnail as the hero, the words as text, every plate the frame’s own render at 2x, the next three cases by their thumbnails, and the home page’s footer",
     "state": "live"
    }
   ]
  },
  {
   "id": "services",
   "label": "Our services",
   "note": "What the studio sells, as a section.",
   "pages": [
    {
     "id": "services-gear-bags-v2",
     "updated": "2026-10-14T15:18:00+07:00",
     "change": "New: rewritten copy — 4 services a stage, what each stage adds, engagement and a call to action (option)",
     "label": "Gear tiers — bags v2 (new copy)",
     "file": "services-gear-bags-v2.html",
     "note": "Gear tiers — bags with the new content: an outcome per stage, four short services each, the earlier stages carried, a line per bag, engagement + CTA on the panel",
     "state": "live"
    }
   ]
  },
  {
   "id": "testimonials",
   "label": "Our testimonials",
   "note": "What clients say.",
   "pages": [
    {
     "id": "testimonials-topo",
     "updated": "2026-10-06T18:00:00+07:00",
     "change": "Tablets and phones: quote cards you swipe through by hand",
     "label": "Testimonials — topo",
     "file": "testimonials-topo.html",
     "note": "The final site's quotes, one pinned scene: masked word reveals, a live contour field per client, parallax",
     "state": "live"
    }
   ]
  },
  {
   "id": "footer",
   "label": "Footer",
   "note": "The bottom of every page.",
   "pages": [
    {
     "id": "footer-dusk-grid",
     "updated": "2026-10-07T17:15:00+07:00",
     "change": "An ASCII marshmallow; a shorter footer and a better form",
     "label": "Footer — dusk grid",
     "file": "footer-dusk-grid.html",
     "note": "A contact form over the campfire on the left; page and social links, the studio and its local time, and TIBBA drawn as a blueprint on the right; orange to green to black, bottom up",
     "state": "live"
    },
    {
     "id": "footer-dusk-grid-light",
     "updated": "2026-10-19T12:00:00+07:00",
     "change": "New: the dusk grid footer in a light theme on #F5F9FA",
     "label": "Footer — dusk grid, light",
     "file": "footer-dusk-grid-light.html",
     "note": "The dusk grid footer on #F5F9FA: near-black ink and hairlines, a warm glow at the foot under the fire, the fire drawn in dark dots with orange running to amber; hover still stokes it",
     "state": "live"
    }
   ]
  },
  {
   "id": "about",
   "label": "About us",
   "note": "The whole about page, its sections assembled.",
   "pages": [
    {
     "id": "about-01",
     "updated": "2026-10-12T16:00:00+07:00",
     "change": "The About landing merged in: one About page, stitched, with the numbers kept",
     "label": "About us",
     "file": "about.html",
     "note": "The one About page: hero, description, the numbers, foundations, team and footer, with the site navbar and the dropdown index",
     "state": "live"
    }
   ]
  },
  {
   "id": "about-sections",
   "label": "About us — sections",
   "note": "The pages the About page is assembled from, in the order it shows them.",
   "pages": [
    {
     "id": "about-hero-01",
     "updated": "2026-10-14T18:18:00+07:00",
     "change": "New right side: a contoured peak — the camera flies from the map down to the summit; hover a ring and it turns into 'tibba design studio', the lines dither (the stone stays as an option)",
     "label": "About us — hero",
     "file": "about-hero.html",
     "note": "What the name means, stated large, behind a WebGL stone with the mark cut into it — lean, drag and light it with the pointer",
     "state": "live"
    },
    {
     "id": "about-description-01",
     "updated": "2026-10-01T12:00:00+07:00",
     "change": "New effect: held text that fills letter by letter as you scroll",
     "label": "About us — description",
     "file": "about-description.html",
     "note": "The studio's three paragraphs held in place and filled from gray to white as you scroll, the front edge trailing over a few letters",
     "state": "live"
    },
    {
     "id": "about-foundations-01",
     "updated": "2026-10-01T12:00:00+07:00",
     "change": "Rebuilt as Metrics plates: open once, live contours per card",
     "label": "About us — foundations",
     "file": "about-foundations.html",
     "note": "Agile and Creating value as Metrics-style plates that open once, each over its own drifting contours (per-card controls)",
     "state": "live"
    },
    {
     "id": "about-team-01",
     "updated": "2026-10-01T12:00:00+07:00",
     "change": "Mountains gone: Metrics plates over live contours per member",
     "label": "About us — team",
     "file": "about-team.html",
     "note": "Each member on a Metrics-style plate over their own drifting contours; the portrait dithers on hover",
     "state": "live"
    }
   ]
  },
  {
   "id": "misc",
   "label": "Miscellaneous animations",
   "note": "Experiments that have not found a section yet.",
   "pages": [
    {
     "id": "misc-bags",
     "updated": "2026-10-13T15:55:00+07:00",
     "change": "Three bags (hiking pack, waist pack, daypack) with a bouncy switcher; the Tibba icon centred on each front",
     "label": "Bags",
     "file": "misc-bags.html",
     "note": "The topographic backpack illustration as a WebGL model: every panel carries flowing contour rings, the Tibba icon on each front; switch bags bottom left (1–3); drag to turn, reset to the drawing’s angle",
     "state": "live"
    }
   ]
  }
 ]
};
window.TIBBA_PAGES = [window.TIBBA_SITE.feature, ...window.TIBBA_SITE.sections]
  .flatMap(s => s.pages.map(p => ({ ...p, section: s.id, sectionLabel: s.label })));
