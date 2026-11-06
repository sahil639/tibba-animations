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
import { mountLogoMorph, LOGO_MORPH } from './logo-morph.js';
import { TICKER } from './site-sections.js';

export const SITE_NAV = [
  { label: 'Work', href: 'website-v3.html#work' },
  { label: 'Services', href: 'website-v3.html#services' },
  { label: 'About', href: 'about.html' },
  { label: 'Contact', href: 'website-v3.html#footer' },
];

export function mountSiteNav(header, { nav = SITE_NAV, home = 'website-v3.html', current = null } = {}) {
  const foot = document.querySelector('[data-site-footer], #footer');
  const items = nav.map(it => it.label === 'Contact' && foot ? { ...it, href: '#contact' } : it);
  mountCaHeader(header, { nav: items, announcement: TICKER, home, mark: '<span class="site-mark" aria-hidden="true"></span>' });
  header.classList.add('site-nav', 'site-nav-solo');
  mountLogoMorph(header.querySelector('.site-mark'), LOGO_MORPH);
  if (current) header.querySelectorAll('.ca-link').forEach((a, i) => { if (items[i] && items[i].label === current) a.setAttribute('aria-current', 'page'); });

  const row = header.querySelector('.ca-row');
  row.insertAdjacentHTML('beforeend', `<button class="site-menu" type="button" aria-expanded="false" aria-controls="site-drawer">
    <span class="site-menu-word">Menu</span><span class="site-menu-tg" aria-hidden="true"><i></i><i></i></span></button>`);
  row.insertAdjacentHTML('afterend', `<div class="site-drawer" id="site-drawer"><div class="site-drawer-in">
    <ol class="site-drawer-list">${items.map((it, i) => `<li><a href="${it.href}"${it.label === current ? ' aria-current="page"' : ''}><small>0${i + 1}</small>${it.label}</a></li>`).join('')}</ol>
  </div></div>`);

  const menu = open => {
    header.classList.toggle('open', open);
    header.querySelector('.site-menu').setAttribute('aria-expanded', open);
  };
  header.addEventListener('click', e => {
    if (e.target.closest('.site-menu')) { menu(!header.classList.contains('open')); return; }
    const a = e.target.closest('a[href="#contact"]');
    if (a) { e.preventDefault(); menu(false); foot.scrollIntoView({ behavior: 'smooth' }); }
  });
  addEventListener('keydown', e => { if (e.key === 'Escape') menu(false); });
  requestAnimationFrame(() => document.documentElement.classList.add('site-nav-in'));
}
