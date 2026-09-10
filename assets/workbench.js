/* ══════════════════════════════════════════════════════════════════════════
   Workbench — site menu, right dock, comments
   ─────────────────────────────────────────────────────────────────────────
   Loaded by every page. It reads assets/manifest.js for the site map and
   notes.js for the comments, and it builds its own chrome — no page carries
   any of this markup.

   The one clever part is adopt(): a page's control panel is MOVED into the
   dock with appendChild rather than rebuilt there. Moving a node keeps every
   listener already bound to it, so a slider wired up on line 3,000 of a
   monolith keeps working with nothing in that file changed.
   ═════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var SITE  = window.TIBBA_SITE;
  var PAGES = window.TIBBA_PAGES || [];
  if (!SITE) { console.warn('[workbench] assets/manifest.js did not load'); return; }

  var LS = {
    author: 'tibba.author',
    drafts: 'tibba.notes.drafts',
    nav:    'tibba.nav.open',
    dock:   'tibba.dock.open',
    notes:  'tibba.notes.open',
    width:  'tibba.dock.width',
  };
  function get(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* ── which page is this ────────────────────────────────────────────────
     cleanUrls means the address can be /topo-hero or /topo-hero.html or /,
     so everything is compared as a bare stem. */
  function stem(path) {
    var s = String(path).split('?')[0].split('#')[0];
    s = s.substring(s.lastIndexOf('/') + 1);
    return s.replace(/\.html$/, '').toLowerCase();
  }
  var here = stem(location.pathname) || 'index';
  var CURRENT = PAGES.filter(function (p) { return stem(p.file) === here; })[0] || null;

  /* ── theme ─────────────────────────────────────────────────────────────
     The chrome sits on a decade of different page backgrounds. Rather than
     pick one and lose half of them, read the page's own luminance once. */
  function luminance(rgb) {
    var m = /rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/.exec(rgb || '');
    if (!m) return 0;
    return (0.2126 * +m[1] + 0.7152 * +m[2] + 0.0722 * +m[3]) / 255;
  }
  function applyTheme() {
    var bg = getComputedStyle(document.body).backgroundColor;
    if (!bg || bg === 'transparent' || /rgba\(0, 0, 0, 0\)/.test(bg)) {
      bg = getComputedStyle(document.documentElement).backgroundColor;
    }
    document.documentElement.setAttribute('data-wb-theme', luminance(bg) > 0.55 ? 'light' : 'dark');
  }

  /* ═══ the site menu ══════════════════════════════════════════════════ */
  function buildNav() {
    var nav = el('nav', 'wb');
    nav.id = 'wb-nav';
    nav.setAttribute('aria-label', 'Site');
    nav.dataset.open = get(LS.nav, 'false');

    var bar = el('button', 'wb-nav-bar');
    bar.type = 'button';
    bar.setAttribute('aria-expanded', nav.dataset.open);
    bar.appendChild(el('span', 'wb-caret'));
    bar.appendChild(el('span', 'wb-mark', 'Tibba'));
    bar.appendChild(el('span', 'wb-here', CURRENT ? CURRENT.label : 'Index'));
    bar.addEventListener('click', function () {
      var open = nav.dataset.open !== 'true';
      nav.dataset.open = String(open);
      bar.setAttribute('aria-expanded', String(open));
      set(LS.nav, String(open));
    });
    nav.appendChild(bar);

    var body = el('div', 'wb-nav-body');
    var home = el('a', 'wb-home', 'All sections');
    home.href = 'index.html';
    body.appendChild(home);

    [SITE.feature].concat(SITE.sections).forEach(function (sec) {
      if (!sec) return;
      var d = el('details', 'wb-group' + (sec === SITE.feature ? ' wb-feature' : ''));
      var mine = CURRENT && CURRENT.section === sec.id;
      d.open = !!mine;

      var sum = el('summary');
      sum.appendChild(el('span', 'wb-tw'));
      sum.appendChild(el('span', null, sec.label));
      sum.appendChild(el('span', 'wb-n', String(sec.pages.length)));
      d.appendChild(sum);

      sec.pages.forEach(function (p) {
        var a = el('a', 'wb-page');
        a.href = p.file;
        a.appendChild(el('span', null, p.label));
        if (p.state === 'stub') a.appendChild(el('span', 'wb-stub', 'stub'));
        if (CURRENT && CURRENT.id === p.id) a.setAttribute('aria-current', 'page');
        d.appendChild(a);
      });
      body.appendChild(d);
    });

    nav.appendChild(body);
    return nav;
  }

  /* ═══ notes ══════════════════════════════════════════════════════════
     Committed notes come from notes.js, which the dev server rewrites and a
     dev commits. Anything written while the file cannot be reached is held
     in localStorage and shown as uncommitted until it lands in the file. */
  function committed() { return (window.TIBBA_NOTES || []).slice(); }
  function drafts() {
    try { return JSON.parse(get(LS.drafts, '[]')) || []; } catch (e) { return []; }
  }
  function saveDrafts(list) { set(LS.drafts, JSON.stringify(list)); }

  function allNotes() {
    var done = committed(), ids = {};
    done.forEach(function (n) { ids[n.id] = 1; });
    /* a draft that has since been committed by someone else is not a draft
       any more — drop it rather than show the note twice */
    var pending = drafts().filter(function (n) { return !ids[n.id]; });
    if (pending.length !== drafts().length) saveDrafts(pending);
    return done.map(function (n) { return Object.assign({}, n, { unsaved: false }); })
      .concat(pending.map(function (n) { return Object.assign({}, n, { unsaved: true }); }))
      .sort(function (a, b) { return String(a.at).localeCompare(String(b.at)); });
  }

  function noteFileText(list) {
    return '/* Comments left in the workbench dock. Written by the dev server when a\n' +
           '   note is saved; commit it with the change the note is about. */\n' +
           'window.TIBBA_NOTES = ' + JSON.stringify(list, null, 2) + ';\n';
  }

  function persist(note, done) {
    /* The dev server takes the note and rewrites notes.js. On Vercel, or over
       file://, there is nothing to take it — the note stays local and the
       panel offers the file to download instead. */
    var ok = false;
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', 'api/notes', true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) {
          try { window.TIBBA_NOTES = JSON.parse(xhr.responseText).notes || []; ok = true; } catch (e) {}
        }
        done(ok);
      };
      xhr.onerror = function () { done(false); };
      xhr.send(JSON.stringify(note));
    } catch (e) { done(false); }
  }

  /* ═══ the dock ═══════════════════════════════════════════════════════ */
  var dock, dockTab, listEl, countEl, scopeEl, bodyEl;
  var notesWrap, notesToggle;
  var scopeAll = false;

  function buildDock() {
    dock = el('aside', 'wb');
    dock.id = 'wb-dock';
    dock.setAttribute('aria-label', 'Controls and comments');
    dock.dataset.open = get(LS.dock, 'true');
    document.documentElement.dataset.wbDock = dock.dataset.open === 'true' ? 'open' : 'closed';
    var w = get(LS.width, '');
    if (w) document.documentElement.style.setProperty('--wb-dock-w', w);

    dockTab = el('button', 'wb-dock-tab');
    dockTab.type = 'button';
    dockTab.appendChild(el('span', 'wb-dot'));
    dockTab.appendChild(el('span', null, 'Panel'));
    dockTab.addEventListener('click', function () { toggleDock(); });
    dock.appendChild(dockTab);

    var grip = el('div', 'wb-grip');
    grip.title = 'Drag to resize';
    dock.appendChild(grip);
    dragWidth(grip);

    var head = el('div', 'wb-dock-head');
    var t = el('div');
    t.appendChild(el('div', 'wb-sec', CURRENT ? CURRENT.sectionLabel : 'Workbench'));
    t.appendChild(el('div', 'wb-ttl', CURRENT ? CURRENT.label : document.title || 'Page'));
    head.appendChild(t);
    var x = el('button', 'wb-x', '×');
    x.type = 'button';
    x.title = 'Close the dock';
    x.setAttribute('aria-label', 'Close the dock');
    x.addEventListener('click', function () { toggleDock(false); });
    head.appendChild(x);
    dock.appendChild(head);

    bodyEl = el('div', 'wb-dock-body');
    dock.appendChild(bodyEl);
    dock.appendChild(buildNotes());
    return dock;
  }

  function toggleDock(force) {
    var open = force === undefined ? dock.dataset.open !== 'true' : !!force;
    dock.dataset.open = String(open);
    document.documentElement.dataset.wbDock = open ? 'open' : 'closed';
    set(LS.dock, String(open));
  }

  function dragWidth(grip) {
    var startX = 0, startW = 0, dragging = false;
    grip.addEventListener('pointerdown', function (e) {
      dragging = true; startX = e.clientX;
      startW = parseInt(getComputedStyle(dock).width, 10);
      grip.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    grip.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var w = Math.max(280, Math.min(window.innerWidth * 0.62, startW + (startX - e.clientX)));
      document.documentElement.style.setProperty('--wb-dock-w', w + 'px');
    });
    grip.addEventListener('pointerup', function (e) {
      if (!dragging) return;
      dragging = false;
      grip.releasePointerCapture(e.pointerId);
      set(LS.width, getComputedStyle(dock).width);
    });
  }

  /* Move the page's own control panel in, rather than rebuild it. */
  function adopt() {
    var found = [];
    ['#ui', '#tune'].forEach(function (sel) {
      var n = document.querySelector(sel);
      if (n && !n.closest('#wb-dock')) found.push(n);
    });
    found.forEach(function (n) {
      n.classList.add('wb-adopted');
      n.removeAttribute('hidden');
      bodyEl.appendChild(n);
    });
    /* the page's own show/hide affordances now describe nothing */
    ['#toggle', '#tune-hide', '#k-close'].forEach(function (sel) {
      var n = document.querySelector(sel);
      if (n) n.style.display = 'none';
    });
    if (!found.length) {
      bodyEl.appendChild(el('div', 'wb-empty',
        'This page has no controls of its own. Notes below are filed against it all the same.'));
    }
    return found.length;
  }

  /* ═══ comments ═══════════════════════════════════════════════════════ */
  function buildNotes() {
    var wrap = notesWrap = el('div', 'wb-notes');
    wrap.dataset.open = get(LS.notes, 'true');

    var head = el('div', 'wb-notes-head');
    notesToggle = el('button', 'wb-notes-toggle');
    notesToggle.type = 'button';
    notesToggle.setAttribute('aria-expanded', wrap.dataset.open);
    notesToggle.appendChild(el('span', 'wb-tw'));
    notesToggle.appendChild(el('span', null, 'Comments'));
    countEl = el('span', 'wb-count', '0');
    notesToggle.appendChild(countEl);
    notesToggle.addEventListener('click', function () { toggleNotes(); });
    head.appendChild(notesToggle);

    scopeEl = el('button', 'wb-scope', 'this page');
    scopeEl.type = 'button';
    scopeEl.title = 'Switch between this page and the whole site';
    scopeEl.addEventListener('click', function () {
      scopeAll = !scopeAll;
      scopeEl.textContent = scopeAll ? 'whole site' : 'this page';
      renderNotes();
    });
    head.appendChild(scopeEl);
    wrap.appendChild(head);

    var notesBody = el('div', 'wb-notes-body');
    listEl = el('div', 'wb-list');
    notesBody.appendChild(listEl);

    var compose = el('form', 'wb-compose');
    var who = el('input');
    who.type = 'text';
    who.placeholder = 'Your name';
    who.value = get(LS.author, '');
    who.addEventListener('change', function () { set(LS.author, who.value.trim()); });

    var txt = el('textarea');
    txt.placeholder = CURRENT
      ? 'Note on ' + CURRENT.label + '…'
      : 'Note on this page…';

    var row = el('div', 'wb-compose-row');
    var save = el('button', 'wb-btn wb-primary', 'Save note');
    save.type = 'submit';
    var out = el('button', 'wb-btn', 'notes.js');
    out.type = 'button';
    out.title = 'Download notes.js with every comment, to commit';
    out.addEventListener('click', function () { downloadNotes(); });
    var say = el('span', 'wb-say', '');
    row.appendChild(save);
    row.appendChild(out);
    row.appendChild(say);

    compose.appendChild(who);
    compose.appendChild(txt);
    compose.appendChild(row);
    compose.addEventListener('submit', function (e) {
      e.preventDefault();
      var text = txt.value.trim();
      if (!text) return;
      var author = who.value.trim() || 'anon';
      set(LS.author, author);
      var note = {
        id: 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        page: CURRENT ? CURRENT.id : here,
        pageLabel: CURRENT ? CURRENT.label : document.title,
        author: author,
        text: text,
        at: new Date().toISOString(),
      };
      txt.value = '';
      say.textContent = 'saving…';
      persist(note, function (ok) {
        if (!ok) {
          var d = drafts();
          d.push(note);
          saveDrafts(d);
          say.innerHTML = 'held locally — <b>download notes.js</b> to commit it';
        } else {
          say.textContent = 'written to notes.js — commit it';
        }
        renderNotes();
        setTimeout(function () { say.textContent = ''; }, 8000);
      });
    });
    notesBody.appendChild(compose);
    wrap.appendChild(notesBody);
    return wrap;
  }

  function toggleNotes(force) {
    var open = force === undefined ? notesWrap.dataset.open !== 'true' : !!force;
    notesWrap.dataset.open = String(open);
    notesToggle.setAttribute('aria-expanded', String(open));
    set(LS.notes, String(open));
    /* the list only scrolls to the newest note when it has a height to scroll
       within, so an expand has to put it back at the bottom */
    if (open) setTimeout(function () { listEl.scrollTop = listEl.scrollHeight; }, 320);
  }

  function fmt(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return '';
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) + ' ' +
           d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  function renderNotes() {
    var mine = CURRENT ? CURRENT.id : here;
    var list = allNotes().filter(function (n) { return scopeAll || n.page === mine; });
    listEl.textContent = '';
    countEl.textContent = String(list.length);

    if (!list.length) {
      listEl.appendChild(el('div', 'wb-none',
        scopeAll ? 'Nothing written anywhere yet.' : 'Nothing on this page yet.'));
    }
    list.forEach(function (n) {
      var row = el('div', 'wb-note');
      if (n.unsaved) row.dataset.unsaved = 'true';
      var meta = el('div', 'wb-meta');
      meta.appendChild(el('span', 'wb-who', n.author || 'anon'));
      if (scopeAll) meta.appendChild(el('span', null, n.pageLabel || n.page));
      meta.appendChild(el('span', 'wb-on', fmt(n.at)));
      row.appendChild(meta);
      row.appendChild(el('div', 'wb-txt', n.text));
      listEl.appendChild(row);
    });
    listEl.scrollTop = listEl.scrollHeight;

    countEl.dataset.unsaved = String(list.some(function (n) { return n.unsaved; }));
    var pending = allNotes().some(function (n) { return n.unsaved; });
    if (dockTab) dockTab.dataset.unsaved = String(pending);
  }

  function downloadNotes() {
    var text = noteFileText(allNotes().map(function (n) {
      var c = Object.assign({}, n);
      delete c.unsaved;
      return c;
    }));
    var blob = new Blob([text], { type: 'text/javascript' });
    var a = el('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'notes.js';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  /* Some pages own the wheel outright — topo-peaks moves focus between summits
     with it and calls preventDefault on window for every event. That listener
     cannot tell a scroll over the mountain from a scroll over a comment
     thread, so the chrome stops its own events reaching it. */
  function keepScrollLocal(root) {
    ['wheel', 'touchmove'].forEach(function (type) {
      root.addEventListener(type, function (e) { e.stopPropagation(); }, { passive: true });
    });
  }

  /* ═══ boot ═══════════════════════════════════════════════════════════ */
  function boot() {
    if (document.getElementById('wb-nav')) return;
    applyTheme();
    var nav = buildNav();
    document.body.appendChild(nav);
    document.body.appendChild(buildDock());
    adopt();
    renderNotes();
    keepScrollLocal(nav);
    keepScrollLocal(dock);

    /* \ toggles the dock. The pages already own H for their own panel and
       most other letters are taken by one page or another. */
    window.addEventListener('keydown', function (e) {
      if (e.key !== '\\' || e.metaKey || e.ctrlKey || e.altKey) return;
      var t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      toggleDock();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
