/* ══════════════════════════════════════════════════════════════════════════
   Case study — the three bespoke section types
   ─────────────────────────────────────────────────────────────────────────
   assets/case.js renders the ordinary blocks (text, points, stats, quote,
   figure). Anything with another `k` is looked up here: each kind gives the
   markup for its block and a mount() that runs once the page is built.

     hyper    the Matcha Cartel "Hyperfixation" section — a burst of plates
              flying out from the title, then a pinned three-column reader
              that scrolls one entry at a time. Colour blocks stand in for
              every image.
     origin   the Matcha Cartel "Origin Log" — cards that spring in from the
              left and land scattered, draggable, with an index along the
              bottom that types itself in. Title moved to the top.
     globe    a text block with a particle globe beside it.

   Matcha Cartel is the interaction reference only. Type, colour, spacing and
   copy are this site's and this client's; the lime and the mono face are
   gone, replaced by F37 Analog and the case's own colour (--client).
   ═════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const br = s => esc(s).replace(/\n/g, '<br>');
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const clamp01 = v => clamp(v, 0, 1);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* GSAP's named eases, written out, because the section is driven straight
     off scroll progress and there is no timeline to hand them to. */
  const E = {
    p1io: t => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    p2o:  t => 1 - Math.pow(1 - t, 3),
    p2io: t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    p3io: t => (t < .5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),
    lin:  t => t,
  };
  /* one tween: where a value is at time T, given a start, a length and ease */
  const tw = (T, at, dur, from, to, ease = E.lin) =>
    from + (to - from) * ease(clamp01((T - at) / dur));

  /* ── glitch: a few characters at a time drop out and come back ──────────
     The reference runs one timer per character; one interval that picks
     characters does the same job without a hundred live timers. */
  function glitch(el) {
    if (reduced) return { set: t => { el.textContent = t; }, stop() {} };
    let spans = [];
    const set = text => {
      el.innerHTML = [...text].map(c => `<span>${c === ' ' ? '&nbsp;' : esc(c)}</span>`).join('');
      spans = [...el.children];
    };
    const iv = setInterval(() => {
      if (!spans.length) return;
      for (let k = 0; k < 2; k++) {
        const s = spans[(Math.random() * spans.length) | 0];
        let n = 2 + ((Math.random() * 4) | 0);
        const burst = () => {
          s.style.opacity = n-- > 0 ? (Math.random() > .5 ? (.08 + Math.random() * .2).toFixed(2) : '1') : '1';
          if (n >= 0) setTimeout(burst, 30 + Math.random() * 60);
        };
        burst();
      }
    }, 420);
    return { set, stop: () => clearInterval(iv) };
  }

  /* ── colour blocks ──────────────────────────────────────────────────────
     Placeholders for every image, drawn from the block's own palette. Seeded
     so a reload shows the same blocks — random-looking, not re-rolled. */
  function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  }
  function block(colour, label, cls = '') {
    return `<div class="cs-block ${cls}" style="--c:${colour}">
        ${label ? `<span>${esc(label)}</span>` : ''}</div>`;
  }

  /* ══════════════════════════════════════════════════════════════════════
     HYPER
     ══════════════════════════════════════════════════════════════════════ */
  /* Where the six plates burst to, and where they leave by — the reference's
     own positions, as fractions of the viewport from its centre. */
  const BURST = [
    { w: 340, h: 242, ix: -26, iy: -22, tx: -65, ty: -60 },
    { w: 300, h: 300, ix:  10, iy: -32, tx:  10, ty: -85 },
    { w: 340, h: 240, ix:  36, iy:  -8, tx:  85, ty:  -8 },
    { w: 300, h: 212, ix:  28, iy:  30, tx:  65, ty:  65 },
    { w: 300, h: 210, ix:  -6, iy:  32, tx:  -6, ty:  85 },
    { w: 290, h: 208, ix: -38, iy:   6, tx: -85, ty:   6 },
  ];
  const T_TOTAL = 24;

  const hyper = {
    html(b) {
      const r = rng(b.seed || 7);
      const pick = () => b.palette[(r() * b.palette.length) | 0];
      const n = b.items.length;
      /* one colour per entry, chosen once, so its thumbnail and its block are
         the same colour */
      const itemCols = b.itemColours || b.items.map(pick);
      return `
      <section class="case-block cs-hyper" data-cs="hyper" style="--pin:${b.pin || 7}">
        <div class="cs-hyper-stage">
          ${BURST.map((c, i) => `<div class="cs-burst" data-i="${i}"
                style="--w:${c.w}px;--h:${c.h}px">${block(pick(), '')}</div>`).join('')}

          <div class="cs-hyper-title">
            <p class="cs-kicker">${esc(b.kicker || '')}</p>
            <h2>${br(b.title)}</h2>
            <span class="cs-hint">${esc(b.hint || '(scroll down)')}</span>
          </div>
          ${b.note ? `<p class="cs-hyper-note">${br(b.note)}</p>` : ''}

          <div class="cs-reader">
            <div class="cs-left">
              <div class="cs-left-head">
                <h3>${br(b.archive.h)}</h3>
                <p>${esc(b.archive.p)}</p>
              </div>
              <div class="cs-grow"></div>
              <div class="cs-thumbs">${b.items.map((it, i) =>
                `<div class="cs-thumb" data-i="${i}" style="--c:${itemCols[i]}"></div>`).join('')}</div>
              <span class="cs-hint">${esc(b.hint || '(scroll down)')}</span>
            </div>

            <div class="cs-centre"><div class="cs-column">${b.items.map((it, i) =>
              `<div class="cs-slide">${block(itemCols[i],
                  it.plate || `${it.title} — placeholder`, 'cs-screen')}</div>`).join('')}
            </div></div>

            <div class="cs-right">
              <div class="cs-right-head">
                <div class="cs-counter">(01/${String(n).padStart(2, '0')})</div>
                <div class="cs-line"></div>
              </div>
              <div class="cs-grow"></div>
              <div class="cs-right-body">
                <h4></h4>
                <dl class="cs-meta"></dl>
                <p class="cs-desc"></p>
              </div>
            </div>
          </div>
        </div>
      </section>`;
    },

    mount(root, b) {
      const stage = root.querySelector('.cs-hyper-stage');
      const bursts = [...root.querySelectorAll('.cs-burst')];
      const title = root.querySelector('.cs-hyper-title');
      const note = root.querySelector('.cs-hyper-note');
      const reader = root.querySelector('.cs-reader');
      const left = root.querySelector('.cs-left');
      const right = root.querySelector('.cs-right');
      const column = root.querySelector('.cs-column');
      const thumbs = [...root.querySelectorAll('.cs-thumb')];
      const n = b.items.length;
      const counter = root.querySelector('.cs-counter');
      const g = glitch(root.querySelector('.cs-line'));
      const h4 = root.querySelector('.cs-right-body h4');
      const meta = root.querySelector('.cs-meta');
      const desc = root.querySelector('.cs-desc');

      /* The reader's schedule, in the reference's own units: plates burst and
         leave over 0–7, the title goes at 7, the reader scales in at 8, the
         side panels at 9.5, then one entry every 3 units from 12. It is
         stretched to fit however many entries there are. */
      const firstMove = 12, per = 3;
      const total = Math.max(T_TOTAL, firstMove + (n - 1) * per + 3);

      let active = -1;
      function show(i) {
        if (i === active) return;
        active = i;
        const it = b.items[i];
        counter.textContent = `(${String(i + 1).padStart(2, '0')}/${String(n).padStart(2, '0')})`;
        g.set(it.line || '');
        h4.textContent = it.title;
        meta.innerHTML = (it.meta || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');
        desc.textContent = it.p;
        thumbs.forEach((t, k) => t.classList.toggle('on', k === i));
        root.querySelector('.cs-right-body').classList.remove('in');
        void root.offsetWidth;
        root.querySelector('.cs-right-body').classList.add('in');
      }
      show(0);

      function apply(T) {
        const vw = innerWidth, vh = innerHeight;
        const k = clamp(vw / 1440, 0.55, 1.1);
        bursts.forEach((el, i) => {
          const c = BURST[i];
          const inAt = i * 0.15, outAt = 1.5 + i * 0.5;
          let x = tw(T, inAt, 0.6, 0, c.ix, E.p2o), y = tw(T, inAt, 0.6, 0, c.iy, E.p2o);
          const s = tw(T, inAt, 0.6, 0, 1, E.p2o);
          let o = tw(T, inAt, 0.6, 0, 1, E.p2o);
          if (T > outAt) {
            x = tw(T, outAt, 3, c.ix, c.tx, E.p1io);
            y = tw(T, outAt, 3, c.iy, c.ty, E.p1io);
            o = tw(T, outAt, 3, 1, 0, E.p1io);
          }
          el.style.transform = `translate(-50%,-50%) translate(${x * vw / 100}px, ${y * vh / 100}px) scale(${s * k})`;
          el.style.opacity = o.toFixed(3);
        });

        const to = tw(T, 7, 1, 1, 0);
        title.style.opacity = to.toFixed(3);
        title.style.transform = `translateY(${tw(T, 7, 1, 0, -30)}px)`;
        if (note) note.style.opacity = tw(T, 7, 0.5, 1, 0).toFixed(3);

        const ro = tw(T, 8, 1.8, 0, 1, E.p3io);
        reader.style.opacity = ro.toFixed(3);
        reader.style.transform = `scale(${tw(T, 8, 1.8, 0.05, 1, E.p3io)})`;
        reader.style.pointerEvents = ro > 0.9 ? 'auto' : 'none';

        left.style.opacity = tw(T, 9.5, 1, 0, 1).toFixed(3);
        left.style.transform = `translateX(${tw(T, 9.5, 1, -30, 0)}px)`;
        right.style.opacity = tw(T, 9.5, 1, 0, 1).toFixed(3);
        right.style.transform = `translateX(${tw(T, 9.5, 1, 30, 0)}px)`;

        let y = 0;
        for (let i = 1; i < n; i++) y += tw(T, firstMove + (i - 1) * per, 1.5, 0, 1, E.p2io);
        column.style.transform = `translateY(${-y * 100}%)`;
        column.style.setProperty('--y', y);
        show(clamp(Math.round(y), 0, n - 1));
      }

      /* ── the conductor ───────────────────────────────────────────────────
         The section is taller than the screen by --pin screens; the stage
         inside it is sticky. Progress through that height IS the timeline. A
         little smoothing stands in for GSAP's scrub, so a flick of the wheel
         eases through the move instead of jumping to it. */
      let target = 0, cur = 0, last = performance.now(), live = false, raf = 0;
      function measure() {
        const r = root.getBoundingClientRect();
        const travel = root.offsetHeight - innerHeight;
        target = travel > 0 ? clamp01(-r.top / travel) : 0;
      }
      function tick(now) {
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        cur += (target - cur) * (1 - Math.exp(-dt / (reduced ? 0.0001 : 0.22)));
        if (Math.abs(target - cur) < 1e-4) cur = target;
        apply(cur * total);
        if (live || cur !== target) raf = requestAnimationFrame(tick); else raf = 0;
      }
      function kick() { measure(); if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } }
      addEventListener('scroll', kick, { passive: true });
      addEventListener('resize', kick);
      new IntersectionObserver(([e]) => { live = e.isIntersecting; if (live) kick(); }).observe(root);
      measure(); cur = target; apply(cur * total);
    },
  };

  /* ══════════════════════════════════════════════════════════════════════
     ORIGIN
     ══════════════════════════════════════════════════════════════════════ */
  const origin = {
    html(b) {
      return `
      <section class="case-block cs-origin" data-cs="origin">
        <header class="cs-origin-head">
          <p class="cs-kicker">${esc(b.kicker || '')}</p>
          <h2>${esc(b.h)}</h2>
          <div class="cs-origin-copy">${b.p.map(p => `<p>${esc(p)}</p>`).join('')}</div>
        </header>
        <div class="cs-canvas">
          <p class="cs-drag"></p>
          ${b.cards.map((c, i) => `
            <article class="cs-card ${c.landscape ? 'is-wide' : ''}" data-i="${i}"
                     style="--w:${c.w}px;--h:${c.h}px;--card-bg:${c.bg};--card-ink:${c.ink || '#111'}">
              <header><span>${esc(c.id)}</span><span>${esc(c.era)}</span></header>
              <h3>${br(c.title)}</h3>
              <p class="sub">${br(c.subtitle)}</p>
              <ul>${c.body.map(l => `<li>${esc(l)}</li>`).join('')}</ul>
              <figure>${block(c.fill, '', 'cs-fig')}<figcaption><b>${esc(c.fig)}</b>${br(c.figLabel)}</figcaption></figure>
            </article>`).join('')}
          <nav class="cs-eras">${b.cards.map(c =>
            `<div><b>${esc(c.id)}.</b><span data-full="${esc(c.era)}"></span></div>`).join('')}</nav>
        </div>
      </section>`;
    },

    mount(root, b) {
      const canvas = root.querySelector('.cs-canvas');
      const cards = [...root.querySelectorAll('.cs-card')];
      const eras = [...root.querySelectorAll('.cs-eras span')];
      const drag = root.querySelector('.cs-drag');
      let top = cards.length + 10;
      const NAV_H = () => root.querySelector('.cs-eras').offsetHeight;

      /* Cards are drawn at the reference's sizes on a 1400px canvas and
         scaled with it, so a narrow window gets the same composition smaller
         rather than five cards piled on each other. */
      const scale = () => clamp(canvas.clientWidth / 1400, 0.46, 1.05);

      const S = cards.map((el, i) => ({
        el, c: b.cards[i], x: -2000, y: 40, rot: 24, vx: 0, vy: 0, vr: 0,
        tx: 0, ty: 0, entered: false, dragging: false, raf: 0,
      }));
      const size = s => { const k = scale(); return { w: s.c.w * k, h: s.c.h * k }; };
      const put = s => { s.el.style.transform = `translate(${s.x}px, ${s.y}px) rotate(${s.rot}deg)`; };
      const bounds = s => {
        const { w, h } = size(s);
        return { maxX: Math.max(0, canvas.clientWidth - w), maxY: Math.max(0, canvas.clientHeight - h - NAV_H()) };
      };
      function layoutScale() { canvas.style.setProperty('--k', scale()); }
      layoutScale();

      /* Landing spots: spread across the canvas in slots, jittered, rather than
         fully random. Fully random piles two or three cards in one corner often
         enough that the section looks broken on arrival. */
      function targets() {
        const cw = canvas.clientWidth, n = S.length;
        S.forEach((s, i) => {
          const { w, h } = size(s), bd = bounds(s);
          const slot = (i + 0.5) / n;
          s.tx = clamp(slot * cw - w / 2 + (Math.random() - .5) * cw * 0.08, 16, Math.max(16, bd.maxX - 16));
          s.ty = clamp(20 + Math.random() * Math.max(0, bd.maxY - 40), 16, Math.max(16, bd.maxY));
        });
      }

      /* The entry: every card springs in from off the left edge, turning from
         24 degrees down to level — the reference's constants, K 0.08 D 0.75. */
      function enter() {
        targets();
        S.forEach((s, i) => {
          const { w } = size(s);
          s.x = -(w + 200); s.y = s.ty; s.rot = 24; put(s);
          s.el.style.zIndex = b.cards[i].z || i + 1;
          setTimeout(() => {
            if (reduced) { s.x = s.tx; s.y = s.ty; s.rot = 0; put(s); s.entered = true; return; }
            let vx = 0, vy = 0, vr = 0;
            const K = 0.08, D = 0.75;
            const spring = () => {
              if (s.dragging) return;
              vx = (vx + (s.tx - s.x) * K) * D; vy = (vy + (s.ty - s.y) * K) * D; vr = (vr + (0 - s.rot) * K) * D;
              s.x += vx; s.y += vy; s.rot += vr; put(s);
              if (Math.abs(vx) < .1 && Math.abs(s.x - s.tx) < .5 && Math.abs(vy) < .1 && Math.abs(s.y - s.ty) < .5) {
                s.x = s.tx; s.y = s.ty; s.rot = 0; put(s); s.entered = true; return;
              }
              s.raf = requestAnimationFrame(spring);
            };
            s.raf = requestAnimationFrame(spring);
          }, i * 100);
        });

        /* the index types itself in, one era after another */
        eras.forEach((el, i) => {
          const full = el.dataset.full; let c = 0;
          setTimeout(() => {
            const iv = setInterval(() => { el.textContent = full.slice(0, ++c); if (c >= full.length) clearInterval(iv); }, reduced ? 0 : 45);
          }, i * 60);
        });
        const hint = b.hint || '(drag around to view)'; let c = 0;
        const iv = setInterval(() => { drag.textContent = hint.slice(0, ++c); if (c >= hint.length) clearInterval(iv); }, 28);
      }

      /* ── dragging, with the reference's throw and spring-back ────────── */
      S.forEach(s => {
        const el = s.el; let lx = 0, ly = 0, lt = 0;
        el.addEventListener('pointerdown', e => {
          e.preventDefault(); el.setPointerCapture(e.pointerId);
          cancelAnimationFrame(s.raf);
          s.dragging = true; s.rot = 0; el.classList.add('grab');
          el.style.zIndex = ++top;
          lx = e.clientX; ly = e.clientY; lt = performance.now(); s.vx = s.vy = 0;
        });
        el.addEventListener('pointermove', e => {
          if (!s.dragging) return;
          const now = performance.now(), dt = now - lt, dx = e.clientX - lx, dy = e.clientY - ly;
          if (dt > 0) { s.vx = dx / dt * 16; s.vy = dy / dt * 16; }
          const bd = bounds(s);
          s.x = clamp(s.x + dx, 0, bd.maxX); s.y = clamp(s.y + dy, 0, bd.maxY); put(s);
          lx = e.clientX; ly = e.clientY; lt = now;
        });
        const up = () => {
          if (!s.dragging) return;
          s.dragging = false; el.classList.remove('grab');
          const glide = () => {
            const bd = bounds(s);
            const cx = clamp(s.x, 0, bd.maxX), cy = clamp(s.y, 0, bd.maxY);
            const oob = Math.abs(cx - s.x) > .5 || Math.abs(cy - s.y) > .5;
            if (oob) { s.vx = (s.vx + (cx - s.x) * .12) * .7; s.vy = (s.vy + (cy - s.y) * .12) * .7; }
            else { s.vx *= .9; s.vy *= .9; }
            s.x += s.vx; s.y += s.vy; put(s);
            if (Math.abs(s.vx) < .15 && Math.abs(s.vy) < .15 && !oob) { s.x = cx; s.y = cy; put(s); return; }
            s.raf = requestAnimationFrame(glide);
          };
          s.raf = requestAnimationFrame(glide);
        };
        el.addEventListener('pointerup', up);
        el.addEventListener('pointercancel', up);
      });

      let done = false;
      new IntersectionObserver(([e]) => {
        if (e.isIntersecting && !done) { done = true; enter(); }
      }, { threshold: 0.25 }).observe(canvas);

      addEventListener('resize', () => {
        layoutScale();
        S.forEach(s => { const bd = bounds(s); s.x = clamp(s.x, 0, bd.maxX); s.y = clamp(s.y, 0, bd.maxY); put(s); });
      });

      S.forEach(put);
    },
  };

  /* ══════════════════════════════════════════════════════════════════════
     GLOBE
     ══════════════════════════════════════════════════════════════════════ */
  const globe = {
    html(b) {
      return `
      <section class="case-block cs-globe-block" data-cs="globe">
        <div class="cs-globe-text">
          ${b.h ? `<h2 data-odo>${esc(b.h)}</h2>` : ''}
          ${b.p.map(p => `<p>${esc(p)}</p>`).join('')}
          ${b.legend ? `<ul class="cs-globe-legend">${b.legend.map(l =>
            `<li><i></i>${esc(l)}</li>`).join('')}</ul>` : ''}
        </div>
        <div class="cs-globe-shell">
          <canvas class="cs-globe-canvas" aria-hidden="true"></canvas>
          <p class="cs-globe-cap">${esc(b.caption || '')}</p>
        </div>
      </section>`;
    },
    mount(root, b) {
      /* relative to this file: an import() from a classic script resolves
         against the script's own URL, not the page's */
      import('./case-globe.js').then(m => m.mountGlobe(root.querySelector('.cs-globe-canvas'), b))
        .catch(err => console.warn('globe failed to load', err));
    },
  };

  window.TIBBA_CASE_KINDS = { hyper, origin, globe };
})();
