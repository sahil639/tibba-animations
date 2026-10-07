/* ══════════════════════════════════════════════════════════════════════════
   Workbench — site menu and right dock
   ─────────────────────────────────────────────────────────────────────────
   Loaded by every page. It reads assets/manifest.js for the site map and
   assets/whats-new.js for which pages are new to this browser, and it builds
   its own chrome — no page carries any of this markup.

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
    nav:    'tibba.nav.open',
    dock:   'tibba.dock.open',
    width:  'tibba.dock.width',
  };
  function get(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  /* The comments feature is gone. What it left in this browser — the name
     typed into it, unsent drafts, whether its drawer was open — is cleared
     once, so nothing stale sits in storage. */
  ['tibba.author', 'tibba.notes.drafts', 'tibba.notes.open'].forEach(function (k) {
    try { localStorage.removeItem(k); } catch (e) {}
  });

  /* New to this browser — assets/whats-new.js. Tolerates a page that does
     not load it: nothing is ever new there. */
  var NEW = window.TibbaNew || { isNew: function () { return false; }, markSeen: function () {} };

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
      if (NEW.fresh && sec.pages.some(function (p) { return NEW.fresh(p); })) d.classList.add('wb-fresh');
      if (sec.pages.some(function (p) { return NEW.isNew(p); })) {
        var gd = el('span', 'wb-new-dot'); gd.title = 'Something new in here'; sum.appendChild(gd);
      }
      sum.appendChild(el('span', 'wb-n', String(sec.pages.length)));
      d.appendChild(sum);

      sec.pages.forEach(function (p) {
        var a = el('a', 'wb-page' + (NEW.fresh && NEW.fresh(p) ? ' wb-fresh' : ''));
        if (NEW.fresh && NEW.fresh(p)) a.title = 'Changed in the last 24 hours' + (p.change ? ' — ' + p.change : '');
        a.href = p.file;
        a.appendChild(el('span', null, p.label));
        if (p.state === 'stub') a.appendChild(el('span', 'wb-stub', 'stub'));
        if (NEW.isNew(p)) {
          var nt = el('span', 'wb-new', 'New');
          if (p.change) nt.title = p.change;
          a.appendChild(nt);
        }
        if (CURRENT && CURRENT.id === p.id) a.setAttribute('aria-current', 'page');
        d.appendChild(a);
      });
      body.appendChild(d);
    });

    nav.appendChild(body);
    return nav;
  }

  /* ═══ the dock ═══════════════════════════════════════════════════════ */
  var dock, dockTab, bodyEl;

  function buildDock() {
    dock = el('aside', 'wb');
    dock.id = 'wb-dock';
    dock.setAttribute('aria-label', 'Controls');
    dock.dataset.open = get(LS.dock, 'true');
    document.documentElement.dataset.wbDock = dock.dataset.open === 'true' ? 'open' : 'closed';
    var w = get(LS.width, '');
    if (w) document.documentElement.style.setProperty('--wb-dock-w', w);

    dockTab = el('button', 'wb-dock-tab');
    dockTab.type = 'button';
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
    found.forEach(attachBake);
    /* the page's own show/hide affordances now describe nothing */
    ['#toggle', '#tune-hide', '#k-close'].forEach(function (sel) {
      var n = document.querySelector(sel);
      if (n) n.style.display = 'none';
    });
    if (!found.length) {
      /* only if the dock has not already said this once — adopt() can be
         called again later by a page whose panel waits on a module, and a
         second placeholder under the first helps nobody */
      if (!bodyEl.querySelector('.wb-empty')) {
        bodyEl.appendChild(el('div', 'wb-empty',
          'This page has no controls of its own.'));
      }
    } else {
      /* and a panel that arrives late clears the line saying there is none */
      var empty = bodyEl.querySelector('.wb-empty');
      if (empty) empty.remove();
    }
    return found.length;
  }

  /* ═══ bake ═════════════════════════════════════════════════════════
     Every panel gets "Bake settings": the Polaroids idea, for any page.
     A page that bakes its own config (assets/bake.js — it has #bk-bake)
     is left alone. For every other panel the dock snapshots the controls
     themselves — each slider, select, colour, checkbox, and which button
     of each .seg row is on — into this browser, per page; on the next
     load it plays them back into the panel, firing the same input and
     change events a hand on the control would, so the page applies them
     exactly as if they had been set by hand. "Clear baked" drops them. */
  function attachBake(panel) {
    if (panel.dataset.wbBake || panel.querySelector('#bk-bake, #p-bake, [data-bake]')) return;
    panel.dataset.wbBake = '1';
    var KEY = 'tibba.wbbake.' + location.pathname;
    var box = document.createElement('div');
    box.className = 'wb-bake';
    box.innerHTML = '<p class="tune-sub">Layout</p><div class="tune-acts">' +
      '<button class="tune-btn" type="button" data-wb="bake">Bake settings</button>' +
      '<button class="tune-btn" type="button" data-wb="clear">Clear baked</button></div><p class="why"></p>';
    panel.appendChild(box);
    var why = box.querySelector('.why');
    function controls() {
      return Array.prototype.filter.call(panel.querySelectorAll('input, select, textarea'), function (c) {
        return !box.contains(c) && c.type !== 'file' && c.type !== 'button' && c.type !== 'submit';
      });
    }
    function segs() {
      return Array.prototype.filter.call(panel.querySelectorAll('.seg'), function (g) { return !box.contains(g); });
    }
    var keyOf = function (c, i) { return c.id ? '#' + c.id : 'n' + i; };
    function snapshot() {
      var out = { v: {}, s: {} };
      controls().forEach(function (c, i) {
        out.v[keyOf(c, i)] = (c.type === 'checkbox' || c.type === 'radio') ? c.checked : c.value;
      });
      segs().forEach(function (g, i) {
        var on = Array.prototype.indexOf.call(g.children, g.querySelector('.on'));
        if (on >= 0) out.s[g.id ? '#' + g.id : 'g' + i] = on;
      });
      return out;
    }
    function restore(b) {
      controls().forEach(function (c, i) {
        var k = keyOf(c, i);
        if (!(k in b.v)) return;
        if (c.type === 'checkbox' || c.type === 'radio') { if (c.checked === b.v[k]) return; c.checked = b.v[k]; }
        else { if (c.value === b.v[k]) return; c.value = b.v[k]; }
        c.dispatchEvent(new Event('input', { bubbles: true }));
        c.dispatchEvent(new Event('change', { bubbles: true }));
      });
      segs().forEach(function (g, i) {
        var k = g.id ? '#' + g.id : 'g' + i, want = b.s[k];
        if (want == null || !g.children[want] || g.children[want].classList.contains('on')) return;
        g.children[want].click();
      });
    }
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    why.textContent = saved ? 'This browser is showing baked settings.' : "Showing the page's defaults.";
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-wb]'); if (!b) return;
      if (b.dataset.wb === 'bake') {
        try { localStorage.setItem(KEY, JSON.stringify(snapshot())); } catch (err) {}
        why.textContent = 'Baked — they load on the next refresh.';
      } else { try { localStorage.removeItem(KEY); } catch (err) {} location.reload(); }
    });
    /* play the bake back once the page has finished wiring its panel */
    if (saved) {
      var go = function () { setTimeout(function () { restore(saved); }, 120); };
      if (document.readyState === 'complete') requestAnimationFrame(function () { requestAnimationFrame(go); });
      else window.addEventListener('load', go, { once: true });
    }
  }

  /* Some pages own the wheel outright — topo-peaks moves focus between summits
     with it and calls preventDefault on window for every event. That listener
     cannot tell a scroll over the mountain from a scroll over the dock's
     panel, so the chrome stops its own events reaching it. */
  function keepScrollLocal(root) {
    ['wheel', 'touchmove'].forEach(function (type) {
      root.addEventListener(type, function (e) { e.stopPropagation(); }, { passive: true });
    });
  }

  /* ═══ embedded ══════════════════════════════════════════════════════
     Inside the full-page preview (full-page.html) a page is a block in a
     longer page: no menu, no dock, no panel, no scrollbar of its own. Its
     scroll is driven by the outer page, and the wheel and touch it receives
     are handed straight up to the outer page, so the whole stack scrolls
     as one document. */
  var EMBED = window.self !== window.top || /[?&]embed\b/.test(location.search);
  function embed() {
    document.documentElement.classList.add('wb-embed');
    var st = document.createElement('style');
    st.textContent = '#tune,#ui,#wb-nav,#wb-dock{display:none!important}' +
      'html{overflow:hidden!important;scrollbar-width:none}html::-webkit-scrollbar{display:none}' +
      /* body must not become a scroll container of its own (overflow-x:hidden
         on body would, once html's overflow is set) or sticky stages break */
      'body{overflow:visible!important}';
    document.head.appendChild(st);
    var up = window.parent;
    /* scrollTo(y) in the page's own coordinates: inside the site shell the
       outer page is what scrolls, so the request is passed up, offset by
       where this page's block starts */
    window.wb = { adopt: function () {}, scrollTo: function (y, smooth) {
      var fe = null; try { fe = window.frameElement; } catch (e) {}
      var sec = fe && fe.closest && fe.closest('.site-block');
      var how = smooth === false ? 'auto' : 'smooth';
      if (sec && up && up !== window) up.scrollTo({ top: sec.offsetTop + y, behavior: how });
      else window.scrollTo({ top: y, behavior: how });
    } };
    if (!up || up === window) return;
    window.addEventListener('wheel', function (e) {
      if (e.ctrlKey) return;
      e.preventDefault();
      up.scrollBy(0, e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY);
    }, { passive: false, capture: true });
    /* a gesture that sets off sideways (a swipe through a row of cards)
       stays this page's; one that sets off up or down scrolls the site */
    var ty = null, tx = 0, ty0 = 0, axis = null;
    window.addEventListener('touchstart', function (e) { ty = ty0 = e.touches[0].clientY; tx = e.touches[0].clientX; axis = null; }, { passive: true, capture: true });
    window.addEventListener('touchmove', function (e) {
      if (ty === null) return;
      var y = e.touches[0].clientY, x = e.touches[0].clientX;
      if (!axis && (Math.abs(x - tx) > 8 || Math.abs(y - ty0) > 8)) axis = Math.abs(x - tx) > Math.abs(y - ty0) ? 'x' : 'y';
      if (axis !== 'x') up.scrollBy(0, ty - y);
      ty = y;
    }, { passive: true, capture: true });
    window.addEventListener('touchend', function () { ty = null; }, { passive: true, capture: true });
  }

  /* ═══ boot ═══════════════════════════════════════════════════════════ */
  function boot() {
    if (EMBED) { embed(); return; }
    if (document.getElementById('wb-nav')) return;
    applyTheme();
    /* Opening a page is seeing it: mark it before the menu is drawn, so the
       page you are on is never flagged as new in its own menu. */
    if (CURRENT) NEW.markSeen(CURRENT.id);
    var nav = buildNav();
    document.body.appendChild(nav);
    document.body.appendChild(buildDock());
    adopt();

    /* adopt() is the dock's one piece of public surface. A page whose panel
       is built later than DOMContentLoaded — because it waits on a module, or
       on a scene that module creates — has no way to get itself adopted
       otherwise, and would sit loose on top of the page instead. */
    window.wb = window.wb || {};
    window.wb.adopt = adopt;
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
