/* Small stroke icons for the phone page (Nov 2026): each case's summit, and
   the three stage packs — icons, not scaled-down renders. 24 × 24, drawn on
   whole/half pixels so they stay crisp; the colour is currentColor. */
const S = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const SUMMIT = [
  /* Groww — a broad shouldered massif */
  S('<path d="M2 19.5 7.5 11l3 3L15 7.5l7 12z"/><path d="M6 15.5h3M12.5 12.5h4M10 17h6"/>'),
  /* Firstpost — a horn, steep */
  S('<path d="M3 19.5 12 3.5l9 16z"/><path d="M9.2 9.5h5.6M7.5 13h9M5.7 16.3h12.6"/>'),
  /* Breathe ESG — a summit on a flat bench */
  S('<path d="M2 19.5 6 13h3.5L12 7l2.5 6H18l4 6.5z"/><path d="M10.6 10.4h2.8M5 15.5h14"/>'),
  /* Shyft & Mindhouse — an even cone */
  S('<path d="M3.5 19.5 12 5.5l8.5 14z"/><path d="M10 8.8h4M8 12.2h8M6 15.8h12"/>'),
];
export const PACK = [
  /* early: a waist pack */
  S('<path d="M2.5 12.5c3 1.2 16 1.2 19 0"/><rect x="6.5" y="10" width="11" height="8" rx="3"/><path d="M9 13.5h6"/>'),
  /* mid: a head torch */
  S('<path d="M3 12a9 5 0 0 1 18 0"/><path d="M3 12c0 2 4 3.5 9 3.5s9-1.5 9-3.5"/><rect x="9" y="12.5" width="6" height="5" rx="1.5"/>'),
  /* established: a daypack */
  S('<path d="M8 6V4.5a4 4 0 0 1 8 0V6"/><rect x="5.5" y="6" width="13" height="15" rx="4"/><path d="M8.5 13h7v5h-7z"/>'),
];
