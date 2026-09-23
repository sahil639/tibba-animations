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
});
scene.setAccent(ACCENT);
document.documentElement.style.setProperty('--accent', ACCENT);

window.tibba = { scene };

/* ══════════════════════════════════════════════════════════════════════════
   SCROLL
   ─────────────────────────────────────────────────────────────────────────
   Two viewports, one move. There is no ink state to pass through, so the
   whole of the scroll is the camera coming in on the summit — and the rings
   go live once it is close enough for them to be worth pointing at.
   ═════════════════════════════════════════════════════════════════════════ */
const scope = $('#scope');
const cue = $('#cue');
const def = $('#def');
let hoverOn = null;

function onScroll() {
  const travel = scope.offsetHeight - innerHeight;
  const t = travel > 0 ? clamp01(-scope.getBoundingClientRect().top / travel) : 0;

  scene.zoomTo(t);

  const live = t > 0.3;
  if (live !== hoverOn) { hoverOn = live; scene.setHover(live); }
  def.classList.toggle('on', live);
  cue.style.opacity = t < 0.06 ? 1 : 0;
}
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', onScroll);
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
onScroll();

/* ══════════════════════════════════════════════════════════════════════════
   THE RINGS AND THE DEFINITION
   ─────────────────────────────────────────────────────────────────────────
   Hover only, no click. The three targets track the projected rings every
   frame; hovering one lifts that ring in the scene and brings its line
   forward in the card.
   ═════════════════════════════════════════════════════════════════════════ */
const hits = [0, 1, 2].map(i => $('#ring-hit-' + i));
const entries = [...document.querySelectorAll('#def .entry')];
let ringOn = -1;

hits.forEach((el, i) => {
  const enter = () => setRing(i);
  const leave = () => setRing(-1);
  el.addEventListener('pointerenter', enter);
  el.addEventListener('focus', enter);
  el.addEventListener('pointerleave', leave);
  el.addEventListener('blur', leave);
  el.setAttribute('aria-label', entries[i].querySelector('.k').textContent);
});

function setRing(i) {
  if (i === ringOn) return;
  ringOn = i;
  scene.setRingHover(i);
  entries.forEach((e, k) => e.classList.toggle('on', k === i));
}

function track() {
  requestAnimationFrame(track);
  if (!hoverOn) {
    if (hits[0].classList.contains('on')) {
      hits.forEach(el => el.classList.remove('on'));
      setRing(-1);
    }
    return;
  }
  scene.ringScreen().forEach((r, i) => {
    const el = hits[i];
    if (!r || r.behind || r.r < 4) { el.classList.remove('on'); return; }
    el.classList.add('on');
    /* larger than the ring: a contour is two pixels wide and nobody should
       have to hit that. Rings project as flat ellipses, so the target is one
       too rather than a circle that reaches well above and below the stroke. */
    const d = Math.max(40, r.r * 2 + 26);
    el.style.left = r.x + 'px';
    el.style.top = r.y + 'px';
    el.style.width = d + 'px';
    el.style.height = (d * 0.42) + 'px';
  });
}
requestAnimationFrame(track);

/* ══════════════════════════════════════════════════════════════════════════
   THE PANEL
   ─────────────────────────────────────────────────────────────────────────
   Built here rather than in the markup so it can read the scene's own
   defaults instead of restating them — a slider whose starting position is
   typed into the HTML is a second copy of a number, and the two disagree the
   first time either changes. Adopted by the dock, which MOVES it, so every
   listener bound below survives.
   ═════════════════════════════════════════════════════════════════════════ */
{
  const cam = scene.heroCam();
  const dots = scene.dots();
  const el = document.createElement('div');
  el.id = 'tune';
  el.innerHTML = `
    <div id="tune-head"><b>Active Peak</b><button id="tune-hide" title="Hide (H)">–</button></div>

    <p class="tune-sub">VIEW</p>
    <div class="seg" id="v-snap">
      <button data-v="hero" class="on">Hero</button>
      <button data-v="top">Plan</button>
      <button data-v="side">Elevation</button>
    </div>

    <div class="row"><label>Angle<i id="v-elev">${cam.elev}°</i></label>
      <input type="range" id="s-elev" min="2" max="90" value="${cam.elev}"></div>
    <div class="row"><label>Swing<i id="v-azim">${cam.azim}°</i></label>
      <input type="range" id="s-azim" min="-60" max="60" value="${cam.azim}"></div>
    <div class="row"><label>Distance<i id="v-dist">${cam.dist}</i></label>
      <input type="range" id="s-dist" min="40" max="260" value="${cam.dist}"></div>
    <div class="row"><label>Depth<i id="v-depth">0.22</i></label>
      <input type="range" id="s-depth" min="0" max="100" value="22"></div>

    <p class="tune-sub">SUMMIT RINGS</p>
    <div class="row"><label>Accent<i id="v-acc">${ACCENT}</i></label>
      <input type="color" id="s-acc" value="${ACCENT.toLowerCase()}"></div>
    <div class="row"><label>Rings<i id="v-top">3</i></label>
      <input type="range" id="s-top" min="1" max="8" value="3"></div>

    <p class="tune-sub">DOTTED CONTOURS</p>
    <div class="row"><label>Spacing<i id="v-dp">${dots.period.toFixed(2)}</i></label>
      <input type="range" id="s-dp" min="10" max="600" value="${Math.round(dots.period * 100)}"></div>
    <div class="row"><label>Dot length<i id="v-dot">${dots.on.toFixed(2)}</i></label>
      <input type="range" id="s-dot" min="2" max="70" value="${Math.round(dots.on * 100)}"></div>
    <div class="row"><label>Drift<i id="v-df">${dots.flow.toFixed(2)}</i></label>
      <input type="range" id="s-df" min="0" max="200" value="${Math.round(dots.flow * 100)}"></div>

    <p class="tune-sub">TERRAIN</p>
    <div class="row"><label>Seed<i id="v-seed">${scene.info().seed}</i></label>
      <button id="s-reseed" class="tune-btn">New country</button></div>
    <p id="tune-read"></p>`;
  document.body.appendChild(el);

  const q = id => el.querySelector('#' + id);
  const bind = (sid, vid, map, fmt, apply) => {
    const s = q(sid), v = q(vid);
    s.addEventListener('input', () => { const x = map(+s.value); v.textContent = fmt(x); apply(x); });
  };

  /* ── the camera ─────────────────────────────────────────────────────── */
  const readout = () => {
    const c = scene.heroCam();
    q('tune-read').textContent =
      `elev ${c.elev}°  swing ${c.azim}°  dist ${c.dist}  look ${c.tgtY}`;
  };
  bind('s-elev', 'v-elev', n => n, x => x + '°', x => { scene.setHeroCam({ elev: x }); readout(); });
  bind('s-azim', 'v-azim', n => n, x => x + '°', x => { scene.setHeroCam({ azim: x }); readout(); });
  bind('s-dist', 'v-dist', n => n, x => String(x),     x => { scene.setHeroCam({ dist: x }); readout(); });
  bind('s-depth', 'v-depth', n => n / 100, x => x.toFixed(2), x => scene.setDepth(x));
  /* Light by default. The haze is what gives an oblique view its air, and it
     is what eats a plan view — from overhead every ridge but the nearest is
     at the far end of the fade, and the sheet goes empty at the edges. */
  scene.setDepth(0.22);
  readout();

  /* The snap views take the camera off the sliders, so the sliders stop
     describing where it is. Marking which view is current is the honest way
     to say so — the alternative is three numbers that quietly lie. */
  q('v-snap').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    [...q('v-snap').children].forEach(c => c.classList.toggle('on', c === b));
    scene.snapView(b.dataset.v);
  });

  /* ── the rings ──────────────────────────────────────────────────────── */
  q('s-acc').addEventListener('input', e => {
    q('v-acc').textContent = e.target.value.toUpperCase();
    document.documentElement.style.setProperty('--accent', e.target.value);
    scene.setAccent(e.target.value);
  });
  let topT = null;
  q('s-top').addEventListener('input', e => {
    q('v-top').textContent = e.target.value;
    clearTimeout(topT);
    topT = setTimeout(() => scene.setAccentTop(+e.target.value), 240);
  });

  /* ── the dotted contours ────────────────────────────────────────────── */
  bind('s-dp',  'v-dp',  n => n / 100, x => x.toFixed(2), x => scene.setDots({ period: x }));
  bind('s-dot', 'v-dot', n => n / 100, x => x.toFixed(2), x => scene.setDots({ on: x }));
  bind('s-df',  'v-df',  n => n / 100, x => x.toFixed(2), x => scene.setDots({ flow: x }));
  /* No "how many rings are dotted" control here. On this page what is dotted
     is decided by whether a contour is out on the open ground, not by which
     level it sits at — a slider counting levels would be wired to nothing. */

  q('s-reseed').addEventListener('click', () => {
    const u = new URL(location.href);
    u.searchParams.set('seed', String((Math.random() * 0xFFFFFFFF) >>> 0));
    location.href = u.toString();
  });

  q('tune-hide').addEventListener('click', () => el.classList.toggle('hidden'));
  if (window.wb && window.wb.adopt) window.wb.adopt();
}
