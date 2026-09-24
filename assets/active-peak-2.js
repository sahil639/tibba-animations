/* ══════════════════════════════════════════════════════════════════════════
   Active Peak 2 — the same scene, with the ink
   ─────────────────────────────────────────────────────────────────────────
   Active Peak with the redraw put back on the front of it. The first state is
   the peak as a lit, shaded surface — the blue gradient mesh the hero opened
   on before the ink was taken out — and it is redrawn into contour line as
   the scroll descends from the plan into the working perspective. By the time
   the massif moves aside in the third state it is the same drawing the other
   page starts at.

   Everything else is shared with Active Peak: one scene module, one panel
   design, the same three-station camera table. What this page adds is the
   morph and the controls for it.

   ── why the ink rides the descent rather than sitting between states ──────
   The redraw is a plane travelling down through the mountain. Running it
   while the camera is also descending means the two moves resolve together
   and the peak arrives at the perspective already drawn; running it as its
   own scroll band would spend a viewport on a transition that is more
   interesting when something else is happening at the same time.
   ═════════════════════════════════════════════════════════════════════════ */
import { createRangeScene } from './range-scene.js';

const $ = s => document.querySelector(s);
const clamp01 = t => t < 0 ? 0 : t > 1 ? 1 : t;

const ACCENT = '#FF4B1F';          // Page 05's accent, not the site's #E85D3D

const scene = createRangeScene({
  canvas: $('#peak-canvas'),
  mode: 'hero',
  /* the redraw is the point of this page */
  ink: true,
  /* The range's own ramp, not tibba-peak's. This page shows the SURFACE for
     the whole of its first state, and the peak ramp was chosen for line work
     — on a lit solid it washes the whole massif out to near white. */
  palette: 'range',
  backdrop: 'behind',
  hover: true,          // the ridge highlight; the scroll decides when it is live
  /* The peak makes room in the third state; it does not hand over. Fading it
     the way the home page does would take it to nothing here, because that
     fade compounds with the country's dimming and the haze already on it. */
  lockFade: 0.9,
});
scene.setAccent(ACCENT);
document.documentElement.style.setProperty('--accent', ACCENT);

window.tibba = { scene };

/* ══════════════════════════════════════════════════════════════════════════
   SCROLL — three stations
   ─────────────────────────────────────────────────────────────────────────
   Each state is a full camera station rather than a couple of numbers with
   the rest inherited: angle, swing, distance, and where the massif sits in
   the frame on both axes. The scroll interpolates between them.

   Held as a table because that is what makes them tunable. With the states
   written into the scroll handler, "move the peak left in the third section"
   means finding the line that does it; as a table the panel can edit any
   field of any state and the same interpolation carries it.

   ── why placement is a camera target and not an offset ────────────────────
   X and Y here move what the camera LOOKS AT, not the mountain. Sliding the
   mesh instead slides it through its own aerial fade and its own ground
   plane, so it gets hazier as it moves left and eventually walks off the
   edge of the terrain; moving the look-at point keeps the whole scene intact
   and just re-frames it. It is also the only version that composes with the
   third state's turn and scale without fighting them.
   ═════════════════════════════════════════════════════════════════════════ */
const scope = $('#scope');
const cue = $('#cue');
const reserve = $('#reserve');

const STATES = [
  /* 1 — the plan. Straight down, high, centred. */
  { name: 'Plan',        elev: 90, azim:  0, dist: 248, x:  0, y: 12 },
  /* 2 — the working perspective. */
  { name: 'Perspective', elev: 30, azim:  6, dist: 138, x:  2, y: 17 },
  /* 3 — aside, leaving the right of the frame for copy. The camera looks to
     the RIGHT of the massif, which is what puts the massif on the left. */
  { name: 'Aside',       elev: 26, azim: 14, dist: 150, x: 46, y: 20 },
];

/* Where each state sits along the scroll, and how much of the travel between
   them is spent moving rather than holding. The hold is what gives a state
   time to be read; without it the whole page is one continuous slide and no
   state is ever actually shown.

   It sits at the END of a leg only. Holding both ends put two of them back to
   back around the middle state — 0.13 of the leg before it and 0.13 after —
   which on a 1843px scroll is 257px, a quarter of a viewport, where the wheel
   turns and the mountain does not move at all. That does not read as a beat,
   it reads as the page having stalled. Arrival-only means a scroll always
   moves something on the frame it arrives, and the state still settles before
   the next leg takes over. */
const MOVE = { hold: 0.10 };

/* The redraw's own window inside the first leg, and how it is shaped.
   `bias` above 1 holds the fill longer and then drains it quickly; below 1
   starts draining at once and eases into the finish. */
const INK = { start: 0.10, end: 0.86, ease: 'smooth', bias: 1.0 };

/* The third state also turns and shrinks the massif, which the camera cannot
   do — that is lockTo() on the scene. It runs across the last leg. */
const LOCK_FROM = 1;

const ease = t => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;

function stateAt(t) {
  /* which leg of the journey, and how far along it */
  const legs = STATES.length - 1;
  const span = 1 / legs;
  const leg = Math.min(legs - 1, Math.floor(t / span));
  const raw = (t - leg * span) / span;

  /* the hold: the move runs from the top of the leg and is finished with the
     last slice of it to spare, so it has arrived before the next one starts */
  const h = MOVE.hold;
  const k = ease(clamp01(raw / Math.max(1e-4, 1 - h)));

  const A = STATES[leg], B = STATES[leg + 1];
  return {
    leg, k,
    cam: {
      elev: lerp(A.elev, B.elev, k),
      azim: lerp(A.azim, B.azim, k),
      dist: lerp(A.dist, B.dist, k),
      tgtX: lerp(A.x, B.x, k),
      tgtY: lerp(A.y, B.y, k),
    },
  };
}

function onScroll() {
  const travel = scope.offsetHeight - innerHeight;
  const t = travel > 0 ? clamp01(-scope.getBoundingClientRect().top / travel) : 0;

  const st = stateAt(t);
  scene.setHeroCam(st.cam);

  /* ── the ink ──────────────────────────────────────────────────────────
     Across the first leg — plan into perspective — with its own window
     inside it, so the redraw can start after the camera has begun moving and
     finish before it lands. INK.start and INK.end are fractions of that leg,
     which is what makes them meaningful to drag: 0 to 1 is "the whole
     descent", 0.3 to 0.8 is "begin once it is underway, be done before it
     settles". */
  const legK = st.leg === 0 ? st.k : 1;
  const raw = clamp01((legK - INK.start) / Math.max(1e-4, INK.end - INK.start));
  scene.setHeroMorph(INK.ease === 'linear' ? raw : ease(raw) ** INK.bias);

  /* the turn and the scale, only on the last leg */
  const lock = st.leg >= LOCK_FROM ? st.k : 0;
  scene.lockTo(lock);

  /* The ridge hover is worth having once there is a ridge to point at — in
     the plan view the whole sheet is one flat drawing and a highlight band
     across it means nothing. */
  scene.setHover(st.leg >= 1 || st.k > 0.5);

  reserve.classList.toggle('on', lock > 0.22);
  reserve.setAttribute('aria-hidden', String(!(lock > 0.22)));
  cue.style.opacity = t < 0.06 ? 1 : 0;

  if (window.__apReadout) window.__apReadout(st, t);
}

addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', onScroll);
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
onScroll();

/* ══════════════════════════════════════════════════════════════════════════
   THE PANEL
   ─────────────────────────────────────────────────────────────────────────
   Every control reads its starting value off the scene or off the state
   table, never from a number typed into the markup — a slider whose position
   is written twice disagrees with itself the first time either copy moves.

   The camera group edits ONE STATE AT A TIME, chosen by the segment at the
   top of it. That is the only way three stations fit in a panel without
   fifteen sliders: the fields are the same five for each, so the segment
   swaps which row of the table they are bound to and the sliders re-read.
   Styling is assets/tune.css, shared with every other panel here.
   ═════════════════════════════════════════════════════════════════════════ */
{
  const ink = scene.ink();
  const dots = scene.dots();
  const pc = n => Math.round(n * 100);

  const el = document.createElement('div');
  el.id = 'tune';
  el.innerHTML = `
    <div id="tune-head"><b>Active Peak 2</b><button id="tune-hide" title="Hide (H)">–</button></div>

    <p class="tune-sub">Scroll state</p>
    <div class="seg" id="v-state">
      ${STATES.map((s2, i) => `<button data-i="${i}"${i ? '' : ' class="on"'}>${s2.name}</button>`).join('')}
    </div>
    <div class="row"><label>Angle<i id="v-elev"></i></label>
      <input type="range" id="s-elev" min="2" max="90"></div>
    <div class="row"><label>Swing<i id="v-azim"></i></label>
      <input type="range" id="s-azim" min="-60" max="60"></div>
    <div class="row"><label>Distance<i id="v-dist"></i></label>
      <input type="range" id="s-dist" min="40" max="320"></div>
    <div class="row"><label>Placement X<i id="v-tx"></i></label>
      <input type="range" id="s-tx" min="-90" max="90"></div>
    <div class="row"><label>Placement Y<i id="v-ty"></i></label>
      <input type="range" id="s-ty" min="-10" max="70"></div>
    <div class="row"><label>Hold<i id="v-hold">${MOVE.hold.toFixed(2)}</i></label>
      <input type="range" id="s-hold" min="0" max="40" value="${pc(MOVE.hold)}"></div>

    <p class="tune-sub">Ink transition</p>
    <div class="row"><label>Starts at<i id="v-is">${INK.start.toFixed(2)}</i></label>
      <input type="range" id="s-is" min="0" max="90" value="${pc(INK.start)}"></div>
    <div class="row"><label>Done by<i id="v-ie">${INK.end.toFixed(2)}</i></label>
      <input type="range" id="s-ie" min="10" max="100" value="${pc(INK.end)}"></div>
    <div class="row"><label>Bias<i id="v-ib">${INK.bias.toFixed(2)}</i></label>
      <input type="range" id="s-ib" min="30" max="300" value="${pc(INK.bias)}"></div>
    <div class="seg" id="v-ink">
      <button data-m="0" class="on">Sweep</button>
      <button data-m="1">Ink</button>
      <button data-m="2">Fade</button>
    </div>
    <div class="row"><label>Easing<i id="v-iz"></i></label>
      <input type="range" id="s-iz" min="0" max="1" value="1"></div>

    <p class="tune-sub">Depth</p>
    <div class="row"><label>Haze<i id="v-depth">0.22</i></label>
      <input type="range" id="s-depth" min="0" max="100" value="22"></div>
    <div class="row"><label>Depth opacity<i id="v-dop">${ink.depthOp.toFixed(2)}</i></label>
      <input type="range" id="s-dop" min="0" max="100" value="${pc(ink.depthOp)}"></div>
    <div class="row"><label>Country opacity<i id="v-off">${ink.offPeak.toFixed(2)}</i></label>
      <input type="range" id="s-off" min="8" max="100" value="${pc(ink.offPeak)}"></div>
    <div class="row"><label>Fade start<i id="v-fade">${ink.fade.toFixed(2)}</i></label>
      <input type="range" id="s-fade" min="20" max="100" value="${pc(ink.fade)}"></div>

    <p class="tune-sub">Ridge hover</p>
    <div class="row"><label>Reach<i id="v-hr">60</i></label>
      <input type="range" id="s-hr" min="10" max="160" value="60"></div>
    <div class="row"><label>Band<i id="v-hb">2.8</i></label>
      <input type="range" id="s-hb" min="5" max="120" value="28"></div>
    <div class="row"><label>Strength<i id="v-hs">1.00</i></label>
      <input type="range" id="s-hs" min="0" max="200" value="100"></div>
    <div class="row"><label>Ease<i id="v-he">9.0</i></label>
      <input type="range" id="s-he" min="10" max="260" value="90"></div>

    <p class="tune-sub">Contours</p>
    <div class="row"><label>Density<i id="v-lev">${ink.levels}</i></label>
      <input type="range" id="s-lev" min="10" max="64" value="${ink.levels}"></div>
    <div class="row"><label>Line weight<i id="v-wt">${ink.weight.toFixed(2)}</i></label>
      <input type="range" id="s-wt" min="30" max="260" value="${pc(ink.weight)}"></div>
    <div class="row"><label>Sheet opacity<i id="v-op">${ink.opacity.toFixed(2)}</i></label>
      <input type="range" id="s-op" min="15" max="100" value="${pc(ink.opacity)}"></div>

    <p class="tune-sub">Low ground</p>
    <div class="row"><label>Flatten<i id="v-lf">${scene.lowland().flat.toFixed(2)}</i></label>
      <input type="range" id="s-lf" min="0" max="90" value="${pc(scene.lowland().flat)}"></div>
    <div class="row"><label>Up to<i id="v-ll">${Math.round(scene.lowland().upTo)}</i></label>
      <input type="range" id="s-ll" min="4" max="60" value="${Math.round(scene.lowland().upTo)}"></div>
    <div class="row"><label>Dot spacing<i id="v-dp">${dots.period.toFixed(2)}</i></label>
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
  const deg = x => Math.round(x) + '°';
  const int = x => String(Math.round(x));
  const two = x => x.toFixed(2);

  const bind = (sid, vid, map, fmt, apply) => {
    const sl = q(sid), v = q(vid);
    sl.addEventListener('input', () => {
      const x = map(+sl.value); v.textContent = fmt(x); apply(x);
    });
  };
  /* the three that rebuild geometry are debounced — a rebuild is marching
     squares over the whole field and a drag fires it every pixel */
  const bindSlow = (sid, vid, map, fmt, apply) => {
    const sl = q(sid), v = q(vid); let t = null;
    sl.addEventListener('input', () => {
      const x = map(+sl.value); v.textContent = fmt(x);
      clearTimeout(t); t = setTimeout(() => apply(x), 260);
    });
  };

  /* ── the camera states ───────────────────────────────────────────────── */
  let editing = 0;
  const FIELDS = [
    ['s-elev', 'v-elev', 'elev', deg],
    ['s-azim', 'v-azim', 'azim', deg],
    ['s-dist', 'v-dist', 'dist', int],
    ['s-tx',   'v-tx',   'x',    int],
    ['s-ty',   'v-ty',   'y',    int],
  ];

  function loadState() {
    const st = STATES[editing];
    for (const [sid, vid, key, fmt] of FIELDS) {
      q(sid).value = st[key];
      q(vid).textContent = fmt(st[key]);
    }
  }
  for (const [sid, vid, key, fmt] of FIELDS) {
    q(sid).addEventListener('input', e => {
      STATES[editing][key] = +e.target.value;
      q(vid).textContent = fmt(+e.target.value);
      onScroll();                 // re-evaluate at the current scroll position
    });
  }
  q('v-state').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    [...q('v-state').children].forEach(c => c.classList.toggle('on', c === b));
    editing = +b.dataset.i;
    loadState();
  });
  loadState();

  bind('s-hold', 'v-hold', n => n / 100, two, x => { MOVE.hold = x; onScroll(); });

  /* ── the ink ─────────────────────────────────────────────────────────
     start and end are clamped against each other: a window whose end is
     before its start divides by a negative and the redraw runs backwards. */
  bind('s-is', 'v-is', n => n / 100, two, x => { INK.start = Math.min(x, INK.end - 0.05); onScroll(); });
  bind('s-ie', 'v-ie', n => n / 100, two, x => { INK.end = Math.max(x, INK.start + 0.05); onScroll(); });
  bind('s-ib', 'v-ib', n => n / 100, two, x => { INK.bias = x; onScroll(); });
  q('s-iz').addEventListener('input', e => {
    INK.ease = e.target.value === '1' ? 'smooth' : 'linear';
    q('v-iz').textContent = INK.ease;
    onScroll();
  });
  q('v-iz').textContent = INK.ease;
  q('v-ink').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    [...q('v-ink').children].forEach(c => c.classList.toggle('on', c === b));
    scene.setInkMode(+b.dataset.m);
  });

  /* ── depth ───────────────────────────────────────────────────────────── */
  bind('s-depth', 'v-depth', n => n / 100, two, x => scene.setDepth(x));
  bind('s-dop',   'v-dop',   n => n / 100, two, x => scene.setInk({ depthOp: x }));
  bind('s-off',   'v-off',   n => n / 100, two, x => scene.setInk({ offPeak: x }));
  bind('s-fade',  'v-fade',  n => n / 100, two, x => scene.setInk({ fade: x }));

  /* ── the ridge hover ─────────────────────────────────────────────────── */
  bind('s-hr', 'v-hr', n => n,       int, x => scene.setHoverStyle({ radius: x }));
  bind('s-hb', 'v-hb', n => n / 10,  two, x => scene.setHoverStyle({ band: x }));
  bind('s-hs', 'v-hs', n => n / 100, two, x => scene.setHoverStyle({ strength: x }));
  bind('s-he', 'v-he', n => n / 10,  x => x.toFixed(1), x => scene.setHoverStyle({ ease: x }));

  /* ── contours ────────────────────────────────────────────────────────── */
  bindSlow('s-lev', 'v-lev', n => n, int, x => scene.setLevels(x));
  bind('s-wt', 'v-wt', n => n / 100, two, x => scene.setInk({ weight: x }));
  bind('s-op', 'v-op', n => n / 100, two, x => scene.setInk({ opacity: x }));

  /* ── the low ground ──────────────────────────────────────────────────── */
  bindSlow('s-lf', 'v-lf', n => n / 100, two, x => scene.setLowland({ flat: x }));
  bindSlow('s-ll', 'v-ll', n => n,       int, x => scene.setLowland({ upTo: x }));
  bind('s-dp',  'v-dp',  n => n / 100, two, x => scene.setDots({ period: x }));
  bind('s-dot', 'v-dot', n => n / 100, two, x => scene.setDots({ on: x }));
  bind('s-df',  'v-df',  n => n / 100, two, x => scene.setDots({ flow: x }));

  /* ── summit ──────────────────────────────────────────────────────────── */
  bindSlow('s-top', 'v-top', n => n, int, x => scene.setAccentTop(x));
  q('s-acc').addEventListener('input', e => {
    q('v-acc').textContent = e.target.value.toUpperCase();
    document.documentElement.style.setProperty('--accent', e.target.value);
    scene.setAccent(e.target.value);
  });

  q('s-reseed').addEventListener('click', () => {
    const u = new URL(location.href);
    u.searchParams.set('seed', String((Math.random() * 0xFFFFFFFF) >>> 0));
    location.href = u.toString();
  });

  /* The readout says which state the scroll is in and how far through the
     move — the sliders edit a state that may not be the one on screen, and
     without this there is no way to tell which you are looking at. */
  window.__apReadout = (st, t) => {
    const a = STATES[st.leg], b = STATES[st.leg + 1];
    q('tune-read').textContent =
      `${a.name} → ${b.name}   ${Math.round(st.k * 100)}%` +
      `   ·   scroll ${Math.round(t * 100)}%`;
  };

  scene.setDepth(0.22);
  q('tune-hide').addEventListener('click', () => el.classList.toggle('hidden'));
  if (window.wb && window.wb.adopt) window.wb.adopt();

  onScroll();
}
