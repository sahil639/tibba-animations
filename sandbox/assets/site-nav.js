/* ══════════════════════════════════════════════════════════════════════════
   The navbar, for pages that stand on their own
   ─────────────────────────────────────────────────────────────────────────
   Website v3's home page draws its navbar inside the shell (assets/site-
   shell.js), with the morphing mark, the phone's Menu and drawer, and the
   wireframe of the page. Pages outside the shell — the case studies, the
   About hero on its own — used to hang a plainer copy. This is the home
   page's navbar for them: the same pill, mark, links, strip, Menu and
   drawer. Only the wireframe stays home-only, as it maps the shell's
   sections.

     mountSiteNav(document.getElementById('ca-header'), { current: 'Work' })

   Contact scrolls to the page's own footer when it has one, and otherwise
   goes to the home page's.
   ═════════════════════════════════════════════════════════════════════════ */
import { mountCaHeader } from './ca-nav.js';
import { mountLogoMorph, LOGO_MORPH } from './logo-morph.js?v=2';
import { TICKER } from './site-sections.js?v=5';

export const SITE_NAV = [
  { label: 'Work', href: 'index.html#work' },
  { label: 'Services', href: 'index.html#services' },
  { label: 'About', href: 'about.html' },
  { label: 'Contact', href: 'index.html#footer' },
];

export function mountSiteNav(header, { nav = SITE_NAV, home = 'index.html', current = null } = {}) {
  const foot = document.querySelector('[data-site-footer], #footer');
  const items = nav.map(it => it.label === 'Contact' && foot ? { ...it, href: '#contact' } : it);
  mountCaHeader(header, { nav: items, announcement: TICKER, home, mark: '<span class="site-mark" aria-hidden="true"></span>' });
  header.classList.add('site-nav', 'site-nav-solo');
  const logo = mountLogoMorph(header.querySelector('.site-mark'), LOGO_MORPH);
  /* the mark changes form as the page scrolls, a step every 90% of a
     screen (as it did before Nov 2026): one read per frame at most, and a
     slow poll for scrolls that raise no event */
  let lraf = 0;
  const sy = () => Math.max(scrollY, document.body.scrollTop, document.documentElement.scrollTop);
  const turn = () => { lraf = 0; logo && logo.to(Math.floor(sy() / (innerHeight * 0.9))); };
  document.addEventListener('scroll', () => { if (!lraf) lraf = requestAnimationFrame(turn); }, { passive: true, capture: true });
  setInterval(() => { if (!document.hidden) turn(); }, 500);
  if (current) header.querySelectorAll('.ca-link').forEach((a, i) => { if (items[i] && items[i].label === current) a.setAttribute('aria-current', 'page'); });

  /* the phone's row: "Contact" (to the footer), then the pink toggle */
  const contactHref = foot ? '#contact' : home + '#footer';
  const row = header.querySelector('.ca-row');
  row.insertAdjacentHTML('beforeend', `<a class="site-contact" href="${contactHref}">Contact</a><button class="site-menu" type="button" aria-expanded="false" aria-controls="site-drawer" aria-label="Menu">
    <span class="site-menu-tg" aria-hidden="true"><i></i><i></i></span></button>`);
  row.insertAdjacentHTML('afterend', `<div class="site-drawer" id="site-drawer"><div class="site-drawer-in">
    <ol class="site-drawer-list">${items.map((it, i) => `<li><a href="${it.href}"${it.label === current ? ' aria-current="page"' : ''}><small>0${i + 1}</small>${it.label}</a></li>`).join('')}</ol>
  </div></div>`);

  const menu = open => {
    header.classList.toggle('open', open);
    header.querySelector('.site-menu').setAttribute('aria-expanded', open);
    /* nothing here locks the page's scroll; clear any lock left behind */
    if (!open) { document.documentElement.style.overflow = ''; document.body.style.overflow = ''; }
  };
  /* a section on this page: scroll so it lands just under the navbar */
  const goTo = el => {
    /* the bar's resting height (its layout box, so an entrance slide in
       progress does not count) */
    const bar = Math.max(header.offsetHeight, header.querySelector('.ca-row').getBoundingClientRect().bottom);
    /* a section: its heading, not its top padding, comes to rest under the bar */
    const to = (el.tagName === 'SECTION' && el.querySelector('h1, h2')) || el;
    const top = to.getBoundingClientRect().top + sy() - bar - (to === el ? 0 : 20);
    scrollTo({ top: Math.max(0, top), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };
  const targetOf = a => {
    const href = a.getAttribute('href') || '';
    if (href === '#contact') return foot;
    let u; try { u = new URL(href, location.href); } catch (e) { return null; }
    if (!u.hash || u.pathname !== location.pathname) return null;      // another page: let it open
    return document.getElementById(u.hash.slice(1));
  };
  header.addEventListener('click', e => {
    if (e.target.closest('.site-menu')) { menu(!header.classList.contains('open')); return; }
    const a = e.target.closest('a[href]');
    if (!a) return;
    menu(false);                                     // the drawer always closes on a tap
    const el = targetOf(a);
    if (el) { e.preventDefault(); history.replaceState(null, '', a.getAttribute('href') === '#contact' ? location.pathname + location.search : a.hash);
      /* closing and scrolling start together; the navbar is fixed, so the
         drawer folding away moves nothing on the page */
      goTo(el); }
  });
  /* a tap outside the open drawer closes it too */
  document.addEventListener('pointerdown', e => { if (header.classList.contains('open') && !header.contains(e.target)) menu(false); }, { passive: true });
  addEventListener('keydown', e => { if (e.key === 'Escape') menu(false); });
  requestAnimationFrame(() => document.documentElement.classList.add('site-nav-in'));
  /* phones, every page: a long press on an image opens no save / copy menu */
  if (matchMedia('(max-width: 760px)').matches) {
    document.addEventListener('contextmenu', e => { if (e.target.closest('img, video, picture, svg, canvas')) e.preventDefault(); });
    document.addEventListener('dragstart', e => { if (e.target.closest('img, video, picture, svg')) e.preventDefault(); });
  }
}
