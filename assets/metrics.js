/* ══════════════════════════════════════════════════════════════════════════
   Metrics — the page's behaviour
   ─────────────────────────────────────────────────────────────────────────
   The Active Peak scene, entered at its second station and scrolled through
   its third: the camera leg from Perspective to Aside and the lockTo() turn
   and shrink that ride on it, exactly as active-peak.js runs its last leg.

   The boxes are a trigger, not a scrub. Their load-in has five beats in it
   and a count that runs for over a second; tied to the scroll it would stall
   whenever the wheel did. So they fire once the peak has mostly moved over,
   and re-arm if the reader scrolls back far enough for the peak to return —
   come down again and the numbers are measured again.
   ═════════════════════════════════════════════════════════════════════════ */
import { createRangeScene } from './range-scene.js';

const $ = s => document.querySelector(s);
const clamp01 = t => t < 0 ? 0 : t > 1 ? 1 : t;
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t * t * (3 - 2 * t);
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const ACCENT = '#FF4B1F';

const METRICS = [
  { v: '12+',   l: 'Years of experience', k: 'Since 2013' },
  { v: '30+',   l: 'Products shipped',    k: 'Apps · web · SaaS' },
  { v: '08',    l: 'Unicorns serviced',   k: 'And counting' },
  { v: '$400M', l: 'Revenue unlocked',    k: 'For our clients' },
];
/* the order they land in — not left-to-right, so the four arrive as a
   scatter rather than as a row being typed */
const ORDER = [0, 3, 1, 2];

/* ── the scene: Active Peak, option for option ─────────────────────────── */
const scene = createRangeScene({
  canvas: $('#peak-canvas'),
  mode: 'hero', ink: false, palette: 'peak', backdrop: 'behind',
  hover: true, lockFade: 0.9,
});
scene.setAccent(ACCENT);
scene.setDepth(0.22);
document.documentElement.style.setProperty('--accent', ACCENT);
window.tibba = { scene };

/* Active Peak's second and third stations, verbatim */
const FROM = { elev: 30, azim:  6, dist: 138, x:  2, y: 17 };
const TO   = { elev: 26, azim: 14, dist: 150, x: 46, y: 20 };
/* the lock starts a beat after the section pins, and is done with a little
   scroll to spare so the boxes are read against a peak that has stopped */
const LOCK = { from: 0.08, to: 0.62 };
const FIRE_AT = 0.62, REARM_BELOW = 0.2;
let fireAt = FIRE_AT;          // the panel can move it

/* ── the boxes ─────────────────────────────────────────────────────────── */
const host = $('#metrics');
host.innerHTML = METRICS.map((m, i) => `
  <article class="mbox" data-i="${i}">
    <span class="plate"></span><span class="hl"></span>
    <span class="seg"><i></i><i></i><i></i><i></i></span>
    <span class="cn tl"></span><span class="cn tr"></span><span class="cn bl"></span><span class="cn br"></span>
    <span class="pin"></span>
    <div class="in">
      <span class="k"><b>M—${String(i + 1).padStart(2, '0')}</b><span>${m.k}</span></span>
      <span class="v" data-v="${m.v}">${m.v}</span>
      <span class="l">${m.l}</span>
    </div>
  </article>`).join('');
const boxes = [...host.querySelectorAll('.mbox')];

let fired = false, timers = [];
function fire() {
  fired = true;
  ORDER.forEach((bi, n) => {
    const el = boxes[bi];
    const delay = n * 0.2;
    el.style.setProperty('--delay', delay + 's');
    el.classList.remove('in-view'); void el.offsetWidth; el.classList.add('in-view');

    const O = window.Odometer;
    const v = el.querySelector('.v'), l = el.querySelector('.l');
    v.textContent = v.dataset.v; v.dataset.odoText = v.dataset.v;
    if (O) {
      O.count(v, { delay: delay + 0.86, duration: 1.2 });
      O.roll(l, { delay: delay + 0.9, duration: .5, stagger: .018 });
    }
  });
}
function rearm() {
  fired = false;
  timers.forEach(clearTimeout); timers = [];
  boxes.forEach(el => {
    el.classList.remove('in-view');
  });
}

/* ── the scroll ────────────────────────────────────────────────────────── */
const scope = $('#scope');
const stage = $('#stage');
function onScroll() {
  const travel = scope.offsetHeight - innerHeight;
  const t = travel > 0 ? clamp01(-scope.getBoundingClientRect().top / travel) : 0;
  const k = ease(clamp01((t - LOCK.from) / (LOCK.to - LOCK.from)));

  /* narrow: no column to make room for — the boxes sit under the peak — so
     the aside offset comes back out and the peak lifts into the top half */
  const narrow = innerWidth <= 820;
  scene.setHeroCam({
    elev: lerp(FROM.elev, TO.elev, k), azim: lerp(FROM.azim, TO.azim, k),
    dist: lerp(FROM.dist, TO.dist, k),
    tgtX: narrow ? lerp(FROM.x, TO.x, k) * 0.1 - 46 * k : lerp(FROM.x, TO.x, k),
    tgtY: lerp(FROM.y, TO.y, k) - (narrow ? 16 * k : 0),
  });
  scene.lockTo(k);
  stage.style.setProperty('--lock', k.toFixed(3));

  if (!fired && t >= fireAt) fire();
  else if (fired && t < REARM_BELOW) rearm();
}
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', onScroll);
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
onScroll();

/* Parked while the section is off screen — the reader spends the first
   viewport and a bit on the approach, and a full terrain redraw every frame
   under it would be wasted. */
new IntersectionObserver(([e]) => scene.setRunning(e.isIntersecting), { rootMargin: '10% 0px' })
  .observe(scope);

/* ── pointer drift: each box on its own depth ──────────────────────────── */
{
  const DEPTH = [10, 18, 6, 14];
  const cur = { x: 0, y: 0 }, tgt = { x: 0, y: 0 };
  addEventListener('pointermove', e => {
    tgt.x = e.clientX / innerWidth - 0.5; tgt.y = e.clientY / innerHeight - 0.5;
  }, { passive: true });
  const loop = () => {
    requestAnimationFrame(loop);
    if (REDUCED) return;
    cur.x += (tgt.x - cur.x) * 0.06; cur.y += (tgt.y - cur.y) * 0.06;
    boxes.forEach((el, i) => {
      el.style.setProperty('--x', (-cur.x * DEPTH[i]).toFixed(2));
      el.style.setProperty('--y', (-cur.y * DEPTH[i]).toFixed(2));
    });
  };
  loop();
}

/* ── the panel ─────────────────────────────────────────────────────────── */
{
  const el = document.createElement('div');
  el.id = 'tune';
  el.innerHTML = `
    <div id="tune-head"><b>Metrics</b><button id="tune-hide" title="Hide (H)">–</button></div>
    <p class="tune-sub">Load-in</p>
    <div class="row inline"><label>Boxes<i></i></label><button class="tune-btn" id="m-replay">Replay</button></div>
    <div class="row"><label>Fires at<i id="v-fire">${FIRE_AT.toFixed(2)}</i></label>
      <input type="range" id="s-fire" min="20" max="95" value="${Math.round(FIRE_AT * 100)}"></div>`;
  document.body.appendChild(el);
  const q = id => el.querySelector('#' + id);
  q('m-replay').addEventListener('click', () => { rearm(); requestAnimationFrame(fire); });
  q('s-fire').addEventListener('input', e => {
    fireAt = +e.target.value / 100; q('v-fire').textContent = fireAt.toFixed(2);
  });
  q('tune-hide').addEventListener('click', () => el.classList.toggle('hidden'));
  if (window.wb && window.wb.adopt) window.wb.adopt();
}
