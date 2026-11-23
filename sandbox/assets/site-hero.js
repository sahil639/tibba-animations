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

   Routes: as the hero lands, one line in the accent climbs the peak; when
   the turn into the metrics has finished, four more, in the clients'
   colours, climb it from other sides.

   When embedded in the site shell (assets/site-shell.js) it tells the shell
   the moment scrolling may begin: postMessage({ tibba: 'ready' }).

   Every tunable: SITE_HERO_CONFIG.
   ═════════════════════════════════════════════════════════════════════════ */
import { createRangeScene } from './range-scene.js?v=4';

const $ = s => document.querySelector(s);
const clamp01 = t => t < 0 ? 0 : t > 1 ? 1 : t;
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const ACCENT = '#C9124B';
const SKIP = /[?&]noloader\b/.test(location.search);
/* back after the loader has played (the shell reloads an unloaded frame):
   open on the hero exactly as it was left — copy in place, the route drawn */
const SETTLED = /[?&]settled\b/.test(location.search);
if (SETTLED) document.documentElement.classList.add('hero-settled');

export const SITE_HERO_CONFIG = {
  loader: { min: 0.4, giveUp: 45, hold: 0.1, stutter: 0.3, band: 3.0, ghost: 0.1, glow: 0.7 },   // min: s, the least it takes 000 → 100 (it follows the real load, no fixed length); giveUp: s, a stalled resource is let go
  intro: { duration: 1.2 },          // s: the flight from the plan down into the hero
  lock: { from: 0.0, to: 0.55 },     // share of the scroll the turn-aside takes
  /* the boxes open as soon as the turn is under way — no empty beat between
     the peak stepping aside and the numbers arriving — and close fast, and
     fade with the turn, when scrolling back */
  metrics: { openAt: 0.14, closeBelow: 0.1, stagger: 0.09, open: 0.75, close: 0.3 },
};
const C = SITE_HERO_CONFIG;

/* distances are ×1.25 of what they were: the mountain at 80% of its old size */
const PLAN = { elev: 90, azim: 0, dist: 310, x: 0, y: 12 };
const FROM = { elev: 30, azim: 6, dist: 152, x: 2, y: 22 };   // the hero (a closer, larger peak)
const TO   = { elev: 26, azim: 14, dist: 150, x: 38, y: 20 }; // aside, for the metrics (Nov 2026: closer, so larger)
const NARROW_TO = { dist: 135, x: -44, y: -20 };                  // a phone: above the metrics

const scene = createRangeScene({
  canvas: $('#peak-canvas'), mode: 'hero', ink: false, palette: 'peak', backdrop: 'behind',
  hover: true, lockFade: 0.9,
});
scene.setAccent(ACCENT);
scene.setDepth(0.22);
scene.setHover(false);
/* desktop (Nov 2026): the country round the peak a little more present; the
   accent route graded from its summit down; the stats' routes as points
   that climb with a fading trail and leave off the top */
if (!matchMedia('(max-width: 760px)').matches) {
  scene.setInk({ offPeak: 0.5, depthOp: 0.52 });
  scene.setRouteStyle({ heroFade: 1, statsComet: true });
}
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
if (phase === 'hero') { document.body.classList.add('ld-gone', 'hero-in'); scene.setFill(null); clearInterval(coordTimer); tellShell(); scene.climbHero(true, SETTLED ? 0 : 0.5, SETTLED); }

/* Nov 2026: the loader follows the real load, not a clock. What it waits
   for: the fonts, every image in the page, the page's own load event, and
   the 3D terrain (its first drawn frame). Its count is the share of those
   that are in, and nothing else: no timer moves it, so on a slow connection
   it waits where the load is, and it reaches 100 the moment the last one is.
   The one floor is C.loader.min: it never climbs 000 → 100 faster than
   that, so a fast connection sees a short, whole fill rather than a flash. */
const LD = { fonts: false, load: false, scene: false, imgs: [], imgDone: 0 };
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { LD.fonts = true; }); else LD.fonts = true;
if (document.readyState === 'complete') LD.load = true; else addEventListener('load', () => { LD.load = true; }, { once: true });
function watchImages() {
  LD.imgs = [...document.images]; LD.imgDone = 0;
  LD.imgs.forEach(im => {
    if (im.complete) { LD.imgDone++; return; }
    const one = () => { LD.imgDone++; }; im.addEventListener('load', one, { once: true }); im.addEventListener('error', one, { once: true });
  });
}
watchImages();
const ldReal = () => {
  const n = 3 + LD.imgs.length, d = (LD.fonts ? 1 : 0) + (LD.load ? 1 : 0) + (LD.scene ? 1 : 0) + Math.min(LD.imgDone, LD.imgs.length);
  return { share: d / n, all: d >= n };
};
let clockStarted = false, ldClock = 0, ldLast = 0, ldP = 0, ldEnd = 0;
function loaderFrame(now) {
  if (!clockStarted) { clockStarted = true; t0 = now; ldClock = 0; ldLast = now; ldP = 0; ldEnd = 0; }
  LD.scene = true;                                   // the terrain is built: this frame draws it
  const dt = Math.min(0.1, (now - ldLast) / 1000); ldLast = now; ldClock += dt;
  const r = ldReal();
  if (ldClock > C.loader.giveUp) r.all = true;       // only a resource that never answers at all: it does not hold the hero shut for good
  /* where the count heads: the real share of what is in (held under 100
     until the last piece is) */
  const goal = r.all ? 1 : Math.min(0.99, r.share);
  const k = 1 - Math.exp(-dt * 9);
  ldP = Math.min(ldP + dt / C.loader.min, ldP + (goal - ldP) * Math.max(k, r.all ? 1 : 0));
  if (r.all && goal - ldP < 0.004) ldP = 1;
  const p = surge(clamp01(ldP));
  scene.setFill(p, { band: C.loader.band, ghost: C.loader.ghost, glow: C.loader.glow });
  const pct = Math.round(p * 100);
  count.textContent = String(pct).padStart(3, '0');
  bar.style.transform = `scaleX(${p})`;
  let label = STAGES[0][1]; for (const [at, l] of STAGES) if (p >= at) label = l;
  stageTx.textContent = label;
  document.body.classList.toggle('ld-done', pct >= 100);
  if (ldP >= 1 && !ldEnd) ldEnd = now;
  if (ldEnd && now - ldEnd >= C.loader.hold * 1000) {
    /* 100: clear the counter, and fly down into the hero */
    phase = 'intro'; introAt = now;
    document.body.classList.add('ld-gone');
    clearInterval(coordTimer);
    setTimeout(() => document.body.classList.add('hero-in'), C.intro.duration * 300);
    /* not tellShell() yet: the page stays still until the hero has fully
       flown in, so nobody can scroll away mid-intro */
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
    <span class="plate"></span><span class="hl"></span><i class="cn tl"></i><i class="cn tr"></i><i class="cn bl"></i><i class="cn br"></i>
    <div class="in"><span class="v" data-v="${m.v}">${m.v}</span><span class="l">${m.l}</span></div>
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
    tl.fromTo(q('.hl'), { scaleX: 0, opacity: 1 }, { scaleX: 1, duration: .28, ease: 'power3.inOut' }, o)
      .fromTo(q('.plate'), { clipPath: 'inset(50% 0% 50% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: .34, ease: 'power3.inOut' }, o + .24)
      .to(q('.hl'), { opacity: 0, duration: .16, ease: 'none' }, o + .52)
      .fromTo(q('.cn'), { opacity: 0 }, { opacity: 1, duration: .2, ease: 'none' }, o + .5)
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
/* hover (Nov 2026): the definition card is gone; the summit's rings still
   answer the pointer, and the accent route glows while it is under it */
let routeHot = false;
stage.addEventListener('pointermove', e => {
  if (e.pointerType === 'touch') return;
  if (!ringsLive) { if (routeHot) { routeHot = false; scene.setRouteHot(false); } return; }
  const i = ringAt(e.clientX, e.clientY);
  scene.setRingHover(i < 0 ? null : i);
  const hot = scene.nearHeroRoute(e.clientX, e.clientY, 18);
  if (hot !== routeHot) { routeHot = hot; scene.setRouteHot(hot); }
});
stage.addEventListener('pointerleave', () => { scene.setRingHover(null); if (routeHot) { routeHot = false; scene.setRouteHot(false); } });
function closeCard() {}

/* ══ the frame: loader, intro, then the scroll ═════════════════════════ */
const scope = $('#scope');

/* ── phones: no turn, the stats straight away ───────────────────────────
   On a phone the hero is one screen and nothing is scroll-driven: the
   peak stays as it lands, and the stats sit in the flow directly below it
   as a plain 2 × 2 grid, already filled in — no turn-aside, no boxes
   drawing themselves, no counting. That leaves the page nothing to compute
   while it scrolls, and the stats are there the moment they are reached. */
const PHONE = matchMedia('(max-width: 760px)');
function phoneLayout() {
  const on = PHONE.matches;
  document.documentElement.classList.toggle('hero-phone', on);
  if (on) {
    if (host.parentNode !== scope) scope.appendChild(host);
    if (drive) drive.kill();
    tl.progress(1);                                   // the boxes as they finish drawing, at once
    boxes.forEach(el => { const v = el.querySelector('.v'); if (v && v.dataset.v) v.textContent = v.dataset.v; });
    mState = 'open';
  } else if (host.parentNode === scope) {
    stage.appendChild(host);
    tl.progress(0);
    mState = 'closed';
  }
}
phoneLayout();
PHONE.addEventListener('change', phoneLayout);
function scrollT() {
  const travel = scope.offsetHeight - innerHeight;
  return travel > 0 ? clamp01(-scope.getBoundingClientRect().top / travel) : 0;
}
let statsRoutes = false;
function frame(now) {
  requestAnimationFrame(frame);
  if (phase === 'loading') { loaderFrame(now); scene.setHeroCam({ elev: PLAN.elev, azim: PLAN.azim, dist: PLAN.dist, tgtX: PLAN.x, tgtY: PLAN.y }); return; }
  if (phase === 'intro') {
    intro = clamp01((now - introAt) / 1000 / C.intro.duration);
    /* the hero has landed — only now may the page scroll */
    if (intro >= 1) { phase = 'hero'; scene.setFill(null); tellShell(); scene.climbHero(true, 0.15); }
  }
  const t = PHONE.matches ? 0 : scrollT();
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
  if (PHONE.matches) return;
  /* the turn has finished: the routes in the clients' colours climb the peak
     while the numbers roll; back above it, they go */
  if (k >= 0.97 && !statsRoutes) { statsRoutes = true; scene.climbStats(true); }
  else if (k < 0.6 && statsRoutes) { statsRoutes = false; scene.climbStats(false); }
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
    ${R('ld', 'Shortest fill', .2, 3, .05, C.loader.min, 's')}
    ${R('st', 'Stutter', 0, 1, .01, C.loader.stutter)}
    ${R('in', 'Flight into the hero', .6, 5, .1, C.intro.duration, 's')}
    <div class="row inline"><label>Loader<i></i></label><button class="tune-btn" id="s-rp">Replay</button></div>
    <p class="tune-sub">Metrics</p>
    ${R('oa', 'Open at', 0, 1, .01, C.metrics.openAt)}
    ${R('lt', 'Turn finishes at', .3, 1, .01, C.lock.to)}`;
  document.body.appendChild(el);
  const q = id => el.querySelector('#' + id);
  const bind = (id, fn) => q('s-' + id).addEventListener('input', e => { const v = +e.target.value; q('v-' + id).textContent = v + e.target.dataset.unit; fn(v); });
  bind('ld', v => { C.loader.min = v; }); bind('st', v => { C.loader.stutter = v; });
  bind('in', v => { C.intro.duration = v; }); bind('oa', v => { C.metrics.openAt = v; C.metrics.closeBelow = Math.max(0, v - .04); });
  bind('lt', v => { C.lock.to = v; });
  q('s-rp').addEventListener('click', () => {
    scrollTo(0, 0); scene.climbHero(false); scene.climbStats(false); statsRoutes = false; phase = 'loading'; clockStarted = false; t0 = performance.now(); intro = 0; closeCard();
    document.body.classList.remove('ld-gone', 'hero-in', 'ld-done');
    clearInterval(coordTimer); coordTimer = setInterval(pushCoord, 260);
  });
  q('tune-hide').addEventListener('click', () => el.classList.toggle('hidden'));
  if (window.wb && window.wb.adopt) window.wb.adopt();
}
