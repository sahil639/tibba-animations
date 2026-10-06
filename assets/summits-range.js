/* ══════════════════════════════════════════════════════════════════════════
   Our summits — Range, in the Active Peak language
   ─────────────────────────────────────────────────────────────────────────
   Two pages run this file: summits-range.html (the copy in one editorial
   column, the Active Peak reserve made real) and summits-range-l2.html (the
   copy split into four containers stacked up the right flank of the peak).
   Which one is decided by <body data-layout>, and that is the only fork —
   the scene, the scroll, the trail and the rail are the same code.

   ── the scene ─────────────────────────────────────────────────────────────
   Exactly the Active Peak hero: the same createRangeScene options, the same
   three camera stations, the same arrival-only hold, the same lock into the
   aside state. What this page adds is what happens after the peak has made
   room — four case studies, one scroll band each — and the summit trail.

   ── the scroll ────────────────────────────────────────────────────────────
     0.00 – CAM_END    the Active Peak journey: plan → perspective → aside
     CAM_END – 1.00    four equal bands, one per summit, the camera drifting
                       a few degrees round and a little higher each time, the
                       way a walker sees more of the mountain as they climb

   Everything is a scrub, so scrolling back runs it in reverse. The trail is
   the one exception: it is a timed draw, fired when the perspective station
   arrives, because a route that crawls up the face only while the wheel is
   turning reads as being dragged rather than walked.
   ═════════════════════════════════════════════════════════════════════════ */
import { createRangeScene } from './range-scene.js';
import { createPeakTrail } from './peak-trail.js';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const clamp01 = t => t < 0 ? 0 : t > 1 ? 1 : t;
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t * t * (3 - 2 * t);
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

const LAYOUT = document.body.dataset.layout || 'column';
const ACCENT = '#FF4B1F';

/* ══════════════════════════════════════════════════════════════════════════
   DATA — the four summits, in PROJECT_PEAKS order
   ═════════════════════════════════════════════════════════════════════════ */
const CASES = [
  { name: 'Groww', colour: '#4DD9C0', file: 'case-groww.html', years: '2024 — Present',
    tags: ['Mobile app', 'Website', 'Fintech', 'Growth'],
    title: 'How we helped Groww <span class="hi">boost engagement</span> on their app',
    body: 'A deep engagement with Groww to design and improve features that engage users on their consumer app, along with design support for other product initiatives.' },
  { name: 'Firstpost', colour: '#E05555', file: 'case-firstpost.html', years: '2023',
    tags: ['App design', 'News & media', 'Website'],
    title: 'How we helped Firstpost <span class="hi">2x their traffic</span> through a strategic redesign',
    body: "A design overhaul of Firstpost's website and the creation of their first mobile app, with a significant pivot for their business and content strategy." },
  { name: 'Breathe ESG', colour: '#4CAF70', file: 'case-breathe-esg.html', years: '2023',
    tags: ['Dashboard', 'SaaS', 'ESG', 'Design sprints'],
    title: 'How we helped Breathe ESG <span class="hi">accelerate sales</span>, streamline releases and elevate customer experience',
    body: "An MVP to v1 redesign of Breathe ESG's SaaS platform, to make it easier for companies to track their ESG metrics and regulatory compliance." },
  { name: 'Shyft & Mindhouse', colour: '#7B8FF5', file: 'case-shyft-mindhouse.html', years: '2023',
    tags: ['Mobile app', 'Website', 'Fitness', 'Mental health'],
    title: 'How we helped Shyft &amp; Mindhouse <span class="hi">grow their business</span> and supercharge product led growth',
    body: 'Conceptualising and designing a therapy experience, alongside redesigning their websites and apps to impact revenue.' },
];
const N = CASES.length;
const pad = i => String(i + 1).padStart(2, '0');

/* ══════════════════════════════════════════════════════════════════════════
   THE SCENE — Active Peak, option for option
   ═════════════════════════════════════════════════════════════════════════ */
const stage = $('#stage');
const scene = createRangeScene({
  canvas: $('#peak-canvas'),
  mode: 'hero',
  ink: false,
  palette: 'peak',
  backdrop: 'behind',
  hover: true,
  lockFade: 0.9,
});
scene.setAccent(ACCENT);
scene.setDepth(0.22);
document.documentElement.style.setProperty('--accent', ACCENT);

const trail = createPeakTrail(scene, { host: stage, color: ACCENT });
window.tibba = { scene, trail };

/* ══════════════════════════════════════════════════════════════════════════
   SCROLL
   ═════════════════════════════════════════════════════════════════════════ */
const STATES = [
  { name: 'Plan',        elev: 90, azim:  0, dist: 248, x:  0, y: 12 },
  { name: 'Perspective', elev: 30, azim:  6, dist: 138, x:  2, y: 17 },
  { name: 'Aside',       elev: 26, azim: 14, dist: 150, x: 46, y: 20 },
];
const MOVE = { hold: 0.10 };
/* the share of the scroll spent on the Active Peak journey before the first
   summit's copy takes over */
const CAM_END = 0.30;
/* how far the camera drifts over the four bands: a few degrees round the
   peak and a little higher, never enough to lose the aside framing */
const DRIFT = { azim: 10, elev: 5, y: 4, dist: -10 };

function stateAt(t) {
  const legs = STATES.length - 1, span = 1 / legs;
  const leg = Math.min(legs - 1, Math.floor(t / span));
  const raw = (t - leg * span) / span;
  const k = ease(clamp01(raw / Math.max(1e-4, 1 - MOVE.hold)));
  const A = STATES[leg], B = STATES[leg + 1];
  return {
    leg, k,
    cam: {
      elev: lerp(A.elev, B.elev, k), azim: lerp(A.azim, B.azim, k),
      dist: lerp(A.dist, B.dist, k), tgtX: lerp(A.x, B.x, k), tgtY: lerp(A.y, B.y, k),
    },
  };
}

const scope = $('#scope');
const intro = $('#intro');
const cue = $('#cue');
const rail = $('#rail');

let active = -1;           // which summit's copy is up
let bandT = 0;             // 0..N across the four bands, continuous
let trailArmed = true;     // the draw fires once per arrival
let caseProg = new Array(N).fill(0);   // per-card entry, target
let t = 0;

function onScroll() {
  const travel = scope.offsetHeight - innerHeight;
  t = travel > 0 ? clamp01(-scope.getBoundingClientRect().top / travel) : 0;

  const camT = clamp01(t / CAM_END);
  const st = stateAt(camT);

  /* the bands, and the drift across them */
  bandT = clamp01((t - CAM_END) / (1 - CAM_END)) * N;
  const d = ease(clamp01(bandT / N));
  const cam = { ...st.cam };
  if (camT >= 1) {
    cam.azim += DRIFT.azim * d; cam.elev += DRIFT.elev * d;
    cam.tgtY += DRIFT.y * d; cam.dist += DRIFT.dist * d;
  }
  const lock = st.leg >= 1 ? st.k : 0;
  /* On a narrow window there is no right-hand column to make room for — the
     copy sits under the peak — so the aside offset (the station's own x and
     the lock's slide, 46 units each) is taken back out and the peak is
     lifted into the top half instead. */
  if (innerWidth <= 820) {
    cam.tgtX = cam.tgtX * 0.1 - 46 * ease(lock);
    cam.tgtY -= 14 * ease(lock);
  }
  scene.setHeroCam(cam);

  scene.lockTo(lock);
  scene.setHover(st.leg >= 1 || st.k > 0.5);

  /* the intro belongs to the plan view, and is gone before the peak turns */
  const introOut = clamp01(camT / 0.34);
  intro.style.opacity = String(1 - introOut);
  intro.style.transform = `translate3d(0, ${(-introOut * 24).toFixed(1)}px, 0)`;
  intro.style.visibility = introOut >= 1 ? 'hidden' : '';
  cue.style.opacity = t < 0.03 ? 1 : 0;

  /* The trail: drawn when the perspective station arrives — the first frame
     the face is steep enough for switchbacks to read as switchbacks — and
     taken back down if the page returns to the plan. */
  if (trailOn) {
    if (camT > 0.36 && trailArmed) { trailArmed = false; trail.play(); }
    else if (camT < 0.12 && !trailArmed) { trailArmed = true; trail.retract(); }
  }

  /* which summit */
  const inCases = camT >= 1 && lock > 0.9;
  const idx = inCases ? Math.min(N - 1, Math.floor(bandT)) : -1;
  if (idx !== active) setActive(idx);
  document.body.classList.toggle('in-cases', inCases);

  /* per-card entry for the second layout: the first 45% of each band */
  for (let i = 0; i < N; i++) caseProg[i] = camT >= 1 ? clamp01((bandT - i) / 0.45) : 0;
  const within = idx >= 0 ? clamp01(bandT - idx) : 0;
  stage.style.setProperty('--band', within.toFixed(3));
}

/* ══════════════════════════════════════════════════════════════════════════
   THE RAIL — one tick per summit, clickable
   ═════════════════════════════════════════════════════════════════════════ */
rail.innerHTML = CASES.map((c, i) =>
  `<button type="button" data-i="${i}" style="--c:${c.colour}" aria-label="${c.name}">
     <span class="lbl">${pad(i)} ${c.name}</span><span class="tick"></span>
   </button>`).join('');
rail.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  jumpTo(+b.dataset.i);
});
function jumpTo(i) {
  const travel = scope.offsetHeight - innerHeight;
  const tt = CAM_END + (1 - CAM_END) * ((i + 0.5) / N);
  scrollTo({ top: scope.offsetTop + travel * tt, behavior: REDUCED ? 'auto' : 'smooth' });
}
addEventListener('keydown', e => {
  if (e.target.closest('input, textarea, select')) return;
  if (e.key === 't' || e.key === 'T') setTrail(!trailOn);
});

/* ══════════════════════════════════════════════════════════════════════════
   THE COPY — two layouts
   ═════════════════════════════════════════════════════════════════════════ */
const casesEl = $('#cases');

function tagsHTML(c) { return c.tags.map(x => `<span>${x}</span>`).join(''); }

if (LAYOUT === 'column') {
  /* One slot, the Active Peak reserve's own design, with the copy swapped in
     place. The name rises out of a mask and the rest follows it. */
  casesEl.innerHTML = `
    <div class="slot" aria-live="polite">
      <span class="k"><b id="c-idx">01 / 04</b><em id="c-years"></em></span>
      <h2 class="t"><span class="mask"><span id="c-title"></span></span></h2>
      <p class="tags" id="c-tags"></p>
      <p class="body" id="c-body"></p>
      <a class="go" id="c-go" href="#"><span>View project</span><i></i></a>
      <div class="prog"><i></i></div>
    </div>`;
} else {
  /* Four containers, climbing the flank: the first summit's card at the
     bottom, the last one's up by the top, each with its own entrance. */
  const FX = ['wipe', 'fold', 'focus', 'draw'];
  casesEl.innerHTML = CASES.map((c, i) => `
    <article class="card" data-i="${i}" data-fx="${FX[i]}" style="--c:${c.colour}">
      <svg class="frame" preserveAspectRatio="none" aria-hidden="true"><rect x=".5" y=".5" pathLength="1"/></svg>
      <div class="in">
        <span class="k l1"><b>${pad(i)} / ${pad(N - 1)}</b><em>${c.name} · ${c.years}</em></span>
        <h3 class="t l2">${c.title}</h3>
        <p class="tags l3">${tagsHTML(c)}</p>
        <div class="more"><div><p class="body">${c.body}</p>
          <a class="go" href="${c.file}"><span>View project</span><i></i></a></div></div>
      </div>
      <span class="pin" aria-hidden="true"></span>
    </article>`).join('');
}
const cards = $$('.card');

function setActive(i) {
  const prev = active;
  active = i;
  [...rail.children].forEach((b, k) => b.setAttribute('aria-current', String(k === i)));
  document.body.style.setProperty('--case', i >= 0 ? CASES[i].colour : ACCENT);

  if (LAYOUT === 'column') {
    const slot = casesEl.querySelector('.slot');
    casesEl.classList.toggle('on', i >= 0);
    if (i < 0) return;
    const c = CASES[i];
    $('#c-idx').textContent = `${pad(i)} / ${pad(N - 1)} — ${c.name}`;
    $('#c-years').textContent = c.years;
    $('#c-title').innerHTML = c.title;
    $('#c-tags').innerHTML = tagsHTML(c);
    $('#c-body').textContent = c.body;
    $('#c-go').href = c.file;
    slot.style.setProperty('--c', c.colour);
    /* direction matters: going down the list the copy rises, going back up
       it falls, so the swap reads as moving through a sequence */
    slot.classList.remove('swap', 'swap-back');
    void slot.offsetWidth;
    slot.classList.add(prev > i ? 'swap-back' : 'swap');
  } else {
    cards.forEach((c, k) => {
      c.classList.toggle('active', k === i);
      c.classList.toggle('past', i >= 0 && k < i);
    });
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   THE CARDS' ENTRANCES, and the lines back to the trail
   ─────────────────────────────────────────────────────────────────────────
   Scrubbed, not triggered: each card's --p follows the scroll through the
   first part of its band, so the entrance can be stopped half-way and run
   backwards. It is chased per frame rather than written straight from the
   scroll event — wheel notches arrive in jumps, and a 3D fold driven off
   them directly stutters.
   ═════════════════════════════════════════════════════════════════════════ */
const shown = new Array(N).fill(0);
const leaders = $('#leaders');
if (leaders) {
  leaders.innerHTML = CASES.map((c, i) =>
    `<path data-i="${i}" style="--c:${c.colour}"/><circle data-i="${i}" r="2.5"/>`).join('');
}
const leaderPaths = leaders ? [...leaders.querySelectorAll('path')] : [];
const leaderDots = leaders ? [...leaders.querySelectorAll('circle')] : [];

let last = performance.now();
function tick(now) {
  requestAnimationFrame(tick);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (LAYOUT !== 'cards') return;
  const k = REDUCED ? 1 : Math.min(1, dt * 7);
  cards.forEach((el, i) => {
    shown[i] += (caseProg[i] - shown[i]) * k;
    if (Math.abs(caseProg[i] - shown[i]) < 0.001) shown[i] = caseProg[i];
    el.style.setProperty('--p', shown[i].toFixed(4));
    el.classList.toggle('live', shown[i] > 0.002);
  });
}
requestAnimationFrame(tick);

/* The leader from each card to its camp on the trail, redrawn in the trail's
   own render hook so the line and the picture never disagree by a frame. */
trail.onFrame(screen => {
  if (!leaders) return;
  const sr = stage.getBoundingClientRect();
  cards.forEach((el, i) => {
    const path = leaderPaths[i], dot = leaderDots[i];
    const camp = screen.camps[i];
    const campOn = trail.progress >= trail.camps[i] && trailOn;
    const vis = shown[i] > 0.6 && camp && campOn && innerWidth > 820;
    path.style.opacity = vis ? (el.classList.contains('active') ? 1 : 0.35) : 0;
    dot.style.opacity = path.style.opacity;
    if (!vis) return;
    const r = el.getBoundingClientRect();
    const ex = r.left - sr.left - 10, ey = r.top - sr.top + 26;
    /* an elbow: level out of the card, then down onto the camp */
    const mx = Math.max(camp.x + 24, ex - 46);
    path.setAttribute('d', `M${ex.toFixed(1)} ${ey.toFixed(1)} H${mx.toFixed(1)} L${camp.x.toFixed(1)} ${camp.y.toFixed(1)}`);
    dot.setAttribute('cx', ex.toFixed(1)); dot.setAttribute('cy', ey.toFixed(1));
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   THE TRAIL CONTROL — show, hide, replay
   ═════════════════════════════════════════════════════════════════════════ */
let trailOn = true;
const ctl = $('#trail-ctl');
ctl.innerHTML = `
  <button type="button" class="tgl" aria-pressed="true" title="Show or hide the trail (T)">
    <span class="br">[</span><span class="sw"><i></i></span><span class="lb">Trail</span><span class="st">On</span><span class="br">]</span>
  </button>
  <button type="button" class="rp" title="Replay the climb"><span class="br">[</span>Replay<span class="br">]</span></button>`;
const tgl = ctl.querySelector('.tgl');
ctl.querySelector('.rp').addEventListener('click', () => {
  if (!trailOn) setTrail(true); else { trailArmed = false; trail.replay(); }
});
tgl.addEventListener('click', () => setTrail(!trailOn));

function setTrail(on) {
  trailOn = on;
  tgl.setAttribute('aria-pressed', String(on));
  tgl.querySelector('.st').textContent = on ? 'On' : 'Off';
  document.body.classList.toggle('trail-off', !on);
  trail.setVisible(on);
  if (on) {
    /* showing it again replays the climb, if the peak is somewhere a climb
       can be seen; in the plan view it waits for the scroll as it did */
    const camT = clamp01(t / CAM_END);
    if (camT > 0.36) { trailArmed = false; trail.replay(); }
    else { trailArmed = true; trail.set(0); }
  }
  const box = document.getElementById('p-trail');
  if (box) box.checked = on;
}

/* ══════════════════════════════════════════════════════════════════════════
   BOOT
   ═════════════════════════════════════════════════════════════════════════ */
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', onScroll);
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
onScroll();

/* ══════════════════════════════════════════════════════════════════════════
   THE PANEL — the trail's dials; the camera is Active Peak's and tuned there
   ═════════════════════════════════════════════════════════════════════════ */
{
  const el = document.createElement('div');
  el.id = 'tune';
  el.innerHTML = `
    <div id="tune-head"><b>${LAYOUT === 'cards' ? 'Range — L2' : 'Range'}</b><button id="tune-hide" title="Hide (H)">–</button></div>
    <p class="tune-sub">Trail</p>
    <div class="row inline"><label>Show trail<i></i></label><input type="checkbox" id="p-trail" checked></div>
    <div class="row"><label>Climb time<i id="v-dur">4.6s</i></label>
      <input type="range" id="p-dur" min="15" max="120" value="46"></div>
    <div class="row"><label>Route ahead<i id="v-ghost">0.00</i></label>
      <input type="range" id="p-ghost" min="0" max="60" value="0"></div>
    <div class="row inline"><label>Camps<i></i></label><input type="checkbox" id="p-camps" checked></div>
    <div class="row inline"><label>Climb<i></i></label><button class="tune-btn" id="p-replay">Replay</button></div>`;
  document.body.appendChild(el);
  const q = id => el.querySelector('#' + id);
  let dur = 4.6;
  q('p-trail').addEventListener('change', e => setTrail(e.target.checked));
  q('p-dur').addEventListener('input', e => { dur = +e.target.value / 10; q('v-dur').textContent = dur.toFixed(1) + 's'; });
  q('p-ghost').addEventListener('input', e => { const v = +e.target.value / 100; q('v-ghost').textContent = v.toFixed(2); trail.setGhost(v); });
  q('p-camps').addEventListener('change', e => document.body.classList.toggle('no-camps', !e.target.checked));
  q('p-replay').addEventListener('click', () => { if (!trailOn) setTrail(true); trailArmed = false; trail.replay(dur); });
  /* the replay button on the page and the one here share the duration */
  const origReplay = trail.replay;
  trail.replay = d => origReplay(d != null ? d : dur);
  const origPlay = trail.play;
  trail.play = d => origPlay(d != null ? d : dur);
  q('tune-hide').addEventListener('click', () => el.classList.toggle('hidden'));
  if (window.wb && window.wb.adopt) window.wb.adopt();
}
