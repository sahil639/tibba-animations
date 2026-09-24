/* ══════════════════════════════════════════════════════════════════════════
   The snow-peak footer page
   ─────────────────────────────────────────────────────────────────────────
   Mounts the massif behind the shared footer and puts every dial that shapes
   it in the dock. The scene is assets/snow-peak.js; this is the page.
   ═════════════════════════════════════════════════════════════════════════ */
import { createSnowPeak } from './snow-peak.js';

const $ = s => document.querySelector(s);
const stage = $('#peak-stage');
const peak = createSnowPeak({ canvas: $('#peak-canvas') });
window.tibba = { peak };

/* The canvas is as tall as the stage it sits behind, and the stage is as tall
   as the footer makes it — so the size is only known after the chrome has
   rendered. Watched rather than measured once. */
new ResizeObserver(() => {
  const h = stage.getBoundingClientRect().height;
  $('#peak-canvas').style.height = h + 'px';
}).observe(stage);

/* Parked while off screen. It is a full-screen shaded mesh; there is no
   reason for it to run while somebody is reading the top of the page. */
new IntersectionObserver(([e]) => peak.setRunning(e.isIntersecting),
  { rootMargin: '25% 0px' }).observe(stage);

/* ══════════════════════════════════════════════════════════════════════════
   CONTROLS
   ═════════════════════════════════════════════════════════════════════════ */
{
  const P = peak.P, C = peak.CAM;
  const pc = n => Math.round(n * 100);

  const el = document.createElement('div');
  el.id = 'tune';
  el.innerHTML = `
    <div id="tune-head"><b>Snow Peak</b><button id="tune-hide" title="Hide (H)">–</button></div>

    <p class="tune-sub">Sun</p>
    <div class="row"><label>Bearing<i id="v-sa">${P.sunAzim}°</i></label>
      <input type="range" id="s-sa" min="-180" max="180" value="${P.sunAzim}"></div>
    <div class="row"><label>Elevation<i id="v-se">${P.sunElev}°</i></label>
      <input type="range" id="s-se" min="-6" max="70" value="${P.sunElev}"></div>
    <div class="row"><label>Exposure<i id="v-ex">${P.exposure.toFixed(2)}</i></label>
      <input type="range" id="s-ex" min="40" max="200" value="${pc(P.exposure)}"></div>

    <p class="tune-sub">Snow</p>
    <div class="row"><label>Snow line<i id="v-sl">${P.snowLine.toFixed(2)}</i></label>
      <input type="range" id="s-sl" min="0" max="100" value="${pc(P.snowLine)}"></div>
    <div class="row"><label>Line softness<i id="v-sb">${P.snowBlend.toFixed(2)}</i></label>
      <input type="range" id="s-sb" min="1" max="60" value="${pc(P.snowBlend)}"></div>
    <div class="row"><label>Holds on slope<i id="v-ss">${P.snowSlope.toFixed(2)}</i></label>
      <input type="range" id="s-ss" min="0" max="100" value="${pc(P.snowSlope)}"></div>
    <div class="row"><label>Read slope over<i id="v-sm">${P.snowSmooth} cells</i></label>
      <input type="range" id="s-sm" min="0" max="20" value="${P.snowSmooth}"></div>

    <p class="tune-sub">Air</p>
    <div class="row"><label>Haze<i id="v-hz">${P.haze.toFixed(2)}</i></label>
      <input type="range" id="s-hz" min="0" max="200" value="${pc(P.haze)}"></div>

    <p class="tune-sub">Land</p>
    <div class="row"><label>Relief<i id="v-rl">${P.relief.toFixed(2)}</i></label>
      <input type="range" id="s-rl" min="20" max="200" value="${pc(P.relief)}"></div>
    <div class="row"><label>Ridge sharpness<i id="v-rg">${P.ridged.toFixed(2)}</i></label>
      <input type="range" id="s-rg" min="0" max="100" value="${pc(P.ridged)}"></div>
    <div class="row inline"><label>Seed<i id="v-sd">${P.seed}</i></label>
      <button id="s-new" class="tune-btn">New massif</button></div>

    <p class="tune-sub">Camera</p>
    <div class="row"><label>Height<i id="v-ce">${C.elev}°</i></label>
      <input type="range" id="s-ce" min="-4" max="60" value="${C.elev}"></div>
    <div class="row"><label>Distance<i id="v-cd">${C.dist}</i></label>
      <input type="range" id="s-cd" min="150" max="700" value="${C.dist}"></div>
    <div class="row"><label>Look height<i id="v-ct">${C.tgtY}</i></label>
      <input type="range" id="s-ct" min="-20" max="140" value="${C.tgtY}"></div>

    <p class="tune-sub">Colour</p>
    <div class="row"><label>Zenith<i></i></label>
      <input type="color" id="c-zen" value="#2f5590"></div>
    <div class="row"><label>Horizon<i></i></label>
      <input type="color" id="c-hor" value="#dfe6ee"></div>
    <div class="row"><label>Snow<i></i></label>
      <input type="color" id="c-snow" value="#f4f7fb"></div>
    <div class="row"><label>Rock<i></i></label>
      <input type="color" id="c-rock" value="#6d6a66"></div>

    <p class="tune-sub">Footer</p>
    <div class="row inline"><label>Request form<i></i></label>
      <input type="checkbox" id="f-form" checked></div>
    <div class="row inline"><label>Email line<i></i></label>
      <input type="checkbox" id="f-mail" checked></div>
    <div class="row inline"><label>Wordmark &amp; links<i></i></label>
      <input type="checkbox" id="f-base" checked></div>`;
  document.body.appendChild(el);

  const q = id => el.querySelector('#' + id);
  const deg = x => Math.round(x) + '°';
  const int = x => String(Math.round(x));
  const two = x => x.toFixed(2);

  const bind = (sid, vid, map, fmt, apply) => {
    const sl = q(sid), v = q(vid);
    sl.addEventListener('input', () => { const x = map(+sl.value); if (v) v.textContent = fmt(x); apply(x); });
  };
  /* Relief and ridge sharpness change the heightfield, so they rebuild every
     vertex and recompute normals — debounced, the way every other structural
     control in this repo is. */
  const bindSlow = (sid, vid, map, fmt, apply) => {
    const sl = q(sid), v = q(vid); let t = null;
    sl.addEventListener('input', () => {
      const x = map(+sl.value); if (v) v.textContent = fmt(x);
      clearTimeout(t); t = setTimeout(() => apply(x), 220);
    });
  };

  bind('s-sa', 'v-sa', n => n, deg, x => { P.sunAzim = x; peak.sync(); });
  bind('s-se', 'v-se', n => n, deg, x => { P.sunElev = x; peak.sync(); });
  bind('s-ex', 'v-ex', n => n / 100, two, x => { P.exposure = x; peak.sync(); });

  bind('s-sl', 'v-sl', n => n / 100, two, x => { P.snowLine = x; peak.sync(); });
  bind('s-sb', 'v-sb', n => n / 100, two, x => { P.snowBlend = x; peak.sync(); });
  bind('s-ss', 'v-ss', n => n / 100, two, x => { P.snowSlope = x; peak.sync(); });
  /* The blur radius on the normal the snow mask reads. At 0 the mask sees
     every facet and the snow breaks into speckle; wide, and it climbs the
     cliffs it should be falling off. This one rebuilds the whole field, so
     it settles rather than firing on every slider tick. */
  bindSlow('s-sm', 'v-sm', n => n, x => x + ' cells', x => { P.snowSmooth = x; peak.rebuild(); });
  bind('s-hz', 'v-hz', n => n / 100, two, x => { P.haze = x; peak.sync(); });

  bindSlow('s-rl', 'v-rl', n => n / 100, two, x => { P.relief = x; peak.rebuild(); });
  bindSlow('s-rg', 'v-rg', n => n / 100, two, x => { P.ridged = x; peak.rebuild(); });
  q('s-new').addEventListener('click', () => {
    const seed = (Math.random() * 999) | 0 || 1;
    q('v-sd').textContent = seed;
    peak.rebuild(seed);
  });

  bind('s-ce', 'v-ce', n => n, deg, x => peak.setCamera({ elev: x }));
  bind('s-cd', 'v-cd', n => n, int, x => peak.setCamera({ dist: x }));
  bind('s-ct', 'v-ct', n => n, int, x => peak.setCamera({ tgtY: x }));

  /* The sky and the land share colours on purpose — the horizon tint is both
     the top of the sky and what the aerial haze fades into, so setting it
     once keeps the two agreeing. */
  const paint = (id, ...names) => {
    q(id).addEventListener('input', e => {
      for (const n of names) {
        const u = peak.colorUniform(n);
        if (u) u.value.set(e.target.value).convertSRGBToLinear();
      }
    });
  };
  paint('c-zen',  'uZenith');
  paint('c-hor',  'uHorizon');          // sky band and haze target, together
  paint('c-snow', 'uSnow');
  paint('c-rock', 'uRockHigh');

  const hide = (id, sel) => q(id).addEventListener('change', e => {
    document.querySelectorAll(sel).forEach(n => {
      n.style.visibility = e.target.checked ? '' : 'hidden';
    });
  });
  hide('f-form', '.footer-form');
  hide('f-mail', '.footer-mail');
  hide('f-base', '.footer-base');

  q('tune-hide').addEventListener('click', () => el.classList.toggle('hidden'));
  if (window.wb && window.wb.adopt) window.wb.adopt();
}
