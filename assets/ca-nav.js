/* ══════════════════════════════════════════════════════════════════════════
   The Content Architecture site header — markup
   ─────────────────────────────────────────────────────────────────────────
   Built in script rather than typed into the page because the odometer needs
   six glyphs per character and the header carries about fifty characters.
   Written out by hand that is three hundred lines of markup that cannot be
   read, and the decoy glyphs — which are derived, not chosen — would be
   copied rather than computed and would drift the first time a label changed.

   Everything here mirrors site-header.tsx, marquee.tsx and odometer-text.tsx
   from github.com/sahil639/contentarchitecture-clone one for one: same nav
   list, same mark geometry, same seeded decoys, same repeat count.
   ═════════════════════════════════════════════════════════════════════════ */

const NAV = [
  { label: 'Features', href: '#features' },
  { label: 'The repo', href: '#the-repo' },
  { label: 'Showcase', href: '#showcase' },
  { label: 'Pricing',  href: '#pricing', accent: true },
  { label: 'FAQ',      href: '#faq' },
  { label: 'Blog',     href: '/blog' },
];

const ANNOUNCEMENT = 'Now available with Astro';

/* ── the mark ────────────────────────────────────────────────────────────
   A fan of hatched strokes radiating from the lower-left, echoing the hero
   vortex at a glyph's scale. Drawn as arcs of increasing radius about a
   corner origin rather than as concentric rings about the centre. */
const RAYS = 9;

function mark() {
  const paths = Array.from({ length: RAYS }, (_, i) => {
    const r = 3 + i * 2.4;
    return `<path d="M 2 ${22 - r} A ${r} ${r} 0 0 1 ${2 + r} 22"
                  stroke="rgba(241,238,231,0.85)" stroke-width="1.1"
                  stroke-linecap="round" />`;
  }).join('');
  return `<span aria-hidden="true" class="ca-mark">
    <svg viewBox="0 0 24 24" fill="none"><title>Mark</title>${paths}</svg>
  </span>`;
}

/* ── the odometer ────────────────────────────────────────────────────────
   Decoys are derived from the character and its position rather than drawn
   at random, so the column is the same on every load — the original picks
   them this way to keep the server and client renders identical, and keeping
   the rule means a label always rolls through the same glyphs. */
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const DECOY_COUNT = 4;
const STAGGER_MS = 28;

function decoysFor(char, index) {
  const seed = char.charCodeAt(0) + index * 31;
  return Array.from({ length: DECOY_COUNT },
    (_, i) => GLYPHS[(seed + (i + 1) * 7) % GLYPHS.length]);
}

const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function odometer(text) {
  const chars = Array.from(text).map((char, i) => {
    /* Spaces hold their slot in the stagger but never roll. */
    if (char === ' ') return '<span aria-hidden="true" class="ca-odo-space">&nbsp;</span>';
    const column = [char, ...decoysFor(char, i), char];
    const glyphs = column.map(g =>
      `<span data-odometer-glyph="${esc(g)}">${esc(g)}</span>`).join('');
    return `<span aria-hidden="true" class="ca-odo-char">
      <span class="ca-odo-ghost">${esc(char)}</span>
      <span class="ca-odo-col" style="transition-delay:${i * STAGGER_MS}ms">${glyphs}</span>
    </span>`;
  }).join('');
  return `<span class="ca-sr">${esc(text)}</span>
          <span aria-hidden="true" class="ca-odo">${chars}</span>`;
}

/* ── the marquee ─────────────────────────────────────────────────────────
   Duration scales with the number of repeats, keeping pixel speed constant
   no matter how long the phrase is. */
const REPEATS = 6;
const SECONDS_PER_REPEAT = 4.5;

function marquee(text) {
  const half = `<div class="ca-marquee-half">${
    Array.from({ length: REPEATS }, () => `<span>${esc(text)}</span>`).join('')
  }</div>`;
  return `<div class="ca-marquee" style="--ca-marquee-duration:${REPEATS * SECONDS_PER_REPEAT}s">
    <span class="ca-sr">${esc(text)}</span>
    <div aria-hidden="true" class="ca-marquee-track">${half}${half}</div>
  </div>`;
}

export function mountCaHeader(host) {
  const items = NAV.map(item => `<li>
    <a class="ca-link" href="${esc(item.href)}">${odometer(item.label)}${
      item.accent ? '<span aria-hidden="true" class="ca-dot"></span>' : ''
    }</a>
  </li>`).join('');

  host.className = 'ca ca-header';
  host.innerHTML = `
    <div class="ca-panel">
      <div class="ca-panel-inner">
        <nav aria-label="Primary">
          <div class="ca-row">
            <a class="ca-home" href="/" aria-label="Home">${mark()}</a>
            <ul class="ca-list">${items}</ul>
          </div>
          <div class="ca-marquee-rule">${marquee(ANNOUNCEMENT)}</div>
        </nav>
      </div>
    </div>`;
}
