/* ══════════════════════════════════════════════════════════════════════════
   The home page's tuning panel
   ─────────────────────────────────────────────────────────────────────────
   Preview only — strip for production, the way every other page in this repo
   marks its panel.

   Built as a plain #tune element so the dock adopts it: assets/workbench.js
   MOVES this node into the panel on the right rather than rebuilding it, and
   because moving a node keeps its listeners, every control here goes on
   driving what it was wired to. Same contract as the tuning panels on
   tibba-range.html and topo-hero.html — a page's controls are the page's, the
   dock only finds them a home.

   Three groups, which are the three the brief asks for:
     colour   the accent the summit rings and the section marks are drawn in
     view     the hero camera's angle and distance, live
     path     the dotted contours — their spacing, speed and how many rings
   plus a list of every odometer on the page, so the effect can be turned off
   per block and seen immediately rather than guessed at in the markup.
   ═════════════════════════════════════════════════════════════════════════ */
(function build() {
  'use strict';

  /* This is a deferred classic script and the scene is created by a module, so
     it is built before the thing it tunes exists — deferred scripts run ahead
     of module evaluation, not after it. Rather than reorder the page around a
     preview-only panel, wait for the scene to appear. */
  if (!(window.tibba && window.tibba.heroScene)) {
    return void requestAnimationFrame(build);
  }
  const scene = window.tibba.heroScene;

  const el = document.createElement('div');
  el.id = 'tune';
  el.innerHTML = `
    <div id="tune-head"><b>Home</b><button id="tune-hide" title="Hide (H)">–</button></div>

    <p class="tune-sub">COLOUR</p>
    <div class="row"><label>Accent<i id="v-acc">#E85D3D</i></label>
      <input type="color" id="s-acc" value="#e85d3d"></div>

    <p class="tune-sub">HERO VIEW</p>
    <div class="row"><label>Elevation<i id="v-elev">22°</i></label>
      <input type="range" id="s-elev" min="4" max="60" value="22"></div>
    <div class="row"><label>Distance<i id="v-dist">126</i></label>
      <input type="range" id="s-dist" min="60" max="240" value="126"></div>
    <div class="row"><label>Swing<i id="v-azim">6°</i></label>
      <input type="range" id="s-azim" min="-50" max="50" value="6"></div>

    <p class="tune-sub">PATH · DOTTED CONTOURS</p>
    <div class="row"><label>Rings dotted<i id="v-dl">3</i></label>
      <input type="range" id="s-dl" min="0" max="10" value="3"></div>
    <div class="row"><label>Spacing<i id="v-dp">0.42</i></label>
      <input type="range" id="s-dp" min="10" max="160" value="42"></div>
    <div class="row"><label>Dot length<i id="v-dot">0.16</i></label>
      <input type="range" id="s-dot" min="2" max="60" value="16"></div>
    <div class="row"><label>Drift<i id="v-df">0.16</i></label>
      <input type="range" id="s-df" min="0" max="120" value="16"></div>

    <p class="tune-sub">TERRAIN</p>
    <div class="row"><label>Seed<i id="v-seed">—</i></label>
      <button id="s-reseed" class="tune-btn">New country</button></div>

    <p class="tune-sub">ODOMETER</p>
    <div class="row"><label>Effect<i id="v-odo"></i></label>
      <button id="s-odo-all" class="tune-btn">All off</button></div>
    <div id="odo-list"></div>`;
  document.body.appendChild(el);

  const $ = id => el.querySelector('#' + id);
  const bind = (sid, vid, map, fmt, apply) => {
    const s = $(sid), v = $(vid);
    const run = () => { const x = map(+s.value); v.textContent = fmt(x); apply(x); };
    s.addEventListener('input', run); run();
  };

  /* ── colour ───────────────────────────────────────────────────────────
     Written to the CSS custom property and to the scene's uniform together.
     They are the same colour in two places — the rings are drawn by a shader
     and the section marks by CSS — and there is no way to have one read the
     other at runtime without reading back a computed style every frame. */
  $('s-acc').addEventListener('input', e => {
    const hex = e.target.value;
    $('v-acc').textContent = hex.toUpperCase();
    document.documentElement.style.setProperty('--accent', hex);
    scene.setAccent(hex);
  });

  /* ── the hero camera ──────────────────────────────────────────────── */
  bind('s-elev', 'v-elev', n => n, x => x + '°', x => scene.setHeroCam({ elev: x }));
  bind('s-dist', 'v-dist', n => n, x => String(x),     x => scene.setHeroCam({ dist: x }));
  bind('s-azim', 'v-azim', n => n, x => x + '°', x => scene.setHeroCam({ azim: x }));

  /* ── the dotted contours ──────────────────────────────────────────────
     Spacing, length and drift are uniforms, so they take effect on the next
     frame. How MANY rings are dotted is baked into the geometry, so that one
     rebuilds it — which is why it is debounced and the others are not. */
  bind('s-dp',  'v-dp',  n => n / 100, x => x.toFixed(2), x => scene.setDots({ period: x }));
  bind('s-dot', 'v-dot', n => n / 100, x => x.toFixed(2), x => scene.setDots({ on: x }));
  bind('s-df',  'v-df',  n => n / 100, x => x.toFixed(2), x => scene.setDots({ flow: x }));

  let dlT = null;
  $('s-dl').addEventListener('input', e => {
    $('v-dl').textContent = e.target.value;
    clearTimeout(dlT);
    dlT = setTimeout(() => scene.setDottedLevels(+e.target.value), 260);
  });

  /* ── terrain ──────────────────────────────────────────────────────────
     A reload rather than a rebuild. The generated country feeds the
     heightfield, the contour sheet, the palette's reference heights and the
     camera's framing, all of which are computed once at construction — so
     "another country" genuinely means another scene, and pretending otherwise
     by rebuilding half of it is how you get a scene that disagrees with
     itself. */
  $('v-seed').textContent = String(scene.info().seed);
  $('s-reseed').addEventListener('click', () => {
    const u = new URL(location.href);
    u.searchParams.set('seed', String((Math.random() * 0xFFFFFFFF) >>> 0));
    location.href = u.toString();
  });

  /* ── odometers ────────────────────────────────────────────────────────
     Every rolled block on the page, listed with a checkbox. Unchecking one
     settles it immediately rather than waiting for a reload, so the question
     the control answers — does this block want the effect? — can be answered
     by looking at it. */
  {
    const list = $('odo-list');
    const all = [...document.querySelectorAll('[data-odo], [data-odo-count]')];
    $('v-odo').textContent = all.length + ' blocks';

    all.forEach((node, i) => {
      const row = document.createElement('label');
      row.className = 'odo-row';
      const cb = document.createElement('input');
      cb.type = 'checkbox'; cb.checked = true;
      const txt = (node.dataset.odoText || node.textContent || '').trim().slice(0, 34);
      row.append(cb, document.createTextNode(txt || ('block ' + i)));
      cb.addEventListener('change', () => {
        node.dataset.odoOff = cb.checked ? '' : '1';
        if (!cb.checked && node._odoCells) {
          node._odoCells.forEach(c => {
            c._strip.style.transition = 'none';
            c._strip.style.transform =
              `translate(-50%, calc(var(--odo-h, 1.2em) * ${-c._travel}))`;
          });
        }
      });
      list.appendChild(row);
    });

    $('s-odo-all').addEventListener('click', () => {
      const boxes = [...list.querySelectorAll('input')];
      const off = boxes.some(b => b.checked);
      boxes.forEach(b => { if (b.checked === off) { b.checked = !off; b.dispatchEvent(new Event('change')); } });
      $('s-odo-all').textContent = off ? 'All on' : 'All off';
    });
  }

  $('tune-hide').addEventListener('click', () => el.classList.toggle('hidden'));

  /* The dock ran its adopt() at DOMContentLoaded, which was before this panel
     existed — it waits for a scene that a module creates. So it asks to be
     adopted now. adopt() MOVES the node rather than copying it, so every
     listener bound above survives the move. */
  if (window.wb && window.wb.adopt) window.wb.adopt();
})();
