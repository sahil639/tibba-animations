/* ══════════════════════════════════════════════════════════════════════════
   Site hero — loader → Active Peak → Metrics, as one scene
   ─────────────────────────────────────────────────────────────────────────
   The home page's opening, for Final Website v2. One Active Peak scene runs
   the whole of it, so nothing is ever swapped out under the reader:

     1  loader     the hero's first station (Plan, straight down) filling
                   from the valley floor to the summit as the count runs to
                   100 — the Loader section, verbatim (range-scene setFill).
                   Scrolling is held until it is done.
     2  hero       at 100 the counter clears and the camera flies down into
                   the hero's working perspective; TIBBA DESIGN STUDIO comes
                   up on the left, the supporting copy bottom right. The
                   summit's orange rings are live: hover one (tap, on a
                   touch screen) and the Tibba definition opens beside it.
     3  metrics    scrolling takes the hero's third move — the peak turns,
                   shrinks and steps aside — and the four Metrics boxes open
                   in the room it leaves, exactly as the Metrics section.

   When embedded in the site shell (assets/site-shell.js) it tells the shell
   the moment scrolling may begin: postMessage({ tibba: 'ready' }).

   Every tunable: SITE_HERO_CONFIG.
   ═════════════════════════════════════════════════════════════════════════ */
import { createRangeScene } from './range-scene.js';

const $ = s => document.querySelector(s);
const clamp01 = t => t < 0 ? 0 : t > 1 ? 1 : t;
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const ACCENT = '#FF4B1F';
const SKIP = /[?&]noloader\b/.test(location.search);

export const SITE_HERO_CONFIG = {
  loader: { duration: 2.4, hold: 0.1, stutter: 0.3, band: 3.0, ghost: 0.1, glow: 0.7 },
  intro: { duration: 1.2 },          // s: the flight from the plan down into the hero
  lock: { from: 0.0, to: 0.55 },     // share of the scroll the turn-aside takes
  /* the boxes open as soon as the turn is under way — no empty beat between
     the peak stepping aside and the numbers arriving — and close fast, and
     fade with the turn, when scrolling back */
  metrics: { openAt: 0.14, closeBelow: 0.1, stagger: 0.09, open: 0.75, close: 0.3 },
};
const C = SITE_HERO_CONFIG;

const PLAN = { elev: 90, azim: 0, dist: 248, x: 0, y: 12 };
const FROM = { elev: 30, azim: 6, dist: 122, x: 2, y: 22 };   // the hero (a closer, larger peak)
const TO   = { elev: 26, azim: 14, dist: 150, x: 46, y: 20 }; // aside, for the metrics
const NARROW_TO = { dist: 108, x: -44, y: -20 };                  // a phone: above the metrics

const scene = createRangeScene({
  canvas: $('#peak-canvas'), mode: 'hero', ink: false, palette: 'peak', backdrop: 'behind',
  hover: true, lockFade: 0.9,
});
scene.setAccent(ACCENT);
scene.setDepth(0.22);
scene.setHover(false);
document.documentElement.style.setProperty('--accent', ACCENT);
window.tibba = { scene, CONFIG: C };

/* ══ 1 · the loader ════════════════════════════════════════════════════ */
const count = $('#ld-count'), bar = $('#ld-bar i'), stageTx = $('#ld-stage');
const STAGES = [[0, 'Surveying the valley floor'], [0.22, 'Tracing the lower contours'], [0.48, 'Climbing the shoulders'],
  [0.74, 'Approaching the summit'], [0.96, 'Summit reached']];
function surge(t) {
  const steps = 7, s = t * steps, i = Math.floor(s), f = s - i;
  return t + ((i + f * f * (3 - 2 * f)) / steps - t) * C.loader.stutter;
}
const coords = $('#ld-coords');
function dms(v, pos, neg) {
  const h = v >= 0 ? pos : neg; v = Math.abs(v);
  const d = Math.floor(v), mf = (v - d) * 60, m = Math.floor(mf);
  return `${String(d).padStart(2, '0')}°${String(m).padStart(2, '0')}′${((mf - m) * 60).toFixed(1).padStart(4, '0')}″${h}`;
}
function pushCoord() {
  const li = document.createElement('li');
  li.innerHTML = `<i></i>${dms((Math.random() * 2 - 1) * 70, 'N', 'S')}  ${dms((Math.random() * 2 - 1) * 180, 'E', 'W')}  <span>${Math.round(800 + Math.random() * 7800).toLocaleString()} m</span>`;
  coords.prepend(li);
  while (coords.children.length > 4) coords.lastElementChild.remove();
}
let coordTimer = setInterval(pushCoord, 260);
for (let i = 0; i < 4; i++) pushCoord();

let phase = SKIP || REDUCED ? 'hero' : 'loading';
let t0 = performance.now(), intro = phase === 'hero' ? 1 : 0, introAt = 0;
function tellShell() {
  try { if (window.parent !== window) window.parent.postMessage({ tibba: 'ready' }, '*'); } catch {}
}
if (phase === 'hero') { document.body.classList.add('ld-gone', 'hero-in'); scene.setFill(null); clearInterval(coordTimer); tellShell(); }

/* the loader's clock starts on its first drawn frame, not when the script
   ran: building the terrain takes a moment, and a clock started before it
   would have spent most of the 2.4s on a blank screen */
let clockStarted = false, ldClock = 0, ldLast = 0;
function loaderFrame(now) {
  if (!clockStarted) { clockStarted = true; t0 = now; ldClock = 0; ldLast = now; }
  /* and it only counts time it was on screen for: a stalled frame (the
     page busy elsewhere) advances it by one frame, not by the stall */
  ldClock += Math.min(1 / 30, (now - ldLast) / 1000); ldLast = now;
  const e = ldClock;
  const p = surge(clamp01(e / C.loader.duration));
  scene.setFill(p, { band: C.loader.band, ghost: C.loader.ghost, glow: C.loader.glow });
  const pct = Math.round(p * 100);
  count.textContent = String(pct).padStart(3, '0');
  bar.style.transform = `scaleX(${p})`;
  let label = STAGES[0][1]; for (const [at, l] of STAGES) if (p >= at) label = l;
  stageTx.textContent = label;
  document.body.classList.toggle('ld-done', pct >= 100);
  if (e >= C.loader.duration + C.loader.hold) {
    /* 100: clear the counter, and fly down into the hero */
    phase = 'intro'; introAt = now;
    document.body.classList.add('ld-gone');
    clearInterval(coordTimer);
    setTimeout(() => document.body.classList.add('hero-in'), C.intro.duration * 300);
    tellShell();
  }
}

/* ══ 3 · the metrics boxes (as assets/metrics.js) ══════════════════════ */
const METRICS = [
  { v: '12+', l: 'Years of experience', k: 'Since 2013' },
  { v: '30+', l: 'Products shipped', k: 'Apps · web · SaaS' },
  { v: '08', l: 'Unicorns serviced', k: 'And counting' },
  { v: '$400M', l: 'Revenue unlocked', k: 'For our clients' },
];
const LAYOUT = { left: '50%', top: '18%', width: '46vw', aspect: 1.39, boxes: [
  { x: 0.125, y: 0.000, w: 0.375, h: 0.325 }, { x: 0.500, y: 0.175, w: 0.500, h: 0.325 },
  { x: 0.000, y: 0.475, w: 0.500, h: 0.325 }, { x: 0.500, y: 0.675, w: 0.430, h: 0.325 }] };
const host = $('#metrics');
host.innerHTML = `<div class="mcluster">${METRICS.map((m, i) => `
  <article class="mbox" data-i="${i}">
    <span class="plate"></span><span class="hl"></span>
    <span class="cn tl"></span><span class="cn tr"></span><span class="cn bl"></span><span class="cn br"></span>
    <div class="in"><span class="k"><b>M—${String(i + 1).padStart(2, '0')}</b><span>${m.k}</span></span>
      <span class="v" data-v="${m.v}">${m.v}</span><span class="l">${m.l}</span></div>
  </article>`).join('')}</div>`;
const cluster = host.querySelector('.mcluster');
const boxes = [...host.querySelectorAll('.mbox')];
{
  const cs = cluster.style;
  cs.setProperty('--cl', LAYOUT.left); cs.setProperty('--ct', LAYOUT.top); cs.setProperty('--cw', LAYOUT.width); cs.setProperty('--ca', LAYOUT.aspect);
  boxes.forEach((el, i) => { const b = LAYOUT.boxes[i]; ['x', 'y', 'w', 'h'].forEach(k => el.style.setProperty('--b' + k, b[k])); });
}
let tl;
function build() {
  tl = gsap.timeline({ paused: true });
  const st = C.metrics.stagger / Math.max(0.05, C.metrics.open);
  [0, 1, 2, 3].forEach((bi, n) => {
    const el = boxes[bi], q = s => el.querySelectorAll(s), o = n * st;
    const sx = [-8, 8, -8, 8], sy = [-8, -8, 8, 8];
    tl.fromTo(q('.hl'), { scaleX: 0, opacity: 1 }, { scaleX: 1, duration: .28, ease: 'power3.inOut' }, o)
      .fromTo(q('.plate'), { clipPath: 'inset(50% 0% 50% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: .34, ease: 'power3.inOut' }, o + .24)
      .to(q('.hl'), { opacity: 0, duration: .16, ease: 'none' }, o + .52)
      .fromTo(q('.cn'), { opacity: 0, x: k => sx[k], y: k => sy[k] }, { opacity: .9, x: 0, y: 0, duration: .22, ease: 'expo.out' }, o + .52)
      .fromTo(q('.k'), { opacity: 0 }, { opacity: 1, duration: .2, ease: 'none' }, o + .6)
      .fromTo(q('.v'), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .24, ease: 'power2.out' }, o + .64)
      .fromTo(q('.l'), { opacity: 0 }, { opacity: 1, duration: .2, ease: 'none' }, o + .72);
  });
}
build();
let mState = 'closed', drive = null;
function run(to) {
  if (drive) drive.kill();
  const opening = to === 1, unit = tl.duration() * (opening ? C.metrics.open : C.metrics.close);
  mState = opening ? 'opening' : 'closing';
  if (opening && tl.progress() < 0.02 && window.Odometer) boxes.forEach((el, n) => {
    const v = el.querySelector('.v'), d = n * C.metrics.stagger + .64 * C.metrics.open;
    v.textContent = v.dataset.v; v.dataset.odoText = v.dataset.v;
    window.Odometer.count(v, { delay: d, duration: 1.2 });
    window.Odometer.roll(el.querySelector('.l'), { delay: d + .09, duration: .5, stagger: .018 });
  });
  drive = gsap.to(tl, { progress: to, duration: REDUCED ? .01 : Math.abs(to - tl.progress()) * unit,
    ease: opening ? 'power1.inOut' : 'power2.in', onComplete: () => { mState = opening ? 'open' : 'closed'; } });
}

/* ══ 2 · the rings: click for the definition ══════════════════════════ */
const card = $('#def-card');
let ringsLive = false, cardOpen = false;
function ringAt(x, y) {
  const rs = scene.ringScreen(); let best = -1, bd = Infinity;
  rs.forEach((r, i) => {
    if (!r || r.behind) return;
    const dx = (x - r.x) / Math.max(10, r.r + 8), dy = (y - r.y) / Math.max(7, r.r * 0.5 + 8);
    const d = dx * dx + dy * dy;
    if (d < 1 && d < bd) { bd = d; best = i; }
  });
  return best;
}
const stage = $('#stage');
/* hover a ring and the definition opens beside it; move off the rings (and
   off the card) and it closes, after a beat so the pointer can cross the
   gap to the card. Touch has no hover: a tap does the same. */
let hoverRing = -1, closeT = 0;
stage.addEventListener('pointermove', e => {
  if (e.pointerType === 'touch') return;
  if (!ringsLive) { stage.style.cursor = ''; return; }
  if (e.target.closest('#def-card')) { clearTimeout(closeT); return; }
  const i = ringAt(e.clientX, e.clientY);
  scene.setRingHover(i < 0 ? null : i);
  stage.style.cursor = i < 0 ? '' : 'help';
  if (i >= 0) {
    clearTimeout(closeT);
    if (i !== hoverRing || !cardOpen) { hoverRing = i; const r = scene.ringScreen()[i]; openCard(r.x + r.r, r.y); }
  } else if (cardOpen && !closeT) {
    closeT = setTimeout(() => { closeT = 0; hoverRing = -1; closeCard(); }, 320);
  }
});
stage.addEventListener('pointerleave', () => { scene.setRingHover(null); clearTimeout(closeT); closeT = 0; hoverRing = -1; if (cardOpen) closeCard(); });
function openCard(x, y) {
  const w = Math.min(340, innerWidth - 32);
  card.style.left = Math.min(innerWidth - w - 16, Math.max(16, x + 28)) + 'px';
  card.style.top = Math.min(innerHeight - 260, Math.max(90, y - 40)) + 'px';
  card.classList.add('on'); card.setAttribute('aria-hidden', 'false'); cardOpen = true;
}
function closeCard() { card.classList.remove('on'); card.setAttribute('aria-hidden', 'true'); cardOpen = false; }
stage.addEventListener('click', e => {
  if (e.target.closest('#def-card')) return;
  if (ringsLive && e.pointerType !== 'mouse') {
    const i = ringAt(e.clientX, e.clientY);
    if (i >= 0) { const r = scene.ringScreen()[i]; openCard(r.x + r.r, r.y); return; }
  }
  if (cardOpen) closeCard();
});
$('#def-close').addEventListener('click', closeCard);
addEventListener('keydown', e => { if (e.key === 'Escape') closeCard(); });

/* ══ the frame: loader, intro, then the scroll ═════════════════════════ */
const scope = $('#scope');
function scrollT() {
  const travel = scope.offsetHeight - innerHeight;
  return travel > 0 ? clamp01(-scope.getBoundingClientRect().top / travel) : 0;
}
function frame(now) {
  requestAnimationFrame(frame);
  if (phase === 'loading') { loaderFrame(now); scene.setHeroCam({ elev: PLAN.elev, azim: PLAN.azim, dist: PLAN.dist, tgtX: PLAN.x, tgtY: PLAN.y }); return; }
  if (phase === 'intro') {
    intro = clamp01((now - introAt) / 1000 / C.intro.duration);
    if (intro >= 1) { phase = 'hero'; scene.setFill(null); }
  }
  const t = scrollT();
  const k = smooth(clamp01((t - C.lock.from) / (C.lock.to - C.lock.from)));
  const narrow = innerWidth <= 820;
  /* where the scroll says the camera is, eased in from the plan by the intro */
  const cam = {
    elev: lerp(FROM.elev, TO.elev, k), azim: lerp(FROM.azim, TO.azim, k),
    /* a phone keeps the peak centred and lifts it into the top half, clear
       of the boxes below it */
    dist: narrow ? lerp(FROM.dist, NARROW_TO.dist, k) : lerp(FROM.dist, TO.dist, k),
    tgtX: narrow ? lerp(FROM.x, NARROW_TO.x, k) : lerp(FROM.x, TO.x, k),
    tgtY: narrow ? lerp(FROM.y, NARROW_TO.y, k) : lerp(FROM.y, TO.y, k),
  };
  const f = intro < 1 ? (intro < .5 ? 4 * intro ** 3 : 1 - (-2 * intro + 2) ** 3 / 2) : 1;   // cubic in-out
  scene.setHeroCam({ elev: lerp(PLAN.elev, cam.elev, f), azim: lerp(PLAN.azim, cam.azim, f), dist: lerp(PLAN.dist, cam.dist, f),
    tgtX: lerp(PLAN.x, cam.tgtX, f), tgtY: lerp(PLAN.y, cam.tgtY, f) });
  scene.lockTo(k);
  stage.style.setProperty('--lock', k.toFixed(3));
  /* the hero copy gives way as the peak turns aside */
  stage.style.setProperty('--hero-out', clamp01(k * 5).toFixed(3));
  /* the boxes are only ever there once the hero copy has gone: they fade
     with the turn, so scrolling back never leaves them over the hero */
  stage.style.setProperty('--m-on', clamp01((k - 0.2) / 0.2).toFixed(3));
  scene.setHover(intro > 0.6);
  ringsLive = intro >= 1 && k < 0.25;
  if (!ringsLive && cardOpen) closeCard();
  if (t >= C.metrics.openAt) { if (mState !== 'open' && mState !== 'opening') run(1); }
  else if (t < C.metrics.closeBelow) { if (mState !== 'closed' && mState !== 'closing') run(0); }
}
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
requestAnimationFrame(frame);

/* ── the panel ─────────────────────────────────────────────────────────── */
{
  const el = document.createElement('div');
  el.id = 'tune';
  const R = (id, label, min, max, step, val, unit = '') => `<div class="row"><label>${label}<i id="v-${id}">${val}${unit}</i></label><input type="range" id="s-${id}" min="${min}" max="${max}" step="${step}" value="${val}" data-unit="${unit}"></div>`;
  el.innerHTML = `<div id="tune-head"><b>Site hero</b><button id="tune-hide" title="Hide (H)">–</button></div>
    <p class="tune-sub">Loader</p>
    ${R('ld', 'Duration', 1.5, 12, .1, C.loader.duration, 's')}
    ${R('st', 'Stutter', 0, 1, .01, C.loader.stutter)}
    ${R('in', 'Flight into the hero', .6, 5, .1, C.intro.duration, 's')}
    <div class="row inline"><label>Loader<i></i></label><button class="tune-btn" id="s-rp">Replay</button></div>
    <p class="tune-sub">Metrics</p>
    ${R('oa', 'Open at', 0, 1, .01, C.metrics.openAt)}
    ${R('lt', 'Turn finishes at', .3, 1, .01, C.lock.to)}`;
  document.body.appendChild(el);
  const q = id => el.querySelector('#' + id);
  const bind = (id, fn) => q('s-' + id).addEventListener('input', e => { const v = +e.target.value; q('v-' + id).textContent = v + e.target.dataset.unit; fn(v); });
  bind('ld', v => { C.loader.duration = v; }); bind('st', v => { C.loader.stutter = v; });
  bind('in', v => { C.intro.duration = v; }); bind('oa', v => { C.metrics.openAt = v; C.metrics.closeBelow = Math.max(0, v - .04); });
  bind('lt', v => { C.lock.to = v; });
  q('s-rp').addEventListener('click', () => {
    scrollTo(0, 0); phase = 'loading'; clockStarted = false; t0 = performance.now(); intro = 0; closeCard();
    document.body.classList.remove('ld-gone', 'hero-in', 'ld-done');
    clearInterval(coordTimer); coordTimer = setInterval(pushCoord, 260);
  });
  q('tune-hide').addEventListener('click', () => el.classList.toggle('hidden'));
  if (window.wb && window.wb.adopt) window.wb.adopt();
}
