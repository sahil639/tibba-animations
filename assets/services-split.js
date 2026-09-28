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
   ═════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  const LABELS = ['Early-stage startup', 'Mid-size company', 'Established company'];
  const STRATEGY = /research|testing|strategy|marketing|analysis/i;
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const pad = n => String(n).padStart(2, '0');

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
          <li class="ss-item" style="--k:${k}">
            <span class="ix">S—${pad(offset + k + 1)}</span>
            <span class="nm">${cap(sv.name)}</span>
            <span class="pt">${sv.points[0]}</span>
            <i class="rule"></i>
          </li>`).join('')}</ol>`;
    }

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
})(window);
