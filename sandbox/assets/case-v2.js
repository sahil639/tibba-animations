/* ══════════════════════════════════════════════════════════════════════════
   Case study v2 — one design system for all four summits
   ─────────────────────────────────────────────────────────────────────────
   The same data as before (assets/cases.js) and the same bespoke sections
   (assets/case-sections.js — the burst-and-reader, the scattered cards, the
   globe), set in Website v3's system and carried on the work itself:

     the summit     a full-bleed cover (assets/work/<client>/cover), the
                    title over it, the client's colour as the only accent,
                    and an altitude readout — every case is a summit
     the ledger     expertise / deliverables / duration / year in a hairline
                    grid, the tags under it
     the route      a sticky chapter list down the left on a desktop: every
                    heading in the case, the one being read lit, a hairline
                    climbing beside it as the page is read; a click goes there
     the body       text as heading-left / words-right; points as numbered
                    rows; figures full-bleed and numbered (Fig. 01 …), each
                    a real image slot (assets/work/<client>/<label slug>);
                    numbers on the odometer; quotes large
     next summit    the next case, its cover and its line, as the way on;
                    the other two as cards beneath

   Kept from v1: the odometer on every heading and number, the reading
   hairline across the top, the bespoke sections and their interactions,
   the site footer with its range and form, the services slide-over.
   ═════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const id = document.body.dataset.case;
  const C = window.TIBBA_CASES && window.TIBBA_CASES[id];
  const W = window.TibbaWork;
  if (!C || !W) { console.warn('No case study data for', id); return; }
  const S = W.SUMMITS.find(s => s.key === id), idx = W.SUMMITS.indexOf(S);
  const folder = S.folder;

  document.title = C.client + ' — Tibba Design Studio';
  document.documentElement.style.setProperty('--client', C.colour);
  const esc = W.esc, pad = n => String(n).padStart(2, '0');
  const ALT = ['4,820', '5,360', '6,190', '7,050'];

  /* ── the summit ──────────────────────────────────────────────────────── */
  const hero = document.querySelector('[data-case-hero]');
  hero.className = 'cv-hero';
  const title = esc(C.title);
  hero.innerHTML = `
    <div class="cv-cover">${W.img(folder, 'cover', C.client + ' — ' + (C.hero ? C.hero.label : 'the work'), null, 'cv-cover-img')}</div>
    <div class="cv-hero-in">
      <p class="cv-k"><b>Summit ${pad(idx + 1)}</b><i></i><span>${esc(S.sector)} · ${esc(S.year)}</span>
        ${C.status ? `<span class="cv-status">${esc(C.status)}</span>` : ''}</p>
      <p class="cv-client">${esc(C.client)}</p>
      ${C.eyebrow ? `<p class="cv-eyebrow">${esc(C.eyebrow)}</p>` : ''}
      <h1 data-odo>${title}</h1>
      <p class="cv-alt" aria-hidden="true"><span>Alt</span><b>${ALT[idx]}</b><span>m</span></p>
    </div>
    <div class="cv-scroll" aria-hidden="true"><i></i>Scroll to climb</div>`;

  const ledger = document.querySelector('[data-case-ledger]');
  ledger.className = 'cv-ledger';
  ledger.innerHTML = `<div class="wrap">
      <dl>${C.meta.map(m => `<div><dt>${esc(m.k)}</dt><dd>${esc(m.v)}</dd></div>`).join('')}</dl>
      <ul class="cv-tags">${C.tags.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
      ${C.hero ? `<p class="cv-hero-cap"><b>Fig. 00</b> ${esc(C.hero.caption)}</p>` : ''}
    </div>`;

  /* ── the body ────────────────────────────────────────────────────────── */
  let fig = 0, chap = 0;
  const chapters = [];
  const anchor = h => { const a = 'ch-' + (++chap); chapters.push({ a, h }); return a; };
  function figure(f) {
    fig++;
    return `<figure class="cv-fig" style="--ratio:${f.ratio}">
        ${W.img(folder, W.slug(f.label), f.label, f.ratio)}
        <figcaption><b>Fig. ${pad(fig)}</b><span>${esc(f.label)}</span><em>${esc(f.caption)}</em></figcaption>
      </figure>`;
  }
  function block(b) {
    switch (b.k) {
      case 'text':
        return `<section class="cv-block cv-text"${b.h ? ` id="${anchor(b.h)}"` : ''}>
            <div class="cv-l">${b.h ? `<h2 data-odo>${esc(b.h)}</h2>` : ''}</div>
            <div class="cv-r">${b.p.map(p => `<p>${esc(p)}</p>`).join('')}</div>
          </section>`;
      case 'points':
        return `<section class="cv-block cv-text"${b.h ? ` id="${anchor(b.h)}"` : ''}>
            <div class="cv-l">${b.h ? `<h2 data-odo>${esc(b.h)}</h2>` : ''}</div>
            <div class="cv-r">${b.p ? `<p>${esc(b.p)}</p>` : ''}
              <ol class="cv-list">${b.items.map((it, i) => `<li><b>${pad(i + 1)}</b><span>${esc(it)}</span></li>`).join('')}</ol></div>
          </section>`;
      case 'figure':
        return `<section class="cv-block cv-figblock">${figure(b)}</section>`;
      case 'stats':
        return `<section class="cv-block cv-stats"${b.h ? ` id="${anchor(b.h)}"` : ''}>
            ${b.h ? `<h2 data-odo>${esc(b.h)}</h2>` : ''}
            <div class="cv-nums">${b.items.map(s =>
              `<div><span class="n" data-odo-count>${esc(s.n)}</span><span class="l">${esc(s.l)}</span></div>`).join('')}</div>
          </section>`;
      case 'quote':
        return `<section class="cv-block cv-quote">
            <i aria-hidden="true">“</i>
            <blockquote>${esc(b.q)}</blockquote>
            <p class="who"><b>${esc(b.who)}</b>${esc(b.role)}</p>
          </section>`;
      default: {
        const K = window.TIBBA_CASE_KINDS && window.TIBBA_CASE_KINDS[b.k];
        if (!K) return '';
        if (b.h) chapters.push({ a: 'ch-' + (++chap), h: b.h, bespoke: true });
        return `<div class="cv-bespoke" data-chapter="${b.h ? 'ch-' + chap : ''}">${K.html(b)}</div>`;
      }
    }
  }
  const body = document.querySelector('[data-case-body]');
  body.className = 'cv-body';
  const blocks = C.blocks.map(block).join('');
  body.innerHTML = `<aside class="cv-route" aria-label="Chapters"><p class="cv-route-k">The route</p><ol>${chapters.map((c, i) =>
      `<li><a href="#${c.a}" data-a="${c.a}"><b>${pad(i + 1)}</b><span>${esc(c.h)}</span></a></li>`).join('')}</ol><i class="cv-route-line"><i></i></i></aside>
    <div class="cv-main">${blocks}</div>`;
  body.querySelectorAll('.cv-bespoke[data-chapter]').forEach(el => { if (el.dataset.chapter) el.id = el.dataset.chapter; });

  /* the bespoke kinds mount after the markup exists, in page order */
  const bespoke = C.blocks.filter(b => window.TIBBA_CASE_KINDS && window.TIBBA_CASE_KINDS[b.k]);
  body.querySelectorAll('[data-cs]').forEach((el, i) => { const b = bespoke[i]; if (b) window.TIBBA_CASE_KINDS[b.k].mount(el, b); });

  /* ── the route: which chapter is being read ──────────────────────────── */
  const links = [...body.querySelectorAll('.cv-route a')], line = body.querySelector('.cv-route-line i');
  const targets = links.map(a => document.getElementById(a.dataset.a));
  links.forEach((a, i) => a.addEventListener('click', e => {
    e.preventDefault();
    const t = targets[i]; if (t) scrollTo({ top: t.getBoundingClientRect().top + scrollY - 90, behavior: 'smooth' });
  }));
  function route() {
    let cur = -1;
    targets.forEach((t, i) => { if (t && t.getBoundingClientRect().top < innerHeight * .4) cur = i; });
    links.forEach((a, i) => { a.classList.toggle('on', i === cur); a.classList.toggle('past', i < cur); });
    const r = body.getBoundingClientRect();
    /* shown while the body is read; stood down while a full-bleed bespoke
       section is crossing the middle of the screen */
    const wide = [...body.querySelectorAll('.cv-bespoke')].some(el => { const q = el.getBoundingClientRect(); return q.top < innerHeight * .75 && q.bottom > innerHeight * .25; });
    const rt = body.querySelector('.cv-route'), room = body.querySelector('.cv-main > *').getBoundingClientRect().left > rt.offsetWidth + rt.getBoundingClientRect().left + 24;
    rt.classList.toggle('on', room && r.top < innerHeight * .5 && r.bottom > innerHeight * .5 && !wide);
    line.style.transform = `scaleY(${Math.min(1, Math.max(0, (innerHeight * .4 - r.top) / r.height)).toFixed(4)})`;
  }

  /* ── next summit, and the other two ──────────────────────────────────── */
  const nextS = W.SUMMITS[(idx + 1) % W.SUMMITS.length];
  const others = W.SUMMITS.filter(s => s !== S && s !== nextS);
  const nc = window.TIBBA_CASES[nextS.key];
  const more = document.querySelector('[data-case-more]');
  more.className = 'cv-more';
  more.innerHTML = `
    <a class="cv-next" href="${nextS.file}" style="--c:${nc.colour}">
      <div class="cv-next-img">${W.img(nextS.folder, 'cover', nc.client)}</div>
      <div class="cv-next-in">
        <p class="cv-k"><b>Next summit</b><i></i><span>${pad(W.SUMMITS.indexOf(nextS) + 1)} · ${esc(nc.client)}</span></p>
        <h2 data-odo>${esc(nextS.line)}</h2>
        <p class="cv-go">Keep climbing<i></i></p>
      </div>
    </a>
    <div class="wrap cv-others">${others.map(s => { const o = window.TIBBA_CASES[s.key];
      return `<a href="${s.file}" style="--c:${o.colour}" data-odo-hover>
          ${W.img(s.folder, 'cover', o.client, '16 / 10')}
          <p class="tag">${esc(o.client)} · ${esc(s.year)}</p>
          <h3>${esc(s.line)}</h3>
          <p class="go"><span data-odo>View case study</span></p>
        </a>`; }).join('')}</div>`;
  /* every slot carries its own client's colour, for the placeholder */
  document.querySelectorAll('.cv-next .wk-img').forEach(el => el.style.setProperty('--c', nc.colour));
  document.querySelectorAll('.cv-others a').forEach((a, i) => a.querySelector('.wk-img').style.setProperty('--c', window.TIBBA_CASES[others[i].key].colour));
  document.querySelectorAll('.cv-hero .wk-img, .cv-body .wk-img').forEach(el => el.style.setProperty('--c', C.colour));

  /* ── the cover: a slow drift as the page leaves it ───────────────────── */
  const cover = hero.querySelector('.cv-cover');
  function drift() {
    const y = Math.min(scrollY, innerHeight);
    cover.style.transform = `translate3d(0, ${(y * .35).toFixed(1)}px, 0) scale(${(1.04 + y / innerHeight * .06).toFixed(4)})`;
    hero.style.setProperty('--fade', Math.min(1, y / (innerHeight * .8)).toFixed(3));
  }

  /* ── the reading hairline (as v1) ────────────────────────────────────── */
  const bar = document.createElement('div');
  bar.id = 'case-progress';
  document.body.appendChild(bar);
  function progress() {
    const h = document.documentElement.scrollHeight - innerHeight;
    bar.style.width = (h > 0 ? (scrollY / h) * 100 : 0) + '%';
  }
  const all = () => { progress(); route(); drift(); };
  addEventListener('scroll', () => requestAnimationFrame(all), { passive: true });
  addEventListener('resize', all);
  all();

  if (window.Odometer) window.Odometer.arm(document);
})();
