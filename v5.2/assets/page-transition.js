/* Page transitions into the case studies (Nov 2026) — see page-transition.css.
   Loaded in the <head>, before the page first paints, so `pagereveal` is
   heard. Three jobs:
     · on the way out (pageswap): let the transition run only when the page
       being opened is a case study; skip it for everything else
     · a case's next-case card that was clicked lends its thumbnail the name
       pt-hero, and the next case's hero takes that name on arrival
       (pagereveal), so the picture grows into the hero
     · a browser with no cross-document transitions gets .pt-fallback on
       arriving at a case study from this site: the content fades in */
(() => {
  const path = u => { try { return new URL(u, location.href).pathname; } catch (e) { return ''; } };
  const isCase = u => /-casestudy(\.html)?$/.test(path(u));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cross = 'onpagereveal' in window;

  if (!cross && isCase(location.href)) {
    try { if (document.referrer && new URL(document.referrer).origin === location.origin) document.documentElement.classList.add('pt-fallback'); } catch (e) {}
  }
  if (!cross) return;

  let last = null;
  addEventListener('click', e => { last = e.target.closest ? e.target.closest('a[href]') : null; }, true);

  addEventListener('pageswap', e => {
    const vt = e.viewTransition; if (!vt) return;
    const to = e.activation && e.activation.entry && e.activation.entry.url;
    if (!to || !isCase(to) || path(to) === location.pathname) { vt.skipTransition(); return; }
    const card = last && last.closest('.cf-card');
    const pic = card && card.querySelector('.wk-img');
    if (pic && !reduce) {
      pic.style.viewTransitionName = 'pt-hero';
      try { sessionStorage.setItem('pt-hero', '1'); } catch (e) {}
    }
  });

  addEventListener('pagereveal', e => {
    /* the flag is read and cleared on every arrival, so a skipped transition
       never leaves it behind for a later page */
    let want = false;
    try { want = sessionStorage.getItem('pt-hero') === '1'; sessionStorage.removeItem('pt-hero'); } catch (e) {}
    const vt = e.viewTransition; if (!vt) return;
    const hero = want && document.querySelector('.cf-hero');
    if (!hero) return;
    hero.style.viewTransitionName = 'pt-hero';
    vt.finished.finally(() => { hero.style.viewTransitionName = ''; });
  });
})();
