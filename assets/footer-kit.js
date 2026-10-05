/* ══════════════════════════════════════════════════════════════════════════
   Footer kit — the shared parts of the reference footers
   ─────────────────────────────────────────────────────────────────────────
   Eleven footer pages, one per reference, each a different composition
   with the campfire at its centre. What they share lives here so each page
   is only its own layout:

     fire(canvas, opts)            a dithered / ASCII campfire (campfire-dither.js)
     draggable(win, bounds)        a window card dragged by its [data-drag] handle,
                                   collapsed by its [data-toggle] button
     clocks(host, camps)           live clocks, one per [tz, city, region]
     ticker(host, text)            a running line
     barWord(host, letters, o)     letters built from horizontal bars, revealed
                                   when they scroll into view
     panel({ title, key, config, name, fires, extra, bind })
                                   the page's #tune: per-fire controls, the
                                   page's own extras, and Bake settings
   ═════════════════════════════════════════════════════════════════════════ */
import { mountDitherFire } from './campfire-dither.js';
import { applyBaked, bakeControls } from './bake.js';
export { applyBaked };

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const pad = n => String(n).padStart(2, '0');
export const year = () => new Date().getFullYear();

export function fire(canvas, opts) { return mountDitherFire(canvas, opts); }

export function draggable(win, bounds = win.parentElement, { off } = {}) {
  const bar = win.querySelector('[data-drag]'), tg = win.querySelector('[data-toggle]');
  if (tg) tg.addEventListener('click', () => { const shut = win.classList.toggle('shut'); tg.textContent = shut ? '[+]' : '[–]'; });
  if (!bar) return;
  let d = null;
  bar.addEventListener('pointerdown', e => {
    if (off && off()) return;
    const r = win.getBoundingClientRect(), b = bounds.getBoundingClientRect();
    d = { dx: e.clientX - r.left, dy: e.clientY - r.top, b }; bar.setPointerCapture(e.pointerId);
    win.classList.add('drag'); win.style.right = 'auto'; win.style.bottom = 'auto'; win.style.zIndex = 20;
  });
  bar.addEventListener('pointermove', e => {
    if (!d) return;
    const x = Math.min(d.b.width - 60, Math.max(-win.offsetWidth + 60, e.clientX - d.b.left - d.dx));
    const y = Math.min(d.b.height - 30, Math.max(0, e.clientY - d.b.top - d.dy));
    win.style.left = x + 'px'; win.style.top = y + 'px';
  });
  const up = () => { d = null; win.classList.remove('drag'); win.style.zIndex = ''; };
  bar.addEventListener('pointerup', up); bar.addEventListener('pointercancel', up);
}

export const CAMPS = [['Asia/Kolkata', 'India', 'Base'], ['Europe/London', 'London', 'Europe'], ['America/New_York', 'New York', 'N. America'], ['Asia/Singapore', 'Singapore', 'Asia']];
export function clocks(host, camps = CAMPS, { seconds = true } = {}) {
  const F = camps.map(([tz]) => new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', ...(seconds ? { second: '2-digit' } : {}), hour12: false }));
  host.innerHTML = camps.map(([, n, r]) => `<div class="clk"><b>--:--</b><span>${n}</span><small>${r}</small></div>`).join('');
  const tick = () => { const now = new Date(); [...host.children].forEach((c, i) => { c.querySelector('b').textContent = F[i].format(now); }); };
  tick(); setInterval(tick, 1000);
}

export const LINE = 'Tibba — a higher place · Every climb ends around a fire · Design for founders who climb · 30+ products shipped · Now taking on new climbs for 2027';
export function ticker(host, text = LINE, seconds = 46) {
  host.innerHTML = `<div class="tk-tr" style="animation-duration:${seconds}s">${Array(4).fill(`<span>${text}</span>`).join('')}</div>`;
  return { speed(s) { host.firstElementChild.style.animationDuration = s + 's'; } };
}

/* letters built from bars: one canvas per letter, sized by CSS */
export function barWord(host, letters, o = {}) {
  const O = Object.assign({ rows: 15, bar: 0.56, speed: 1, colour: '#0b0b0c', weight: 700 }, o);
  const cvs = letters.map(() => { const c = document.createElement('canvas'); host.appendChild(c); return c; });
  let rows = [], t0 = 0, raf = 0;
  function measure() {
    const R = Math.round(O.rows);
    rows = letters.map(L => {
      const W = 120, H = 154, off = document.createElement('canvas'); off.width = W; off.height = H;
      const g = off.getContext('2d'); g.textAlign = 'center'; g.font = `${O.weight} 172px 'F37 Analog', system-ui, sans-serif`; g.fillText(L, W / 2, H - 14);
      const px = g.getImageData(0, 0, W, H).data, out = [];
      for (let r = 0; r < R; r++) {
        const y = Math.round((r + .5) / R * H), runs = []; let s = -1;
        for (let x = 0; x <= W; x++) { const on = x < W && px[(y * W + x) * 4 + 3] > 110; if (on && s < 0) s = x; if (!on && s >= 0) { runs.push([s / W, x / W]); s = -1; } }
        out.push(runs);
      }
      return out;
    });
  }
  function draw(now) {
    const k = REDUCED ? 99 : (now - t0) / 1000 * O.speed; let busy = false;
    cvs.forEach((c, li) => {
      const r = c.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
      if (!r.width) return;
      if (c.width !== Math.round(r.width * dpr)) { c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr); }
      const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, r.width, r.height);
      const R = rows[li] || [], rh = r.height / R.length, pw = r.width * .86, ox = r.width * .07;
      g.fillStyle = O.colour;
      R.forEach((runs, ri) => runs.forEach(([a, b]) => {
        const t = Math.min(1, Math.max(0, (k - li * .12 - ri * .035) / .45)), e = 1 - Math.pow(1 - t, 3);
        if (t < 1) busy = true;
        if (e > 0) g.fillRect(ox + a * pw, ri * rh + rh * (1 - O.bar) / 2, (b - a) * pw * e, rh * O.bar);
      }));
    });
    raf = busy ? requestAnimationFrame(draw) : 0;
  }
  const play = () => { cancelAnimationFrame(raf); t0 = performance.now(); raf = requestAnimationFrame(draw); };
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
    measure();
    new IntersectionObserver(([e], io) => { if (e.isIntersecting) { io.disconnect(); play(); } }, { threshold: .25 }).observe(host);
    addEventListener('resize', () => { if (!raf) requestAnimationFrame(n => { t0 = -1e9; draw(n); }); });
  });
  return { O, play, remeasure() { measure(); play(); } };
}

/* the panel: per-fire controls, the page's extras, Bake */
export function panel({ title, key, config, name, fires = [], extra = '', bind }) {
  const el = document.createElement('div');
  el.id = 'tune';
  const R = (id, label, min, max, step, val, unit = '') => `<div class="row"><label>${label}<i id="v-${id}">${val}${unit}</i></label><input type="range" id="s-${id}" min="${min}" max="${max}" step="${step}" value="${val}" data-unit="${unit}"></div>`;
  const fireRows = fires.map(({ label, cfg }, i) => `<p class="tune-sub">${label || 'The fire'}</p>
    <div class="seg" id="f${i}-mode"><button data-v="dither">Dither</button><button data-v="ascii">ASCII</button></div>
    ${R(`f${i}-cell`, 'Pixel size', 3, 14, 1, cfg.cell, 'px')}${R(`f${i}-con`, 'Contrast', .6, 2.2, .01, cfg.contrast)}
    ${R(`f${i}-fl`, 'Flame height', .4, 1.7, .01, cfg.flame)}${R(`f${i}-em`, 'Embers', 0, 2, .05, cfg.embers)}
    ${R(`f${i}-sp`, 'Speed', 0, 2.5, .05, cfg.speed)}${R(`f${i}-sc`, 'Fire size', .4, 1.6, .01, cfg.scale)}`).join('');
  el.innerHTML = `<div id="tune-head"><b>${title}</b><button id="tune-hide" title="Hide (H)">–</button></div>${fireRows}${extra}${bakeControls.html}`;
  document.body.appendChild(el);
  const q = id => el.querySelector('#' + id);
  const on = (id, fn) => { const i = q('s-' + id); if (i) i.addEventListener('input', e => { const v = +e.target.value; q('v-' + id).textContent = v + e.target.dataset.unit; fn(v); }); };
  fires.forEach(({ fire: f, cfg, list }, i) => {
    const all = list || [f];
    const set = (k, v) => { cfg[k] = v; all.forEach(x => { x.K[k] = v; }); };
    const g = q(`f${i}-mode`);
    [...g.children].forEach(b => b.classList.toggle('on', b.dataset.v === (cfg.mode || 'dither')));
    g.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; [...g.children].forEach(c => c.classList.toggle('on', c === b)); set('mode', b.dataset.v); });
    on(`f${i}-cell`, v => set('cell', v)); on(`f${i}-con`, v => set('contrast', v)); on(`f${i}-fl`, v => set('flame', v));
    on(`f${i}-em`, v => set('embers', v)); on(`f${i}-sp`, v => set('speed', v)); on(`f${i}-sc`, v => { set('scale', v); all.forEach(x => x.relayout()); });
  });
  if (bind) bind(q, on, R);
  bakeControls.bind(el, key, config, name);
  q('tune-hide').addEventListener('click', () => el.classList.toggle('hidden'));
  if (window.wb && window.wb.adopt) window.wb.adopt();
  return el;
}
export const slider = (id, label, min, max, step, val, unit = '') => `<div class="row"><label>${label}<i id="v-${id}">${val}${unit}</i></label><input type="range" id="s-${id}" min="${min}" max="${max}" step="${step}" value="${val}" data-unit="${unit}"></div>`;
