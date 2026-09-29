/* ══════════════════════════════════════════════════════════════════════════
   Services, split either side of a central visual
   ─────────────────────────────────────────────────────────────────────────
   Shared by the two exploratory Our Services pages — Shifting Topo and
   Compass. Both put one object in the middle of the screen and the chosen
   stage's services left and right of it; this is that layout, so the two
   pages differ only in the object.

   The services are divided by type rather than cut in half:
     left   Research & strategy — understanding the market and the user
     right  Design & delivery   — making the product and shipping it
   Data is window.TIBBA_SERVICES (assets/services.js), the same list every
   services page reads.

     const S = mountServicesSplit({ left, right, stages, blurb, onStage });
     S.pick(i)     select a stage (0 early · 1 mid · 2 established)

   ── each side ─────────────────────────────────────────────────────────────
   Minimal: a list of service TITLES only, and under it one group box that
   holds that side's subtitles, each keyed to its title by its S-number.
   Point at a title (or a line in the box) and the pair lights together.
   The two sides stretch to the same height, so the box's subtitles can sit
   at its top, centre or bottom — SERVICES_SPLIT_CONFIG.subAlign.

   ── SERVICES_SPLIT_CONFIG (window.SERVICES_SPLIT_CONFIG) ─────────────────
     boxGap       px between the title list and the group box
     boxPad       px of padding inside the group box
     subGap       px between the subtitles inside the box
     subAlign     'top' | 'center' | 'bottom' — where they sit in the box
     boxMinHeight px — the box's floor, so the alignment has room to show
   Add servicesSplitPanel() to a page's #tune and call bindServicesSplitPanel
   for the same controls on every page that uses this layout.
   ═════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  const LABELS = ['Early-stage startup', 'Mid-size company', 'Established company'];
  const STRATEGY = /research|testing|strategy|marketing|analysis/i;
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const pad = n => String(n).padStart(2, '0');

  const SERVICES_SPLIT_CONFIG = {
    boxGap: 22,
    boxPad: 18,
    subGap: 12,
    subAlign: 'bottom',      // 'top' | 'center' | 'bottom'
    boxMinHeight: 150,
  };
  const ALIGN = { top: 'flex-start', center: 'center', bottom: 'flex-end' };
  function applyConfig() {
    const c = SERVICES_SPLIT_CONFIG, st = document.documentElement.style;
    st.setProperty('--ss-box-gap', c.boxGap + 'px');
    st.setProperty('--ss-box-pad', c.boxPad + 'px');
    st.setProperty('--ss-sub-gap', c.subGap + 'px');
    st.setProperty('--ss-sub-align', ALIGN[c.subAlign] || 'flex-end');
    st.setProperty('--ss-box-min', c.boxMinHeight + 'px');
  }
  applyConfig();

  function mountServicesSplit(o) {
    const S = global.TIBBA_SERVICES;
    let cur = -1, timer = 0;

    o.stages.innerHTML = S.map((st, i) => `
      <button type="button" class="ss-stage" role="tab" data-i="${i}" aria-selected="false">
        <span class="n">${pad(i + 1)}</span><span class="l">${LABELS[i]}</span>
      </button>`).join('');
    o.stages.addEventListener('click', e => {
      const b = e.target.closest('.ss-stage'); if (b) pick(+b.dataset.i);
    });
    o.stages.addEventListener('keydown', e => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      pick((cur + (e.key === 'ArrowRight' ? 1 : S.length - 1)) % S.length, true);
    });

    function col(list, side, offset) {
      return `<p class="ss-head"><span>${side === 'left' ? 'Research &amp; strategy' : 'Design &amp; delivery'}</span><i></i><b>${pad(list.length)}</b></p>
        <ol class="ss-list">${list.map((sv, k) => `
          <li class="ss-item" style="--k:${k}" data-k="${k}">
            <span class="ix">S—${pad(offset + k + 1)}</span>
            <span class="nm">${cap(sv.name)}</span>
            <i class="rule"></i>
          </li>`).join('')}</ol>
        <div class="ss-box">
          <span class="ss-box-k">${side === 'left' ? 'What the research covers' : 'What we deliver'}</span>
          <div class="ss-subs">${list.map((sv, k) => `
            <p class="ss-sub" style="--k:${k}" data-k="${k}"><b>S—${pad(offset + k + 1)}</b><span>${sv.points[0]}</span></p>`).join('')}</div>
        </div>`;
    }
    /* a title and its subtitle light together, from either end */
    [o.left, o.right].forEach(c => {
      const mark = k => c.querySelectorAll('[data-k]').forEach(n => n.classList.toggle('hot', k != null && n.dataset.k === k));
      c.addEventListener('pointerover', e => { const n = e.target.closest('[data-k]'); mark(n ? n.dataset.k : null); c.classList.toggle('pairing', !!n); });
      c.addEventListener('pointerleave', () => { mark(null); c.classList.remove('pairing'); });
    });

    function pick(i, focus) {
      if (i === cur) return;
      const first = cur < 0;
      cur = i;
      [...o.stages.children].forEach((b, k) => {
        b.setAttribute('aria-selected', String(k === i));
        b.tabIndex = k === i ? 0 : -1;
        if (k === i && focus) b.focus();
      });
      const st = S[i];
      const left = st.services.filter(s => STRATEGY.test(s.name));
      const right = st.services.filter(s => !STRATEGY.test(s.name));
      if (o.blurb) { o.blurb.textContent = st.blurb; o.blurb.classList.remove('in'); void o.blurb.offsetWidth; o.blurb.classList.add('in'); }

      /* out, then in: the old lists clear before the new ones are drawn, so
         two sets of services are never on screen at once */
      [o.left, o.right].forEach(c => c.classList.add('out'));
      clearTimeout(timer);
      timer = setTimeout(() => {
        o.left.innerHTML = col(left, 'left', 0);
        o.right.innerHTML = col(right, 'right', left.length);
        [o.left, o.right].forEach(c => { c.classList.remove('out', 'in'); void c.offsetWidth; c.classList.add('in'); });
      }, first ? 0 : 260);
      if (o.onStage) o.onStage(i, st);
    }

    return { pick, LABELS, get stage() { return cur; } };
  }

  global.mountServicesSplit = mountServicesSplit;
  global.SERVICES_SPLIT_CONFIG = SERVICES_SPLIT_CONFIG;

  /* the panel section, identical on every page that uses the split */
  global.servicesSplitPanel = () => {
    const c = SERVICES_SPLIT_CONFIG;
    const R = (id, label, min, max, val) => `<div class="row"><label>${label}<i id="v-${id}">${val}px</i></label><input type="range" id="s-${id}" min="${min}" max="${max}" value="${val}"></div>`;
    return `<p class="tune-sub">Service groups</p>
      ${R('ss-gap', 'Box spacing', 0, 80, c.boxGap)}
      ${R('ss-pad', 'Box padding', 0, 48, c.boxPad)}
      ${R('ss-sgap', 'Subtitle spacing', 0, 40, c.subGap)}
      ${R('ss-min', 'Box min height', 0, 400, c.boxMinHeight)}
      <div class="seg" id="s-ss-align">${['top', 'center', 'bottom'].map(a => `<button data-a="${a}"${a === c.subAlign ? ' class="on"' : ''}>${a}</button>`).join('')}</div>`;
  };
  global.bindServicesSplitPanel = el => {
    const c = SERVICES_SPLIT_CONFIG;
    [['ss-gap', 'boxGap'], ['ss-pad', 'boxPad'], ['ss-sgap', 'subGap'], ['ss-min', 'boxMinHeight']].forEach(([id, key]) => {
      const inp = el.querySelector('#s-' + id); if (!inp) return;
      inp.addEventListener('input', () => { c[key] = +inp.value; el.querySelector('#v-' + id).textContent = inp.value + 'px'; applyConfig(); });
    });
    const seg = el.querySelector('#s-ss-align');
    if (seg) seg.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      [...seg.children].forEach(x => x.classList.toggle('on', x === b)); c.subAlign = b.dataset.a; applyConfig();
    });
  };
})(window);
