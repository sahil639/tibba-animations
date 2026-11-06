/* ══════════════════════════════════════════════════════════════════════════
   Case study — the Figma-built variations: the moving parts
   ─────────────────────────────────────────────────────────────────────────
   1. Stages. Every slide is drawn in the design's own 1380 × 776.25
      coordinates (.cf-stage) and scaled here to the width it is given.

   3. Layout (further down): the content column's max width — presets
      Narrow 720 · Default 880 · Wide 1040 · Full 1380 and a slider, in the
      page's control panel.

   2. The phone columns (Groww, the slide after Groww Stories). Four columns
      of iPhones, five phones each, looped (each column is its five, twice,
      so it wraps seamlessly). Still until pointed at; while the pointer is
      over the slide the columns run — neighbours in opposite directions —
      easing up to speed, and easing to a stop where they are when it
      leaves. On touch, a tap starts and stops them.

      The columns stand where the design puts them: x is where each column
      sits on the slide, y0 where its first phone starts (both in design
      pixels). Images: assets/work/groww-figma/phone-NN.webp.
   ═════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── 1. stages ─────────────────────────────────────────────────────── */
  const W = 1380;
  const fit = () => document.querySelectorAll('.cf-slide').forEach(s => {
    const st = s.querySelector('.cf-stage'); if (st) st.style.setProperty('--k', (s.clientWidth / W).toFixed(5));
  });
  /* each slide is watched, not the window: the column can change width
     without the window changing (the Layout control) */
  const ro = new ResizeObserver(fit);
  document.querySelectorAll('.cf-slide').forEach(s => ro.observe(s));
  fit();

  /* ── 3. layout: the content column's max width ─────────────────────────
     Presets to compare side by side — Narrow 720, Default 880, Wide 1040,
     Full 1380 (the Figma frame's column) — and a slider for anything in
     between. Kept in this browser; ?maxw=960 in the address overrides. */
  const main = document.querySelector('.cf');
  if (main && document.querySelector('.cf-work')) {
    const KEY = 'tibba.case.layout', PRESETS = [['Narrow', 720], ['Default', 880], ['Wide', 1040], ['Full', 1380]];
    let L = { maxw: 880, alignHero: false };
    try { L = { ...L, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch (e) {}
    const q = +new URLSearchParams(location.search).get('maxw'); if (q >= 480 && q <= 1920) L.maxw = q;
    const apply = () => {
      main.style.setProperty('--maxw', L.maxw + 'px');
      main.classList.toggle('align-hero', !!L.alignHero);
      try { localStorage.setItem(KEY, JSON.stringify(L)); } catch (e) {}
      fit();
      sync();
    };
    const el = document.createElement('div');
    el.id = 'tune';
    el.innerHTML = `
      <div id="tune-head"><b>Case study</b><button id="tune-hide" title="Hide (H)">–</button></div>
      <p class="tune-sub">Layout — content width</p>
      <div class="seg" id="s-maxw">${PRESETS.map(([n, w]) => `<button data-w="${w}" title="${w}px">${n}<br><small>${w}</small></button>`).join('')}</div>
      <div class="row"><label>Max width<i id="v-maxw"></i></label>
        <input type="range" id="s-maxw-r" min="640" max="1380" step="10"></div>
      <div class="row inline"><label>Hero text on the column edge<i></i></label>
        <input type="checkbox" id="s-ah"></div>
      <p class="tune-note" style="margin:10px 0 0;font-size:11px;line-height:1.45;color:rgba(233,236,242,.5)">The column below the hero. Type, spacing and the slides scale with it; under ~980px the facts move below the metrics, under ~640px Stories stacks.</p>`;
    document.body.appendChild(el);
    const $ = s => el.querySelector(s);
    function sync() {
      $('#v-maxw').textContent = L.maxw + 'px';
      $('#s-maxw-r').value = L.maxw;
      $('#s-ah').checked = !!L.alignHero;
      el.querySelectorAll('#s-maxw button').forEach(b => b.classList.toggle('on', +b.dataset.w === L.maxw));
    }
    $('#s-maxw').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { L.maxw = +b.dataset.w; apply(); } });
    $('#s-maxw-r').addEventListener('input', e => { L.maxw = +e.target.value; apply(); });
    $('#s-ah').addEventListener('change', e => { L.alignHero = e.target.checked; apply(); });
    $('#tune-hide').addEventListener('click', () => el.classList.toggle('hidden'));
    apply();
    if (window.wb && window.wb.adopt) window.wb.adopt();
  }

  /* ── 6. the hero's name: as large as the design has it, never wider
     than the screen allows ─────────────────────────────────────────── */
  const name = document.querySelector('.cf-hero h1.fit');
  if (name) {
    const size = () => {
      name.style.removeProperty('--fit');
      const room = name.parentElement.parentElement.clientWidth - 2 * name.parentElement.offsetLeft;
      const w = name.scrollWidth, fs = parseFloat(getComputedStyle(name).fontSize);
      if (w > room) name.style.setProperty('--fit', Math.floor(fs * room / w) + 'px');
    };
    new ResizeObserver(size).observe(name.parentElement.parentElement);
    if (document.fonts) document.fonts.ready.then(size);
  }

  /* ── 4. keep climbing: the other three cases, each by its thumbnail ── */
  addEventListener('DOMContentLoaded', () => {
    const W = window.TibbaWork, box = document.getElementById('cf-cards');
    if (!W || !box) return;
    const here = document.body.dataset.case;
    box.innerHTML = W.SUMMITS.filter(s => s.key !== here).map(s => { const c = window.TIBBA_CASES[s.key];
      /* the thumbnail itself, not TibbaWork.img(): that one remembers a
         missing file for the session, and would keep a card empty after its
         thumbnail arrived */
      return `<a class="cf-card" href="${s.file}" style="--c:${c.colour}"><div class="wk-img" style="--c:${c.colour}"><img src="${W.DIR}${s.folder}/cover.webp" alt="${W.esc(c.client)}" loading="lazy" decoding="async" onload="this.parentNode.classList.add('in')"></div><p>${W.esc(s.line)}</p></a>`; }).join('');
  });

  /* ── 5. the footer: the home page's own (footer-dusk-grid.html), in a
     frame as tall as it is; its links open in this window, not the frame ── */
  document.querySelectorAll('iframe.cf-foot').forEach(f => {
    const fit = () => { try { const d = f.contentDocument; f.style.height = Math.max(d.documentElement.scrollHeight, d.body.scrollHeight) + 'px'; } catch (e) {} };
    const ready = () => {
      try {
        const d = f.contentDocument; if (!d || !d.body || d.querySelector('base[target]')) return;
        const b = d.createElement('base'); b.target = '_top'; d.head.prepend(b);
        new ResizeObserver(fit).observe(d.body);
      } catch (e) {}
      fit();
    };
    f.addEventListener('load', ready);
    try { if (f.contentDocument.readyState === 'complete' && f.contentDocument.URL !== 'about:blank') ready(); } catch (e) {}
  });

  /* ── 2. the phone columns ──────────────────────────────────────────── */
  const box = document.querySelector('.cf-phones');
  if (!box) return;
  const DIR = 'assets/work/groww-figma/';
  const PH = 584.515, GAP = 49, STEP = PH + GAP, LOOP = STEP * 5;
  const COLUMNS = [
    { x: 24.91,   y0: -373.87, dir: -1, phones: ['01', '02', '06', '03', '15'] },
    { x: 372.10,  y0: -583.87, dir:  1, phones: ['03', '04', '03', '15', '06'] },
    { x: 725.21,  y0: -340.87, dir: -1, phones: ['05', '06', '02', '07', '04'] },
    { x: 1078.33, y0: -512.88, dir:  1, phones: ['07', '15', '07', '05', '01'] },
  ];
  const stage = box.querySelector('.cf-stage');
  const cols = COLUMNS.map(c => {
    const el = document.createElement('div');
    el.className = 'cf-col';
    el.style.left = c.x + 'px';
    /* five, then the same five again, so the loop has no seam */
    el.innerHTML = [...c.phones, ...c.phones].map(n => `<img src="${DIR}phone-${n}.webp" alt="" draggable="false" loading="lazy" decoding="async">`).join('');
    stage.appendChild(el);
    return { el, c, off: 0 };
  });
  box.setAttribute('aria-label', 'Groww Stories on iPhone — point at the slide to set the columns moving');

  const SPEED = 70;                    // design px per second at full speed
  let on = false, v = 0, last = 0, raf = 0;
  /* wrap the travel into one set's length, (−LOOP, 0]: with two sets in
     the column the slide is always covered, and at rest (off = 0) each
     column stands exactly where the design has it */
  const place = k => {
    const w = ((k.off % LOOP) - LOOP) % LOOP;
    k.el.style.transform = `translate3d(0, ${(k.c.y0 + w).toFixed(2)}px, 0)`;
  };
  cols.forEach(place);

  function tick(now) {
    const dt = last ? Math.min(.05, (now - last) / 1000) : 0; last = now;
    const target = on ? SPEED : 0;
    v += (target - v) * (1 - Math.exp(-dt * (on ? 2.6 : 3.4)));   // ease up, ease to a stop
    cols.forEach(k => { k.off += k.c.dir * v * dt; place(k); });
    if (on || v > .4) raf = requestAnimationFrame(tick);
    else { raf = 0; last = 0; v = 0; }
  }
  const go = state => {
    if (REDUCED) return;
    on = state;
    if (!raf) { last = 0; raf = requestAnimationFrame(tick); }
  };
  box.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') go(true); });
  box.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch') go(false); });
  box.addEventListener('pointerup', e => { if (e.pointerType === 'touch') go(!on); });
})();
