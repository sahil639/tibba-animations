/* ══════════════════════════════════════════════════════════════════════════
   The home page's behaviour
   ─────────────────────────────────────────────────────────────────────────
   Data, the loader's timeline, the hero's three scroll states, and the two
   interactive sections. The mountain itself is assets/range-scene.js; this
   file only ever tells it what state to be in.
   ═════════════════════════════════════════════════════════════════════════ */
import { createRangeScene } from './range-scene.js';

const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp01 = t => t < 0 ? 0 : t > 1 ? 1 : t;

/* ══════════════════════════════════════════════════════════════════════════
   DATA
   ═════════════════════════════════════════════════════════════════════════ */

/* Every client on the reference's logo wall, with the sector each is known for
   and the colour its summit is drawn in where it has one. `mark` is what the
   display plate shows until the real artwork is dropped in. */
const BRANDS = [
  { name: 'Zomato',                meta: 'Foodtech · App & website',      since: '2015' },
  { name: 'Groww',                 meta: 'Fintech · App & website',       since: '2024', colour: '#4DD9C0', file: 'case-groww.html' },
  { name: 'Paytm',                 meta: 'Fintech · App',                 since: '2017' },
  { name: 'Firstpost',             meta: 'News & media · App & website',  since: '2023', colour: '#E05555', file: 'case-firstpost.html' },
  { name: 'Breathe ESG',           meta: 'SaaS · ESG dashboard',          since: '2023', colour: '#4CAF70', file: 'case-breathe-esg.html' },
  { name: 'Urban Company',         meta: 'Urban services · App',          since: '2016' },
  { name: 'HDFC Bank',             meta: 'Fintech · Rewards platform',    since: '2019' },
  { name: 'The Times of India',    meta: 'News & media · Website',        since: '2018' },
  { name: 'Policybazaar',          meta: 'Insurtech · App',               since: '2019' },
  { name: 'The Indian Express',    meta: 'News & media · App & website',  since: '2021' },
  { name: 'Shyft & Mindhouse',     meta: 'Fitness & mental health · App', since: '2023', colour: '#7B8FF5', file: 'case-shyft-mindhouse.html' },
  { name: 'Apnaklub',              meta: 'B2B wholesale · App',           since: '2022' },
  { name: 'simsim',                meta: 'Social commerce · App',         since: '2020' },
  { name: 'Bombay Shirt Company',  meta: 'Ecommerce · Website',           since: '2018' },
];

/* The four summits. Order matches PROJECT_PEAKS in the scene, so cell n and
   peak n are the same client. */
const CASES = [
  { name: 'Groww', colour: '#4DD9C0', file: 'case-groww.html',
    tags: 'Fintech · App · Website',
    title: 'How we helped Groww boost engagement on their app',
    body: 'A deep engagement with Groww to design and improve features that engage users on their consumer app, along with design support for other product initiatives.' },
  { name: 'Firstpost', colour: '#E05555', file: 'case-firstpost.html',
    tags: 'News & media · App · Website',
    title: 'How we helped Firstpost 2× their traffic through a strategic redesign',
    body: "A design overhaul of Firstpost's website and the creation of their first mobile app, with a significant pivot for their business and content strategy." },
  { name: 'Breathe ESG', colour: '#4CAF70', file: 'case-breathe-esg.html',
    tags: 'SaaS · ESG · Dashboard',
    title: 'How we helped Breathe ESG accelerate sales and streamline releases',
    body: "An MVP to v1 redesign of Breathe ESG's SaaS platform, to make it easier for companies to track their ESG metrics and regulatory compliance." },
  { name: 'Shyft & Mindhouse', colour: '#7B8FF5', file: 'case-shyft-mindhouse.html',
    tags: 'Fitness · Mental health · App',
    title: 'How we helped Shyft & Mindhouse grow their business and supercharge PLG',
    body: 'Conceptualising and designing a therapy experience, alongside redesigning their websites and apps to impact revenue.' },
];

/* The band's own title, with the phrase the reference sets in the project's
   colour marked up. It is a different sentence from the card in the work grid
   — shorter, and built around the number — so it is written here rather than
   derived from the one above. */
const BAND = [
  'How we helped Groww <span class="hi">boost engagement</span> on their app',
  'How we helped Firstpost <span class="hi">2× their traffic</span> through a strategic redesign',
  'How we helped Breathe ESG <span class="hi">accelerate sales</span> and streamline releases',
  'How we helped Shyft &amp; Mindhouse <span class="hi">grow their business</span> and supercharge PLG',
];

/* ══════════════════════════════════════════════════════════════════════════
   THE TWO SCENES
   ═════════════════════════════════════════════════════════════════════════ */
const heroScene = createRangeScene({
  canvas: $('#hero-canvas'),
  mode: 'hero',
  hover: false,        // state three turns these on
});

const rangeScene = createRangeScene({
  canvas: $('#range-canvas'),
  mode: 'range',
  hover: true,
  /* The scene positions these every frame and flags one `landed` when its
     route reaches the summit; the walk below owns active and dimmed. */
  markers: [0, 1, 2, 3].map(i => $('#mkr-' + i)),
  onPeakClick(i) { jumpToCase(i); },
});

/* Both scenes are hung off the window. This is a workbench repo — the dock on
   the right of every page exists so the animation can be poked at — and a
   scene you cannot reach from the console is one you cannot tune. */
window.tibba = { heroScene, rangeScene };

/* Two terrains is two full redraws a frame, so whichever one is not on screen
   stops. The hero is on screen for its first three viewports and the range for
   one, and they never overlap. */
function parkOffscreen(scene, section, onChange) {
  const io = new IntersectionObserver(([e]) => {
    scene.setRunning(e.isIntersecting);
    if (onChange) onChange(e.isIntersecting);
  }, { rootMargin: '20% 0px 20% 0px' });
  io.observe(section);
}
parkOffscreen(heroScene,  $('#hero'), v => { heroVisible = v; });
parkOffscreen(rangeScene, $('#range'));

/* ══════════════════════════════════════════════════════════════════════════
   LOADER
   ─────────────────────────────────────────────────────────────────────────
   The scene is already building behind the sheet. There is no honest progress
   number to report — the terrain build is one synchronous pass that does not
   yield — so the bar is a short, fixed run to 92% while that happens and the
   last 8% is the frame the scene actually renders on. A fake percentage that
   crept to 99 and stopped would be worse than no bar at all.

   When it lifts, the camera is already pulling back, and the title and the nav
   roll in against that same timeline.
   ═════════════════════════════════════════════════════════════════════════ */
const INTRO = REDUCED ? 0 : 2.4;      // seconds of pull-back

function runLoader() {
  const sheet = $('#loader');
  const bar = $('#loader-bar');
  const title = $('#hero-title [data-odo]');
  const lede = $('#hero-lede [data-odo]');
  const nav = document.querySelector('.site-nav');

  requestAnimationFrame(() => { bar.style.width = '92%'; });

  /* Two frames after the scene has been constructed the first render has
     landed, so the sheet is lifting off a picture rather than off nothing.

     With a timeout behind it, because a background tab does not get animation
     frames at all: open this page in one and come back to it ten minutes later
     and the loader would still be sitting there, over a scene that has been
     ready the whole time. The timeout is the guarantee that the sheet lifts;
     the frames are only there to make it lift on a picture. */
  let lifted = false;
  const lift = () => { if (!lifted) { lifted = true; open(); } };
  requestAnimationFrame(() => requestAnimationFrame(lift));
  setTimeout(lift, 1200);

  function open() {
    bar.style.width = '100%';

    const tl = heroScene.playIntro({ duration: INTRO });

    sheet.classList.add('is-done');
    setTimeout(() => sheet.remove(), 800);

    /* The nav arrives while the camera is still moving, its labels rolling —
       the brief asks for it to load in with the zoom-out rather than after it. */
    if (nav) {
      nav.style.opacity = '0';
      nav.style.transition = 'opacity .6s var(--ease)';
      setTimeout(() => {
        nav.style.opacity = '1';
        nav.querySelectorAll('[data-odo]').forEach((el, i) => {
          window.Odometer.roll(el, { delay: i * 0.05, duration: .55 });
        });
      }, INTRO * 1000 * 0.34);
    }

    /* The title rolls in over the middle of the pull-back — early enough that
       the two are clearly one move, late enough that the peak has emerged
       behind the words before they land on it. */
    const O = window.Odometer;
    if (O) {
      setTimeout(() => O.roll(title, { duration: .78, stagger: .028 }), INTRO * 1000 * 0.30);
      if (lede) setTimeout(() => O.roll(lede, { duration: .55, stagger: .012 }), INTRO * 1000 * 0.58);
    }

    if (tl && REDUCED) tl.progress(1);
  }
}

/* The scene's constructor is synchronous — by the time createRangeScene has
   returned, the terrain is built. So the loader waits on the chrome and the
   fonts rather than on the scene. */
if (document.readyState === 'complete') runLoader();
else addEventListener('load', runLoader);

/* ══════════════════════════════════════════════════════════════════════════
   HERO — the three scroll states
   ─────────────────────────────────────────────────────────────────────────
   One 300vh sentinel, read as a fraction.

     0.00 – 0.12   state 1 holds. Nothing happens on the first flick of the
                   wheel, which is deliberate: the hero should survive being
                   nudged.
     0.12 – 0.52   state 2, the ink. The fill drains out of the peak and it is
                   redrawn as its own contours.
     0.52 – 0.88   state 3. The camera comes back in on the summit and the
                   hover rings go live at the point where they are big enough
                   to be worth having.
     0.88 – 1.00   the hold before the metrics take over.

   Every one of these is a scrub, not a trigger, so scrolling back up runs the
   whole thing in reverse rather than leaving the scene in its end state.
   ═════════════════════════════════════════════════════════════════════════ */
const hero = $('#hero');
const heroPanel = $('#hero-panel');
const heroDef = $('#hero-def');
const cue = $('#scroll-cue');
const hint = $('#hover-hint');

/* Four bands over the hero's 400vh. The fourth is the lock: the peak turns,
   shrinks and moves aside, and the metrics come up in the space it leaves. */
const INK_IN = 0.09, INK_OUT = 0.39, ZOOM_OUT = 0.66, LOCK_IN = 0.70, LOCK_OUT = 0.90;
const metricsLayer = $('#metrics-layer');
let metricsRan = false;
let hoverOn = null;

/* Read by the ring tracker below: how far the redraw has got, and whether the
   hero is the section on screen at all. */
let heroInk = 0, heroVisible = true;

function heroScroll() {
  const travel = hero.offsetHeight - innerHeight;
  const t = travel > 0 ? clamp01(-hero.getBoundingClientRect().top / travel) : 0;

  /* state 2 — the redraw */
  const ink = clamp01((t - INK_IN) / (INK_OUT - INK_IN));
  heroInk = ink;
  heroScene.setHeroMorph(ink);

  /* state 3 — back in close, and the rings */
  const zoom = clamp01((t - INK_OUT) / (ZOOM_OUT - INK_OUT));
  heroScene.zoomTo(zoom);

  /* The rings are only on where they are legible. They need line-work under
     them — which is what the ink state produces — and they need the close
     camera, or a ring around one contour at 126 units out is a hairline. */
  const wantHover = zoom > 0.25;
  if (wantHover !== hoverOn) { hoverOn = wantHover; heroScene.setHover(wantHover); }

  /* The title and the copy are one panel now, so they leave as one thing. It
     used to be two curves — the lede going with the redraw and the title
     holding on until the camera closed in — but that only worked while they
     were two pieces of type floating separately. Fading a child inside a box
     that stays put reads as the panel failing to load, not as copy making way.

     It goes late in the ink and is gone before the zoom starts, so the summit
     is never behind the words at the moment the camera arrives on it. */
  const panelOut = 1 - clamp01((ink - 0.45) / 0.45);
  heroPanel.style.opacity = panelOut;
  heroDef.style.opacity = 1 - clamp01((ink - 0.05) / 0.5);

  /* state 4 — the peak moves aside and the numbers arrive */
  const lock = clamp01((t - LOCK_IN) / (LOCK_OUT - LOCK_IN));
  heroScene.lockTo(lock);

  const showMetrics = lock > 0.18;
  metricsLayer.classList.toggle('on', showMetrics);
  metricsLayer.setAttribute('aria-hidden', String(!showMetrics));

  /* The reels are held back until the peak has actually moved: counting to a
     number nobody can see yet spends the one moment the odometer has. They
     run once — scrolling back and forth should not re-roll them. */
  if (showMetrics && !metricsRan) {
    metricsRan = true;
    metricsLayer.querySelectorAll('[data-odo-count]').forEach((el, i) => {
      window.Odometer.count(el, { delay: 0.1 + i * 0.1 });
    });
  }

  cue.style.opacity = t < 0.05 ? 1 : 0;
  hint.style.opacity = wantHover && t < ZOOM_OUT ? 1 : 0;
}

addEventListener('scroll', heroScroll, { passive: true });
addEventListener('resize', heroScroll);

/* The page sets its own starting point. Everything above is a function of
   scrollY, so a browser restoring a scroll position drops the hero into the
   middle of a state it has none of the history for — the same reason
   tibba-range.html took scroll restoration off. */
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
addEventListener('load', () => { heroScroll(); });
heroScroll();

/* ══════════════════════════════════════════════════════════════════════════
   THE RANGE — walking the four summits
   ─────────────────────────────────────────────────────────────────────────
   The original page's case walk, driven off this section's own scroll instead
   of off the document's. Four bands over a 500vh sentinel, one per summit.

   There is no wide establishing shot in front of them. The section opens
   already on the first summit — the camera is put on that station at boot
   rather than flown to it — so the first frame of this section anybody sees is
   the shot itself. What plays on arrival is the climb.

   A band, not a point. The camera flight between summits takes between 1.5 and
   3 seconds depending on how far it has to go, and the climb takes another 2.4
   on top of it — so a summit needs a stretch of scroll long enough to finish
   arriving before the next one is asked for. A viewport each is that stretch,
   and it is also why the index is quantised rather than scrubbed: you cannot
   scrub a flight, and a camera asked for a new destination sixty times a
   second never reaches any of them.
   ═════════════════════════════════════════════════════════════════════════ */
const rangeSection = $('#range-scroll');
const caseUI = $('#case-ui');
const rail = $('#progress-rail');
const cNum = $('#c-num');
const cardEl = $('#case-card');
const ccParts = ['#cc-cat', '#cc-title', '#cc-body'].map(sel => $(sel));
const mkrEls = [0, 1, 2, 3].map(i => $('#mkr-' + i));

/* One band per summit. */
const RANGE_BANDS = CASES.length;

/* ── the rail ───────────────────────────────────────────────────────────── */
CASES.forEach((c, i) => {
  const d = document.createElement('button');
  d.type = 'button';
  d.className = 'p-dot';
  d.dataset.label = c.name;
  d.setAttribute('role', 'tab');
  d.setAttribute('aria-label', c.name + ' case study');
  d.addEventListener('click', () => jumpToCase(i));
  rail.appendChild(d);
});
const pDots = [...rail.children];

mkrEls.forEach((el, i) => el.addEventListener('click', () => jumpToCase(i)));

/* A band is a fraction of the section's *travel* — its height less the one
   viewport the stage is stuck for — not a viewport of the document. Those two
   are not the same number, and reading the band one way while jumping to it
   the other lands the rail a whole summit off. Both go through here. */
const bandTravel = () => rangeSection.offsetHeight - innerHeight;
const bandAt = t => Math.min(RANGE_BANDS - 1, Math.floor(t * RANGE_BANDS + 1e-6));

/** Scroll to the middle of the band that shows one summit. */
function jumpToCase(i) {
  const top = rangeSection.offsetTop + bandTravel() * ((i + 0.5) / RANGE_BANDS);
  scrollTo({ top, behavior: 'smooth' });
}

/* ── the band ───────────────────────────────────────────────────────────── */
const setParts = v => ccParts.forEach(el => { el.style.opacity = v; });
let cardTimer = null;

function applyCase(i) {
  const c = CASES[i];
  /* on the root, so the rail and the band pick up the same accent the route
     is being drawn in */
  document.documentElement.style.setProperty('--ca', c.colour);
  ccParts[0].textContent = c.tags;
  /* the circle rides at the end of the title, so it is written with it */
  ccParts[1].innerHTML = BAND[i] +
    '<span class="cc-go"><span class="cc-go-roll"><i>\u2192</i><i>\u2192</i></span></span>';
  ccParts[2].textContent = c.body;
  cardEl.setAttribute('href', c.file);
  cardEl.setAttribute('aria-label', 'View case study: ' + c.name);
}

function showCard(i) {
  gsap.killTweensOf(ccParts);
  setParts('1');
  applyCase(i);
  cardEl.classList.add('open');
  requestAnimationFrame(() => requestAnimationFrame(() => cardEl.classList.add('shown')));
}

/** Cross-fade the copy while the band itself stays exactly where it is. */
function swapCard(i) {
  gsap.killTweensOf(ccParts);
  gsap.to(ccParts, {
    opacity: 0, duration: 0.14, ease: 'power1.out',
    onComplete() {
      applyCase(i);
      gsap.to(ccParts, { opacity: 1, duration: 0.26, ease: 'power1.out', stagger: 0.045 });
    },
  });
}

/* ── the walk ───────────────────────────────────────────────────────────── */
let onCase = -1;

function selectCase(i) {
  const prev = onCase;
  onCase = i;

  /* walkTo returns null for the summit the camera is already on — which is the
     first one, every time, because the section opened on it. There is no
     flight to make in that case, only the climb. */
  const step = rangeScene.walkTo(i) ||
               { flight: 0, climbDelay: rangeScene.climb(i, 0.3) };

  mkrEls.forEach((el, k) => {
    el.classList.toggle('active', k === i);
    el.classList.toggle('dimmed', k !== i);
  });
  pDots.forEach((d, k) => {
    d.classList.toggle('active', k === i);
    d.setAttribute('aria-selected', String(k === i));
  });
  cNum.textContent = String(i + 1).padStart(2, '0');

  /* The band stays put; only its copy changes between cases. Coming in from
     the wide shot it waits for the camera to be most of the way there —
     arriving with the flight rather than ahead of it. */
  if (cardTimer) { clearTimeout(cardTimer); cardTimer = null; }
  if (prev >= 0 && cardEl.classList.contains('open')) swapCard(i);
  else cardTimer = setTimeout(() => showCard(i), step.flight * 1000 * 0.62);
}

function rangeScroll() {
  const travel = bandTravel();
  if (travel <= 0) return;
  const t = clamp01(-rangeSection.getBoundingClientRect().top / travel);
  const i = bandAt(t);
  if (i !== onCase) selectCase(i);
}

addEventListener('scroll', rangeScroll, { passive: true });
addEventListener('resize', rangeScroll);

/* The opening frame, set before anyone can be looking at it. The walk itself
   waits for the section to actually reach the viewport — run it at boot and
   the first summit's climb has been and gone by the time anyone scrolls down
   to it, which is the one beat in this section worth not missing. */
rangeScene.openOn(0);
applyCase(0);
caseUI.classList.add('visible');
pDots[0].classList.add('active');
pDots[0].setAttribute('aria-selected', 'true');
mkrEls[0].classList.add('active');
mkrEls.slice(1).forEach(el => el.classList.add('dimmed'));

{
  const io = new IntersectionObserver(([e], obs) => {
    if (!e.isIntersecting) return;
    obs.disconnect();
    rangeScroll();                      // whichever band they actually landed in
  }, { rootMargin: '0px 0px -25% 0px' });
  io.observe($('#range-stage'));
}

/* ══════════════════════════════════════════════════════════════════════════
   THE SUMMIT'S RINGS
   ─────────────────────────────────────────────────────────────────────────
   The three accent contours at the top of the massif, each carrying a line
   about the studio. The scene owns the drawing — a hovered ring lifts off the
   mountain and brightens — and this owns the hit-test and the words.

   The targets are tracked against the projected position of the real rings
   every frame rather than placed once, because the camera moves through three
   states in this section and a ring is somewhere different in all of them.
   ═════════════════════════════════════════════════════════════════════════ */
const RINGS = [
  { k: 'tibba / tɪb-bɑ / n',
    t: 'A higher place. A peak. The place we aim to take you and your business.' },
  { k: 'What we do',
    t: 'A UI/UX design studio that helps tech companies solve problems and take ideas from zero to one.' },
  { k: 'How we work',
    t: 'We listen first and shape the process around the client, rather than arriving with one and fitting you into it.' },
];

const ringHits = [0, 1, 2].map(i => $('#ring-hit-' + i));
const ringNote = $('#ring-note');
let ringOn = -1;

ringHits.forEach((el, i) => {
  const enter = () => setRing(i);
  const leave = () => setRing(-1);
  el.addEventListener('pointerenter', enter);
  el.addEventListener('focus', enter);
  el.addEventListener('pointerleave', leave);
  el.addEventListener('blur', leave);
  el.setAttribute('aria-label', RINGS[i].k + ' — ' + RINGS[i].t);
});

function setRing(i) {
  if (i === ringOn) return;
  ringOn = i;
  heroScene.setRingHover(i);
  if (i < 0) { ringNote.classList.remove('on'); return; }
  ringNote.innerHTML = `<b>${RINGS[i].k}</b>${RINGS[i].t}`;
  ringNote.classList.add('on');
}

/* Tracking runs off the same rAF the scene does. It is cheap — three
   projections and a style write — and it only runs while the hero is the
   thing on screen. */
function trackRings() {
  requestAnimationFrame(trackRings);

  /* The rings belong to the peak as line-work, so they are worth pointing at
     only once the redraw has actually produced them, and only while the hero
     is what is on screen. Outside that the targets are not merely hidden,
     they are not in the hit-test at all. */
  const live = heroVisible && heroInk > 0.55;
  if (!live) {
    if (ringHits[0].classList.contains('on')) {
      ringHits.forEach(el => el.classList.remove('on'));
      setRing(-1);
    }
    return;
  }

  const rs = heroScene.ringScreen();
  rs.forEach((r, i) => {
    const el = ringHits[i];
    if (!r || r.behind || r.r < 4) { el.classList.remove('on'); return; }
    el.classList.add('on');
    /* a little larger than the ring, so the target is reachable without
       demanding pixel accuracy on a contour a couple of pixels wide */
    const d = Math.max(34, r.r * 2 + 22);
    el.style.left = r.x + 'px';
    el.style.top = r.y + 'px';
    el.style.width = d + 'px';
    el.style.height = (d * 0.42) + 'px';   // rings project as flat ellipses
  });

  if (ringOn >= 0 && rs[ringOn] && !rs[ringOn].behind) {
    ringNote.style.left = (rs[ringOn].x + 26) + 'px';
    ringNote.style.top = (rs[ringOn].y - 12) + 'px';
  }
}
requestAnimationFrame(trackRings);

/* ══════════════════════════════════════════════════════════════════════════
   BRANDS
   ─────────────────────────────────────────────────────────────────────────
   The names run as one wrapped line; hovering one underlines it and brings
   that client's mark up at the cursor.

   The mark is positioned on pointermove rather than once on enter, so it
   tracks rather than sits — and it is `position: fixed` against the viewport,
   which is why it can be written straight from clientX/clientY with no
   offsetParent arithmetic in between.

   Marks are the clients' own artwork and are not in this repo. Each is a
   labelled plate in the client's colour until they arrive; the plate is the
   right size and in the right place, so dropping an <img> in is a one-line
   change here and nothing in the CSS.
   ═════════════════════════════════════════════════════════════════════════ */
{
  const list = $('#brand-list');
  const mark = $('#brand-mark');
  let raf = 0, mx = 0, my = 0;

  BRANDS.forEach(b => {
    const li = document.createElement('li');
    const el = document.createElement(b.file ? 'a' : 'button');
    if (b.file) el.href = b.file; else el.type = 'button';
    el.className = 'brand-name';
    el.textContent = b.name;

    el.addEventListener('pointerenter', () => {
      mark.textContent = b.name;
      mark.style.setProperty('--mark-bg', b.colour || '#E8433C');
      mark.classList.add('on');
    });
    el.addEventListener('pointerleave', () => mark.classList.remove('on'));
    /* keyboard users get the mark too, parked on the name they are on */
    el.addEventListener('focus', () => {
      const r = el.getBoundingClientRect();
      mx = r.left + r.width / 2; my = r.top - 26;
      place();
      mark.textContent = b.name;
      mark.style.setProperty('--mark-bg', b.colour || '#E8433C');
      mark.classList.add('on');
    });
    el.addEventListener('blur', () => mark.classList.remove('on'));

    li.appendChild(el);
    list.appendChild(li);
  });

  function place() { mark.style.left = mx + 'px'; mark.style.top = my + 'px'; raf = 0; }

  /* One listener on the list rather than one per name, and the write is
     deferred to an animation frame — pointermove fires far more often than
     the screen refreshes, and writing a style on every one of them is layout
     work nobody sees. */
  list.addEventListener('pointermove', e => {
    mx = e.clientX; my = e.clientY - 26;
    if (!raf) raf = requestAnimationFrame(place);
  }, { passive: true });
}

/* ══════════════════════════════════════════════════════════════════════════
   TESTIMONIALS
   ─────────────────────────────────────────────────────────────────────────
   Three cards on a snapping rail. The counter and the rule under it are read
   off the rail's own scrollLeft rather than driven by a pager: the rail can be
   moved by a swipe, a shift-wheel, a drag or the keyboard, and a pager that
   owns the position has to intercept all four. Reading it means every one of
   them works and none of them are handled.

   The third is written rather than collected — it is marked as such below so
   nobody ships it by accident.
   ═════════════════════════════════════════════════════════════════════════ */
const TESTIMONIALS = [
  {
    quote: 'Working with Rahul and team has been an absolute pleasure! The website they\u2019ve designed not only captures the essence of our brand but also resonates with our target audience, resulting in increased engagement and satisfaction.',
    logo: 'Firstpost', name: 'Milan Sachdeva',
    role: 'Senior General Manager, Firstpost', file: 'case-firstpost.html',
  },
  {
    quote: 'Collaborating with the Tibba Design Studio team on our critical design sprint was transformative for Breathe ESG.',
    logo: 'Breathe ESG', name: 'Shaayak Chaterjee',
    role: 'Founder, Breathe ESG', file: 'case-breathe-esg.html',
  },
  /* PLACEHOLDER — invented, not a real client quote. Replace before launch. */
  {
    quote: 'They asked the questions our own team had been avoiding, and then answered them with something we could ship. Six weeks in we had a product our sales team wanted to demo rather than apologise for.',
    logo: 'Apnaklub', name: 'Devika Rao',
    role: 'VP Product, Apnaklub', file: 'case-groww.html', placeholder: true,
  },
];

{
  const rail = $('#testi-rail');
  const num = $('#testi-count b');
  const bar = $('#testi-bar i');

  rail.innerHTML = TESTIMONIALS.map(t => `
    <article class="quote">
      <div class="card">
        <blockquote>\u201C${t.quote}\u201D</blockquote>
        <footer>
          <span class="logo">${t.logo}</span>
          <a class="cta" href="${t.file}" data-odo-hover><span data-odo>View case study</span></a>
        </footer>
      </div>
      <div class="who">
        <span class="pic">Photo</span>
        <span><span class="n">${t.name}</span><span class="r">${t.role}</span></span>
      </div>
    </article>`).join('');

  /* the name and role are two blocks inside one inline span, so they stack */
  rail.querySelectorAll('.who .n, .who .r').forEach(el => { el.style.display = 'block'; });

  const n = TESTIMONIALS.length;
  $('#testi-count').innerHTML =
    `<b>01</b>&thinsp;/&thinsp;${String(n).padStart(2, '0')}`;

  function sync() {
    const max = rail.scrollWidth - rail.clientWidth;
    const p = max > 0 ? rail.scrollLeft / max : 0;
    /* round to the nearest card rather than flooring: at the end of the rail
       the last card is fully shown but its left edge is never reached, so a
       floor would stop the counter one short of the end every time */
    const i = Math.min(n - 1, Math.round(p * (n - 1)));
    num.textContent = String(i + 1).padStart(2, '0');
    bar.style.width = (100 / n) + '%';
    bar.style.transform = `translateX(${i * 100}%)`;
  }
  rail.addEventListener('scroll', sync, { passive: true });
  addEventListener('resize', sync);
  sync();

  if (window.Odometer) window.Odometer.arm(rail);
}

/* Anything built by this file was not in the document when odometer.js armed
   itself, so it is armed now. */
if (window.Odometer) window.Odometer.arm(document);
