/* ══════════════════════════════════════════════════════════════════════════
   Active Peak — the playground's behaviour
   ─────────────────────────────────────────────────────────────────────────
   The hero's scene with the opening move taken off the front of it. Options,
   not a fork: this is the same assets/range-scene.js the home page runs, and
   anything settled here is a flag away from being settled there too. A copy
   of two thousand lines would have drifted from the original inside a week.

     ink: false        start drawn, not filled — saves a viewport of scroll
     palette: 'peak'   tibba-peak.html's ramp, which is also what stops the
                       summit rings merging into one white cap
     backdrop:'behind' the generated hills pulled in close, behind the massif
     accent            tibba-peak.html's orange rather than the site's
   ═════════════════════════════════════════════════════════════════════════ */
import { createRangeScene } from './range-scene.js';

const $ = s => document.querySelector(s);
const clamp01 = t => t < 0 ? 0 : t > 1 ? 1 : t;

const ACCENT = '#FF4B1F';          // Page 05's accent, not the site's #E85D3D

const scene = createRangeScene({
  canvas: $('#peak-canvas'),
  mode: 'hero',
  ink: false,
  palette: 'peak',
  backdrop: 'behind',
  hover: false,
  /* The peak makes room in the third state; it does not hand over. Fading it
     the way the home page does would take it to nothing here, because that
     fade compounds with the country's dimming and the haze already on it. */
  lockFade: 0.9,
});
scene.setAccent(ACCENT);
document.documentElement.style.setProperty('--accent', ACCENT);

window.tibba = { scene };

/* ══════════════════════════════════════════════════════════════════════════
   SCROLL — three states
   ─────────────────────────────────────────────────────────────────────────
     1  a plan view, straight down at 90°, the whole sheet
     2  down to the working perspective, about 30°
     3  the peak moves left, turns and shrinks, leaving the right of the frame
        for copy

   The first two are one continuous move of the same camera rather than two
   stations with a cut between them: the elevation, the distance and the swing
   are each interpolated, so the view descends out of the plan into the
   perspective the way a camera actually would. Holding a beat at each end
   means the two readings both get a moment to be looked at instead of the
   whole thing being one long slide.

   The third rides on top of the second through lockTo(), which turns, scales
   and slides the massif without touching what state it is drawn in.
   ═════════════════════════════════════════════════════════════════════════ */
const scope = $('#scope');
const cue = $('#cue');
const reserve = $('#reserve');

/* The two ends of the descent. PLAN is high and straight down; WORK is the
   station the scene is composed at. */
const PLAN = { elev: 90, dist: 248, azim: 0, tgtY: 12 };
const WORK = { elev: 30, dist: 138, azim: 6, tgtY: 17 };

const DROP_IN = 0.26, DROP_OUT = 0.60;   // plan → perspective
const LOCK_IN = 0.68, LOCK_OUT = 0.94;   // → aside

const ease = t => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;

function onScroll() {
  const travel = scope.offsetHeight - innerHeight;
  const t = travel > 0 ? clamp01(-scope.getBoundingClientRect().top / travel) : 0;

  const drop = ease(clamp01((t - DROP_IN) / (DROP_OUT - DROP_IN)));
  scene.setHeroCam({
    elev: lerp(PLAN.elev, WORK.elev, drop),
    dist: lerp(PLAN.dist, WORK.dist, drop),
    azim: lerp(PLAN.azim, WORK.azim, drop),
    tgtY: lerp(PLAN.tgtY, WORK.tgtY, drop),
  });

  const lock = clamp01((t - LOCK_IN) / (LOCK_OUT - LOCK_IN));
  scene.lockTo(lock);

  reserve.classList.toggle('on', lock > 0.22);
  reserve.setAttribute('aria-hidden', String(!(lock > 0.22)));
  cue.style.opacity = t < 0.06 ? 1 : 0;
}

addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', onScroll);
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
onScroll();

/* ══════════════════════════════════════════════════════════════════════════
   THE PANEL
   ─────────────────────────────────────────────────────────────────────────
   Built here rather than written into the markup so every control can read
   its starting value off the scene. A slider whose position is typed into the
   HTML is a second copy of a number, and the two disagree the first time
   either one changes.

   Styling is assets/tune.css, shared with every other panel in the repo — the
   markup below is only rows, labels and inputs.
   ═════════════════════════════════════════════════════════════════════════ */
{
  const cam = scene.heroCam();
  const dots = scene.dots();
  const ink = scene.ink();
  const pc = n => Math.round(n * 100);

  const el = document.createElement('div');
  el.id = 'tune';
  el.innerHTML = `
    <div id="tune-head"><b>Active Peak</b><button id="tune-hide" title="Hide (H)">–</button></div>

    <p class="tune-sub">View</p>
    <div class="seg" id="v-snap">
      <button data-v="hero" class="on">Scroll</button>
      <button data-v="top">Plan</button>
      <button data-v="side">Elevation</button>
    </div>
    <div class="row"><label>Angle<i id="v-elev">${cam.elev}°</i></label>
      <input type="range" id="s-elev" min="2" max="90" value="${cam.elev}"></div>
    <div class="row"><label>Swing<i id="v-azim">${cam.azim}°</i></label>
      <input type="range" id="s-azim" min="-60" max="60" value="${cam.azim}"></div>
    <div class="row"><label>Distance<i id="v-dist">${cam.dist}</i></label>
      <input type="range" id="s-dist" min="40" max="300" value="${cam.dist}"></div>
    <div class="row"><label>Look height<i id="v-tgty">${cam.tgtY}</i></label>
      <input type="range" id="s-tgty" min="0" max="60" value="${cam.tgtY}"></div>
    <div class="row"><label>Haze<i id="v-depth">0.22</i></label>
      <input type="range" id="s-depth" min="0" max="100" value="22"></div>

    <p class="tune-sub">Contours</p>
    <div class="row"><label>Density<i id="v-lev">${ink.levels}</i></label>
      <input type="range" id="s-lev" min="10" max="64" value="${ink.levels}"></div>
    <div class="row"><label>Line weight<i id="v-wt">${ink.weight.toFixed(2)}</i></label>
      <input type="range" id="s-wt" min="30" max="260" value="${pc(ink.weight)}"></div>
    <div class="row"><label>Sheet opacity<i id="v-op">${ink.opacity.toFixed(2)}</i></label>
      <input type="range" id="s-op" min="15" max="100" value="${pc(ink.opacity)}"></div>
    <div class="row"><label>Country opacity<i id="v-off">${ink.offPeak.toFixed(2)}</i></label>
      <input type="range" id="s-off" min="8" max="100" value="${pc(ink.offPeak)}"></div>
    <div class="row"><label>Fade start<i id="v-fade">${ink.fade.toFixed(2)}</i></label>
      <input type="range" id="s-fade" min="20" max="100" value="${pc(ink.fade)}"></div>

    <p class="tune-sub">Dotted ground</p>
    <div class="row"><label>Spacing<i id="v-dp">${dots.period.toFixed(2)}</i></label>
      <input type="range" id="s-dp" min="10" max="600" value="${pc(dots.period)}"></div>
    <div class="row"><label>Dot length<i id="v-dot">${dots.on.toFixed(2)}</i></label>
      <input type="range" id="s-dot" min="2" max="70" value="${pc(dots.on)}"></div>
    <div class="row"><label>Drift<i id="v-df">${dots.flow.toFixed(2)}</i></label>
      <input type="range" id="s-df" min="0" max="200" value="${pc(dots.flow)}"></div>

    <p class="tune-sub">Summit</p>
    <div class="row"><label>Accent<i id="v-acc">${ACCENT}</i></label>
      <input type="color" id="s-acc" value="${ACCENT.toLowerCase()}"></div>
    <div class="row"><label>Rings<i id="v-top">3</i></label>
      <input type="range" id="s-top" min="1" max="10" value="3"></div>

    <p class="tune-sub">Terrain</p>
    <div class="row inline"><label>Seed<i id="v-seed">${scene.info().seed}</i></label>
      <button id="s-reseed" class="tune-btn">New</button></div>
    <p id="tune-read"></p>`;
  document.body.appendChild(el);

  const q = id => el.querySelector('#' + id);

  /* Every slider is the same shape: read the raw value, map it, show it,
     apply it. Writing that out fourteen times is fourteen chances to show one
     number and apply another. */
  const bind = (sid, vid, map, fmt, apply) => {
    const sl = q(sid), v = q(vid);
    sl.addEventListener('input', () => {
      const x = map(+sl.value);
      v.textContent = fmt(x);
      apply(x);
    });
  };
  /* and the three that rebuild geometry are debounced, because a rebuild is
     marching squares over the whole field and a drag fires it every pixel */
  const bindSlow = (sid, vid, fmt, apply) => {
    const sl = q(sid), v = q(vid);
    let t = null;
    sl.addEventListener('input', () => {
      v.textContent = fmt(+sl.value);
      clearTimeout(t);
      t = setTimeout(() => apply(+sl.value), 240);
    });
  };

  const readout = () => {
    const c = scene.heroCam();
    q('tune-read').textContent =
      `elev ${Math.round(c.elev)}°   swing ${Math.round(c.azim)}°   ` +
      `dist ${Math.round(c.dist)}   look ${Math.round(c.tgtY)}`;
  };

  const deg = x => Math.round(x) + '°';
  const int = x => String(Math.round(x));
  const two = x => x.toFixed(2);

  bind('s-elev', 'v-elev', n => n, deg, x => { scene.setHeroCam({ elev: x }); readout(); });
  bind('s-azim', 'v-azim', n => n, deg, x => { scene.setHeroCam({ azim: x }); readout(); });
  bind('s-dist', 'v-dist', n => n, int, x => { scene.setHeroCam({ dist: x }); readout(); });
  bind('s-tgty', 'v-tgty', n => n, int, x => { scene.setHeroCam({ tgtY: x }); readout(); });
  bind('s-depth', 'v-depth', n => n / 100, two, x => scene.setDepth(x));

  bindSlow('s-lev', 'v-lev', int, x => scene.setLevels(x));
  bind('s-wt',   'v-wt',   n => n / 100, two, x => scene.setInk({ weight: x }));
  bind('s-op',   'v-op',   n => n / 100, two, x => scene.setInk({ opacity: x }));
  bind('s-off',  'v-off',  n => n / 100, two, x => scene.setInk({ offPeak: x }));
  bind('s-fade', 'v-fade', n => n / 100, two, x => scene.setInk({ fade: x }));

  bind('s-dp',  'v-dp',  n => n / 100, two, x => scene.setDots({ period: x }));
  bind('s-dot', 'v-dot', n => n / 100, two, x => scene.setDots({ on: x }));
  bind('s-df',  'v-df',  n => n / 100, two, x => scene.setDots({ flow: x }));

  bindSlow('s-top', 'v-top', int, x => scene.setAccentTop(x));

  q('s-acc').addEventListener('input', e => {
    q('v-acc').textContent = e.target.value.toUpperCase();
    document.documentElement.style.setProperty('--accent', e.target.value);
    scene.setAccent(e.target.value);
  });

  /* Light by default. The haze is what gives an oblique view its air, and it
     is what eats a plan view — from overhead every ridge but the nearest is
     at the far end of the fade and the sheet goes empty at the edges. */
  scene.setDepth(0.22);
  readout();

  /* The two survey views take the camera off the scroll and hold it, so the
     sliders stop describing where it is. Marking which one is current is the
     honest way to say so; "Scroll" hands it back. */
  q('v-snap').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    [...q('v-snap').children].forEach(c => c.classList.toggle('on', c === b));
    scene.snapView(b.dataset.v);
  });

  q('s-reseed').addEventListener('click', () => {
    const u = new URL(location.href);
    u.searchParams.set('seed', String((Math.random() * 0xFFFFFFFF) >>> 0));
    location.href = u.toString();
  });

  q('tune-hide').addEventListener('click', () => el.classList.toggle('hidden'));

  /* The dock ran its adopt() at DOMContentLoaded, before this panel existed —
     it waits on a scene a module creates. adopt() MOVES the node, so every
     listener bound above survives being re-homed. */
  if (window.wb && window.wb.adopt) window.wb.adopt();
}
