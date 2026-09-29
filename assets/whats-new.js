/* ══════════════════════════════════════════════════════════════════════════
   What's new — which pages changed recently, and which this browser has seen
   ─────────────────────────────────────────────────────────────────────────
   Loaded on every page straight after assets/manifest.js, and read by the
   index (the "Since your last visit" section and the per-row New tags) and
   by the site menu in the workbench (a dot beside each new page).

   ── what counts as new ────────────────────────────────────────────────────
   A page with an `updated` time in the manifest that falls inside the last
   48 hours of the viewer's own clock.

   ── what counts as seen ───────────────────────────────────────────────────
   Per browser, in localStorage — no accounts. Each friend on their own
   device starts with every recent change unseen; clearing it for one person
   clears it for nobody else. localStorage rather than sessionStorage so a
   New tag does not come back every time a tab is opened.

   What is stored is the `updated` time that was seen, not a yes/no. So when
   a page is changed again and its stamp moves, it is New again — including
   for someone who saw the previous version.

   A page is marked seen when:
     · its New tag has been on screen long enough for its animation to play
       (the index reports this; the tag stays for the rest of that visit)
     · the page itself is opened (the workbench reports this)
     · everything is acknowledged at once ("Mark all as seen", or folding
       the section away)

   If storage is unavailable (a private window with it blocked) every read
   comes back empty and every write is dropped: tags simply never clear.
   ═════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var WINDOW_MS = 48 * 3600 * 1000;
  var KEY = 'tibba.seen';

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function save(m) {
    try { localStorage.setItem(KEY, JSON.stringify(m)); } catch (e) {}
  }
  var seen = load();

  function pages() { return global.TIBBA_PAGES || []; }
  function stamp(p) { var t = Date.parse(p && p.updated); return isNaN(t) ? null : t; }
  function inWindow(p, now) {
    var t = stamp(p); if (t == null) return false;
    var age = (now || Date.now()) - t;
    /* a stamp a little in the future is a clock or timezone slip, not a
       reason to hide the change */
    return age < WINDOW_MS && age > -6 * 3600 * 1000;
  }

  /** Every page changed within the window, newest first. */
  function recent() {
    var now = Date.now();
    return pages().filter(function (p) { return inWindow(p, now); })
      .sort(function (a, b) { return stamp(b) - stamp(a); });
  }
  function isNew(p) {
    if (typeof p === 'string') p = find(p);
    return !!p && inWindow(p) && seen[p.id] !== p.updated;
  }
  function find(id) { return pages().filter(function (p) { return p.id === id; })[0] || null; }

  function emit() {
    try { global.dispatchEvent(new CustomEvent('tibba:seen')); } catch (e) {}
  }
  function markSeen(id) {
    var p = find(id);
    if (!p || !p.updated || seen[id] === p.updated) return;
    seen[id] = p.updated; save(seen); emit();
  }
  function markAll() {
    recent().forEach(function (p) { seen[p.id] = p.updated; });
    save(seen); emit();
  }

  /* Tidy: drop what was seen of changes that have left the window, so the
     stored object does not grow for ever. */
  (function prune() {
    var keep = {}, changed = false, now = Date.now();
    Object.keys(seen).forEach(function (id) {
      var p = find(id);
      if (p && inWindow(p, now)) keep[id] = seen[id]; else changed = true;
    });
    if (changed) { seen = keep; save(seen); }
  })();

  /* Another tab marking something seen updates this one too. */
  global.addEventListener('storage', function (e) {
    if (e.key !== KEY) return;
    seen = load(); emit();
  });

  global.TibbaNew = {
    WINDOW_MS: WINDOW_MS,
    recent: recent,
    isNew: isNew,
    unseen: function () { return recent().filter(isNew); },
    markSeen: markSeen,
    markAll: markAll,
  };
})(window);
