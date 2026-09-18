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

/* Services, as the reference structures them: a stage, the outcome that stage
   is chasing, and the services that get it there. Each service carries the
   three things it actually delivers. */
const STAGES = [
  {
    id: 'early', label: 'Early stage startup',
    blurb: 'Design an MVP, secure funding, achieve market validation, and reach product–market fit.',
    services: [
      { name: 'User research', points: [
        'Generate an understanding of your market, including competitors and customers',
        'Gather insights with surveys, interviews and market analysis',
        'Attain a deep understanding of your market to guide product development'] },
      { name: 'Product strategy consulting', points: [
        'Turn a thesis about the market into a roadmap somebody can build',
        'Decide what the first version is not, which is most of the work',
        'Pressure-test the plan against what the team can actually ship'] },
      { name: 'Product design and prototyping', points: [
        'Design the MVP end to end, at the fidelity the next conversation needs',
        'Prototype the parts that are arguments rather than screens',
        'Put it in front of users before it is built, not after'] },
      { name: 'User interface (UI) design', points: [
        'A visual language the product can grow into',
        'Screens drawn to a grid and a type scale, not one at a time',
        'Every state designed — empty, loading, error, and full'] },
      { name: 'Usability testing', points: [
        'Watch real users attempt the thing your funding depends on',
        'Separate what people say from what they do',
        'Come back with a ranked list of what to fix first'] },
      { name: 'Development support and handoff', points: [
        'Specs a developer can build from without asking a question',
        'Sit with the build while it happens, not after it ships',
        'Design QA against the real thing on a real device'] },
    ],
  },
  {
    id: 'mid', label: 'Mid stage startup',
    blurb: 'Grow the numbers you are measured on, make releases boring, and turn design into something the whole team can use.',
    services: [
      { name: 'Design systems and style guides', points: [
        'One component library the product and the marketing site both draw on',
        'Tokens, so a brand change is a value change rather than a redesign',
        'Documented well enough that a new engineer uses it by default'] },
      { name: 'Marketing and growth design', points: [
        'Landing pages built to be measured, not admired',
        'Onboarding and activation flows designed against the funnel',
        'Experiments with a hypothesis attached to each one'] },
      { name: 'Optimization and iteration', points: [
        'Find where users actually fall out, with data rather than opinion',
        'Ship changes in a sequence that lets you attribute the result',
        'Retire the parts of the product nobody uses'] },
      { name: 'User experience (UX) design', points: [
        'Redraw the flows that grew by accretion',
        'Make the second and third use as good as the first',
        'Design for the accounts that have real data in them'] },
      { name: 'User research', points: [
        'Segment the users you now have rather than the ones you imagined',
        'Continuous discovery alongside the delivery track',
        'Turn support tickets into a research input'] },
    ],
  },
  {
    id: 'scale', label: 'Established company',
    blurb: 'Keystone projects, a design function that scales, and the discipline to leave the working parts alone.',
    services: [
      { name: 'Design sprints', points: [
        'A week to turn a stuck decision into something tested',
        'The whole room in it, so the outcome does not need selling afterwards',
        'A prototype and five interviews at the end of it'] },
      { name: 'Design systems and style guides', points: [
        'Consolidate the four half-systems that already exist',
        'Governance: who may add to it and how',
        'Migration planned as work, not as a side effect'] },
      { name: 'Product strategy consulting', points: [
        'An outside read on where the product is actually going',
        'The delivery track and the discovery track, run in parallel',
        'Opportunities sized before they are scheduled'] },
      { name: 'User interface (UI) design', points: [
        'A refresh that does not throw away the equity in the current one',
        'Accessibility treated as a requirement rather than an audit',
        'Dense, data-heavy screens that stay readable'] },
      { name: 'Development support and handoff', points: [
        'Work with platform teams on the parts design cannot specify alone',
        'Design QA in the release process rather than beside it',
        'Support the rollout, including the parts that go wrong'] },
    ],
  },
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
function parkOffscreen(scene, section) {
  const io = new IntersectionObserver(([e]) => scene.setRunning(e.isIntersecting), {
    rootMargin: '20% 0px 20% 0px',
  });
  io.observe(section);
}
parkOffscreen(heroScene,  $('#hero'));
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

const INK_IN = 0.12, INK_OUT = 0.52, ZOOM_OUT = 0.88;
let hoverOn = null;

function heroScroll() {
  const travel = hero.offsetHeight - innerHeight;
  const t = travel > 0 ? clamp01(-hero.getBoundingClientRect().top / travel) : 0;

  /* state 2 — the redraw */
  const ink = clamp01((t - INK_IN) / (INK_OUT - INK_IN));
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
   BRANDS
   ─────────────────────────────────────────────────────────────────────────
   Names on the left, one display plate on the right. Hovering a name swaps the
   plate and draws its underline in from the left.

   The plate is driven by pointerenter and by focus, so it is reachable from
   the keyboard — a hover-only interaction would make the whole right-hand
   column invisible to anyone not using a mouse.
   ═════════════════════════════════════════════════════════════════════════ */
{
  const list = $('#brand-list');
  const plate = $('#brand-plate');
  const mark = $('#bp-mark'), meta = $('#bp-meta'), rule = $('#bp-rule');
  let shown = -1, swapT = null;

  BRANDS.forEach((b, i) => {
    const li = document.createElement('li');
    const btn = document.createElement(b.file ? 'a' : 'button');
    if (b.file) { btn.href = b.file; } else { btn.type = 'button'; }
    btn.className = 'brand-name';
    btn.innerHTML = `<span class="n">${b.name}</span><span class="y">${b.since}</span>`;
    btn.addEventListener('pointerenter', () => show(i));
    btn.addEventListener('focus', () => show(i));
    li.appendChild(btn);
    list.appendChild(li);
    b._el = btn;
  });

  function show(i) {
    if (i === shown) return;
    shown = i;
    const b = BRANDS[i];
    BRANDS.forEach(x => x._el.classList.toggle('is-on', x === b));

    /* The swap is two steps with the plate blanked between them, rather than a
       cross-fade: two wordmarks dissolving through each other is unreadable
       for the whole of the transition. */
    plate.classList.add('is-swapping');
    clearTimeout(swapT);
    swapT = setTimeout(() => {
      mark.textContent = b.name;
      meta.textContent = b.meta;
      rule.style.background = b.colour || 'var(--accent)';
      rule.style.width = b.colour ? '52px' : '34px';
      plate.classList.remove('is-swapping');
      /* the wordmark is type, so it arrives the way all type on this site
         arrives */
      if (window.Odometer) window.Odometer.roll(mark, { duration: .5, stagger: .022 });
    }, 190);
  }

  show(0);
}

/* ══════════════════════════════════════════════════════════════════════════
   SERVICES
   ─────────────────────────────────────────────────────────────────────────
   Two levels of selection: the stage across the top, and the service down the
   side. Changing the stage rebuilds the service list and lands on its first
   entry, because a service from the previous stage may not exist in this one.
   ═════════════════════════════════════════════════════════════════════════ */
{
  const tabs = $('#svc-tabs'), blurb = $('#svc-blurb');
  const list = $('#svc-list'), panel = $('#svc-panel');
  let stage = 0, svc = 0, swapT = null;

  STAGES.forEach((s, i) => {
    const b = document.createElement('button');
    b.className = 'svc-tab';
    b.type = 'button';
    b.role = 'tab';
    b.textContent = s.label;
    b.addEventListener('click', () => setStage(i));
    tabs.appendChild(b);
  });

  function setStage(i) {
    stage = i; svc = 0;
    [...tabs.children].forEach((b, k) => b.setAttribute('aria-selected', String(k === i)));
    blurb.textContent = STAGES[i].blurb;

    list.innerHTML = '';
    STAGES[i].services.forEach((s, k) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.className = 'svc-item';
      b.type = 'button';
      b.role = 'tab';
      b.textContent = s.name;
      b.addEventListener('click', () => setService(k));
      b.addEventListener('pointerenter', () => setService(k));
      li.appendChild(b);
      list.appendChild(li);
    });
    setService(0, true);
  }

  function setService(k, instant) {
    svc = k;
    [...list.querySelectorAll('.svc-item')]
      .forEach((b, j) => b.setAttribute('aria-selected', String(j === k)));

    const s = STAGES[stage].services[k];
    const paint = () => {
      panel.innerHTML = `<h3>${s.name}</h3><ul>` +
        s.points.map(p => `<li>${p}</li>`).join('') + '</ul>';
      panel.classList.remove('is-swapping');
      if (window.Odometer) window.Odometer.roll(panel.querySelector('h3'), { duration: .5 });
    };

    clearTimeout(swapT);
    if (instant) { paint(); return; }
    panel.classList.add('is-swapping');
    swapT = setTimeout(paint, 170);
  }

  setStage(0);
}

/* Anything built by this file was not in the document when odometer.js armed
   itself, so it is armed now. */
if (window.Odometer) window.Odometer.arm(document);
