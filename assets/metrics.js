/* ══════════════════════════════════════════════════════════════════════════
   Metrics — the page's behaviour
   ─────────────────────────────────────────────────────────────────────────
   The Active Peak scene, entered at its second station and scrolled through
   its third: the camera leg from Perspective to Aside and the lockTo() turn
   and shrink that ride on it, exactly as active-peak.js runs its last leg.

   The boxes open like HUD panels when the section is scrolled into, and
   close again — the same beats, in reverse — when the reader scrolls back
   up past it. Both directions drive ONE paused GSAP timeline: opening tweens
   its playhead to the end, closing tweens it back to 0. A reversal halfway
   through therefore carries on from wherever the playhead is — it never
   jumps, and never restarts — and the open/close thresholds are two
   different numbers, so a scroll resting between them cannot flicker.

   Every tunable is in METRICS_CONFIG, below.
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

/* ══════════════════════════════════════════════════════════════════════════
   METRICS_CONFIG — every tunable of the boxes
   ═════════════════════════════════════════════════════════════════════════ */
export const METRICS_CONFIG = {
  /* Progress through the section (0 = pinned, 1 = end of its scroll). The
     boxes open once past openAt, and close once back above closeBelow.
     Keep closeBelow < openAt: the gap between them is the hysteresis. */
  scroll: { openAt: 0.5, closeBelow: 0.34 },

  stagger: 0.16,      // seconds between one box's open beginning and the next's
  /* the order the boxes open in (closing runs it backwards) */
  order: [0, 1, 2, 3],

  /* duration: seconds for ONE box's full sequence (line → plate → corners →
     data → pin). ease: the curve over the whole run, any GSAP ease name. */
  open:  { duration: 1.1, ease: 'power1.inOut' },
  close: { duration: 0.7, ease: 'power2.in' },

  /* The cluster's frame on the stage (CSS lengths), and its aspect ratio,
     then each box as fractions of that frame: x, y, w, h. The defaults are
     measured off the reference: a brick bond whose edges meet exactly. */
  layout: {
    left: '50%', top: '18%', width: '46vw', aspect: 1.39,
    boxes: [
      { x: 0.125, y: 0.000, w: 0.375, h: 0.325 },
      { x: 0.500, y: 0.175, w: 0.500, h: 0.325 },
      { x: 0.000, y: 0.475, w: 0.500, h: 0.325 },
      { x: 0.500, y: 0.675, w: 0.430, h: 0.325 },
    ],
  },
  drift: 10,          // px the cluster drifts with the pointer (0 = off)
};
const C = METRICS_CONFIG;

/* ── the boxes ─────────────────────────────────────────────────────────── */
const host = $('#metrics');
host.innerHTML = `<div class="mcluster">${METRICS.map((m, i) => `
  <article class="mbox" data-i="${i}">
    <span class="plate"></span><span class="hl"></span>
    <span class="cn tl"></span><span class="cn tr"></span><span class="cn bl"></span><span class="cn br"></span>
    <span class="pin"></span>
    <div class="in">
      <span class="k"><b>M—${String(i + 1).padStart(2, '0')}</b><span>${m.k}</span></span>
      <span class="v" data-v="${m.v}">${m.v}</span>
      <span class="l">${m.l}</span>
    </div>
  </article>`).join('')}</div>`;
const cluster = host.querySelector('.mcluster');
const boxes = [...host.querySelectorAll('.mbox')];

function applyLayout() {
  const L = C.layout, cs = cluster.style;
  cs.setProperty('--cl', L.left); cs.setProperty('--ct', L.top);
  cs.setProperty('--cw', L.width); cs.setProperty('--ca', String(L.aspect));
  boxes.forEach((el, i) => {
    const b = L.boxes[i];
    el.style.setProperty('--bx', b.x); el.style.setProperty('--by', b.y);
    el.style.setProperty('--bw', b.w); el.style.setProperty('--bh', b.h);
  });
}
applyLayout();

/* ── the timeline ──────────────────────────────────────────────────────
   Built at unit speed: one box's beats span 0..1, the boxes are staggered
   by stagger / open.duration, and the whole thing is then played at a rate
   that gives each box open.duration seconds (or close.duration going back). */
let tl = null;
function build() {
  const at = tl ? tl.progress() : 0;
  if (tl) tl.kill();
  tl = gsap.timeline({ paused: true });
  const st = C.stagger / Math.max(0.05, C.open.duration);
  C.order.forEach((bi, n) => {
    const el = boxes[bi], q = s => el.querySelectorAll(s), o = n * st;
    const cn = q('.cn'), sx = [-6, 6, -6, 6], sy = [-6, -6, 6, 6];
    tl.fromTo(q('.hl'), { scaleX: 0, opacity: 1 }, { scaleX: 1, duration: .28, ease: 'power3.inOut' }, o)
      .fromTo(q('.plate'), { clipPath: 'inset(50% 0% 50% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: .34, ease: 'power3.inOut' }, o + .24)
      .to(q('.hl'), { opacity: 0, duration: .16, ease: 'none' }, o + .52)
      .fromTo(cn, { opacity: 0, x: i => sx[i], y: i => sy[i] }, { opacity: .9, x: 0, y: 0, duration: .22, ease: 'expo.out' }, o + .52)
      .fromTo(q('.k'), { opacity: 0 }, { opacity: 1, duration: .2, ease: 'none' }, o + .6)
      .fromTo(q('.v'), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .24, ease: 'power2.out' }, o + .64)
      .fromTo(q('.l'), { opacity: 0 }, { opacity: 1, duration: .2, ease: 'none' }, o + .72)
      .fromTo(q('.pin'), { scale: 0 }, { scale: 1, duration: .1, ease: 'none' }, o + .9);
  });
  tl.progress(at);
}

let state = 'closed', drive = null;       // closed | opening | open | closing
function run(to) {
  if (drive) drive.kill();
  const opening = to === 1;
  const cfg = opening ? C.open : C.close;
  /* seconds for the remaining distance, at this direction's speed */
  const unit = tl.duration() * cfg.duration;
  const left = Math.abs(to - tl.progress()) * unit;
  state = opening ? 'opening' : 'closing';
  if (opening && tl.progress() < 0.02) count();
  drive = gsap.to(tl, { progress: to, duration: REDUCED ? 0.01 : left, ease: cfg.ease,
    onComplete: () => { state = opening ? 'open' : 'closed'; } });
}
/* the figures count up on each fresh open, timed to land with their box */
function count() {
  const O = window.Odometer; if (!O) return;
  const k = C.open.duration;
  C.order.forEach((bi, n) => {
    const el = boxes[bi], v = el.querySelector('.v'), l = el.querySelector('.l');
    const d = n * C.stagger + .64 * k;
    v.textContent = v.dataset.v; v.dataset.odoText = v.dataset.v;
    O.count(v, { delay: d, duration: 1.2 });
    O.roll(l, { delay: d + .08 * k, duration: .5, stagger: .018 });
  });
}
function open()  { if (state !== 'open' && state !== 'opening') run(1); }
function close() { if (state !== 'closed' && state !== 'closing') run(0); }
build();

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

  if (t >= C.scroll.openAt) open();
  else if (t < C.scroll.closeBelow) close();
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

/* ── pointer drift: the cluster as one piece, so its shared edges hold ── */
{
  const cur = { x: 0, y: 0 }, tgt = { x: 0, y: 0 };
  addEventListener('pointermove', e => {
    tgt.x = e.clientX / innerWidth - 0.5; tgt.y = e.clientY / innerHeight - 0.5;
  }, { passive: true });
  const loop = () => {
    requestAnimationFrame(loop);
    if (REDUCED) return;
    cur.x += (tgt.x - cur.x) * 0.06; cur.y += (tgt.y - cur.y) * 0.06;
    cluster.style.setProperty('--x', (-cur.x * C.drift).toFixed(2));
    cluster.style.setProperty('--y', (-cur.y * C.drift).toFixed(2));
  };
  loop();
}

/* ── the panel: writes into METRICS_CONFIG ─────────────────────────────── */
{
  const el = document.createElement('div');
  el.id = 'tune';
  const R = (id, label, min, max, step, val, unit = '') => `<div class="row"><label>${label}<i id="v-${id}">${val}${unit}</i></label><input type="range" id="s-${id}" min="${min}" max="${max}" step="${step}" value="${val}" data-unit="${unit}"></div>`;
  const E = ['none', 'power1.inOut', 'power2.inOut', 'power3.inOut', 'power2.in', 'power2.out', 'expo.inOut', 'sine.inOut'];
  const sel = (id, v) => `<select id="s-${id}">${E.map(e => `<option${e === v ? ' selected' : ''}>${e}</option>`).join('')}</select>`;
  el.innerHTML = `
    <div id="tune-head"><b>Metrics</b><button id="tune-hide" title="Hide (H)">–</button></div>
    <p class="tune-sub">Scroll thresholds</p>
    ${R('oa', 'Open at', 0, 1, .01, C.scroll.openAt)}
    ${R('cb', 'Close below', 0, 1, .01, C.scroll.closeBelow)}
    <p class="tune-sub">Timing</p>
    ${R('sg', 'Stagger', 0, .8, .01, C.stagger, 's')}
    ${R('od', 'Open duration', .2, 3, .05, C.open.duration, 's')}
    <div class="row"><label>Open easing<i></i></label>${sel('oe', C.open.ease)}</div>
    ${R('cd', 'Close duration', .1, 3, .05, C.close.duration, 's')}
    <div class="row"><label>Close easing<i></i></label>${sel('ce', C.close.ease)}</div>
    <div class="tune-acts"><button class="tune-btn" id="m-open">Open</button><button class="tune-btn" id="m-close">Close</button><button class="tune-btn" id="m-cp">Copy config</button></div>
    <p class="tune-sub">Cluster</p>
    ${R('cw', 'Width', 30, 60, 1, parseFloat(C.layout.width), 'vw')}
    ${R('cl', 'Left', 30, 60, 1, parseFloat(C.layout.left), '%')}
    ${R('ct', 'Top', 5, 40, 1, parseFloat(C.layout.top), '%')}
    ${R('dr', 'Pointer drift', 0, 30, 1, C.drift, 'px')}`;
  document.body.appendChild(el);
  const q = id => el.querySelector('#' + id);
  const bind = (id, fn) => q('s-' + id).addEventListener('input', e => {
    const v = +e.target.value; q('v-' + id).textContent = v + e.target.dataset.unit; fn(v);
  });
  bind('oa', v => { C.scroll.openAt = v; onScroll(); });
  bind('cb', v => { C.scroll.closeBelow = v; onScroll(); });
  bind('sg', v => { C.stagger = v; build(); });
  bind('od', v => { C.open.duration = v; build(); });
  bind('cd', v => { C.close.duration = v; });
  q('s-oe').addEventListener('change', e => { C.open.ease = e.target.value; });
  q('s-ce').addEventListener('change', e => { C.close.ease = e.target.value; });
  bind('cw', v => { C.layout.width = v + 'vw'; applyLayout(); });
  bind('cl', v => { C.layout.left = v + '%'; applyLayout(); });
  bind('ct', v => { C.layout.top = v + '%'; applyLayout(); });
  bind('dr', v => { C.drift = v; });
  q('m-open').addEventListener('click', () => run(1));
  q('m-close').addEventListener('click', () => run(0));
  q('m-cp').addEventListener('click', async () => {
    const txt = 'export const METRICS_CONFIG = ' + JSON.stringify(C, null, 2) + ';';
    try { await navigator.clipboard.writeText(txt); } catch { console.log(txt); }
  });
  q('tune-hide').addEventListener('click', () => el.classList.toggle('hidden'));
  if (window.wb && window.wb.adopt) window.wb.adopt();
  window.tibba.metrics = { CONFIG: C, open: () => run(1), close: () => run(0), get state() { return state; }, get progress() { return tl.progress(); } };
}
