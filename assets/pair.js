/* ══════════════════════════════════════════════════════════════════════════
   The desktop and phone versions of a page, tied together (Nov 2026)
   ─────────────────────────────────────────────────────────────────────────
     <script src="assets/pair.js" data-side="desktop" data-pair="website-v3-mobile.html"></script>

   Loaded first in the <head> of both pages of a pair. The page belongs to
   one side of the 760px line; whenever the window is on the other side —
   when it loads, and whenever it is resized across the line later (a docked
   devtools panel opening or closing, a window dragged narrower) — it swaps
   to its pair, keeping the section (#hash). ?desktop / ?mobile pin a side.
   ═════════════════════════════════════════════════════════════════════════ */
(function () {
  var me = document.currentScript, side = me && me.dataset.side, pair = me && me.dataset.pair;
  if (!side || !pair || window.top !== window) return;
  if (/[?&](desktop|mobile)\b/.test(location.search)) return;
  var phone = matchMedia('(max-width: 760px)');
  var wrong = function () { return side === 'desktop' ? phone.matches : !phone.matches; };
  /* the loader (Nov 2026) plays only on a real arrival — a first visit or a
     reload. A swap on load is still that arrival, so it is handed on to the
     pair; a swap later (the window resized across the line) is not, and
     opens the pair without it. */
  var go = function (onLoad) {
    try {
      var nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
      var arrival = sessionStorage.getItem('tibba.arrival') === '1' || sessionStorage.getItem('tibba.visited') !== '1' || (nav && nav.type === 'reload');
      if (onLoad && arrival && side === 'mobile') sessionStorage.setItem('tibba.arrival', '1');   // only the desktop home has a loader else sessionStorage.removeItem('tibba.arrival');
      sessionStorage.setItem('tibba.visited', '1');
    } catch (e) {}
    location.replace(pair + location.hash);
  };
  if (wrong()) { go(true); return; }
  /* settle first: a window being dragged across the line, or a devtools
     panel sliding open, should not swap pages on every pixel */
  var t = 0;
  var check = function () { clearTimeout(t); t = setTimeout(function () { if (wrong()) go(false); }, 350); };
  if (phone.addEventListener) phone.addEventListener('change', check); else phone.addListener(check);
  /* and on resize too: not every way of resizing (device emulation, some
     embedded browsers) reports the media query's change */
  addEventListener('resize', check);
})();
