/* ══════════════════════════════════════════════════════════════════════════
   The case study renderer
   ─────────────────────────────────────────────────────────────────────────
   Reads one entry out of assets/cases.js and builds the page from it. Each
   case study file is a shell that names its own id in <body data-case="...">;
   everything visible below the nav comes from here.
   ═════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const id = document.body.dataset.case;
  const C = window.TIBBA_CASES && window.TIBBA_CASES[id];
  if (!C) { console.warn('No case study data for', id); return; }

  document.title = C.client + ' — Tibba Design Studio';
  document.documentElement.style.setProperty('--client', C.colour);

  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

  /* ── the top ─────────────────────────────────────────────────────────── */
  const hero = document.querySelector('[data-case-hero]');
  hero.className = 'case-hero';
  hero.innerHTML = `
    <div class="wrap">
      <p class="client"><i></i>${esc(C.client)}${
        C.status ? `<span class="case-status">${esc(C.status)}</span>` : ''}</p>
      ${C.eyebrow ? `<p class="case-eyebrow">${esc(C.eyebrow)}</p>` : ''}
      <h1 data-odo>${esc(C.title)}</h1>
      <ul class="case-tags">${C.tags.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
      <dl class="case-meta">${C.meta.map(m =>
        `<div><dt>${esc(m.k)}</dt><dd>${esc(m.v)}</dd></div>`).join('')}</dl>
      ${figure(C.hero)}
    </div>`;

  /* ── the body ────────────────────────────────────────────────────────── */
  function figure(f) {
    if (!f) return '';
    return `<figure class="case-figure" style="--ratio:${f.ratio}">
        <div class="plate"><span>${esc(f.label)}</span></div>
        <figcaption>${esc(f.caption)}</figcaption>
      </figure>`;
  }

  function block(b) {
    switch (b.k) {
      case 'text':
        return `<section class="case-block">
            ${b.h ? `<h2 data-odo>${esc(b.h)}</h2>` : ''}
            ${b.p.map(p => `<p>${esc(p)}</p>`).join('')}
          </section>`;

      case 'points':
        return `<section class="case-block">
            ${b.h ? `<h2 data-odo>${esc(b.h)}</h2>` : ''}
            ${b.p ? `<p>${esc(b.p)}</p>` : ''}
            <ul class="case-list">${b.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>
          </section>`;

      case 'figure':
        return `<section class="case-block">${figure(b)}</section>`;

      case 'stats':
        return `<section class="case-block">
            ${b.h ? `<h2 data-odo>${esc(b.h)}</h2>` : ''}
            <div class="case-stats">${b.items.map(s =>
              `<div><span class="n" data-odo-count>${esc(s.n)}</span>
                    <span class="l">${esc(s.l)}</span></div>`).join('')}</div>
          </section>`;

      case 'quote':
        return `<section class="case-block case-quote">
            <blockquote>“${esc(b.q)}”</blockquote>
            <p class="who">${esc(b.who)}</p>
            <p class="role">${esc(b.role)}</p>
          </section>`;

      default: {
        /* anything else is one of the bespoke kinds in case-sections.js */
        const K = window.TIBBA_CASE_KINDS && window.TIBBA_CASE_KINDS[b.k];
        return K ? K.html(b) : '';
      }
    }
  }

  const body = document.querySelector('[data-case-body]');
  body.className = 'case-body';
  body.innerHTML = `<div class="wrap">${C.blocks.map(block).join('')}</div>`;

  /* the bespoke kinds mount after the markup exists, in page order */
  const bespoke = C.blocks.filter(b => window.TIBBA_CASE_KINDS && window.TIBBA_CASE_KINDS[b.k]);
  body.querySelectorAll('[data-cs]').forEach((el, i) => {
    const b = bespoke[i];
    if (b) window.TIBBA_CASE_KINDS[b.k].mount(el, b);
  });

  /* ── the other three ─────────────────────────────────────────────────── */
  /* The data key and the file name are not the same word for every case —
     'shyft-and-mindhouse' is the key, case-shyft-mindhouse.html is the file —
     so the mapping is stated once here rather than reconstructed inline. */
  const FILE = {
    'groww': 'case-groww.html',
    'firstpost': 'case-firstpost.html',
    'breathe-esg': 'case-breathe-esg.html',
    'shyft-and-mindhouse': 'case-shyft-mindhouse.html',
  };

  const others = window.TIBBA_CASE_ORDER.filter(k => k !== id);
  const more = document.querySelector('[data-case-more]');
  more.className = 'case-more';
  more.innerHTML = `
    <div class="wrap">
      <h2 data-odo>Other projects</h2>
      <div class="grid">${others.map(k => {
        const o = window.TIBBA_CASES[k];
        return `<a href="${FILE[k]}" style="--client-other:${o.colour}" data-odo-hover>
            <p class="tag">${esc(o.client)}</p>
            <h3>${esc(o.title)}</h3>
            <p class="go"><span data-odo>View case study</span></p>
          </a>`;
      }).join('')}</div>
    </div>`;

  /* ── the reading hairline ────────────────────────────────────────────── */
  const bar = document.createElement('div');
  bar.id = 'case-progress';
  document.body.appendChild(bar);

  function progress() {
    const h = document.documentElement.scrollHeight - innerHeight;
    bar.style.width = (h > 0 ? (scrollY / h) * 100 : 0) + '%';
  }
  addEventListener('scroll', progress, { passive: true });
  addEventListener('resize', progress);
  progress();

  /* everything above was built after odometer.js armed the document */
  if (window.Odometer) window.Odometer.arm(document);
})();
