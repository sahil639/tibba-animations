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

/* the drawer's wireframe: each section as a few strokes (site-shell.css .wf) */
const L = (w, cls = '') => `<i class="l ${cls}" style="width:${w}%"></i>`;
const BX = (n, cls = '') => `<span class="bxs ${cls}">${'<i class="bx"></i>'.repeat(n)}</span>`;
const WIRES = {
  opening: `<svg class="pk" viewBox="0 0 100 40" preserveAspectRatio="none"><path d="M0 40 L30 18 L44 26 L62 6 L80 22 L100 14"/><path d="M8 40 L32 24 L46 30 L62 14 L78 28 L96 22"/></svg>${L(62, 'big')}${L(40)}`,
  brands: BX(8, 'g4'),
  summits: `${L(34)}${BX(4, 'g2 tall')}`,
  cases: `${L(42)}${BX(3, 'row')}`,
  services: `${L(38)}<span class="tabs"><i></i><i></i><i></i></span>${BX(1, 'wide')}`,
  testimonials: `${L(20, 'acc')}${L(80, 'big')}${L(64, 'big')}${L(30)}`,
  studio: `${L(30)}<span class="pol"><i></i><i></i><i></i></span>`,
  footer: `${L(70, 'big')}${L(46, 'big')}<span class="fire"></span>${L(90)}`,
  'about-hero': `<span class="stone"></span>${L(56, 'big')}${L(36)}`,
  'about-description': `${L(90)}${L(84)}${L(88)}${L(52)}`,
  'about-foundations': BX(4, 'g2'),
  'about-team': `${L(28)}${BX(6, 'g3')}`,
  generic: `${L(60, 'big')}${L(80)}${L(70)}`,
};

export function mountSite({ sections, nav = [], home = '#', announcement = TICKER, extraNav = [], links = null }) {
  const stack = document.getElementById('stack');
  let version = Date.now().toString(36);
  let blocks = [];

  /* ── the navbar ───────────────────────────────────────────────────
     The same pill on every page — Work, Services, About and the mark —
     hung from the top edge, with the black strip carrying the studio's
     line along its foot. Below 760px the pill narrows to mark · Menu ·
     toggle (the toggle opens the links beneath it), and beside it hangs a
     second, smaller panel, as tall as the pill: a wireframe of the whole
     site that scrolls with the page, the section in view marked. */
  const header = document.getElementById('ca-header');
  function navItems() {
    if (links) return links.map(l => ({ label: l.label, href: l.href || '#' + l.target, target: l.target }));
    const fromSections = sections.filter(s => s.nav).map(s => ({ label: s.nav, href: '#' + s.id, target: s.id, minor: !!s.navMinor }));
    return [...fromSections, ...extraNav];
  }
  let logo, wire = null;
  function drawNav() {
    if (wire) wire.stop();
    mountCaHeader(header, { nav: navItems(), announcement, home, mark: '<span class="site-mark" aria-hidden="true"></span>' });
    header.classList.add('site-nav');
    logo = mountLogoMorph(header.querySelector('.site-mark'), LOGO_MORPH);
    /* the phone's row: Menu and the toggle */
    const row = header.querySelector('.ca-row');
    row.insertAdjacentHTML('beforeend', `<button class="site-menu" type="button" aria-expanded="false" aria-controls="site-drawer">
      <span class="site-menu-word">Menu</span><span class="site-menu-tg" aria-hidden="true"><i></i><i></i></span></button>`);
    /* the drawer: the links */
    const items = navItems().map((it, i) => `<li><a href="${it.href}"${it.target ? ` data-target="${it.target}"` : ''}><small>0${i + 1}</small>${it.label}</a></li>`).join('');
    row.insertAdjacentHTML('afterend', `<div class="site-drawer" id="site-drawer"><div class="site-drawer-in">
      <ol class="site-drawer-list">${items}</ol>
    </div></div>`);
    /* the wireframe, in its own panel to the pill's right */
    header.insertAdjacentHTML('beforeend', `<div class="site-wire" title="Where you are on the page"><div class="site-wire-in"><div class="site-wire-track"></div></div></div>`);
    wire = mountWire(header.querySelector('.site-wire'), header.querySelector('.ca-panel'));
  }
  drawNav();
  const menu = open => {
    header.classList.toggle('open', open);
    const b = header.querySelector('.site-menu'); if (b) b.setAttribute('aria-expanded', open);
  };
  header.addEventListener('click', e => {
    if (e.target.closest('.site-menu')) { menu(!header.classList.contains('open')); return; }
    if (e.target.closest('.site-wire')) { const id = wire && wire.at(e.clientY); if (id) { menu(false); goTo(id); } return; }
    const a = e.target.closest('[data-target]');
    if (a) { e.preventDefault(); menu(false); goTo(a.dataset.target); return; }
    if (e.target.closest('.ca-home') && home === '#') { e.preventDefault(); menu(false); goTo(null); }
  });
  addEventListener('keydown', e => { if (e.key === 'Escape') menu(false); });

  /* the wireframe: one small sketch per section, in the site's order and
     roughly in its proportions. Drawn at 150px wide and scaled into the
     panel; scrolled so the point of the page at the middle of the screen
     sits at the middle of the panel — section by section, so a long pinned
     section and a short one both read at their own pace. */
  const WIRE_W = 150;
  function mountWire(host, panel) {
    const box = host.querySelector('.site-wire-in'), track = host.querySelector('.site-wire-track');
    let raf = 0, y = 0, ty = 0, scale = .5, total = 0, parts = [], drawn = '';
    function draw() {
      const vh = innerHeight || 800;
      const key = blocks.map(b => b.s.id + ':' + Math.round((b.H || b.sec.offsetHeight) / 50)).join();
      if (key === drawn) return; drawn = key;
      track.innerHTML = blocks.map(b => {
        const H = b.H || b.sec.offsetHeight || vh;
        const k = Math.min(2.4, Math.max(b.s.frame ? .7 : 1, H / vh * .45));
        return `<div class="wf wf-${b.s.id}" data-id="${b.s.id}" style="--k:${k.toFixed(2)}">${WIRES[b.s.id] || WIRES.generic}<b>${b.s.label}</b></div>`;
      }).join('');
      total = track.offsetHeight;
      parts = [...track.children].map(el => ({ id: el.dataset.id, top: el.offsetTop, h: el.offsetHeight }));
      mark();
    }
    function mark() {
      track.querySelectorAll('.wf').forEach(el => el.classList.toggle('here', !!current && el.dataset.id === current.s.id));
      header.querySelectorAll('.site-drawer-list a').forEach(a => a.toggleAttribute('aria-current', !!current && a.dataset.target === current.s.id));
    }
    /* where the page is, in the wireframe's own pixels */
    function target() {
      const c = scrollY + innerHeight / 2, view = box.clientHeight / scale;
      let w = 0;
      for (let i = 0; i < blocks.length; i++) {
        const top = blocks[i].sec.offsetTop, h = blocks[i].sec.offsetHeight || 1, p = parts[i];
        if (!p) break;
        if (c < top + h || i === blocks.length - 1) { w = p.top + Math.min(1, Math.max(0, (c - top) / h)) * p.h; break; }
      }
      return Math.max(0, Math.min(total - view, w - view / 2));
    }
    function frame() {
      raf = 0;
      y += (ty - y) * .22;
      if (Math.abs(ty - y) < .3) y = ty; else raf = requestAnimationFrame(frame);
      track.style.transform = `scale(${scale}) translate3d(0,${(-y).toFixed(1)}px,0)`;
    }
    function follow() {
      if (!host.offsetWidth) return;                          // hidden: wider than a phone
      scale = box.clientWidth / WIRE_W;
      draw();
      ty = target();
      if (!raf) raf = requestAnimationFrame(frame);
    }
    /* as tall as the pill, whatever the pill is doing (the drawer opening) */
    const ro = new ResizeObserver(() => { host.style.height = panel.offsetHeight + 'px'; follow(); });
    ro.observe(panel);
    return {
      follow, mark,
      redraw() { drawn = ''; follow(); },
      at(clientY) {
        const r = box.getBoundingClientRect(), wy = (clientY - r.top) / scale + y;
        const p = parts.find(q => wy >= q.top && wy < q.top + q.h);
        return p && p.id;
      },
      stop() { ro.disconnect(); cancelAnimationFrame(raf); },
    };
  }

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
    /* the navbar drops in only once the loader has handed over */
    if (!on) requestAnimationFrame(() => document.documentElement.classList.add('site-nav-in'));
    else document.documentElement.classList.remove('site-nav-in');
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
  let wireT = 0;
  function frameH(b) { return b.sec.querySelector('.sticky').offsetHeight || innerHeight; }
  function measure(b) {
    try {
      const d = b.frame.contentDocument; if (!d || !d.body) return;
      b.FH = frameH(b);
      const h = Math.max(d.documentElement.scrollHeight, d.body.scrollHeight, b.FH);
      if (Math.abs(h - b.H) > 2) { b.H = h; b.sec.style.height = h + 'px'; remember(b); clearTimeout(wireT); wireT = setTimeout(() => wire && wire.redraw(), 250); }
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
      header.querySelectorAll('.ca-link[data-target]').forEach(a => a.toggleAttribute('aria-current', !!now && a.dataset.target === now.s.id));
      if (wire) wire.mark();
    }
    if (wire) wire.follow();
    if (logo) logo.to(Math.floor(scrollY / (vh * C.logoStep)));
  }
  let ticking = false;
  addEventListener('scroll', () => { if (ticking) return; ticking = true; requestAnimationFrame(() => { ticking = false; sync(false); }); }, { passive: true });
  addEventListener('resize', () => { blocks.forEach(b => b.loaded && measure(b)); sync(true); });

  /* ── build, and rebuild (the Modular hub) ────────────────────────── */
  /* a phone takes a section's `mobile` page in place of its default one */
  const forPhone = list => !matchMedia('(max-width: 760px)').matches ? list : list.map(s =>
    s.mobile && s.variants && s.file === s.variants[0].file ? { ...s, file: s.mobile.file, frame: s.mobile.frame || s.frame } : s);
  let given = [];
  function build(list) {
    given = list;
    list = forPhone(list);
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

  /* crossing the phone width (a rotated tablet, the Modular hub's device
     switch) swaps those sections over, where the page stands, without
     replaying the loader */
  matchMedia('(max-width: 760px)').addEventListener('change', () => {
    if (!given.some(s => s.mobile)) return;
    rebuild(given.map(s => s.gate && !/noloader/.test(s.file) ? { ...s, file: s.file + (s.file.includes('?') ? '&' : '?') + 'noloader' } : s), true);
  });

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
  /* a deep link (#summits, #services …) skips the loader and travels there */
  const deep = location.hash.slice(1);
  if (deep && sections.some(s => s.id === deep)) {
    sections = sections.map(s => s.gate && !/noloader/.test(s.file) ? { ...s, file: s.file + (s.file.includes('?') ? '&' : '?') + 'noloader' } : s);
    setTimeout(() => goTo(deep), 900);
  }
  build(sections);
  return { get blocks() { return blocks; }, goTo, rebuild, CONFIG: C };
}
