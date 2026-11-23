/* Line icons for the phone page (Nov 2026), one family: 32 × 32, a 1.25
   stroke on half pixels, contour lines inside each form (the site's
   topographic hand), and the client or stage colour on one small detail.
   Each case's summit, and the three stage packs. */
const S = (d, acc = '') => `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}${acc ? `<g stroke="var(--ac, currentColor)">${acc}</g>` : ''}</svg>`;
export const SUMMIT = [
  /* Groww — a broad shouldered massif, two tops */
  S('<path d="M2.5 26.5 9 15.5l3 2.5 5.5-9 5 6.5 2-2 5 13"/><path d="M7.4 18.4c1 .5 2.6.6 3.6 0M15.6 12.6c1.2.6 2.9.6 4 0M5.6 21.5c2.2 1 5 1 7 0 1.6-.8 4.6-.9 6.2 0 1.6.9 4.2.9 5.8 0M4 24.5c3 1 7.5 1 10.5 0 2.5-.8 6.8-.8 9.2 0 1.6.5 3.2.6 4.6.3"/>', '<path d="M17.5 9v-3.5l2.5 1-2.5 1"/>'),
  /* Firstpost — a horn, steep and narrow */
  S('<path d="M4 26.5 16 4.5l12 22"/><path d="M13.4 9.6c1.6.7 3.6.7 5.2 0M11.5 13.2c2.8 1 6.2 1 9 0M9.5 17c3.8 1.2 9.2 1.2 13 0M7.4 20.8c5 1.4 12.2 1.4 17.2 0M5.6 24.2c6 1.5 14.8 1.5 20.8 0"/>', '<path d="M16 4.5V1.8l2.6 1-2.6 1"/>'),
  /* Breathe ESG — a summit standing on a flat bench */
  S('<path d="M2.5 26.5 7.5 18h5L16 9l3.5 9h5l5 8.5"/><path d="M14.6 12.6c.9.4 2 .4 2.8 0M13.4 15.6c1.6.6 3.6.6 5.2 0M6 21.2c2.4.8 5 .8 7.2 0 1.8-.6 3.8-.6 5.6 0 2.2.8 4.8.8 7.2 0M4.2 24.4c3.6 1 8 1 11.8 0s8.2-1 11.8 0"/>', '<path d="M16 9V6l2.5 1L16 8"/>'),
  /* Shyft & Mindhouse — an even cone */
  S('<path d="M3.5 26.5 16 7l12.5 19.5"/><path d="M13.6 10.8c1.5.6 3.3.6 4.8 0M11.6 14c2.6.9 6.2.9 8.8 0M9.6 17.2c3.6 1.1 9.2 1.1 12.8 0M7.6 20.4c4.8 1.3 12 1.3 16.8 0M5.6 23.6c6 1.5 14.8 1.5 20.8 0"/>', '<path d="M16 7V4l2.5 1L16 6"/>'),
];
export const PACK = [
  /* early stage: a waist pack — belt, pouch with a zip, a contour panel */
  S('<path d="M2 15.5c4 1.6 24 1.6 28 0"/><path d="M2 18c4 1.6 24 1.6 28 0"/><rect x="8.5" y="12" width="15" height="12" rx="4"/><path d="M10.5 16h11"/><path d="M11.5 19.4c1.6.8 3.6.8 5 0 1.2-.6 2.8-.6 4 0M12.5 21.8c1.4.5 3 .5 4.2 0"/>', '<path d="M20.5 14.6v2.6"/>'),
  /* mid stage: a head torch — band, housing, lens, a beam */
  S('<path d="M3.5 17a12.5 7 0 0 1 25 0"/><path d="M3.5 17c0 2.8 5.6 5 12.5 5s12.5-2.2 12.5-5"/><path d="M5.6 19.4c2 1 4.6 1.6 7.4 1.8M26.4 19.4c-2 1-4.6 1.6-7.4 1.8"/><rect x="11.5" y="16.5" width="9" height="7.5" rx="2.5"/><circle cx="16" cy="20.2" r="2"/>', '<path d="M16 25.5v3M12.5 27.5l-1.5 2M19.5 27.5l1.5 2"/>'),
  /* established: a daypack — handle, lid, front pocket, contour panel, straps */
  S('<path d="M12 7.5V6a4 4 0 0 1 8 0v1.5"/><rect x="7.5" y="7.5" width="17" height="21" rx="5.5"/><path d="M7.5 13.5c5.5 1.6 11.5 1.6 17 0"/><rect x="11" y="18.5" width="10" height="7" rx="2"/><path d="M12.5 21.2c1.2.6 2.8.6 4 0s2.6-.6 3.5 0M13.2 23.4c1 .4 2.4.4 3.4 0"/><path d="M5.5 12.5v11M26.5 12.5v11"/>', '<path d="M16 15.2v2"/>'),
];
