/* ══════════════════════════════════════════════════════════════════════════
   Site shell — sections stitched into one website
   ─────────────────────────────────────────────────────────────────────────
   Final Website v2 and the About landing are built from the playground's
   own section pages, framed rather than copied, so each always shows the
   latest version of its design. The technique is full-page.html's: every
   section is a block exactly as tall as its page, holding a sticky,
   viewport-sized frame of that page; as this page scrolls through the
   block, the frame's own document is scrolled to match. Pinned scenes pin,
   scroll-driven reveals run — one after another, as one document. Inside
   a frame the workbench stands down (embed mode) and hands its wheel and
   touch up to this page.

   What the shell adds on top:
     · one navbar for the whole site — the About hero's floating pill
       (assets/ca-nav.js), set in F37, its links scrolling smoothly to
       their sections, its mark the changing-on-scroll Tibba logo, and a
       ticker in the studio's voice
     · the gate: a section marked `gate` (the loader) holds the page still
       until it posts { tibba: 'ready' }
     · seams: a section's top edge is softened while it scrolls in, so one
       scene hands over to the next instead of cutting
     · PAGE_CSS (assets/site-sections.js) injected into every framed page:
       F37 throughout, no second navbar, no lead-in spacers
     · the refresh button, bottom left: reloads every section from source
       (cache-busted) where it stands, so the page picks up the latest
       version of each design without losing its place
     · rebuild(sections) — the Modular Website hub drives it by message

     mountSite({ sections, nav, home, announcement })
   ═════════════════════════════════════════════════════════════════════════ */
import { mountCaHeader } from './ca-nav.js';
import { mountLogoMorph, LOGO_MORPH } from './logo-morph.js';
import { PAGE_CSS, TICKER } from './site-sections.js';

const clamp01 = t => t < 0 ? 0 : t > 1 ? 1 : t;
export const SITE_CONFIG = {
  loadAhead: 1.5,      // viewports: how far ahead a section starts loading
  unloadBeyond: 4,     // viewports: sections further away than this are unloaded
  seam: 0.22,          // share of the viewport the incoming edge is softened over
  logoStep: 0.9,       // viewports of scroll per change of the mark's form
  gateTimeout: 14,     // s: never hold the page longer than this, whatever happens
};
const C = SITE_CONFIG;

export function mountSite({ sections, nav = [], home = '#', announcement = TICKER, extraNav = [] }) {
  const stack = document.getElementById('stack');
  let version = Date.now().toString(36);
  let blocks = [];

  /* ── the navbar ───────────────────────────────────────────────────── */
  const header = document.getElementById('ca-header');
  function navItems() {
    const fromSections = sections.filter(s => s.nav).map(s => ({ label: s.nav, href: '#' + s.id, target: s.id }));
    return [...fromSections, ...extraNav];
  }
  function drawNav() {
    mountCaHeader(header, { nav: navItems(), announcement, home, mark: '<span class="site-mark" aria-hidden="true"></span>' });
    header.classList.add('site-nav');
    logo = mountLogoMorph(header.querySelector('.site-mark'), LOGO_MORPH);
  }
  let logo;
  drawNav();
  header.addEventListener('click', e => {
    const a = e.target.closest('[data-target]');
    if (a) { e.preventDefault(); goTo(a.dataset.target); return; }
    if (e.target.closest('.ca-home') && home === '#') { e.preventDefault(); goTo(null); }
  });

  /* ── smooth travel to a section ──────────────────────────────────── */
  let tween = 0;
  function goTo(id) {
    if (locked) return;
    const b = blocks.find(x => x.s.id === id);
    const target = () => b ? b.sec.offsetTop : 0;          // re-read every frame: sections above may still be loading
    const from = scrollY, d0 = target() - from;
    const dur = Math.min(2.2, 0.7 + Math.abs(d0) / innerHeight * 0.12) * 1000, t0 = performance.now();
    cancelAnimationFrame(tween);
    const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const step = now => {
      const k = clamp01((now - t0) / dur); scrollTo(0, from + (target() - from) * ease(k));
      if (k < 1) tween = requestAnimationFrame(step);
      else setTimeout(() => { if (Math.abs(scrollY - target()) > 2) scrollTo(0, target()); }, 400);   // a late resize above
    };
    tween = requestAnimationFrame(step);
  }
  ['wheel', 'touchstart', 'keydown'].forEach(t => addEventListener(t, () => cancelAnimationFrame(tween), { passive: true }));

  /* ── the gate: hold the page while the loader runs ───────────────── */
  let locked = false, gateTimer = 0;
  function lock(on) {
    locked = on;
    document.documentElement.classList.toggle('site-locked', on);
    clearTimeout(gateTimer);
    if (on) gateTimer = setTimeout(() => lock(false), C.gateTimeout * 1000);
  }
  addEventListener('message', e => {
    if (e.data && e.data.tibba === 'ready' && blocks.some(b => b.frame.contentWindow === e.source)) lock(false);
    /* the Modular hub: same origin only, and only plain page files */
    if (e.data && e.data.tibba === 'layout' && Array.isArray(e.data.sections) && e.origin === location.origin) {
      const ok = e.data.sections.filter(x => x && typeof x.file === 'string' && /^[\w.-]+\.html(\?[\w=&-]*)?$/.test(x.file));
      rebuild(ok, e.data.keepScroll);
    }
  });

  /* ── the blocks ───────────────────────────────────────────────────── */
  const srcOf = (s, fresh) => s.file + (s.file.includes('?') ? '&' : '?') + 'embed=1&v=' + version
    + (fresh && s.gate && !/noloader/.test(s.file) ? '&noloader' : '');   // a refresh never replays the loader
  function make(s) {
    const sec = document.createElement('section');
    sec.className = 'site-block'; sec.id = 'sec-' + s.id;
    sec.setAttribute('aria-label', s.label);
    const fh = s.frame || '100vh';
    sec.style.setProperty('--frame-h', fh);
    sec.style.height = fh;
    const known = hcache[s.file.split('?')[0] + '@' + innerWidth + 'x' + innerHeight];
    if (known) sec.style.height = known + 'px';
    sec.innerHTML = `<div class="sticky"><iframe title="${s.label}"></iframe><i class="seam" aria-hidden="true"></i></div>`;
    stack.appendChild(sec);
    return { s, sec, frame: sec.querySelector('iframe'), seam: sec.querySelector('.seam'), H: 0, FH: 0, loaded: false, lastY: -1, ro: null };
  }
  /* each page's measured height, remembered per viewport size, so a
     section not yet loaded already takes the room it will need and the
     page below it does not jump when it arrives */
  const HKEY = 'tibba.site.heights';
  let hcache = {};
  try { hcache = JSON.parse(localStorage.getItem(HKEY) || '{}'); } catch {}
  const hk = s => s.file.split('?')[0] + '@' + innerWidth + 'x' + innerHeight;
  function remember(b) { hcache[hk(b.s)] = b.H; try { localStorage.setItem(HKEY, JSON.stringify(hcache)); } catch {} }
  function frameH(b) { return b.sec.querySelector('.sticky').offsetHeight || innerHeight; }
  function measure(b) {
    try {
      const d = b.frame.contentDocument; if (!d || !d.body) return;
      b.FH = frameH(b);
      const h = Math.max(d.documentElement.scrollHeight, d.body.scrollHeight, b.FH);
      if (Math.abs(h - b.H) > 2) { b.H = h; b.sec.style.height = h + 'px'; remember(b); }
    } catch {}
  }
  function inject(b) {
    try {
      const d = b.frame.contentDocument, file = b.s.file.split('?')[0];
      const st = d.createElement('style');
      st.textContent = (PAGE_CSS['*'] || '') + (PAGE_CSS[file] || '');
      d.head.appendChild(st);
    } catch {}
  }
  function load(b) {
    if (b.loaded) return;
    b.loaded = true; b.lastY = -1;
    b.frame.addEventListener('load', function onload() {
      b.frame.removeEventListener('load', onload);
      inject(b); measure(b);
      try { b.ro = new ResizeObserver(() => measure(b)); b.ro.observe(b.frame.contentDocument.body); } catch {}
      [300, 1000, 2500, 5000].forEach(t => setTimeout(() => measure(b), t));
      sync(true);
    });
    b.frame.src = srcOf(b.s, b.fresh);
  }
  function unload(b) {
    if (!b.loaded) return;
    b.loaded = false;
    if (b.ro) b.ro.disconnect();
    b.frame.src = 'about:blank';                 // keeps its measured height
  }

  /* ── the scroll: drive each frame's own document ─────────────────── */
  let current = null;
  function sync(force) {
    const vh = innerHeight;
    let now = null;
    blocks.forEach(b => {
      const r = b.sec.getBoundingClientRect();
      const near = r.bottom > -vh * C.loadAhead && r.top < vh * (1 + C.loadAhead);
      const far = r.bottom < -vh * C.unloadBeyond || r.top > vh * (1 + C.unloadBeyond);
      if (near) load(b); else if (far) unload(b);
      if (r.top <= vh * 0.5 && r.bottom > vh * 0.5) now = b;
      /* the seam: the incoming edge is soft while it travels up the screen */
      b.seam.style.opacity = r.top > 0 && r.top < vh ? clamp01((r.top - vh * (1 - C.seam * 2.6)) / (vh * C.seam * 1.6)).toFixed(3) : '0';
      if (!b.loaded) return;
      const fh = b.FH || vh;
      const y = Math.round(Math.min(Math.max(0, -r.top), Math.max(0, (b.H || fh) - fh)));
      if (force || y !== b.lastY) { b.lastY = y; try { b.frame.contentWindow.scrollTo(0, y); } catch {} }
    });
    if (now !== current) {
      current = now;
      header.querySelectorAll('[data-target]').forEach(a => a.toggleAttribute('aria-current', !!now && a.dataset.target === now.s.id));
    }
    if (logo) logo.to(Math.floor(scrollY / (vh * C.logoStep)));
  }
  let ticking = false;
  addEventListener('scroll', () => { if (ticking) return; ticking = true; requestAnimationFrame(() => { ticking = false; sync(false); }); }, { passive: true });
  addEventListener('resize', () => { blocks.forEach(b => b.loaded && measure(b)); sync(true); });

  /* ── build, and rebuild (the Modular hub) ────────────────────────── */
  function build(list) {
    sections = list;
    blocks.forEach(b => { if (b.ro) b.ro.disconnect(); });
    stack.innerHTML = '';
    blocks = list.map(make);
    drawNav();
    const first = list[0];
    lock(!!(first && first.gate && !/noloader/.test(first.file)));
    sync(true);
  }
  function rebuild(list, keepScroll) {
    const y = scrollY;
    build(list);
    if (!keepScroll) scrollTo(0, 0); else scrollTo(0, Math.min(y, document.documentElement.scrollHeight));
    sync(true);
  }

  /* ── refresh: every section again, from source, where it stands ──── */
  const rf = document.getElementById('site-refresh');
  if (rf) rf.addEventListener('click', () => {
    version = Date.now().toString(36);
    rf.classList.remove('spin'); void rf.offsetWidth; rf.classList.add('spin');
    blocks.forEach(b => {
      if (!b.loaded) return;                     // unloaded ones load fresh when reached
      b.loaded = false; b.fresh = true; if (b.ro) b.ro.disconnect();
      load(b);
    });
  });

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  scrollTo(0, 0);
  build(sections);
  return { get blocks() { return blocks; }, goTo, rebuild, CONFIG: C };
}
