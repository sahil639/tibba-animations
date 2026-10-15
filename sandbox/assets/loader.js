/* ══════════════════════════════════════════════════════════════════════════
   Loader — the Active Peak's first view, filling to the summit
   ─────────────────────────────────────────────────────────────────────────
   The plan view the hero opens on, straight down on the contour sheet, with
   one thing added: the lines come up from the valley floor to the summit as
   the count runs from 0 to 100. Rising through the elevations is what walks
   the fill inward across the sheet, so the whole country draws itself in
   toward the orange rings — and the rings are the last lines to arrive,
   which is the moment the count reads 100.

   Same scene module as the hero with the same options, so the loader and
   the page it hands over to are one drawing rather than a look-alike.
   ═════════════════════════════════════════════════════════════════════════ */
import { createRangeScene } from './range-scene.js';

const $ = s => document.querySelector(s);
const clamp01 = t => (t < 0 ? 0 : t > 1 ? 1 : t);
const ACCENT = '#FF4B1F';

const scene = createRangeScene({
  canvas: $('#loader-canvas'),
  mode: 'hero',
  ink: false,
  palette: 'peak',
  backdrop: 'behind',
  hover: false,
  lockFade: 0.9,
});
scene.setAccent(ACCENT);
scene.setHover(false);
/* the Active Peak's first station — Plan, straight down */
scene.setHeroCam({ elev: 90, azim: 0, dist: 248, tgtX: 0, tgtY: 12 });
scene.setFill(0);
window.tibba = { scene };

/* ── the dials ─────────────────────────────────────────────────────────── */
export const L = {
  duration: 6.5,       // seconds, 0 → 100
  hold: 1.2,           // seconds held at 100 before it loops
  loop: true,
  band: 3.0,           // how thick the bright front is, world units
  ghost: 0.10,         // how much of an unfilled line is already visible
  glow: 0.55,          // how bright the front is
  /* Loaders do not really run at an even rate — they surge and stall — and
     one that does reads as a progress bar someone drew. A little stepping,
     so the count has pauses in it, without ever going backwards. */
  stutter: 0.35,
};

/* ── the counter, top left ─────────────────────────────────────────────── */
const count = $('#ld-count'), bar = $('#ld-bar i'), stage = $('#ld-stage');
const STAGES = [
  [0.00, 'Surveying the valley floor'],
  [0.22, 'Tracing the lower contours'],
  [0.48, 'Climbing the shoulders'],
  [0.74, 'Approaching the summit'],
  [0.96, 'Summit reached'],
];

/* ── the facts, bottom left ────────────────────────────────────────────── */
const FACTS = [
  ['Everest', '8,849 m. It still grows about 4 mm a year as the Indian plate pushes north.'],
  ['K2', '8,611 m. Roughly one climber has died for every four who have reached the top.'],
  ['Kangchenjunga', '8,586 m. First climbers stopped a few feet short, by promise, to leave the summit untouched.'],
  ['Mauna Kea', 'Measured from the sea floor it stands 10,211 m — taller than Everest.'],
  ['Chimborazo', 'Its summit is the point on Earth farthest from the planet’s centre.'],
  ['Denali', 'Its base-to-peak rise of about 5,500 m is bigger than Everest’s.'],
  ['Mont Blanc', 'The summit’s ice cap shifts its height by a couple of metres from year to year.'],
  ['Nanga Parbat', 'The Rupal Face rises around 4,600 m — among the tallest walls on Earth.'],
  ['Contour lines', 'Close together means steep ground. Far apart means it is gentle.'],
  ['Treeline', 'Trees stop growing roughly where the warmest month averages below 10°C.'],
];
const factName = $('#ld-fact .name'), factText = $('#ld-fact .text'), factNo = $('#ld-fact .no');
let factIdx = Math.floor(Math.random() * FACTS.length);
function showFact(i) {
  const [n, t] = FACTS[i];
  const box = $('#ld-fact');
  box.classList.remove('in'); void box.offsetWidth; box.classList.add('in');
  factName.textContent = n;
  factText.textContent = t;
  factNo.textContent = String(i + 1).padStart(2, '0') + ' / ' + String(FACTS.length).padStart(2, '0');
}
showFact(factIdx);
setInterval(() => { factIdx = (factIdx + 1) % FACTS.length; showFact(factIdx); }, 3600);

/* ── the coordinates, bottom right ─────────────────────────────────────── */
const coordList = $('#ld-coords');
function dms(v, pos, neg) {
  const h = v >= 0 ? pos : neg; v = Math.abs(v);
  const d = Math.floor(v), mf = (v - d) * 60, m = Math.floor(mf), s = ((mf - m) * 60).toFixed(1);
  return `${String(d).padStart(2, '0')}°${String(m).padStart(2, '0')}′${s.padStart(4, '0')}″${h}`;
}
function randomCoord() {
  const lat = (Math.random() * 2 - 1) * 70, lon = (Math.random() * 2 - 1) * 180;
  const alt = Math.round(800 + Math.random() * 7800);
  return `${dms(lat, 'N', 'S')}  ${dms(lon, 'E', 'W')}  <span>${alt.toLocaleString()} m</span>`;
}
function pushCoord() {
  const li = document.createElement('li');
  li.innerHTML = `<i></i>${randomCoord()}`;
  coordList.prepend(li);
  while (coordList.children.length > 4) coordList.lastElementChild.remove();
}
for (let i = 0; i < 4; i++) pushCoord();
setInterval(pushCoord, 900);

/* ── the run ───────────────────────────────────────────────────────────── */
/* a monotone curve with plateaus in it: smooth overall, stepping locally */
function surge(t) {
  const steps = 7;
  const s = t * steps, i = Math.floor(s), f = s - i;
  const stepped = (i + (f * f * (3 - 2 * f))) / steps;
  return t + (stepped - t) * L.stutter;
}

let t0 = performance.now(), paused = false, pauseAt = 0, manual = null;
function frame(now) {
  requestAnimationFrame(frame);
  let p;
  if (manual != null) p = manual;
  else {
    const e = ((paused ? pauseAt : now) - t0) / 1000;
    const cycle = L.duration + L.hold;
    const local = L.loop ? e % cycle : Math.min(e, L.duration);
    p = clamp01(local / L.duration);
    p = surge(p);
  }
  scene.setFill(p, { band: L.band, ghost: L.ghost, glow: L.glow });
  const pct = Math.round(p * 100);
  count.textContent = String(pct).padStart(3, '0');
  bar.style.transform = `scaleX(${p})`;
  let label = STAGES[0][1];
  for (const [at, l] of STAGES) if (p >= at) label = l;
  stage.textContent = label;
  document.body.classList.toggle('ld-done', pct >= 100);
}
requestAnimationFrame(frame);

export const loader = {
  L, scene,
  restart() { t0 = performance.now(); paused = false; manual = null; },
  pause(on) { if (on && !paused) pauseAt = performance.now(); if (!on && paused) t0 += performance.now() - pauseAt; paused = on; },
  scrub(p) { manual = p == null ? null : clamp01(p); },
};
window.tibbaLoader = loader;
