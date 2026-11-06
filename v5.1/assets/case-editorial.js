/* ══════════════════════════════════════════════════════════════════════════
   Case study — editorial template
   ─────────────────────────────────────────────────────────────────────────
   Builds a case study page from its entry in assets/cases.js (the copy) and
   assets/work.js (the images), in the layout of assets/case-editorial.css.
   A page is a shell: <body data-case="groww">, a <main data-case-editorial>
   and the site footer. Spec and scaling notes: docs/case-study-template.md.

   ── the page, top to bottom ───────────────────────────────────────────────
     hero      the cover in a small centred container; a meta line (client ·
               sector, case number, status, year) on a hairline; the title
               as a large statement, its first line indented one column; the
               ledger (the four facts) and the tags
     body      the blocks, each turned into one of five components:
                 row        title in column 1, words in column 4
                 pair       title and words in one half, a 4:5 container in
                            the other — sides alternate
                 full       a container across all four columns
                 numbers    a label and up to four figures on the odometer
                 statement  a quote, set as large as the title
               bespoke kinds (case-sections.js) keep their own layout
     more      "Other projects": the next two cases as 7:5 cards

   ── how blocks become components ──────────────────────────────────────────
     text + figure  → pair, on every second such couple (so a page runs
                      full · pair · full …); otherwise row, then full
     figure         → full (ratio snapped to 16:10, 3:2 or 16:9)
     text, points   → row          stats → numbers        quote → statement
     A block can say which it wants: figure { layout: 'half' | 'full' }.
   ═════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const id = document.body.dataset.case;
  const C = window.TIBBA_CASES && window.TIBBA_CASES[id];
  const W = window.TibbaWork;
  if (!C || !W) { console.warn('No case study data for', id); return; }
  const S = W.SUMMITS.find(s => s.key === id), idx = W.SUMMITS.indexOf(S);
  const folder = S.folder, esc = W.esc, pad = n => String(n).padStart(2, '0');

  document.title = 'Just. Case Study – ' + C.client + ' — Tibba Design Studio';
  document.documentElement.style.setProperty('--client', C.colour);

  /* the three shapes a full-width container may take */
  function snap(ratio) {
    const [a, b] = String(ratio || '16 / 10').split('/').map(Number), r = a / (b || 1);
    return r >= 1.7 ? '16 / 9' : r >= 1.55 ? '16 / 10' : '3 / 2';
  }
  let fig = 0;
  function box(kind, name, alt, ratio) {
    return `<figure class="ce-box ce-box--${kind}"${ratio ? ` style="--ratio:${ratio}"` : ''}>${W.img(folder, name, alt)}</figure>`;
  }
  function caption(f) {
    return `<p class="ce-cap"><span class="ce-label"><b>Fig. ${pad(fig)}</b></span><span>${esc(f.label)}${f.caption ? ' — ' + esc(f.caption) : ''}</span></p>`;
  }
  const paras = b => `<div class="ce-text">${(b.p || []).map(p => `<p>${esc(p)}</p>`).join('')}</div>`;

  /* ── the hero ────────────────────────────────────────────────────────── */
  const hero = `<header class="ce-hero ce-wrap">
      ${box('hero', 'cover', C.client + ' — the work')}
      <div class="ce-meta ce-label">
        <span>${esc(C.client)} · ${esc(S.sector)}</span>
        <span>Case study ${pad(idx + 1)} / ${pad(W.SUMMITS.length)}</span>
        <span class="ce-status">${esc(C.status || '')}</span>
        <span>${esc(S.year)}</span>
      </div>
      <h1 class="ce-statement indent">${esc(C.title)}</h1>
      <dl class="ce-ledger">${C.meta.map(m => `<div><dt class="ce-label">${esc(m.k)}</dt><dd>${esc(m.v)}</dd></div>`).join('')}</dl>
      <ul class="ce-tags" style="margin-top:22px">${C.tags.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
    </header>`;

  /* ── the body ────────────────────────────────────────────────────────── */
  const out = [];
  let couples = 0, flip = false;
  const B = C.blocks;
  for (let i = 0; i < B.length; i++) {
    const b = B[i], next = B[i + 1];
    if (b.k === 'text' && b.h && next && next.k === 'figure') {
      const wantPair = next.layout ? next.layout === 'half' : (couples++ % 2 === 1);
      if (wantPair) {
        fig++;
        out.push(`<div class="ce-pair${flip ? ' flip' : ''} ce-in">
            <div class="ce-copy"><h2 class="ce-title">${esc(b.h)}</h2>${paras(b)}</div>
            <div class="ce-half">${box('half', W.slug(next.label), next.label)}${caption(next)}</div>
          </div>`);
        flip = !flip; i++; continue;
      }
    }
    switch (b.k) {
      case 'text':
        if (!b.h && b.p.join(' ').length < 240) { out.push(`<p class="ce-sec ce-statement ce-in">${esc(b.p.join(' '))}</p>`); break; }
        out.push(`<section class="ce-sec ce-row ce-in">${b.h ? `<h2 class="ce-title">${esc(b.h)}</h2>` : ''}${paras(b)}</section>`);
        break;
      case 'points':
        out.push(`<section class="ce-sec ce-row ce-in">${b.h ? `<h2 class="ce-title">${esc(b.h)}</h2>` : ''}
            ${b.p ? `<div class="ce-text ce-lead"><p>${esc(b.p)}</p></div>` : ''}
            <ol class="ce-list" style="grid-column:3 / 5">${b.items.map(it => `<li>${esc(it)}</li>`).join('')}</ol></section>`);
        break;
      case 'figure':
        fig++;
        if (b.layout === 'half') {
          out.push(`<div class="ce-pair${flip ? ' flip' : ''} ce-in"><div class="ce-copy"></div><div class="ce-half">${box('half', W.slug(b.label), b.label)}${caption(b)}</div></div>`);
          flip = !flip;
        } else out.push(`<div class="ce-in">${box('full', W.slug(b.label), b.label, snap(b.ratio))}${caption(b)}</div>`);
        break;
      case 'stats':
        out.push(`<section class="ce-sec ce-stats ce-in">${b.h ? `<h2 class="ce-title">${esc(b.h)}</h2>` : ''}
            <div class="ce-nums">${b.items.map(s => `<div><span class="n" data-odo-count>${esc(s.n)}</span><span class="l">${esc(s.l)}</span></div>`).join('')}</div></section>`);
        break;
      case 'quote':
        out.push(`<blockquote class="ce-sec ce-quote ce-in" style="margin-left:0;margin-right:0"><p class="ce-statement indent">“${esc(b.q)}”</p>
            <cite class="ce-label"><b>${esc(b.who)}</b>${esc(b.role)}</cite></blockquote>`);
        break;
      default: {
        const K = window.TIBBA_CASE_KINDS && window.TIBBA_CASE_KINDS[b.k];
        if (K) out.push(`<div class="ce-bespoke">${K.html(b)}</div>`);
      }
    }
  }
  const body = `<div class="ce-body ce-wrap">${out.join('')}</div>`;

  /* ── other projects ──────────────────────────────────────────────────── */
  const others = [1, 2].map(k => W.SUMMITS[(idx + k) % W.SUMMITS.length]);
  const more = `<section class="ce-more ce-wrap" aria-label="Other projects">
      <h2 class="ce-statement">Other projects</h2>
      <div class="ce-cards">${others.map(s => { const o = window.TIBBA_CASES[s.key];
        return `<a class="ce-card ce-in" href="${s.file}" style="--c:${o.colour}">
            <figure class="ce-box ce-box--card">${W.img(s.folder, 'cover', o.client)}</figure>
            <p class="ce-cap"><span class="ce-label"><b style="color:var(--c)">${esc(o.client)}</b></span><span>${esc(s.sector)} · ${esc(s.year)}</span></p>
            <h3>${esc(s.line)}</h3>
          </a>`; }).join('')}</div>
    </section>`;

  const main = document.querySelector('[data-case-editorial]');
  main.classList.add('ce');
  main.innerHTML = hero + body + more;

  /* every placeholder in its own project's colour */
  main.querySelectorAll('.ce-hero .wk-img, .ce-body .wk-img').forEach(el => el.style.setProperty('--c', C.colour));
  main.querySelectorAll('.ce-card').forEach(a => a.querySelector('.wk-img').style.setProperty('--c', a.style.getPropertyValue('--c')));

  /* bespoke kinds mount once their markup exists, in page order */
  const bespoke = B.filter(b => window.TIBBA_CASE_KINDS && window.TIBBA_CASE_KINDS[b.k]);
  main.querySelectorAll('[data-cs]').forEach((el, i) => { const b = bespoke[i]; if (b) window.TIBBA_CASE_KINDS[b.k].mount(el, b); });

  /* arrival */
  const io = 'IntersectionObserver' in window && new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('seen'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -10% 0px' });
  main.querySelectorAll('.ce-in').forEach(el => io ? io.observe(el) : el.classList.add('seen'));

  /* the reading hairline */
  const bar = document.createElement('div');
  bar.id = 'case-progress';
  document.body.appendChild(bar);
  const progress = () => { const h = document.documentElement.scrollHeight - innerHeight; bar.style.width = (h > 0 ? scrollY / h * 100 : 0) + '%'; };
  addEventListener('scroll', progress, { passive: true });
  addEventListener('resize', progress);
  progress();

  if (window.Odometer) window.Odometer.arm(document);
})();
