/* ══════════════════════════════════════════════════════════════════════════
   Case study v3 — image-led, with two heroes to choose between
   ─────────────────────────────────────────────────────────────────────────
   The same data as v2 (assets/cases.js, assets/work.js), laid out in three
   parts:

     the hero      one of two, picked by <body data-hero="…">
                     'arch'    a full-height page: the cover rising as a
                               dome from the foot of the screen, the client's
                               name set huge over its lower left, a line of
                               small caps under it
                     'ledger'  a ruled sheet: a row of hairline columns along
                               the top, the name large on the left, the
                               particulars in ruled rows on the right, and
                               the project in justified capitals at the foot
     the plates    images only: a 12-column grid, never more than two to a
                   row, each row its own pair of sizes (GALLERY, below)
     next          the next three cases as cards, each with its image, its
                   line, a hairline and its sector; "All work" beside the
                   heading

   Each image is a slot from TibbaWork.img: drop a file in
   assets/work/<folder>/<name>.webp and it replaces the placeholder.
   ═════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const id = document.body.dataset.case;
  const C = window.TIBBA_CASES && window.TIBBA_CASES[id];
  const W = window.TibbaWork;
  if (!C || !W) { console.warn('No case study data for', id); return; }
  const S = W.SUMMITS.find(s => s.key === id), idx = W.SUMMITS.indexOf(S);
  const folder = S.folder, esc = W.esc, pad = n => String(n).padStart(2, '0');

  document.documentElement.style.setProperty('--client', C.colour);

  /* ── the plates ──────────────────────────────────────────────────────────
     Rows of one or two. span is out of 12; ratio is the image's shape; sink
     drops a plate down its row so the pair does not line up at the top. */
  const GALLERY = {
    groww: [
      [{ n: 'groww-feed', span: 12, ratio: '21 / 9' }],
      [{ n: 'feed-buckets', span: 7, ratio: '4 / 5' }, { n: 'feed-article', span: 4, ratio: '3 / 4', sink: true }],
      [{ n: 'groww-stories', span: 5, ratio: '3 / 4' }, { n: 'stories-frames', span: 7, ratio: '16 / 10' }],
      [{ n: 'xirr-calculator', span: 12, ratio: '16 / 9' }],
      [{ n: 'xirr-projection', span: 4, ratio: '1 / 1', sink: true }, { n: 'design-system', span: 8, ratio: '16 / 10' }],
      [{ n: 'stories-film', span: 9, ratio: '16 / 9', push: 3 }],
    ],
  };
  /* a case without its own list: its figures, alternating wide and paired */
  function fallback() {
    const figs = C.blocks.filter(b => b.k === 'figure').map(b => W.slug(b.label));
    const rows = []; let i = 0;
    while (i < figs.length) {
      if (rows.length % 2 === 0) rows.push([{ n: figs[i++], span: 12, ratio: '16 / 9' }]);
      else { const r = [{ n: figs[i++], span: 7, ratio: '4 / 3' }]; if (i < figs.length) r.push({ n: figs[i++], span: 5, ratio: '3 / 4', sink: true }); rows.push(r); }
    }
    return rows;
  }

  /* ── hero: arch ──────────────────────────────────────────────────────── */
  function heroArch() {
    return `<section class="c3-arch">
      <a class="c3-chip" href="#c3-plates"><span>See the work</span><i aria-hidden="true"></i></a>
      <div class="c3-dome">${W.img(folder, 'cover', C.client + ' — the work', null)}</div>
      <div class="c3-arch-in">
        <h1 class="c3-name">${esc(C.client)}</h1>
        <div class="c3-row">
          <p>${esc(S.line.replace(/^How we helped /, 'Helping '))}</p>
          <p>${esc(S.year)}</p>
          <p>${esc(S.sector)}</p>
        </div>
      </div>
    </section>`;
  }

  /* ── hero: ledger ────────────────────────────────────────────────────── */
  function heroLedger() {
    const scope = (C.meta.find(m => /expertise/i.test(m.k)) || { v: '' }).v.split(/,\s*/).filter(Boolean);
    const rows = C.meta.filter(m => !/expertise/i.test(m.k));
    const top = [['Tibba', 'website-v3.html'], ['Case studies', 'website-v3.html#work', true], [C.client], [S.sector], [S.year], [`${pad(idx + 1)} / ${pad(W.SUMMITS.length)}`]];
    return `<section class="c3-ledger">
      <ol class="c3-cols">${top.map(([t, href, dot]) => `<li>${href ? `<a href="${href}">` : '<span>'}${dot ? '<i class="c3-dot"></i>' : ''}${esc(t)}${href ? '</a>' : '</span>'}</li>`).join('')}</ol>
      <a class="c3-back" href="website-v3.html#work"><i aria-hidden="true"></i><span>Go back</span></a>
      <dl class="c3-facts">
        ${C.status ? `<div><dt>Status</dt><dd><b class="c3-pip"></b>${esc(C.status)}</dd></div>` : ''}
        ${rows.map(m => `<div><dt>${esc(m.k)}</dt><dd>${esc(m.v)}</dd></div>`).join('')}
        <div class="c3-scope"><dt>Project scope</dt><dd><ul>${scope.map(s => `<li>${esc(s.charAt(0).toUpperCase() + s.slice(1))}</li>`).join('')}</ul></dd></div>
      </dl>
      <h1 class="c3-big">${esc(C.client)}</h1>
      <p class="c3-about-k">About the project</p>
      <p class="c3-about">${esc(C.summary || C.title)}</p>
    </section>`;
  }

  /* ── the plates ──────────────────────────────────────────────────────── */
  let n = 0;
  const rows = GALLERY[id] || fallback();
  const total = rows.reduce((a, r) => a + r.length, 0);
  const plates = `<section class="c3-plates" id="c3-plates" aria-label="The work">
    <p class="c3-k"><b>The work</b><i></i><span>${pad(total)} plates</span></p>
    ${rows.map(r => `<div class="c3-prow">${r.map(p => { n++;
      const label = p.n.replace(/-/g, ' ');
      return `<figure class="c3-plate${p.sink ? ' sink' : ''}" style="--span:${p.span};${p.push ? `--push:${p.push + 1};` : ''}">
        ${W.img(folder, p.n, C.client + ' — ' + label, p.ratio)}
        <figcaption><b>${pad(n)}</b>${esc(label)}</figcaption>
      </figure>`; }).join('')}</div>`).join('')}
  </section>`;

  /* ── next ────────────────────────────────────────────────────────────── */
  const nextThree = [1, 2, 3].map(k => W.SUMMITS[(idx + k) % W.SUMMITS.length]).filter(s => s !== S).slice(0, 3);
  const next = `<section class="c3-next">
    <header><h2>Keep climbing.</h2><a class="c3-all" href="website-v3.html#work"><span>All work</span><i aria-hidden="true"></i></a></header>
    <div class="c3-cards">${nextThree.map(s => { const o = window.TIBBA_CASES[s.key];
      return `<a class="c3-card" href="${s.file}" style="--c:${o.colour}">
        ${W.img(s.folder, 'cover', o.client, '16 / 10')}
        <h3>${esc(s.line)}</h3>
        <p><span>${esc(s.sector)}</span><span>${esc(o.client)} · ${esc(s.year)}</span></p>
      </a>`; }).join('')}</div>
  </section>`;

  const main = document.querySelector('[data-case3]');
  main.innerHTML = (document.body.dataset.hero === 'ledger' ? heroLedger() : heroArch()) + plates + next;
  main.querySelectorAll('.c3-arch .wk-img, .c3-plates .wk-img').forEach(el => el.style.setProperty('--c', C.colour));
  main.querySelectorAll('.c3-card').forEach(a => a.querySelector('.wk-img').style.setProperty('--c', a.style.getPropertyValue('--c')));

  /* the plates arrive as they come into view */
  const io = 'IntersectionObserver' in window && new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('seen'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -8% 0px' });
  main.querySelectorAll('.c3-plate, .c3-card').forEach(el => io ? io.observe(el) : el.classList.add('seen'));

  /* the arch: the dome rises a little as the page leaves it */
  const dome = main.querySelector('.c3-dome');
  if (dome) {
    const drift = () => { const y = Math.min(scrollY, innerHeight); dome.style.transform = `translate3d(-50%, ${(-y * .12).toFixed(1)}px, 0) scale(${(1 + y / innerHeight * .05).toFixed(4)})`; };
    addEventListener('scroll', () => requestAnimationFrame(drift), { passive: true });
    drift();
  }

  /* the reading hairline, as v2 */
  const bar = document.createElement('div');
  bar.id = 'case-progress';
  document.body.appendChild(bar);
  const progress = () => { const h = document.documentElement.scrollHeight - innerHeight; bar.style.width = (h > 0 ? scrollY / h * 100 : 0) + '%'; };
  addEventListener('scroll', progress, { passive: true });
  addEventListener('resize', progress);
  progress();
})();
