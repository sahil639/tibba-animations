/* ══════════════════════════════════════════════════════════════════════════
   The range, as a scene
   ─────────────────────────────────────────────────────────────────────────
   Lifted out of tibba-range.html, which was one page owning one canvas: the
   scroll position drove the redraw, the case cards, the camera flights and the
   climbs, all from inside the same module. The final site needs the same
   mountain twice, in two sections, doing two different things — so everything
   that was about *that page* has come out and what is left is the scene.

   What came out: the case cards and their copy, the progress rail, the phase
   machine, the pill nav, the scroll handler, the keyboard walk, the hero
   intro's typography and the tuning panel. What stayed is every line that
   makes the mountain look the way it looks — the heightfield, marching
   squares, the ribbon shaders, the morph from lit surface to ink, the aerial
   fade, the pointer parallax and the hover rings.

   Nothing in the drawing was retuned. The two modes are not two scenes: they
   are the one scene with a different peak revealed, driven through the same
   `rangeReveal` number the original page faded the range up with. That is why
   the hero and the work section look like the same mountain from two places,
   because they are.

   ── the two modes ─────────────────────────────────────────────────────────
   'hero'    the studio's own massif alone, front and centre. The four client
             summits exist in the heightfield — they have to, they are part of
             the same terrain — but are never revealed, so the hero frame is
             the one peak the brief asks for.
   'range'   the four client summits, as line, with no routes drawn up them.
             The studio's peak is the one held back this time.

   ── using it ──────────────────────────────────────────────────────────────
       import { createRangeScene } from './assets/range-scene.js';
       const scene = createRangeScene({ canvas, mode: 'hero' });
       scene.setHeroMorph(0.4);     // fill → ink, 0..1
       scene.setHover(true);        // the rings under the cursor
       scene.zoomTo(1, 1.6);        // wide → close on the summit
       scene.setRunning(visible);   // park the loop when off screen

   Three.js and GSAP are imports, so this needs a network connection at
   runtime — the same trade tibba-range.html already made.
   ═════════════════════════════════════════════════════════════════════════ */
import * as THREE from 'three';

export function createRangeScene(opts) {
  const MODE_RANGE = opts.mode === 'range';

  /* Which country the hero drew this load. Reported on the API so the control
     panel can show it and hand it back to pin the landscape down. */
  let HERO_TERRAIN_SEED = 0;

  /* Every measurement in here used to be innerWidth/innerHeight, because the
     canvas was the window. It is a section now, so the scene measures its own
     box — and falls back to the window only before layout has happened. */
  const vpW = () => canvas.clientWidth  || innerWidth;
  const vpH = () => canvas.clientHeight || innerHeight;

  /* The hover rings are the hero's third scroll state and nothing else's, so
     they are off until a caller turns them on. */
  let hoverEnabled = !!opts.hover;

  /* The camera stations, and the framing that adapts them to the window, are
     declared at the bottom of this file — below the resize handler that wants
     to use them. A ResizeObserver's first callback is asynchronous, so in
     practice it never fires that early, but `frameOut` is a `let` and reading
     it before its declaration is a throw rather than an undefined. This flag
     is the one thing resize() is allowed to test. */
  let framingReady = false;

/* ─── Route colours ──────────────────────────────────────────────────────
   All that is left of this page's case data. A route is drawn in its project's
   colour, so the scene needs the four colours and nothing else about them —
   the copy, the links and the cards belong to whatever page is using this. */
const CASES = [
  { accent: '#4DD9C0' },   // Groww
  { accent: '#E05555' },   // Firstpost
  { accent: '#4CAF70' },   // Breathe ESG
  { accent: '#7B8FF5' },   // Shyft & Mindhouse
];

/* ─── Noise ──────────────────────────────────────────────────── */
/* An integer bit-mix rather than the usual sin-based hash. The terrain below
   asks for roughly five times as many noise samples per point as a plain cone
   did, and a hash built on Math.sin would have put a second on the load; this
   is several times faster and has none of sin-hash's lattice banding. */
function h2(x, y){
  let n = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
function vn(x,y){
  const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
  const ux=fx*fx*(3-2*fx),uy=fy*fy*(3-2*fy);
  const a=h2(ix,iy),b=h2(ix+1,iy),c=h2(ix,iy+1),d=h2(ix+1,iy+1);
  return a+(b-a)*ux+(c-a)*uy+(d-c-b+a)*ux*uy;
}
function fbmN(x,y,oct){ let v=0,a=0.5,f=1; for(let i=0;i<oct;i++){v+=a*vn(x*f,y*f);a*=0.5;f*=2.09;} return v; }
function fbm(x,y){ return fbmN(x,y,5); }
function sstep(t){ return t<=0?0:(t>=1?1:t*t*(3-2*t)); }

/* ─── The range ──────────────────────────────────────────────────────────
   Five summits, each with its own landform rather than its own radius. A cone
   — however you bend the exponent — reads as a dome, because the thing that
   makes a mountain look like a mountain is not its profile but its erosion:
   spurs running down off the summit, gullies between them, and a plan outline
   that is nowhere near a circle.

   Each peak is built from `parts` — separate masses summed together, so a
   summit can sit on a bench which sits on a sprawling apron, which is what the
   hero reference is: a compact cusped top on a broad lobed shelf, not a
   pyramid. A part is either an exponential cone (`sharp`) or a flat-topped
   mesa (`mesa`, the fraction of its radius spent falling away).

   On top of that each peak carries:
     warp    domain warp, in world units — this is what breaks the circle, and
             it is applied once so every part of a peak distorts together.
     spur    the coarse ridge armature: ridged noise sampled around a circle in
             theta so it wraps with no seam, then smoothstepped so the gullies
             come out as rounded lobes instead of V-notches.
     flute   the same again, finer and denser, on a wobbled angle so the
             gullies are not perfectly radial.
   ------------------------------------------------------------------------ */
const PEAKS = [
  /* The studio's massif, built to the reference: a small steep summit, the
     bench it stands on, a wide lobed apron sprawling forward, a second lobe
     off to one side and a low bump on the front shelf. Kept deliberately
     smooth — the reference has no fluting on it at all. */
  { x: 5, z: -1, h:41, spread:44, seed: 11.7, rot: 0.30, aniso:1.00, warp:16,
    spur:0.16, spurF:2.6, flute:0.05, fluteF: 9,
    parts: [
      { dx:  0, dz:  0, h:19.0, spread:19, sharp:2.10, aniso:1.10 }, // summit
      { dx:  2, dz:  6, h:11.0, spread:26, sharp:2.50, aniso:1.18 }, // bench
      { dx: -5, dz: 17, h:15.0, spread:45, mesa:0.55,  aniso:1.30 }, // apron
      { dx: 22, dz: 10, h: 6.0, spread:28, mesa:0.50,  aniso:1.15 }, // side lobe
      { dx: -4, dz: 15, h: 4.0, spread: 7, sharp:2.00, aniso:1.00 }, // front bump
    ] },
  // Groww — a broad shouldered massif, stretched across the view
  { x:-112, z:  -98, h:23, spread:28, seed: 43.1, rot:-0.60, aniso:1.42, warp:13,
    spur:0.34, spurF:2.0, flute:0.08, fluteF: 9,
    parts: [ { dx:0, dz:0, h:23, spread:28, sharp:2.60, aniso:1.42 },
             { dx:9, dz:11, h:5, spread:26, mesa:0.62, aniso:1.20 } ] },
  // Firstpost — a horn: cusped, steep, almost no skirt
  { x: -40, z: -124, h:23, spread:23, seed: 77.9, rot: 0.90, aniso:1.10, warp: 7,
    spur:0.44, spurF:2.9, flute:0.12, fluteF:13,
    parts: [ { dx:0, dz:0, h:23, spread:23, sharp:1.35, aniso:1.10 },
             { dx:-6, dz:8, h:3, spread:20, mesa:0.70, aniso:1.10 } ] },
  /* Breathe — a plateau, but no longer only a plateau. A mesa on its own has
     no top: its contours stop at the rim and the middle is blank, so on the
     walk it read as a stump next to three mountains. It keeps the flat-topped
     bench it is built on and gains a cusped summit standing on it. */
  { x:  44, z: -121, h:20, spread:32, seed:129.3, rot: 0.15, aniso:1.30, warp:14,
    spur:0.30, spurF:2.2, flute:0.13, fluteF:12,
    parts: [ { dx:0, dz:0, h: 9.5, spread:13, sharp:1.55, aniso:1.12 }, // summit
             { dx:0, dz:0, h:13.0, spread:25, mesa:0.44, aniso:1.30 }, // the bench
             { dx:3, dz:9, h: 5.5, spread:34, mesa:0.58, aniso:1.22 } ] },
  /* Shyft — an even cone, near symmetric, now drawn to a point. At sharp 2.0
     the exponential is still wide at the top and the last few rings sat almost
     on top of each other; 1.45 gives the same mass a summit you can see. */
  { x: 114, z:  -95, h:23, spread:26, seed:191.5, rot: 0.00, aniso:1.05, warp: 5,
    spur:0.22, spurF:3.2, flute:0.13, fluteF:14,
    parts: [ { dx:0, dz:0, h:23, spread:26, sharp:1.45, aniso:1.05 },
             { dx:0, dz:6, h: 4, spread:30, mesa:0.66, aniso:1.05 } ] },
];
/* ── the hero's own country ───────────────────────────────────────────────
   In 'hero' the four client summits have no business being there. They are not
   what the section is about, and because the terrain is one mesh their
   silhouettes are in the frame whether or not their contours are revealed.

   So in hero mode they are replaced — same four slots, so every uniform array
   in the shaders keeps its size — with landforms scattered and shaped at
   random: some cusped, some flat-topped benches, at a spread of heights, and
   pushed out far enough to sit on the horizon rather than crowd the massif.
   Peak 0, the studio's own, is never touched.

   Seeded rather than Math.random, so a reload gives a different country but a
   given seed always gives the same one — a landscape you cannot get back to is
   one you cannot tune, and the control panel needs to be able to hold one
   still while the camera is being set against it. */
function makeCountry(seed) {
  let t = seed >>> 0;
  const rnd = () => {                       // xorshift32, uniform in [0,1)
    t ^= t << 13; t >>>= 0;
    t ^= t >> 17;
    t ^= t << 5;  t >>>= 0;
    return t / 4294967296;
  };
  const between = (a, b) => a + (b - a) * rnd();

  /* Four bearings, one per quadrant of the far field, jittered inside their
     own arc. Picking four angles at random instead clumps them — three on one
     side and a gap is the single most common draw, and it reads as a mistake
     rather than as a range.

     'behind' pulls the same four in much closer and holds them to a narrower
     arc directly beyond the massif, which is what reads as depth rather than
     as a horizon: near enough that the eye has something to measure the peak
     against, far enough back that they never compete with it. */
  const near = opts.backdrop === 'behind';
  return [0, 1, 2, 3].map(i => {
    const arc = near ? Math.PI * 0.44 : Math.PI * 0.72;
    const from = near ? -Math.PI * 0.72 : -Math.PI * 0.86;
    const ang = from + (i + between(0.18, 0.82)) * (arc / 2);
    const dist = near ? between(62, 126) : between(108, 168);
    const x = Math.cos(ang) * dist;
    const z = -Math.abs(Math.sin(ang) * dist) - between(near ? 34 : 24, near ? 72 : 60);

    /* Held below the studio's massif on purpose. The hero is about one peak;
       a generated hill that out-tops it steals the skyline, and it would also
       take the top of the shared contour interval with it. */
    /* Smaller when they are close, so proximity does not turn into height —
       a near hill as tall as the massif is a second massif. */
    const h = near ? between(8, 17) : between(11, 23);
    const spread = between(22, 40);
    const mesa = rnd() < 0.38;              // a bench rather than a horn
    const sd = between(10, 240);

    return {
      x, z, h, spread, seed: sd,
      rot: between(-1, 1), aniso: between(1.0, 1.45), warp: between(5, 16),
      spur: between(0.16, 0.42), spurF: between(1.9, 3.2),
      flute: between(0.05, 0.14), fluteF: between(8, 14),
      parts: mesa
        ? [ { dx: 0, dz: 0, h: h * 0.42, spread: spread * 0.42, sharp: between(1.4, 1.9), aniso: 1.1 },
            { dx: 0, dz: 0, h: h * 0.62, spread: spread * 0.8, mesa: between(0.4, 0.6), aniso: 1.25 } ]
        : [ { dx: 0, dz: 0, h, spread, sharp: between(1.4, 2.4), aniso: between(1.0, 1.3) },
            { dx: between(-8, 8), dz: between(4, 12), h: h * 0.22,
              spread: spread * 1.15, mesa: between(0.5, 0.7), aniso: 1.15 } ],
    };
  });
}

if (!MODE_RANGE && opts.terrain !== false) {
  /* ?seed=… pins the country, which is what makes it tunable: a landscape you
     cannot get back to is one you cannot set a camera against. */
  const fromUrl = new URLSearchParams(location.search).get('seed');
  const seed = opts.terrainSeed != null ? opts.terrainSeed
    : (fromUrl ? (parseInt(fromUrl, 10) >>> 0)
               : (Math.random() * 0xFFFFFFFF) >>> 0);
  HERO_TERRAIN_SEED = seed;
  makeCountry(seed).forEach((p, i) => { PEAKS[i + 1] = p; });
}

PEAKS.forEach(p => {
  p._cos = Math.cos(p.rot); p._sin = Math.sin(p.rot);
  p._ax = p.spread * p.aniso; p._az = p.spread / p.aniso;
  let reach = 0;
  p.parts.forEach(t => {
    t._c = p._cos; t._s = p._sin;
    t._ax = t.spread * t.aniso; t._az = t.spread / t.aniso;
    /* a mesa is finished at r = 1; a cone needs a couple of radii before it is
       numerically nothing */
    t._lim = t.mesa ? 1.02 : 2.0;
    reach = Math.max(reach, Math.hypot(t.dx, t.dz) + Math.max(t._ax, t._az) * t._lim);
  });
  /* cheap reject radius, measured before the warp so a far point never pays
     for one — this early-out is most of what keeps the build under a second */
  p._cut = reach + p.warp;
  p._cut2 = p._cut * p._cut;
});
const PROJECT_PEAKS = [1, 2, 3, 4];        // PEAKS index per case, in CASES order

const NPK = PEAKS.length;

/* The fill belongs to the hero peak alone. A client summit shading in solid was
   too much weight for a secondary element — it stopped reading as one peak in a
   range and started reading as a second hero. The clients stay as line for the
   whole scroll, keep the same ink as every other peak, and what carries the
   project's colour is the route climbing them. */
/* Colours headed for a raw ShaderMaterial have to be plain sRGB components.
   new THREE.Color(hex) converts to linear working space, and a raw shader has
   no <colorspace_fragment> to convert it back, so the linear value gets written
   to an sRGB framebuffer verbatim: #E05555 was arriving on screen as (255,35,35)
   instead of (224,85,85) — a different red from the one in the title. */
function srgbVec(hex) {
  const n = typeof hex === 'string' ? parseInt(hex.slice(1), 16) : hex;
  return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

/* Each peak's colour, for the hover pulse. The studio's own summit has no
   client accent, so it takes the brand primary. */
const PEAK_ACCENT = PEAKS.map(() => srgbVec(0x7B8FF5));

const peakLit    = PEAKS.map(() => 0);   // 0..1 highlight, clients only
const peakLitT   = PEAKS.map(() => 0);

function coneAt(p, x, z){
  const qx = x - p.x, qz = z - p.z;
  if (qx*qx + qz*qz > p._cut2) return 0;

  const S = p.seed;
  // domain warp first, once — every part of this peak distorts together
  const wx = x + p.warp * (fbmN(x*0.055 + 5.2 + S, z*0.055 - 2.1 + S, 2) - 0.5);
  const wz = z + p.warp * (fbmN(x*0.055 - 7.7 + S, z*0.055 + 4.3 + S, 2) - 0.5);
  const bx = wx - p.x, bz = wz - p.z;

  let hSum = 0;
  for (let k = 0; k < p.parts.length; k++){
    const t = p.parts[k];
    const dx = bx - t.dx, dz = bz - t.dz;
    const px = (dx*t._c - dz*t._s) / t._ax;
    const pz = (dx*t._s + dz*t._c) / t._az;
    const r = Math.sqrt(px*px + pz*pz);
    if (r > t._lim) continue;
    hSum += t.h * (t.mesa
      ? sstep((1 - r) / t.mesa)
      : Math.exp(-Math.pow(r, t.sharp) * 3));
  }
  if (hSum < 0.02) return 0;

  /* Erosion rides on the combined form, not on any one part, so a spur running
     off the summit carries on down across the bench below it. */
  const u = Math.min(1, hSum / p.h);
  const flank = Math.pow(1 - u, 0.9);        // relief dies at the summit
  const env   = 4 * u * (1 - u);             // and peaks mid-height

  const ax = (bx*p._cos - bz*p._sin) / p._ax;
  const az = (bx*p._sin + bz*p._cos) / p._az;
  const th = Math.atan2(az, ax);
  const sp = fbmN(Math.cos(th)*p.spurF + 31 + S, Math.sin(th)*p.spurF - 12 + S, 2);
  const spur = sstep(1 - Math.abs(sp*2 - 1));

  const thw = th + 0.38 * (fbmN(ax*0.9 + 3.3 + S, az*0.9 - 1.1 + S, 2) - 0.5);
  const fn  = fbmN(Math.cos(thw)*p.fluteF + 57 + S, Math.sin(thw)*p.fluteF - 23 + S, 2);
  const flute = sstep(1 - Math.abs(fn*2 - 1));

  const grain = (fbmN(ax*3.4 + 2.2 + S, az*3.4 - 8.8 + S, 2) - 0.5) * 2;

  return hSum + p.h * (p.spur*spur*env + p.flute*flute*env*env + 0.03*env*grain) * flank;
}

function mh(x,z){
  /* The country was carrying ±8 units of its own relief, which is more than the
     hero's apron stands proud of it — the shelf read as one more fold in the
     landscape instead of as the base of a mountain. Halved, the massifs are
     the landform and the ground is the ground. */
  let v = (fbm(x*.058+1.7,z*.058+2.3)-.45)*6.0;
  for(let i=0;i<PEAKS.length;i++) v += coneAt(PEAKS[i], x, z);
  return Math.max(0, v);
}

let MAX_H=0;
for(let x=-60;x<=60;x++) for(let z=-60;z<=60;z++) MAX_H=Math.max(MAX_H,mh(x,z));
/** Per-peak summit height — each peak's contour interval is scaled to its own. */
/* Where each summit actually is, not where its cone was nominally centred. The
   domain warp and the offset parts move a real top several units off the entry
   in the table — enough that a route aimed at the nominal centre finishes just
   past the peak and hooks back, and a camera aimed there frames it off-centre. */
const PEAK_TOP = [];
const PEAK_H = PEAKS.map(p => {
  let m = 0, bx = p.x, bz = p.z;
  for(let a=-p.spread*1.3; a<=p.spread*1.3; a+=1.0)
    for(let b=-p.spread*1.3; b<=p.spread*1.3; b+=1.0){
      const h = mh(p.x+a, p.z+b);
      if (h > m) { m = h; bx = p.x+a; bz = p.z+b; }
    }
  PEAK_TOP.push({ x: bx, z: bz });
  return m;
});
PEAK_H[0] = MAX_H;      // keep the hero's palette mapping exactly where it was

/* Height the palette is measured against, which is not the same as the height
   the contour interval is measured against. Normalise a 26-unit summit fully to
   itself and its whole cap lands in the white of the ramp — it reads as chalk,
   not as a smaller mountain. Blending toward the range maximum keeps a shorter
   peak in the greys where it belongs, while peak 0 is unchanged by definition. */
const PEAK_TONE = PEAK_H.map(h => MAX_H + (h - MAX_H) * 0.78);

/* ── the survey palette ──────────────────────────────────────────────────
   Two of them. The same GLSL function either way, so the mountain surface and
   the contour sheet always agree — they read the ramp from one string.

   'range' is this scene's own: a long dark ramp with the whole top of it
   spent on the cap, which is what makes a peak read as lit from above when
   the fill is still on it.

   'peak' is tibba-peak.html's, lifted verbatim. It starts three times lighter
   and tops out lower, over three bands rather than four, with a sqrt rather
   than a 0.70 curve. On a peak drawn purely as line that is the better of the
   two, and it is also what fixes the white cap: the range ramp puts its last
   band between 0.42 and 0.79 brightness, so the summit rings — which are a
   couple of pixels apart up there — all land in it at once and merge into one
   blown-out blob. The peak ramp's top band is narrower and darker, so they
   stay separate strokes. */
const CT_PALETTES = {
  range: `
    t = pow(clamp(t, 0.0, 1.0), 0.70);
    vec3 c0=vec3(0.048,0.054,0.108);
    vec3 c1=vec3(0.095,0.115,0.200);
    vec3 c2=vec3(0.210,0.250,0.380);
    vec3 c3=vec3(0.420,0.470,0.600);
    vec3 c4=vec3(0.790,0.820,0.905);
    if     (t<0.25) return mix(c0,c1,t/0.25);
    else if(t<0.50) return mix(c1,c2,(t-0.25)/0.25);
    else if(t<0.75) return mix(c2,c3,(t-0.50)/0.25);
    return mix(c3,c4,(t-0.75)/0.25);`,

  peak: `
    t = pow(clamp(t, 0.0, 1.0), 0.50);
    vec3 c0 = vec3(0.170, 0.180, 0.225);
    vec3 c1 = vec3(0.400, 0.425, 0.520);
    vec3 c2 = vec3(0.640, 0.670, 0.775);
    vec3 c3 = vec3(0.845, 0.870, 0.955);
    if (t < 0.34) return mix(c0, c1, t / 0.34);
    if (t < 0.70) return mix(c1, c2, (t - 0.34) / 0.36);
    return mix(c2, c3, (t - 0.70) / 0.30);`,
};

const CT_PALETTE_GLSL = `
  vec3 palette(float t){
    ${CT_PALETTES[opts.palette] || CT_PALETTES.range}
  }`;

/* ─── Renderer ───────────────────────────────────────────────── */
const canvas = opts.canvas;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(vpW(), vpH(), false);
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
scene.background = null;
/* No THREE.Fog. None of the materials here declare `fog: true`, so a scene
   fog was never reaching them — the aerial fade is the shaders' own `vFog`,
   and it fades ALPHA rather than mixing toward a colour. Which means the
   distance haze is literally whatever is painted behind the canvas: the sky of
   this scene is the page's own background, and there is no sky colour in here
   to set. Keep the section behind it the same black the ground is and the
   horizon has no seam in it at all. */

/* ─── Camera ─────────────────────────────────────────────────── */
const camera = new THREE.PerspectiveCamera(50, vpW() / vpH(), 0.1, 600);
const camTarget = new THREE.Vector3(5, 14, 0);

/* The camera position the scroll owns, before any pointer input. Tweens move
   this rather than the camera itself, so the parallax below can orbit around
   it without the two writing to camera.position and cancelling each other —
   which is why the old parallax had to switch itself off during every flight. */
const camBase = new THREE.Vector3();
/* The hero gets a fraction of the swing, and almost none of the pitch. The
   studio name sits behind the canvas and shows only where the framebuffer is
   empty, so anything that lifts the far horizon crops the words — and at a 22
   degree camera the horizon is very sensitive to pitch. The work section has no
   type behind the mountain, so it takes the full amount. */
const PARALLAX = { yaw: 0.15, pitch: 0.075, ease: 5.5, heroYaw: 0.6, heroPitch: 0.22 };
const _up = new THREE.Vector3(0, 1, 0);
const _pv = new THREE.Vector3(), _pr = new THREE.Vector3();

function applyParallax() {
  _pv.copy(camBase).sub(camTarget);
  const hero = framing !== 'case';
  const yaw = -mSmooth.x * PARALLAX.yaw * (hero ? PARALLAX.heroYaw : 1);
  let pitch = mSmooth.y * PARALLAX.pitch * (hero ? PARALLAX.heroPitch : 1);
  /* In the hero the pitch may only lower the camera, never raise it. Raising it
     means looking down more steeply, which lifts the far horizon — and the
     horizon is the edge that was slicing through the studio name. Letting it
     drop is free: that direction only opens up more sky. */
  if (hero) pitch = Math.min(pitch, 0);
  _pv.applyAxisAngle(_up, yaw);
  _pr.crossVectors(_pv, _up);
  if (_pr.lengthSq() > 1e-6) {
    /* never let the pointer push the camera over the pole or under the ground */
    const elev = Math.asin(Math.max(-1, Math.min(1, _pv.y / Math.max(1e-4, _pv.length()))));
    pitch = Math.max(-elev + 0.07, Math.min(1.45 - elev, pitch));
    _pv.applyAxisAngle(_pr.normalize(), pitch);
  }
  camera.position.copy(camTarget).add(_pv);
}

/* Hero camera, held as angle and distance rather than a point, so elevation can
   be dialled without also having to solve for the position that produces it.
   `elev` is degrees above the horizon: low is a front-on view where the massif
   reads as a silhouette, high looks down on it and shows the apron as a shelf. */
const HERO_CAM = { elev: 22, dist: 126, azim: 6, tgtX: 2, tgtY: 17, tgtZ: -4 };
const H_POS = new THREE.Vector3();
const H_TGT = new THREE.Vector3();
function applyHeroCam(live) {
  const e = HERO_CAM.elev * Math.PI / 180, a = HERO_CAM.azim * Math.PI / 180;
  const up = HERO_CAM.dist * Math.sin(e), out = HERO_CAM.dist * Math.cos(e);
  H_TGT.set(HERO_CAM.tgtX, HERO_CAM.tgtY, HERO_CAM.tgtZ);
  H_POS.set(H_TGT.x + out * Math.sin(a), H_TGT.y + up, H_TGT.z + out * Math.cos(a));
  if (live && framing === 'hero') {
    if (camAnim) { camAnim.kill(); camTweening = false; }
    camTarget.copy(H_TGT);
    camBase.copy(H_POS);
  }
}
/** First-load intro: camera & target start lower, then ease to hero. */
/* H_POS and H_TGT are computed here rather than at declaration, and on this
   page that call has to be explicit. On tibba-range.html it was not: the
   tuning panel bound a slider to HERO_CAM.elev and ran it once on setup, and
   that run was what first filled these two vectors. Take the panel out — as
   production has to — and the hero camera stays at the origin, inside the
   mountain, rendering the inside of the terrain. */
applyHeroCam(false);

const HERO_INTRO_CAM_Y = 14;
const HERO_INTRO_TGT_Y = 5;
const HERO_INTRO_GROUP_Y = -7;

/* Case study: one survey station per client summit, all at the same elevation and
   distance, so travelling between them is a level pan across the range rather
   than a swoop — the contour map stays legible the whole way and the case card
   never has to fight a moving horizon. */
const SURVEY = { elev: 24, dist: 80, look: 0.34 };
/* Each station swings outboard of its own summit, looking back along the range.
   The subject stays front and centre and the other four recede behind it — which
   is the only thing in a still frame that says "range" rather than "a mountain". */
const CASE_AZIM = [-32, -18, 18, 32];   // degrees off dead-ahead
let CASE_CAM = null;            // filled once PEAK_H and TREK exist, below

/* ─── Mountain geometry ──────────────────────────────────────── */
/* The plane grew from 130 to 500 to hold the range, and RES with it so the
   spacing per vertex stays what the hero was authored against (~1.09 units).
   Every vertex also carries the peak that owns it and how strongly, which is
   what lets one summit light up while the rest of the range stays as line. */
const TERRAIN = 500, RES = 460;
const geo = new THREE.PlaneGeometry(TERRAIN, TERRAIN, RES, RES);
geo.rotateX(-Math.PI/2);
const pos = geo.attributes.position;
/* A copy of the rendered surface on its own grid. The contours are extracted
   from a field twice as fine as this mesh, so wherever the mesh chords across a
   gully it sits ABOVE the true surface — and a contour drawn at the true height
   there ends up inside the depth mesh and gets culled. That is what breaks a
   line into pieces. Keeping the mesh heights lets each contour ride up onto the
   mesh wherever that happens, and stay at its own level everywhere else. */
const MRES = RES + 1, MCELL = TERRAIN / RES, MHALF = TERRAIN / 2;
const MESHY = new Float32Array(MRES * MRES);
for(let i=0;i<pos.count;i++){
  const x = pos.getX(i), z = pos.getZ(i), y = mh(x, z);
  pos.setY(i, y);
  const ii = Math.round((x + MHALF) / MCELL), jj = Math.round((z + MHALF) / MCELL);
  if (ii >= 0 && ii < MRES && jj >= 0 && jj < MRES) MESHY[jj * MRES + ii] = y;
}
pos.needsUpdate = true;
geo.computeVertexNormals();

function meshYAt(x, z) {
  const gx = (x + MHALF) / MCELL, gz = (z + MHALF) / MCELL;
  let i = Math.floor(gx), j = Math.floor(gz);
  i = i < 0 ? 0 : (i > MRES - 2 ? MRES - 2 : i);
  j = j < 0 ? 0 : (j > MRES - 2 ? MRES - 2 : j);
  const fx = gx - i, fz = gz - j;
  const a = MESHY[j*MRES+i],     b = MESHY[j*MRES+i+1],
        c = MESHY[(j+1)*MRES+i], d = MESHY[(j+1)*MRES+i+1];
  return a + (b-a)*fx + (c-a)*fz + (d-c-b+a)*fx*fz;
}

/* Peak positions and reach, handed to both shaders. Nothing is assigned to a
   peak: every fragment reads all five and blends them by proximity, so the
   ground between two summits carries a gradient rather than a Voronoi seam. */
const PEAK_XZS = PEAKS.map(p => new THREE.Vector3(p.x, p.z, p.spread));

const mountainGroup = new THREE.Group();
scene.add(mountainGroup);

const mountainMat = new THREE.ShaderMaterial({
  uniforms: {
    uAlpha:  { value: 1 },
    /* one entry per peak — the range holds five independent redraws */
    uPeak:   { value: PEAK_XZS },
    uCut:    { value: PEAKS.map(() => 1e4) },   // world height each sweep plane sits at
    uMorphA: { value: PEAKS.map(() => 0) },
    uPeakH:  { value: PEAK_TONE.slice() },
    uBand:   { value: 4.5 },                    // softness of the plane
    uMode:   { value: 0 },
    uEdgeAmt:{ value: 0 },                      // how live the survey line is
    uFogNear:{ value: 200 },
    uFogFar: { value: 520 },
  },
  transparent: true,
  depthWrite: true,
  side: THREE.DoubleSide,
  defines: { NP: PEAKS.length },
  vertexShader:`
    uniform vec3 uPeak[NP];
    uniform float uCut[NP];
    uniform float uMorphA[NP];
    uniform float uPeakH[NP];
    uniform float uFogNear, uFogFar;
    varying float vH, vCut, vMorph, vFog, vMax, vOn;
    varying vec3 vN;
    void main(){
      vH=position.y; vN=normalize(normalMatrix*normal);

      /* Blend all five peaks by proximity instead of picking one. An inverse
         fourth-power weight lets the nearest summit dominate hard while still
         handing over smoothly, so a peak lighting up bleeds into the saddle
         beside it rather than stopping at a hard edge halfway across. */
      float wsum=0.0, c=0.0, m=0.0, hx=0.0, wmax=0.0;
      for (int i=0;i<NP;i++){
        vec2 dd = position.xz - uPeak[i].xy;
        float q = dot(dd,dd) / (uPeak[i].z * uPeak[i].z);
        float w = 1.0 / (q*q + 0.02);
        wsum += w; wmax = max(wmax, w);
        c += uCut[i]*w; m += uMorphA[i]*w; hx += uPeakH[i]*w;
      }
      vCut = c/wsum; vMorph = m/wsum; vMax = hx/wsum;
      /* Out in the country between summits the blend sits halfway between a lit
         peak and a drained one, which is honest but puts a travelling sweep line
         across ground that is not transitioning at all. This says how much of a
         peak this ground actually is, and the survey line is scaled by it. */
      vOn = smoothstep(0.02, 0.85, wmax);

      vec4 mv = modelViewMatrix*vec4(position,1.0);
      vFog = 1.0 - smoothstep(uFogNear, uFogFar, -mv.z);
      gl_Position=projectionMatrix*mv;
    }`,
  fragmentShader:`
    precision highp float;
    varying float vH, vCut, vMorph, vFog, vMax, vOn;
    varying vec3 vN;
    uniform float uAlpha, uBand, uMode, uEdgeAmt;
    ${CT_PALETTE_GLSL}
    void main(){
      /* The ramp is curved, not linear. Read straight off height, an apron a
         quarter of the way up the massif lands in the darkest quarter of the
         palette and disappears into the ground; the reference keeps its whole
         body mid-tone and spends the bright end on the cap alone. */
      float t = clamp(vH/vMax, 0.0, 1.0);
      vec3 col = palette(t);
      float cl=exp(-abs(sin(vH*1.15))*16.0);
      col=mix(col,col*0.55,cl*0.28);
      vec3 l=normalize(vec3(-0.3,2.8,1.0));
      float diff=dot(vN,l)*0.34+0.66;
      float side=max(0.0,dot(vN,normalize(vec3(1.0,0.4,-0.4)))*0.10);
      col=col*diff+col*side;

      /* ── the redraw ────────────────────────────────────────────────────
         How much of this fragment is still rendered as a solid, lit surface.
         The contour layer uses the complement of exactly this expression, so
         the two are always a partition — no gap, no double-draw. Every term
         reads this peak's own cut, so one summit can be lighting up while the
         four beside it stay as line. */
      float solid;
      float edge = 0.0;
      if (uMode < 0.5) {                      // sweep
        solid = 1.0 - smoothstep(vCut - uBand, vCut + uBand, vH);
        edge  = exp(-pow((vH - vCut) / max(0.001, uBand * 0.7), 2.0));
      } else if (uMode < 1.5) {               // ink
        solid = 1.0 - clamp(vMorph * 1.9 - (1.0 - t) * 0.9, 0.0, 1.0);
      } else {                                // fade
        solid = 1.0 - smoothstep(0.0, 1.0, vMorph);
      }

      /* The shading drains, but the mountain does not. What leaves is the light,
         not the body: the surface settles onto a near-black paper tone a shade
         under the page and stays fully opaque, so a contoured peak is a solid
         silhouette carrying its lines rather than a transparent shell you can
         read the page through. A trace of the shading is added back rather than
         mixed in — mixing keeps a fixed share, which on a summit that was nearly
         white leaves a grey cap sitting on an otherwise black mountain. */
      vec3 paper = vec3(0.022,0.022,0.026);
      col = mix(col, paper + col * 0.055, 1.0 - solid);

      float live = uEdgeAmt * vOn;
      col += vec3(0.34,0.40,0.66) * edge * live;

      /* Opacity is now only ever reduced by distance — never by the redraw and
         never by which peak this is near. The terrain is one body. */
      float a = uAlpha * vFog;
      if (a < 0.004) discard;
      gl_FragColor=vec4(col, a);
    }`,
});
const mountainMesh = new THREE.Mesh(geo, mountainMat);
mountainGroup.add(mountainMesh);

mountainGroup.position.y = HERO_INTRO_GROUP_Y;
mountainMat.uniforms.uAlpha.value = 0;
camBase.set(H_POS.x, H_POS.y - HERO_INTRO_CAM_Y, H_POS.z);
camTarget.set(H_TGT.x, H_TGT.y - HERO_INTRO_TGT_Y, H_TGT.z);

// Ground
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(700,700),
  /* Black, not the near-black navy this was. The terrain fades to alpha, so
     the ground plane and the page behind it have to be the same colour or the
     plane's far edge draws a line across the view. */
  new THREE.MeshBasicMaterial({ color: 0x000000 })
);
ground.rotation.x = -Math.PI/2; ground.position.y = -0.1;
scene.add(ground);

/* ─── Routes and flags ───────────────────────────────────────── */
/* One ascent per client summit, laid out against that peak's own footprint so a
   broad shoulder gets a long traverse and a horn gets a tighter switchback. The
   sign flips each time so consecutive routes do not read as the same drawing. */
const PATH_PTS = 180;
const PATH_CLR = CASES.map(c => c.accent);   // the route wears the project's colour
PROJECT_PEAKS.forEach((pi, i) => PEAK_ACCENT[pi].copy(srgbVec(PATH_CLR[i])));

const TREK = PROJECT_PEAKS.map((pi, i) => {
  const p = PEAKS[pi], R = p.spread, sg = i % 2 ? -1 : 1;
  const t = PEAK_TOP[pi];        // anchor the whole ascent on the real summit
  /* Switchbacks kept inside the peak's own footprint. The earlier route started
     a spread and a half out on flat ground and swung wider than the mountain,
     which read as a stray line rather than as an ascent. */
  const ctrl = [
    [t.x + sg * 0.34 * R, t.z + 1.22 * R],   // trailhead, on the lower slope
    [t.x - sg * 0.46 * R, t.z + 0.86 * R],
    [t.x + sg * 0.48 * R, t.z + 0.48 * R],
    [t.x - sg * 0.11 * R, t.z + 0.22 * R],   // last switchback, kept gentle so the
    [t.x, t.z],                              // final approach does not hook at the top
  ];
  return { peak: pi, ctrl, base: { x: ctrl[0][0], z: ctrl[0][1] } };
});

const FLAG_XZ = TREK.map(t => ({ x: t.ctrl[4][0], z: t.ctrl[4][1] }));
const FLAGS = FLAG_XZ.map(({x,z}) => ({ x, z, y: mh(x,z) }));

/* ─── The routes ─────────────────────────────────────────────────────────
   The mountain keeps its own ink; what carries the project's colour is the
   line up it. So the route has to be the heaviest, most deliberate mark on the
   sheet — a one-pixel THREE.Line cannot do that next to contour ribbons that
   are already two and a half pixels wide, and a LineBasicMaterial ignores
   linewidth on every desktop driver anyway. These are built the same way the
   contours are: quad strips widened in screen space, so the trail holds an
   exact width at any depth and any pixel density. */
const TRAIL_PTS = 260;

const trailPaths = TREK.map(({ ctrl }) => {
  /* Centripetal rather than uniform: a uniform Catmull-Rom overshoots past its
     last control point, which put a loop over the summit and sent the route
     back down the far side. */
  const curve = new THREE.CatmullRomCurve3(
    ctrl.map(([x,z]) => new THREE.Vector3(x, mh(x,z), z)),
    false, 'centripetal'
  );
  const pts = curve.getPoints(TRAIL_PTS);
  // resample y off the terrain so the route hugs the surface rather than cutting through it
  pts.forEach(p => { p.y = mh(p.x, p.z) + 0.55; });
  return pts;
});

function buildTrailGeometry() {
  let vCount = 0, iCount = 0;
  trailPaths.forEach(P => { vCount += P.length * 2; iCount += (P.length - 1) * 6; });

  const pos  = new Float32Array(vCount * 3),
        prev = new Float32Array(vCount * 3),
        next = new Float32Array(vCount * 3),
        side = new Float32Array(vCount),
        arc  = new Float32Array(vCount),
        trl  = new Float32Array(vCount);
  const idx = vCount > 65535 ? new Uint32Array(iCount) : new Uint16Array(iCount);

  let v = 0, ii = 0;
  trailPaths.forEach((P, t) => {
    const n = P.length;
    const cum = new Float32Array(n); let tot = 0;
    for (let i = 1; i < n; i++) { tot += P[i].distanceTo(P[i-1]); cum[i] = tot; }
    if (tot < 1e-5) tot = 1;

    const base = v;
    for (let i = 0; i < n; i++) {
      const pt = P[i], pp = P[Math.max(0, i-1)], np = P[Math.min(n-1, i+1)];
      for (let sd = 0; sd < 2; sd++) {
        const o = v * 3;
        pos[o]=pt.x;  pos[o+1]=pt.y;  pos[o+2]=pt.z;
        prev[o]=pp.x; prev[o+1]=pp.y; prev[o+2]=pp.z;
        next[o]=np.x; next[o+1]=np.y; next[o+2]=np.z;
        /* arc runs 1 at the trailhead to 0 at the summit, so the reveal below
           reads as a climb rather than as a line being extruded downhill */
        side[v] = sd ? 1 : -1; arc[v] = 1 - cum[i] / tot; trl[v] = t;
        v++;
      }
    }
    for (let i = 0; i < n - 1; i++) {
      const a = base + i * 2;
      idx[ii++]=a; idx[ii++]=a+1; idx[ii++]=a+2;
      idx[ii++]=a+1; idx[ii++]=a+3; idx[ii++]=a+2;
    }
  });

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aPrev',    new THREE.BufferAttribute(prev, 3));
  g.setAttribute('aNext',    new THREE.BufferAttribute(next, 3));
  g.setAttribute('aSide',    new THREE.BufferAttribute(side, 1));
  g.setAttribute('aArc',     new THREE.BufferAttribute(arc, 1));
  g.setAttribute('aTrail',   new THREE.BufferAttribute(trl, 1));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 20, -60), 340);
  return g;
}

const NTR = trailPaths.length;
const trailMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, depthTest: true, side: THREE.DoubleSide,
  defines: { NT: NTR },
  uniforms: {
    uHalfRes: { value: new THREE.Vector2(1, 1) },
    uWidth:   { value: 2.3 },                       // CSS px — heaviest mark on the sheet, but only just
    uProgress:{ value: new Array(NTR).fill(0) },    // 0 = unclimbed, 1 = at the summit
    uColor:   { value: PATH_CLR.map(srgbVec) },
    uGlow:    { value: 0 },     // the route is the accent exactly; bloom is opt-in
    uFogNear: { value: 210 },
    uFogFar:  { value: 430 },
  },
  vertexShader: `
    attribute vec3 aPrev, aNext;
    attribute float aSide, aArc, aTrail;
    uniform vec2 uHalfRes;
    uniform float uWidth, uFogNear, uFogFar;
    uniform float uProgress[NT];
    uniform vec3 uColor[NT];
    varying float vArc, vProg, vFog;
    varying vec3 vCol;
    void main(){
      vec4 cur = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      vec4 prv = projectionMatrix * modelViewMatrix * vec4(aPrev,   1.0);
      vec4 nxt = projectionMatrix * modelViewMatrix * vec4(aNext,   1.0);

      vec2 cs = cur.xy / max(1e-5, abs(cur.w)) * uHalfRes;
      vec2 ps = prv.xy / max(1e-5, abs(prv.w)) * uHalfRes;
      vec2 ns = nxt.xy / max(1e-5, abs(nxt.w)) * uHalfRes;

      vec2 dA = cs - ps, dB = ns - cs;
      float lA = length(dA), lB = length(dB);
      dA = lA > 1e-4 ? dA / lA : vec2(0.0);
      dB = lB > 1e-4 ? dB / lB : vec2(0.0);
      if (lA <= 1e-4) dA = dB;
      if (lB <= 1e-4) dB = dA;
      if (length(dA + dB) < 1e-4) dB = dA;

      vec2 tg = normalize(dA + dB);
      vec2 mi = vec2(-tg.y, tg.x);
      vec2 nA = vec2(-dA.y, dA.x);
      float k = 1.0 / clamp(abs(dot(mi, nA)), 0.35, 1.0);
      cur.xy += (mi * aSide * uWidth * 0.5 * k) / uHalfRes * cur.w;

      float pr = uProgress[0]; vec3 cl = uColor[0];
      for (int i = 0; i < NT; i++){
        if (abs(float(i) - aTrail) < 0.5){ pr = uProgress[i]; cl = uColor[i]; }
      }
      vArc = aArc; vProg = pr; vCol = cl;

      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vFog = 1.0 - smoothstep(uFogNear, uFogFar, -mv.z);
      gl_Position = cur;
    }`,
  fragmentShader: `
    precision highp float;
    varying float vArc, vProg, vFog;
    varying vec3 vCol;
    uniform float uGlow;
    void main(){
      /* aArc is 1 at the trailhead and 0 at the summit, so after climbing a
         fraction p the walked part is everything with aArc above 1 - p. The
         edges have to run low-to-high or smoothstep reverses and an unclimbed
         route draws in full. */
      float climbed = 1.0 - vProg;
      float on = smoothstep(climbed - 0.012, climbed + 0.012, vArc);
      if (on < 0.01) discard;

      /* the leading end burns brighter — it reads as a position on the route
         rather than as a line that happens to be growing */
      float head = exp(-pow((vArc - climbed) / 0.045, 2.0))
                 * step(0.001, vProg) * step(vProg, 0.999);

      /* Added, not multiplied. Multiplying by 1.5 pushed the red channel past
         1.0 and clipped it, which is what turned a coral route orange. */
      vec3 col = vCol + vCol * uGlow * 0.3 + vec3(1.0) * head * 0.75;
      float a = on * vFog * (0.92 + 0.08 * head);
      gl_FragColor = vec4(col, min(1.0, a));
    }`,
});

const trailMesh = new THREE.Mesh(buildTrailGeometry(), trailMat);
trailMesh.frustumCulled = false;
trailMesh.renderOrder = 4;          // above the contours — it is the top mark
mountainGroup.add(trailMesh);

const trailProgress = new Array(NTR).fill(0);

// Base origin dot (world scale adjusted each frame ≈ BASE_DOT_SCREEN_PX on screen).
// It moves to the foot of whichever ascent is active.
const BASE_DOT_GEO_R = 0.5;
const baseDot = new THREE.Mesh(
  new THREE.SphereGeometry(BASE_DOT_GEO_R, 12, 12),
  new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })
);
baseDot.position.set(TREK[0].base.x, mh(TREK[0].base.x, TREK[0].base.z)+0.65, TREK[0].base.z);
mountainGroup.add(baseDot);

function buildCaseCam(live) {
  const e = SURVEY.elev * Math.PI / 180;
  const up = SURVEY.dist * Math.sin(e), out = SURVEY.dist * Math.cos(e);
  CASE_CAM = PROJECT_PEAKS.map((pi, i) => {
    const t = PEAK_TOP[pi], a = CASE_AZIM[i] * Math.PI / 180;
    const tgt = new THREE.Vector3(t.x, PEAK_H[pi] * SURVEY.look, t.z);
    return {
      tgt,
      pos: new THREE.Vector3(tgt.x + out * Math.sin(a), tgt.y + up, tgt.z + out * Math.cos(a)),
    };
  });
  if (live && framing === 'case' && focused >= 0) {
    if (camAnim) { camAnim.kill(); camTweening = false; }
    camBase.copy(CASE_CAM[focused].pos);
    camTarget.copy(CASE_CAM[focused].tgt);
  }
}
buildCaseCam(false);
/** Longer flights get longer, so the pan holds a roughly constant ground speed. */
function flightDur(to) {
  return Math.min(3.1, Math.max(1.5, camBase.distanceTo(to) / 74));
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONTOUR LAYER
   The same mountain, redrawn as its own level sets. Nothing here invents a
   second terrain: marching squares runs over mh(x,z) — the exact heightfield
   the shaded mesh is built from — so every line lies on the surface you were
   just looking at, seen through the same camera.

   field → marching squares → smooth → resample → smooth → snap back onto the
   level → screen-space ribbons (so stroke width is exact at any DPR).
   ═══════════════════════════════════════════════════════════════════════════ */
const CT = {
  LEVELS: 30,        // contour count on the tallest peak; the interval is shared
  START: 1,          // the lowest contours are the ones that run between the
                     // summits, so they are what makes the range one landmass
  INDEX_EVERY: 5,    // every Nth line is an index (heavy) contour
  W_MINOR: 1.35,     // CSS px
  W_INDEX: 2.70,
  LIFT: 0.12,        // world units the ribbon floats off the surface
  OPACITY: 0.92,
  STEP: 0.56,        // field spacing — fine enough to resolve the fluting
  X0: -186, X1: 190, // the field covers the whole range, in one piece
  Z0: -196, Z1:  58,
  FADE_R: 232,       // radius the aerial fade is measured against
  MIN_LEN: 7,        // world units — anything shorter is a speck, not a contour

  /* ── dotted rings ──────────────────────────────────────────────────────
     The lowest contours — the ones running between the summits rather than up
     them — are drawn as a travelling row of dots instead of a solid stroke,
     which is what Contour Ridge does with its outermost three levels. Lifted
     from that page verbatim: period 0.42 world units, the dot holding to 0.16
     of it and gone by 0.30, drifting at 0.16 units a second.

     Those numbers are in WORLD units, which is the whole reason the geometry
     below grows a second arc attribute. The normalised one it already had is
     a fraction of a ring's own circumference, so dots measured against it
     would come out at the same COUNT on every ring — twelve around a tiny
     summit ring and twelve around a base ring fifty times its length.
     Measured in world units they come out at the same SIZE, which is what
     reads as one dotted pen rather than as a dashed circle. */
  DOTTED_LEVELS: 3,  // how many of the lowest rings are dotted
  DOT_PERIOD: 0.42,  // world units from one dot to the next
  DOT_ON:     0.16,  // where the dot starts fading out, as a fraction of that
  DOT_OFF:    0.30,  // and where it has gone
  DOT_FLOW:   0.16,  // world units a second the row drifts along its own arc

  /* The summit's own rings. The top few contours of the studio's massif are
     drawn in the accent rather than in ink and can be lifted off the mountain
     under the cursor — the same three rings the reference site wears at its
     peak, and the same object tibba-peak.html lifts on hover.

     They are not separate geometry. A ring is flagged in the contour buffer
     and the shaders do the rest, so it stays part of the same survey sheet:
     it takes the ink sweep, the aerial fade and the occlusion exactly as every
     other contour does, and there is no second mesh to keep in step. */
  ACCENT_TOP: 3,     // rings down from the summit that wear the accent
  RING_LIFT: 1.15,   // world units the hovered ring rises
};

/* One field across the entire range rather than a box per summit. Local boxes
   are cheaper, but they stop at their own edges: the contours die out in the
   saddles and every peak ends up sitting on its own separate base. A single
   grid gives one continuous survey — ridges and cols carry through from one
   summit to the next, which is what makes it read as a range. */
let CF, CT_NX, CT_NZ, CT_STEP, CT_ORX, CT_ORZ;

function ctBuildField() {
  CT_STEP = CT.STEP;
  CT_ORX = CT.X0; CT_ORZ = CT.Z0;
  CT_NX = Math.round((CT.X1 - CT.X0) / CT_STEP) + 1;
  CT_NZ = Math.round((CT.Z1 - CT.Z0) / CT_STEP) + 1;
  CF = new Float32Array(CT_NX * CT_NZ);
  for (let j = 0; j < CT_NZ; j++) {
    const z = CT_ORZ + j * CT_STEP;
    for (let i = 0; i < CT_NX; i++) CF[j * CT_NX + i] = mh(CT_ORX + i * CT_STEP, z);
  }
}

function ctField(i, j) {
  i = i < 0 ? 0 : (i > CT_NX - 1 ? CT_NX - 1 : i);
  j = j < 0 ? 0 : (j > CT_NZ - 1 ? CT_NZ - 1 : j);
  return CF[j * CT_NX + i];
}
function ctSample(x, z) {                       // bilinear read of the field
  const gx = (x - CT_ORX) / CT_STEP, gz = (z - CT_ORZ) / CT_STEP;
  const i = Math.floor(gx), j = Math.floor(gz), fx = gx - i, fz = gz - j;
  const a = ctField(i, j), b = ctField(i + 1, j), c = ctField(i, j + 1), d = ctField(i + 1, j + 1);
  return a + (b - a) * fx + (c - a) * fz + (d - c - b + a) * fx * fz;
}
function ctSlope(x, z) {
  const e = CT_STEP;
  const gx = (ctSample(x + e, z) - ctSample(x - e, z)) / (2 * e);
  const gz = (ctSample(x, z + e) - ctSample(x, z - e)) / (2 * e);
  return Math.hypot(gx, gz);
}

/* --------------------------- marching squares ---------------------------- */
function ctHEdge(i, j) { return j * (CT_NX - 1) + i; }
function ctVEdge(i, j) { return (CT_NX - 1) * CT_NZ + j * CT_NX + i; }

function contoursAt(level) {
  const pos = new Map(), segs = [], adj = new Map();

  function px(i, j, i2, j2, eid) {
    if (pos.has(eid)) return eid;
    const f0 = CF[j * CT_NX + i], f1 = CF[j2 * CT_NX + i2];
    let t = (level - f0) / (f1 - f0);
    if (!isFinite(t)) t = 0.5;
    t = t < 0 ? 0 : (t > 1 ? 1 : t);
    pos.set(eid, [CT_ORX + (i + (i2 - i) * t) * CT_STEP, CT_ORZ + (j + (j2 - j) * t) * CT_STEP]);
    return eid;
  }
  function add(e1, e2) {
    const k = segs.length; segs.push([e1, e2]);
    const a = adj.get(e1); if (a) a.push(k); else adj.set(e1, [k]);
    const b = adj.get(e2); if (b) b.push(k); else adj.set(e2, [k]);
  }

  for (let j = 0; j < CT_NZ - 1; j++) {
    for (let i = 0; i < CT_NX - 1; i++) {
      const a = CF[j * CT_NX + i], b = CF[j * CT_NX + i + 1],
            c = CF[(j + 1) * CT_NX + i + 1], d = CF[(j + 1) * CT_NX + i];
      const code = (a >= level ? 1 : 0) | (b >= level ? 2 : 0) | (c >= level ? 4 : 0) | (d >= level ? 8 : 0);
      if (code === 0 || code === 15) continue;

      let B = 0, R = 0, T = 0, L = 0;
      if ((code & 1) !== ((code >> 1) & 1)) B = px(i, j, i + 1, j, ctHEdge(i, j));
      if (((code >> 1) & 1) !== ((code >> 2) & 1)) R = px(i + 1, j, i + 1, j + 1, ctVEdge(i + 1, j));
      if (((code >> 3) & 1) !== ((code >> 2) & 1)) T = px(i, j + 1, i + 1, j + 1, ctHEdge(i, j + 1));
      if ((code & 1) !== ((code >> 3) & 1)) L = px(i, j, i, j + 1, ctVEdge(i, j));

      switch (code) {
        case 1: case 14: add(L, B); break;
        case 2: case 13: add(B, R); break;
        case 3: case 12: add(L, R); break;
        case 4: case 11: add(R, T); break;
        case 6: case 9:  add(B, T); break;
        case 7: case 8:  add(T, L); break;
        case 5:  if ((a+b+c+d) * 0.25 >= level) { add(B,R); add(T,L); } else { add(L,B); add(R,T); } break;
        case 10: if ((a+b+c+d) * 0.25 >= level) { add(L,B); add(R,T); } else { add(B,R); add(T,L); } break;
      }
    }
  }

  const used = new Uint8Array(segs.length), lines = [];
  const other = (seg, e) => (seg[0] === e ? seg[1] : seg[0]);
  function walk(startSeg, startEdge) {
    const pts = []; let e = startEdge, s = startSeg;
    pts.push(pos.get(e));
    for (;;) {
      used[s] = 1;
      e = other(segs[s], e);
      pts.push(pos.get(e));
      const list = adj.get(e); let nxt = -1;
      if (list) for (let q = 0; q < list.length; q++) if (!used[list[q]]) { nxt = list[q]; break; }
      if (nxt < 0) break;
      s = nxt;
    }
    return pts;
  }
  for (let p = 0; p < 2; p++) {                  // open chains first, then rings
    for (let k = 0; k < segs.length; k++) {
      if (used[k]) continue;
      const s0 = segs[k]; let start = -1;
      if (p === 0) {
        if ((adj.get(s0[0]) || []).length === 1) start = s0[0];
        else if ((adj.get(s0[1]) || []).length === 1) start = s0[1];
        else continue;
      } else start = s0[0];
      const pts = walk(k, start);
      if (pts.length > 12) lines.push(pts);
    }
  }
  return lines;
}

/* ---------------------------- line conditioning -------------------------- */
/* Marching squares emits points at wildly uneven spacing — short slivers where
   a contour clips a cell corner. Re-walking at a fixed step removes them, which
   is most of what makes a stroke look jagged. */
function ctSmooth(pts) {
  const n = pts.length, out = new Array(n);
  out[0] = pts[0]; out[n - 1] = pts[n - 1];
  for (let i = 1; i < n - 1; i++)
    out[i] = [(pts[i-1][0] + 2*pts[i][0] + pts[i+1][0]) * 0.25,
              (pts[i-1][1] + 2*pts[i][1] + pts[i+1][1]) * 0.25];
  return out;
}
function ctResample(pts, spacing) {
  const out = [pts[0]]; let acc = 0, cur = pts[0];
  for (let i = 1; i < pts.length; i++) {
    const nx = pts[i][0], nz = pts[i][1];
    let dx = nx - cur[0], dz = nz - cur[1], seg = Math.hypot(dx, dz);
    while (acc + seg >= spacing && seg > 1e-9) {
      const need = (spacing - acc) / seg;
      cur = [cur[0] + dx * need, cur[1] + dz * need];
      out.push(cur);
      dx = nx - cur[0]; dz = nz - cur[1]; seg = Math.hypot(dx, dz); acc = 0;
    }
    acc += seg; cur = [nx, nz];
  }
  if (out.length < 2) out.push(pts[pts.length - 1]);
  return out;
}
/* Smoothing moves a polyline off its own level set, which buries parts of it in
   the terrain once the depth pass is accurate. Two Newton steps along the
   gradient put every point back on the contour, keeping the smoothed shape. */
function ctSnap(pts, lev) {
  const e = CT_STEP;
  /* A Newton step is (level - height) / |grad|², so it blows up wherever the
     ground is nearly flat — and the range is now full of nearly flat ground:
     mesa tops, benches, the apron under the hero summit. Unbounded, a single
     step throws a point tens of units across the map, which is what tore the
     contours into long straight jogs and broken runs. The point began on its
     level set and has only been nudged off it by the smoothing passes, so no
     honest correction is more than a cell or two — cap it there and a
     degenerate gradient can no longer do any damage. */
  const CAP = CT_STEP * 1.5;
  for (let i = 0; i < pts.length; i++) {
    let x = pts[i][0], z = pts[i][1];
    for (let it = 0; it < 3; it++) {
      const gx = (ctSample(x+e, z) - ctSample(x-e, z)) / (2*e);
      const gz = (ctSample(x, z+e) - ctSample(x, z-e)) / (2*e);
      const g2 = gx*gx + gz*gz;
      if (!(g2 > 1e-6)) break;                      // also catches NaN
      let k = (lev - ctSample(x, z)) / g2;
      const mv = Math.hypot(gx * k, gz * k);
      if (!(mv > 0)) break;
      if (mv > CAP) k *= CAP / mv;                  // never further than a cell or two
      x += gx * k; z += gz * k;
    }
    pts[i] = [x, z];
  }
  return pts;
}

/* --------------------------- ribbon geometry ----------------------------- */
/* Each polyline becomes a quad strip. The vertex shader does the widening in
   screen space, so a stroke keeps one pixel width at any depth or DPR — and it
   scales with nothing, which is what stops the lines going heavy as the camera
   pulls back across the range. */
/* Rebuilt in place, keeping the mesh. Replacing the mesh would lose its
   position in mountainGroup and its render order, and the material — which
   holds every uniform the panel has been setting — along with them. */
function rebuildContours() {
  const g = buildContourGeometry();
  contourMesh.geometry.dispose();
  contourMesh.geometry = g;
}

/* Where the summit's accent rings sit in the world, filled as the geometry is
   built. The page projects these to find what the cursor is over — the rings
   are the one part of this scene with copy attached to them, and hit-testing
   three small ellipses is a job for the DOM rather than for a ray march. */
const ACCENT_RINGS = [];

function buildContourGeometry() {
  ACCENT_RINGS.length = 0;
  ctBuildField();
  const lines = [];
  /* One vertical interval across the whole range. Contours that share an
     elevation carry through from summit to saddle to summit, which is what
     makes it one survey sheet rather than five separate charts. */
  const interval = MAX_H / CT.LEVELS;

  for (let n = CT.START; n <= CT.LEVELS; n++) {
    const level = n * interval;
    const isIndex = (n % CT.INDEX_EVERY) === 0;
    const polys = contoursAt(level);

    for (let q = 0; q < polys.length; q++) {
      let pl = polys[q];
      for (let sm = 0; sm < 4; sm++) pl = ctSmooth(pl);
      if (pl.length < 12) continue;
      pl = ctResample(pl, CT_STEP * 1.15);
      if (pl.length < 10) continue;
      for (let sm = 0; sm < 3; sm++) pl = ctSmooth(pl);
      pl = ctSnap(pl, level);

      /* closed rings lose the duplicated end point so there is no seam */
      const closed = Math.hypot(pl[0][0] - pl[pl.length-1][0],
                                pl[0][1] - pl[pl.length-1][1]) < CT_STEP * 0.9;
      if (closed) pl = pl.slice(0, pl.length - 1);
      if (pl.length < 8) continue;

      let mx = 0, mz = 0, len = 0;
      for (let w = 0; w < pl.length; w++) { mx += pl[w][0]; mz += pl[w][1]; }
      for (let w = 1; w < pl.length; w++) len += Math.hypot(pl[w][0]-pl[w-1][0], pl[w][1]-pl[w-1][1]);
      if (len < CT.MIN_LEN) continue;
      mx /= pl.length; mz /= pl.length;

      /* Steep flanks read denser and the summit blocks read strongest, so the
         flat country between peaks stays as hairlines and does not compete.
         Kept deliberately gentle all the same: modulate a stroke too hard and
         an index contour on a flank ends up thinner than a minor one in the
         middle, which is the hierarchy the heavy line existed to carry. */
      const steep = Math.min(1, ctSlope(pl[0][0], pl[0][1]) / 1.5);
      let central = 0;
      for (let k = 0; k < PEAKS.length; k++)
        central = Math.max(central, Math.exp(-Math.pow(Math.hypot(mx - PEAKS[k].x, mz - PEAKS[k].z) / (PEAKS[k].spread * 1.5), 2.2)));
      const w = (isIndex ? CT.W_INDEX : CT.W_MINOR) * (0.62 + 0.38 * steep) * (0.62 + 0.38 * central);

      /* The lowest rings are the ones carrying between the summits, and they
         are the ones that go dotted — counted from CT.START, so moving where
         the sheet begins does not change which rings are dashed. */
      const dotted = n < CT.START + CT.DOTTED_LEVELS;

      /* Is this ring one of the studio massif's own? Answered by where it is,
         not by how high it is. Height alone looked like it would do — peak 0
         is the tallest thing in the range and MAX_H is measured on it — but
         that is only true of the four client summits as authored. The hero
         generates its own country at random, and two generated landforms whose
         skirts overlap sum to something taller than the massif, at which point
         the top three levels belong to a hill on the horizon and the accent
         rings are painted on the wrong mountain.

         Proximity is true in both modes and under any terrain. */
      const near0 = Math.hypot(mx - PEAKS[0].x, mz - PEAKS[0].z) < PEAKS[0].spread * 0.9;
      let rr = 0;
      for (const q of pl) rr += Math.hypot(q[0] - mx, q[1] - mz);

      lines.push({ pts: pl, level, weight: w, closed, dotted, ring: 0,
                   near0, cx: mx, cz: mz, cr: rr / pl.length });
    }
  }

  /* The accent rings, chosen after the whole sheet exists rather than during
     it. Taking "the top three levels" as they are generated does not work: the
     very highest level of a field is a single point, not a ring, so marching
     squares returns nothing for it and counting it leaves two. Picking the
     three highest rings that were actually BUILT takes whatever the field
     gave, and is right whether the summit lands on a level or between two. */
  const crown = lines.filter(L => L.near0 && L.closed)
                     .sort((a, b) => b.level - a.level)
                     .slice(0, CT.ACCENT_TOP);
  crown.forEach((L, i) => {
    L.ring = i + 1;                                   // 1 is the topmost
    ACCENT_RINGS[i] = { x: L.cx, z: L.cz, y: L.level, r: L.cr };
  });

  let vCount = 0, iCount = 0;
  for (const L of lines) { vCount += L.pts.length * 2; iCount += (L.pts.length - 1) * 6; }

  const pos  = new Float32Array(vCount * 3),
        prev = new Float32Array(vCount * 3),
        next = new Float32Array(vCount * 3),
        side = new Float32Array(vCount),
        wid  = new Float32Array(vCount),
        rad  = new Float32Array(vCount),
        lev  = new Float32Array(vCount),
        arc  = new Float32Array(vCount),
        arcW = new Float32Array(vCount),   // the same walk, in world units
        dot  = new Float32Array(vCount),   // 1 on the rings that are dotted
        rng  = new Float32Array(vCount);   // 1..3 on the summit's accent rings
  const idx = vCount > 65535 ? new Uint32Array(iCount) : new Uint16Array(iCount);

  /* every point's height, clear of the mesh */
  const ySafe = (x, z, level) => Math.max(level, meshYAt(x, z)) + CT.LIFT;

  let v = 0, ii = 0;
  for (const L of lines) {
    const P = L.pts, n = P.length;
    const cum = new Float32Array(n); let tot = 0;
    for (let i = 1; i < n; i++) { tot += Math.hypot(P[i][0]-P[i-1][0], P[i][1]-P[i-1][1]); cum[i] = tot; }
    if (tot < 1e-5) tot = 1;

    const base = v;
    for (let i = 0; i < n; i++) {
      const pt = P[i];
      const pp = P[L.closed ? (i === 0 ? n - 1 : i - 1) : Math.max(0, i - 1)];
      const np = P[L.closed ? (i === n - 1 ? 0 : i + 1) : Math.min(n - 1, i + 1)];
      /* distance from the middle of the range, normalised — one aerial fade for
         the whole sheet, so the country dissolves at the horizon and nowhere else */
      const r = Math.hypot(pt[0], pt[1] + 60) / CT.FADE_R;
      const yc = ySafe(pt[0], pt[1], L.level);
      const yp = ySafe(pp[0], pp[1], L.level);
      const yn = ySafe(np[0], np[1], L.level);
      for (let sd = 0; sd < 2; sd++) {
        const o = v * 3;
        pos[o] = pt[0];  pos[o+1] = yc; pos[o+2] = pt[1];
        prev[o] = pp[0]; prev[o+1] = yp; prev[o+2] = pp[1];
        next[o] = np[0]; next[o+1] = yn; next[o+2] = np[1];
        side[v] = sd ? 1 : -1; wid[v] = L.weight; rad[v] = r;
        lev[v] = L.level; arc[v] = cum[i] / tot;
        arcW[v] = cum[i]; dot[v] = L.dotted ? 1 : 0; rng[v] = L.ring;
        v++;
      }
    }
    for (let i = 0; i < n - 1; i++) {
      const a = base + i * 2;
      idx[ii++] = a; idx[ii++] = a + 1; idx[ii++] = a + 2;
      idx[ii++] = a + 1; idx[ii++] = a + 3; idx[ii++] = a + 2;
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aPrev',    new THREE.BufferAttribute(prev, 3));
  g.setAttribute('aNext',    new THREE.BufferAttribute(next, 3));
  g.setAttribute('aSide',    new THREE.BufferAttribute(side, 1));
  g.setAttribute('aWidth',   new THREE.BufferAttribute(wid, 1));
  g.setAttribute('aRadius',  new THREE.BufferAttribute(rad, 1));
  g.setAttribute('aLevel',   new THREE.BufferAttribute(lev, 1));
  g.setAttribute('aArc',     new THREE.BufferAttribute(arc, 1));
  g.setAttribute('aArcW',    new THREE.BufferAttribute(arcW, 1));
  g.setAttribute('aDot',     new THREE.BufferAttribute(dot, 1));
  g.setAttribute('aRing',    new THREE.BufferAttribute(rng, 1));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, MAX_H * 0.4, -60), 340);
  CF = null;                       // the field is only needed during the build
  return g;
}

/* The palette is lifted verbatim from the surface shader. That is the whole
   trick behind the crossfade reading as one object: at the moment the sweep
   crosses a band, the ink under it is the exact colour the shading was. */
const contourMat = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  depthTest: true,
  side: THREE.DoubleSide,
  defines: { NP: PEAKS.length },
  uniforms: {
    uHalfRes:  { value: new THREE.Vector2(1, 1) },
    uWeight:   { value: 1 },
    uPeak:     { value: PEAK_XZS },
    uCut:      { value: PEAKS.map(() => 1e4) },
    uMorphA:   { value: PEAKS.map(() => 0) },
    uPeakH:    { value: PEAK_TONE.slice() },
    uReveal:   { value: PEAKS.map(() => 1) },   // per-peak ink master, 0 hides a peak outright
    uLit:      { value: PEAKS.map(() => 0) },   // per-peak highlight, 0..1
    uAnyLit:   { value: 0 },
    uHiWeight: { value: 0.30 },
    uDim:      { value: 0.38 },
    uHoverCol: { value: srgbVec(0x7B8FF5) },     // the pointed-at peak's colour
    uHoverY:   { value: -1e4 },                 // elevation under the cursor
    uHoverXZ:  { value: new THREE.Vector2() },
    uHoverAmt: { value: 0 },
    uHoverBand:{ value: 2.8 },                  // half-width of the lit band, world units
    uHoverR:   { value: 60 },                   // how far round the ring it carries
    uHoverPeak:{ value: -1 },                   // which summit the pointer is on
    uPulse:    { value: 0 },
    uBand:     { value: MAX_H * 0.11 },
    uMode:     { value: 0 },
    uOpacity:  { value: CT.OPACITY },
    /* the dotted rings — uTime is ticked in the render loop below */
    uTime:      { value: 0 },
    uDotPeriod: { value: CT.DOT_PERIOD },
    uDotOn:     { value: CT.DOT_ON },
    uDotOff:    { value: CT.DOT_OFF },
    uDotFlow:   { value: CT.DOT_FLOW },
    /* the summit's accent rings — lift and heat, one per ring */
    uAccent:    { value: srgbVec(0xE85D3D) },
    uRingLift:  { value: [0, 0, 0] },
    uRingHot:   { value: [0, 0, 0] },
    uEdgeAmt:  { value: 0 },
    uFadeA:    { value: 0.74 },                 // aerial fade, in units of the range's reach
    uFadeB:    { value: 1.0 },
    uFogNear:  { value: 200 },
    uFogFar:   { value: 520 },
    uInk:      { value: new THREE.Color(0x9FB0E8) },
    uEdge:     { value: new THREE.Color(0xC9D4FF) },
  },
  vertexShader: `
    attribute vec3 aPrev, aNext;
    attribute float aSide, aWidth, aRadius, aArc, aLevel, aArcW, aDot, aRing;
    uniform vec2 uHalfRes;
    uniform float uWeight, uFogNear, uFogFar;
    uniform vec3 uPeak[NP];
    uniform float uCut[NP];
    uniform float uMorphA[NP];
    uniform float uPeakH[NP];
    uniform float uReveal[NP];
    uniform float uLit[NP];
    uniform float uHiWeight;
    uniform float uHoverPeak;
    uniform float uRingLift[3];
    varying float vY, vR, vArc, vCut, vMorph, vMax, vReveal, vFog, vOn, vLit, vSame;
    varying float vArcW, vDot, vRing, vRingHot;
    varying vec2  vXZ;

    uniform float uRingHot[3];

    void main(){
      /* A lifted ring rises off the mountain without the mountain moving with
         it. Resolved with a loop rather than by indexing the uniform array
         with a varying — dynamic indexing of a uniform array is not something
         every GLSL ES 1.0 driver will take, and three iterations costs less
         than finding out which ones will. */
      vec3 p = position, pP = aPrev, pN = aNext;
      vRing = aRing; vRingHot = 0.0;
      for (int k = 0; k < 3; k++) {
        if (aRing > float(k) + 0.5 && aRing < float(k) + 1.5) {
          p.y  += uRingLift[k];
          pP.y += uRingLift[k];
          pN.y += uRingLift[k];
          vRingHot = uRingHot[k];
        }
      }

      vec4 cur = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      vec4 prv = projectionMatrix * modelViewMatrix * vec4(pP,  1.0);
      vec4 nxt = projectionMatrix * modelViewMatrix * vec4(pN,  1.0);

      vec2 cs = cur.xy / max(1e-5, abs(cur.w)) * uHalfRes;
      vec2 ps = prv.xy / max(1e-5, abs(prv.w)) * uHalfRes;
      vec2 ns = nxt.xy / max(1e-5, abs(nxt.w)) * uHalfRes;

      vec2 dA = cs - ps, dB = ns - cs;
      float lA = length(dA), lB = length(dB);
      dA = lA > 1e-4 ? dA / lA : vec2(0.0);
      dB = lB > 1e-4 ? dB / lB : vec2(0.0);
      if (lA <= 1e-4) dA = dB;
      if (lB <= 1e-4) dB = dA;
      if (length(dA + dB) < 1e-4) dB = dA;

      vec2 tg = normalize(dA + dB);
      vec2 mi = vec2(-tg.y, tg.x);
      vec2 nA = vec2(-dA.y, dA.x);
      float k = 1.0 / clamp(abs(dot(mi, nA)), 0.35, 1.0);   // mitre, length-capped

      /* the width has to be widened here, not in the fragment stage — a ribbon
         is geometry, and a highlighted peak reads heavier only if its quads are
         actually fatter */
      float wLit = 0.0;
      for (int i=0;i<NP;i++){
        vec2 dw = position.xz - uPeak[i].xy;
        float qw = dot(dw,dw) / (uPeak[i].z * uPeak[i].z);
        wLit = max(wLit, uLit[i] / (qw*qw + 1.0));
      }
      float wid = aWidth * uWeight * (1.0 + uHiWeight * clamp(wLit, 0.0, 1.0));
      cur.xy += (mi * aSide * wid * 0.5 * k) / uHalfRes * cur.w;

      /* the same proximity blend the surface uses, so a contour and the fill
         beneath it always agree about which peak they are near */
      float wsum=0.0, c=0.0, m=0.0, hx=0.0, rv=0.0, wmax=0.0, li=0.0, wh=0.0;
      for (int i=0;i<NP;i++){
        vec2 dd = position.xz - uPeak[i].xy;
        float q = dot(dd,dd) / (uPeak[i].z * uPeak[i].z);
        float w = 1.0 / (q*q + 0.02);
        wsum += w; wmax = max(wmax, w);
        c += uCut[i]*w; m += uMorphA[i]*w; hx += uPeakH[i]*w; rv += uReveal[i]*w;
        li += uLit[i]*w;
        /* how much of this line belongs to the summit the pointer is on — the
           same proximity weighting everything else uses, so it hands over
           smoothly across a saddle instead of switching at a hard boundary */
        if (abs(float(i) - uHoverPeak) < 0.5) wh = w;
      }
      vCut = c/wsum; vMorph = m/wsum; vMax = hx/wsum; vReveal = rv/wsum;
      vLit = li/wsum; vXZ = position.xz;
      vSame = wh / wsum;
      vOn = smoothstep(0.02, 0.85, wmax);

      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vFog = 1.0 - smoothstep(uFogNear, uFogFar, -mv.z);

      /* the sweep, the hover band and the palette all key off the contour's own
         elevation — not the height its geometry was nudged to */
      vY = aLevel; vR = aRadius; vArc = aArc;
      vArcW = aArcW; vDot = aDot;
      gl_Position = cur;
    }`,
  fragmentShader: `
    precision highp float;
    varying float vY, vR, vArc, vCut, vMorph, vMax, vReveal, vFog, vOn, vLit, vSame;
    varying float vArcW, vDot, vRing, vRingHot;
    varying vec2  vXZ;
    uniform float uBand, uMode, uOpacity, uFadeA, uFadeB, uEdgeAmt;
    uniform float uTime, uDotPeriod, uDotOn, uDotOff, uDotFlow;
    uniform vec3  uAccent;
    uniform float uAnyLit, uDim;
    uniform float uHoverY, uHoverAmt, uHoverBand, uHoverR, uPulse;
    uniform vec2  uHoverXZ;
    uniform vec3 uInk, uEdge, uHoverCol;
    ${CT_PALETTE_GLSL}
    void main(){
      float t = clamp(vY / vMax, 0.0, 1.0);

      /* how much of this line has been drawn yet */
      float vis;
      float edge = 0.0;
      if (uMode < 0.5) {                        // sweep — an elevation plane travels
        vis  = smoothstep(vCut - uBand, vCut + uBand, vY);
        edge = exp(-pow((vY - vCut) / max(0.001, uBand * 0.85), 2.0)) * vOn * uEdgeAmt;
      } else if (uMode < 1.5) {                 // ink — floods down from the summit
        float lead = clamp(vMorph * 1.9 - (1.0 - t) * 0.9, 0.0, 1.0);
        vis  = smoothstep(vArc, vArc + 0.035, lead);
        edge = exp(-pow((lead - vArc) / 0.05, 2.0)) * step(0.001, lead) * step(lead, 0.999);
      } else {                                  // fade — the flat baseline
        vis = smoothstep(0.0, 1.0, vMorph);
      }

      /* aerial fade: the country around each summit drops away so the range
         reads as discrete peaks rather than one field of noise */
      float aer = 1.0 - smoothstep(uFadeA, uFadeB, vR);

      vec3 col = mix(palette(t) * 1.70, uInk, 0.52);
      col = mix(col, uEdge, edge * 0.85);
      col += uEdge * edge * 0.35;

      /* The ground itself stays the same ink at every peak. Recolouring a whole
         summit made the mountain the subject; the route up it is the subject,
         and it carries the project's colour on its own. All that survives here
         is a little extra weight on the peak being discussed. */
      float live = smoothstep(0.0, 0.03, vMorph) * vReveal * vFog;
      float a = vis * aer * uOpacity * live;
      a *= mix(0.72, 1.0, t);                   // low ground sits back, but stays
      a = max(a, edge * aer * 0.55 * live);
      /* everything that is not the peak under discussion recedes a little, so
         the route being drawn has a quieter drawing to sit on */
      a *= mix(1.0, 1.0 - uDim, clamp(uAnyLit - vLit, 0.0, 1.0));

      /* ── hover ──────────────────────────────────────────────────────────
         A contour is the set of points at one elevation, so pointing at the
         ground and lighting everything at that height is what the line already
         means — the whole ring answers, not just the bit under the cursor.

         But only on the summit being pointed at. Distance alone will not do
         that job: leave any floor under the falloff and every peak in the range
         keeps a share of the highlight, because they all have a contour at that
         elevation. vSame gates it to the hovered peak; the distance term is
         then free to shade the ring from the cursor round to its far side
         without ever reaching across the saddle. */
      float dy = (vY - uHoverY) / uHoverBand;
      float band = exp(-dy * dy);
      float dxz = length(vXZ - uHoverXZ) / uHoverR;
      float hov = uHoverAmt * band * vSame * mix(0.55, 1.0, exp(-dxz * dxz));
      hov *= 0.60 + 0.40 * uPulse;

      /* one colour for the whole highlight: the peak being pointed at. Reading
         it off the per-vertex proximity blend instead tinted the saddle toward
         whichever neighbour was closer, so a ring gated to one summit could
         come up in the colour of the next one along. */
      col = mix(col, uHoverCol, hov * 0.95);
      col += uHoverCol * hov * 0.55;
      a *= 1.0 + 1.1 * hov;                     // and it comes forward off the sheet

      /* ── the summit's rings ────────────────────────────────────────────
         Painted rather than mixed: an accent ring is not ink with a tint on
         it, it is a different pen. Under the cursor it brightens and thickens
         a little, which together with the lift in the vertex shader is the
         whole of the hover. */
      if (vRing > 0.5) {
        col = mix(uAccent, uAccent * 1.5 + 0.28, vRingHot);
        a  *= 1.0 + 0.85 * vRingHot;
      }

      /* ── the dots ──────────────────────────────────────────────────────
         Applied last, so a dotted ring still takes the ink sweep, the aerial
         fade and the hover highlight exactly as a solid one does. The dashes
         only decide where along the stroke ink lands — never what colour it
         is, and never whether it has been revealed yet. */
      if (vDot > 0.5 && uDotPeriod > 0.0) {
        float d = fract((vArcW + uTime * uDotFlow) / uDotPeriod);
        a *= 1.0 - smoothstep(uDotOn, uDotOff, d);
      }

      if (a < 0.004) discard;
      gl_FragColor = vec4(col, min(1.0, a));
    }`,
});

const contourMesh = new THREE.Mesh(buildContourGeometry(), contourMat);
contourMesh.frustumCulled = false;
contourMesh.renderOrder = 2;
mountainGroup.add(contourMesh);

/* A depth-only copy of the surface. It writes nothing to colour, so the
   mountain stays solid to the depth test even once the shading has drained —
   which is what makes contours on the far side genuinely disappear behind the
   ridge instead of showing through like a wireframe. */
const depthMat = new THREE.MeshBasicMaterial({
  colorWrite: false, depthWrite: true,
  polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2,
  side: THREE.DoubleSide,
});
const depthMesh = new THREE.Mesh(geo, depthMat);
depthMesh.renderOrder = -1;
mountainGroup.add(depthMesh);

/* the shaded surface no longer owns depth — the pass above does */
mountainMat.depthWrite = false;
mountainMesh.renderOrder = 1;
ground.renderOrder = -2;

/* ─── Morph driver ───────────────────────────────────────────────────────── */
/* morph 0 = lit, shaded surface.  morph 1 = contour line.
   Every peak carries its own value, which is the whole mechanism behind the
   range: the studio's summit drains to line as the hero scrolls away, and each
   client summit runs the same move backwards — 1 to 0 — when the camera lands
   on it, so the light washes up the flanks exactly the way it does on scroll-up. */
const MORPH = {
  START: 0.26,        // × viewport height — where the hero redraw begins
  END:   0.86,        //                     where it has fully landed
  SPRING: 7.5,        // how hard the hero peak chases the scroll
  ARRIVE_SPRING: 3.1, // slower, so an arriving peak highlights over about a second
  ARRIVE_DELAY: 0.52, // × the camera flight — the highlight starts before it settles
  CLIMB: 2.4,         // seconds the route takes to walk from trailhead to summit
  HANDOFF: 0.85,      // how far the hero peak has drained before the page moves on
  COPY_OUT: 0.72,     // and how far before the flanking copy has finished fading
  mode: 0,            // 0 sweep · 1 ink · 2 fade — the hero fill only
  hiWeight: 0.30,     // how much heavier the peak under discussion draws
  dim: 0.38,          // how far the rest of the range recedes while one is up
  scrub: null,        // panel override on the hero peak; null = driven by scroll
};

const peakMorph  = PEAKS.map((_, i) => (i === 0 ? 0 : 1));  // clients are always line
const peakTarget = peakMorph.slice();
const peakReveal = PEAKS.map((_, i) => (i === 0 ? 1 : 0));  // and start unrevealed
let rangeReveal = 0, rangeRevealTarget = 0, edgeAmt = 0;
let arriveTimer = null;

/* The hero morph is no longer read off window.scrollY. The page owns the
   scroll — it has a loader, six sections and two of these scenes in it — so it
   drives the redraw through setHeroMorph() and this module simply chases the
   value it is given. MORPH.scrub is that value. */
function heroMorphFromScroll() {
  return MORPH.scrub === null ? 0 : MORPH.scrub;
}

/** Highlight one client summit and release the others. -1 highlights none. */
function lightPeak(caseIdx, delaySec) {
  if (arriveTimer) { clearTimeout(arriveTimer); arriveTimer = null; }
  const apply = () => {
    for (let i = 1; i < NPK; i++) peakLitT[i] = 0;
    if (caseIdx >= 0) peakLitT[PROJECT_PEAKS[caseIdx]] = 1;
    arriveTimer = null;
  };
  if (delaySec > 0) arriveTimer = setTimeout(apply, delaySec * 1000);
  else apply();
}

/* The plane travels over the first SWEEP_SPAN of a peak's morph, not all of it.
   Run it to the very end and the last third of the move pushes the cut through
   ground that is already out of frame — the transition reads as finished long
   before the scroll agrees. Landing it early leaves a short settle where the
   survey line fades out and the ink comes up to full. */
const SWEEP_SPAN = 0.78;

function stepMorph(dt) {
  const heroT = heroMorphFromScroll();
  peakTarget[0] = heroT;

  /* In the hero the client range does not exist at all: the brief asks for the
     main peak on its own up there, so the four summits behind it are not merely
     faint, they are never revealed. In 'range' mode it is the other way round —
     the four are the subject and the studio's own massif is the one held back.
     Either way this is the same single number the original page used to fade
     the range up on scroll, which is why the two modes look like one scene. */
  rangeRevealTarget = MODE_RANGE ? 1 : 0;
  rangeReveal += (rangeRevealTarget - rangeReveal) * Math.min(1, dt * 4.5);

  /* Aerial perspective is off in the hero — the original framing has no haze on
     it anywhere — and closes in as the range appears, so neighbouring summits
     recede with distance instead of stacking up at equal strength. */
  /* The fade normally tracks the redraw — off in the hero, closing in as the
     range appears. Once a caller has set it by hand that stops: a control that
     is overwritten sixty times a second is not a control. */
  const fw = peakMorph[0];
  const fn = 210 + (130 - 210) * fw;
  const ff = 430 + (310 - 430) * fw;
  if (depthLock < 0) {
    mountainMat.uniforms.uFogNear.value = fn; mountainMat.uniforms.uFogFar.value = ff;
    contourMat.uniforms.uFogNear.value  = fn; contourMat.uniforms.uFogFar.value  = ff;
  }

  let fastest = 0;
  for (let i = 0; i < NPK; i++) {
    const was = peakMorph[i];
    peakMorph[i] += (peakTarget[i] - peakMorph[i]) * Math.min(1, dt * MORPH.SPRING);
    if (Math.abs(peakTarget[i] - peakMorph[i]) < 0.0004) peakMorph[i] = peakTarget[i];
    fastest = Math.max(fastest, Math.abs(peakMorph[i] - was) / Math.max(1e-4, dt));
    /* In 'hero' the studio's massif is the only thing revealed. In 'range' it
       is revealed too, but as line, standing in the foreground of the four
       client summits — which is exactly where the original page leaves it once
       the hero has drained. Holding it back instead does not remove it: the
       terrain is one mesh and its depth still occludes, so an unrevealed peak
       0 is not an absent mountain, it is a mountain-shaped hole with no
       contours on it.  */
    peakReveal[i] = i === 0 ? (MODE_RANGE ? rangeReveal : 1) : rangeReveal;

    peakLit[i] += (peakLitT[i] - peakLit[i]) * Math.min(1, dt * MORPH.ARRIVE_SPRING);
    if (Math.abs(peakLitT[i] - peakLit[i]) < 0.0004) peakLit[i] = peakLitT[i];
  }

  /* The bright survey line marks where the redraw is happening right now, so it
     only exists while something is moving. Left permanently on, it settles into
     the saddle between a lit peak and a drained one and reads as a light leak. */
  const tp = trailMat.uniforms.uProgress.value;
  for (let i = 0; i < NTR; i++) tp[i] = trailProgress[i];
  if (depthLock < 0) {
    trailMat.uniforms.uFogNear.value = fn;
    trailMat.uniforms.uFogFar.value  = ff;
  }

  const want = Math.min(1, fastest * 7);
  edgeAmt += (want - edgeAmt) * Math.min(1, dt * (want > edgeAmt ? 16 : 5));
  mountainMat.uniforms.uEdgeAmt.value = edgeAmt;
  contourMat.uniforms.uEdgeAmt.value = edgeAmt;

  applyMorph();
}

function applyMorph() {
  const band = contourMat.uniforms.uBand.value;
  const cuts = contourMat.uniforms.uCut.value;
  const morphs = contourMat.uniforms.uMorphA.value;
  let anyInk = false, anyLit = 0;

  for (let i = 0; i < NPK; i++) {
    const m = peakMorph[i];
    const c = Math.min(1, m / SWEEP_SPAN);
    const e = c * c * c * (c * (c * 6 - 15) + 10);          // smootherstep
    const hi = PEAK_H[i] + band * 1.25, lo = -band * 1.25;
    cuts[i] = hi + (lo - hi) * e;
    morphs[i] = m;
    if (m > 0.002 && peakReveal[i] > 0.002) anyInk = true;
    anyLit = Math.max(anyLit, peakLit[i]);
  }

  contourMat.uniforms.uMode.value = MORPH.mode;
  contourMat.uniforms.uReveal.value = peakReveal;
  contourMat.uniforms.uLit.value = peakLit;
  contourMat.uniforms.uAnyLit.value = anyLit;
  contourMat.uniforms.uHiWeight.value = MORPH.hiWeight;
  contourMat.uniforms.uDim.value = MORPH.dim;
  mountainMat.uniforms.uCut.value = cuts;
  mountainMat.uniforms.uMorphA.value = morphs;
  mountainMat.uniforms.uBand.value = band;
  mountainMat.uniforms.uMode.value = MORPH.mode;

  depthMesh.visible = true;
  mountainMesh.visible = true;    // it is the solid body under the contours now
  contourMesh.visible = anyInk;
}
function syncContourRes() {
  contourMat.uniforms.uHalfRes.value.set(vpW() * 0.5, vpH() * 0.5);
  trailMat.uniforms.uHalfRes.value.set(vpW() * 0.5, vpH() * 0.5);
}
syncContourRes();

/* ─── State ──────────────────────────────────────────────────── */
/* Which framing the camera is in and which summit it is pointed at. The page
   used to call these `phase` and `active` because they were the page's own
   state machine; in here they are only ever read by the two camera builders
   and by the parallax, which wants a gentler swing in the wide framing than in
   the close one. */
let framing   = MODE_RANGE ? 'case' : 'hero';   // 'hero' | 'case'
let focused   = -1;
let pathAnim  = null;
let camAnim   = null;
let camTweening = false;
let introTl   = null;

// Pointer parallax
const mouse  = { x: 0, y: 0 };
const mSmooth = { x: 0, y: 0 };

/* ─── Camera animation ───────────────────────────────────────── */
function moveCam(p, t, dur=1.4, cb) {
  if(camAnim) camAnim.kill();
  camTweening = true;
  camAnim = gsap.timeline({ onComplete(){ camTweening=false; if(cb)cb(); } });
  camAnim.to(camBase,  {x:p.x,y:p.y,z:p.z,duration:dur,ease:'power3.inOut'},0);
  camAnim.to(camTarget,{x:t.x,y:t.y,z:t.z,duration:dur,ease:'power3.inOut'},0);
}

/* ─── Markers ────────────────────────────────────────────────── */
const mkrEls = (opts.markers || []).filter(Boolean);
mkrEls.forEach((el, i) => {
  el.addEventListener('click', () => { if (opts.onPeakClick) opts.onPeakClick(i); });
});

/* The opening move — the mountain rising into frame and the camera pulling
   back off the summit — is exposed as playIntro() at the bottom of this file
   rather than run from in here. On the final site it is the loader that owns
   it: the zoom-out and the title's odometer are one piece of motion, and only
   the page can see both.  */

const tmp = new THREE.Vector3();
const baseDotWorld = new THREE.Vector3();
/** Screen diameter in CSS pixels (matches .mkr-dot, 5×5). */
const BASE_DOT_SCREEN_PX = 5;

function updateMarkers() {
  /* The flags sit on the client summits now, which in the hero are specks on the
     horizon — four dormant dots out there read as dirt on the lens, not as
     waypoints. They belong to the range, so they appear once you are in it. */
  if (!mkrEls.length) return;
  FLAGS.forEach((f,i) => {
    if (!mkrEls[i]) return;
    tmp.set(f.x, f.y+0.9, f.z);
    mountainGroup.localToWorld(tmp);
    tmp.project(camera);
    const el = mkrEls[i];
    /* The dot is the flag at the summit, so it is not there until the route
       has actually got there. Gating on the climb rather than on the phase
       makes arriving the payoff for the ascent instead of something that has
       already happened by the time the line starts drawing. */
    el.classList.toggle('landed', trailProgress[i] >= 0.995);
    if(tmp.z >= 1){ el.style.display='none'; return; }
    el.style.display = 'flex';
    el.style.left = ((tmp.x*.5+.5)*vpW())+'px';
    el.style.top  = ((-tmp.y*.5+.5)*vpH())+'px';
  });
}

/* The case band, the phase machine, the pill nav and the scroll handler that
   drove them have all gone to the page. What they did to this scene was move
   the camera and light a summit, and both of those are on the returned API —
   focusPeak() and lightPeak() — so a caller can still build that flow without
   this file knowing anything about a card.  */

/* ─── Pointer parallax ───────────────────────────────────────── */
/* Listened for on the window rather than the canvas so the parallax keeps
   tracking a cursor that has wandered off the scene, but measured against the
   canvas's own box — there are two of these on the final page and a pointer
   position in window coordinates would aim the ray into the wrong one. */
addEventListener('mousemove', e => {
  const r = canvas.getBoundingClientRect();
  if (!r.width || !r.height) return;
  mouse.x = ((e.clientX - r.left) / r.width)  * 2 - 1;
  mouse.y = ((e.clientY - r.top)  / r.height) * 2 - 1;
  pointerInside = e.clientX >= r.left && e.clientX <= r.right
               && e.clientY >= r.top  && e.clientY <= r.bottom;
}, { passive: true });

/* ─── Hover ──────────────────────────────────────────────────────────────
   A contour is the set of points at one elevation, so the honest answer to
   "what am I pointing at" is the whole ring at that height, not the segment
   under the cursor. Finding the height means intersecting the pointer ray with
   the terrain, and a THREE.Raycaster against a 200k-vertex mesh is a per-frame
   sweep of every triangle. Marching the ray against mh() instead costs about a
   hundred samples: coarse steps that lengthen with distance, then a short
   bisection once the ray has passed under the surface. */
const HOVER = { band: 2.8, radius: 60, pulse: 2.2, strength: 1 };
const _hr = new THREE.Vector3(), _ho = new THREE.Vector3();
let hoverAmt = 0, hoverHit = false, hoverPeak = -1;
const hoverPt = { x: 0, y: -1e4, z: 0 };
let pointerInside = false;

function pickTerrain() {
  _hr.set(mouse.x, -mouse.y, 0.5).unproject(camera).sub(camera.position).normalize();
  _ho.copy(camera.position).sub(mountainGroup.position);
  if (_hr.y > 0 && _ho.y > MAX_H + 4) return false;   // pointing at sky from above it

  let t = 1, prev = _ho.y - mh(_ho.x, _ho.z), prevT = 0;
  for (let i = 0; i < 150 && t < 620; i++) {
    const gap = (_ho.y + _hr.y * t) - mh(_ho.x + _hr.x * t, _ho.z + _hr.z * t);
    if (gap < 0) {
      let lo = prevT, hi = t;                          // bisect the crossing
      for (let k = 0; k < 14; k++) {
        const mid = (lo + hi) * 0.5;
        const g = (_ho.y + _hr.y * mid) - mh(_ho.x + _hr.x * mid, _ho.z + _hr.z * mid);
        if (g < 0) hi = mid; else lo = mid;
      }
      hoverPt.x = _ho.x + _hr.x * hi;
      hoverPt.z = _ho.z + _hr.z * hi;
      hoverPt.y = mh(hoverPt.x, hoverPt.z);
      /* the same weighting the shaders use, so the peak picked here is the peak
         the contour shader thinks this ground belongs to */
      let best = 0, bw = -1;
      for (let k = 0; k < NPK; k++) {
        const pk = PEAKS[k];
        const ddx = hoverPt.x - pk.x, ddz = hoverPt.z - pk.z;
        const q = (ddx*ddx + ddz*ddz) / (pk.spread * pk.spread);
        const w = 1 / (q*q + 0.02);
        if (w > bw) { bw = w; best = k; }
      }
      hoverPeak = best;
      return true;
    }
    prev = gap; prevT = t;
    t += 1.1 + t * 0.035;                              // coarser the further out
  }
  return false;
}

function updateHover(dt) {
  /* the pulse only means anything on line-work, so it is off wherever the
     ground under the pointer is still filled */
  const canHover = hoverEnabled && pointerInside && contourMesh.visible;
  hoverHit = canHover ? pickTerrain() : false;
  hoverAmt += ((hoverHit ? HOVER.strength : 0) - hoverAmt) * Math.min(1, dt * 9);

  const c = caseUnderPointer();
  canvas.style.cursor = (c >= 0 && opts.onPeakClick) ? 'pointer' : '';

  const u = contourMat.uniforms;
  u.uHoverAmt.value = hoverAmt;
  u.uHoverBand.value = HOVER.band;
  u.uHoverR.value = HOVER.radius;
  u.uPulse.value = 0.5 + 0.5 * Math.sin(_lastT * 0.001 * HOVER.pulse * Math.PI);
  if (hoverHit) {
    u.uHoverY.value = hoverPt.y;
    u.uHoverXZ.value.set(hoverPt.x, hoverPt.z);
    u.uHoverPeak.value = hoverPeak;
    u.uHoverCol.value.copy(PEAK_ACCENT[hoverPeak]);
  }
}

/* Clicking the mountain itself selects its project. The pointer ray is already
   being cast every frame for the hover pulse, so the peak under the cursor is
   known — this just hands it to the caller, which decides what a click on a
   summit means on its page. */
const CASE_OF_PEAK = {};
PROJECT_PEAKS.forEach((pi, i) => { CASE_OF_PEAK[pi] = i; });

function caseUnderPointer() {
  if (!hoverEnabled || !contourMesh.visible || !pointerInside) return -1;
  if (!hoverHit) return -1;
  const c = CASE_OF_PEAK[hoverPeak];
  return c === undefined ? -1 : c;
}

canvas.addEventListener('click', () => {
  const c = caseUnderPointer();
  if (c >= 0 && opts.onPeakClick) opts.onPeakClick(c);
});

window.addEventListener('pointerenter', () => { pointerInside = true; });
window.addEventListener('pointerleave', () => { pointerInside = false; });
document.addEventListener('mouseleave', () => { pointerInside = false; });

/* ─── Resize ─────────────────────────────────────────────────── */
/* A ResizeObserver rather than a window resize listener: these canvases are
   laid out by their sections, so one can change size without the window doing
   anything — a sticky hero releasing, a section coming out of a grid. */
function resize() {
  const w = vpW(), h = vpH();
  if (!w || !h) return;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
  syncContourRes();
  if (framingReady) syncFraming();
}
const ro = new ResizeObserver(resize);
ro.observe(canvas);
addEventListener('resize', resize);

/* ─── Render loop ────────────────────────────────────────────── */
let _lastT = performance.now();
let dotClock = 0;
let ringHover = -1;
/* a snap view is holding the camera; the scroll does not get it back until
   something asks for the hero station again */
let viewLock = false;
/* set by setDepth, so stepMorph knows to stop writing the fade itself */
let depthLock = -1;
let rafId = 0, running = true;
/* Scheduled rather than entered. The loop used to run its first frame the
   instant it was defined, which was fine when it was the last thing on the
   page; here the camera stations and the zoom it reads are set up below it, so
   the first frame has to wait until the factory has finished building. */
function frame(){
  rafId = requestAnimationFrame(frame);
  /* Two WebGL scenes on one page is two full terrain redraws a frame. The one
     that is not on screen does not get them: the page hands each scene its own
     visibility and the loop simply stops. */
  if (!running) { _lastT = performance.now(); return; }

  /* The morph is eased per-frame rather than written straight from the scroll
     position. Scroll events arrive in coarse, uneven jumps — trackpad flicks,
     wheel notches, momentum — and driving the sweep plane off them directly
     makes it stutter. Chasing the target with a framerate-independent lerp
     turns any input cadence into one continuous move, and it keeps the tail of
     a flick moving after the events have stopped. */
  const _now = performance.now();
  const dt = Math.min(0.05, (_now - _lastT) / 1000);
  _lastT = _now;
  stepMorph(dt);

  /* The dotted rings drift along their own arc length. Accumulated rather than
     read off performance.now(): the clock keeps running while the scene is
     parked off screen, and a scene that has been parked for a minute would
     otherwise come back with its dots teleported to wherever the wall clock
     had got to. */
  dotClock += dt;
  contourMat.uniforms.uTime.value = dotClock;

  /* The rings chase their hover rather than snapping to it. A ring that lifts
     the instant the cursor crosses it reads as a hit-test firing; one that
     rises over a fifth of a second reads as the ring responding. */
  {
    const lift = contourMat.uniforms.uRingLift.value;
    const hot  = contourMat.uniforms.uRingHot.value;
    const e = Math.min(1, dt * 9);
    for (let k = 0; k < 3; k++) {
      const want = ringHover === k ? 1 : 0;
      hot[k]  += (want - hot[k]) * e;
      lift[k] += (want * CT.RING_LIFT - lift[k]) * e;
    }
  }

  /* The zoom is chased rather than set, for the same reason the morph is: the
     page drives it off a scroll position, and a scroll arrives in jumps. */
  zoom += (zoomT - zoom) * Math.min(1, dt * 3.4);
  if (Math.abs(zoomT - zoom) < 0.0004) zoom = zoomT;
  applyZoom();

  /* Pointer parallax, in every phase and during flights too. It orbits the
     station rather than sliding the camera sideways — a slide skews the whole
     scene, a small orbit reads as the range having depth. */
  const pe = Math.min(1, dt * PARALLAX.ease);
  mSmooth.x += (mouse.x - mSmooth.x) * pe;
  mSmooth.y += (mouse.y - mSmooth.y) * pe;
  applyParallax();

  camera.lookAt(camTarget);
  updateHover(dt);
  updateMarkers();

  // Keep trek origin dot ~BASE_DOT_SCREEN_PX Ø in screen space (like HTML markers)
  baseDot.getWorldPosition(baseDotWorld);
  const dist = baseDotWorld.distanceTo(camera.position);
  if (dist > 0.01) {
    const vFOV = camera.fov * Math.PI / 180;
    const cssH = vpH();
    const worldPerPx = (2 * Math.tan(vFOV / 2) * dist) / cssH;
    const rWorld = (BASE_DOT_SCREEN_PX * 0.5) * worldPerPx;
    baseDot.scale.setScalar(rWorld / BASE_DOT_GEO_R);
  }

  renderer.render(scene, camera);
}
rafId = requestAnimationFrame(frame);

/* camBase is declared below the camera section, so the opening station is
   seeded here rather than at definition time */
camBase.copy(H_POS);
camTarget.copy(H_TGT);


/* ══════════════════════════════════════════════════════════════════════════
   The two framings, and the move between them
   ─────────────────────────────────────────────────────────────────────────
   The hero has a wide station and a close one. Wide is the framing the page
   settles into out of the loader; close is what the third scroll state pulls
   in to, and it is also the framing the hover rings are worth looking at in,
   because at 126 units out a ring around one contour is a hairline.

   'range' has one station of its own, far enough back to hold all four client
   summits with air around them.
   ═════════════════════════════════════════════════════════════════════════ */
/* The close station. It is framed on the SUMMIT rather than on the mountain,
   because what the third scroll state is for is the three accent rings at the
   top of it — and a station close enough to fill the frame with the massif
   puts those rings above the top of it. Aimed high on the peak and held far
   enough back that all three rings are in shot and large enough to point at. */
const HERO_CLOSE = { elev: 18, dist: 95, azim: 4, tgtX: 4, tgtY: 30, tgtZ: -2 };

function station(c) {
  const e = c.elev * Math.PI / 180, a = c.azim * Math.PI / 180;
  const up = c.dist * Math.sin(e), out = c.dist * Math.cos(e);
  const tgt = new THREE.Vector3(c.tgtX, c.tgtY, c.tgtZ);
  const pos = new THREE.Vector3(tgt.x + out * Math.sin(a), tgt.y + up, tgt.z + out * Math.cos(a));
  return { pos, tgt };
}

const HERO_WIDE  = { pos: H_POS, tgt: H_TGT };
const HERO_TIGHT = station(HERO_CLOSE);

/* Where the loader starts: right in among the contours near the summit, close
   enough that the peak fills the frame and reads as terrain rather than as a
   mountain. The zoom-out is the move from here to HERO_WIDE. */
const HERO_ZOOMED_IN = station({ elev: 7, dist: 21, azim: 2, tgtX: 5, tgtY: 29, tgtZ: -1 });

/* ── framing on a narrow window ──────────────────────────────────────────
   Every station below is a distance and an angle, and a distance frames a
   subject only at the aspect it was chosen at. These were chosen on a wide
   desktop window; on a phone held upright the horizontal field of view is
   less than half as wide and the mountain simply walks out of the sides of
   the frame.

   So the camera is pushed back along its own view vector as the window gets
   narrower than the aspect the stations were set at. Pushing back rather than
   widening the lens keeps the perspective — winding the field of view open
   instead would flatten the massif and stretch the peaks at the edges, which
   is exactly the shot this scene is not.  */
const FRAME_ASPECT = 1.55;
let frameOut = 1;

function syncFraming() {
  const a = camera.aspect || 1;
  frameOut = a >= FRAME_ASPECT ? 1 : Math.min(2.4, Math.pow(FRAME_ASPECT / a, 0.82));
  if (!MODE_RANGE) return;

  /* A re-frame has to re-seat the summit the walk is actually on — turn a
     phone on its side mid-section and the camera is
     still at the distance the portrait window needed. Mid-flight it is left
     alone: the tween is already heading for a station, and moving the camera
     under it would fight the tween for a second and lose. */
  if (focused >= 0 && !camTweening) {
    const st = framed(CASE_CAM[focused]);
    camBase.copy(st.pos);
    camTarget.copy(st.tgt);
  }
}

/* ── the lock ────────────────────────────────────────────────────────────
   Where the hero's peak goes when the page has finished with it: turned,
   shrunk, moved to one side and faded back, so it becomes the thing the
   metrics sit beside rather than the thing they sit on.

   The numbers are topo-hero-scroll.html's, which is the page this move was
   worked out on — its LOCK_YAW, LOCK_SCALE and LOCK_OPACITY carried straight
   across. The one that could not was LOCK_X: that page states the final
   position in normalised device coordinates, which it can because it owns its
   own projection. Here the same displacement is a world-space shift of the
   camera, so it is expressed in world units and is a function of how far away
   the camera happens to be.

   Nothing here touches the morph. The peak arrives at this section already
   drawn out as contour line and it stays that way — re-lighting it on the way
   into the metrics would undo the whole redraw the hero just performed. */
const LOCK = {
  yaw: 0.58,        // radians the peak turns through on the way down
  scale: 0.62,      // final size, as a fraction of the hero's
  shift: 46,        // world units the camera slides, putting the peak left
  drop: 0.16,       // and how far it settles, as a fraction of its height
  opacity: 0.45,    // what the line fades back to
};
let lockT = 0;

/* 0 = wide, 1 = close. Held rather than tweened directly so that a scroll that
   reverses mid-flight is chased rather than fought. */
let zoom = 0, zoomT = 0;
const _zp = new THREE.Vector3(), _zt = new THREE.Vector3();

function applyZoom() {
  /* viewLock is a snap view holding the camera. Without it a survey view
     lasts exactly as long as its flight: applyZoom runs every frame off the
     scroll position, so the moment the tween releases camTweening the camera
     is put straight back on the scroll's own station. A view you cannot hold
     still is not a view. */
  if (MODE_RANGE || camTweening || viewLock) return;
  const e = zoom * zoom * (3 - 2 * zoom);
  _zp.lerpVectors(HERO_WIDE.pos, HERO_TIGHT.pos, e);
  _zt.lerpVectors(HERO_WIDE.tgt, HERO_TIGHT.tgt, e);
  camTarget.copy(_zt);
  camBase.copy(_zt).addScaledVector(_zp.sub(_zt), frameOut);

  /* The lock rides on top of whatever the zoom has just decided, so the two
     compose instead of fighting: the peak can still be at its close station
     and be sliding out of the middle of the frame at the same time. Both the
     station and what it looks at move together, which slides the subject
     across the frame rather than swinging the camera round it. */
  if (lockT > 0) {
    const e = lockT * lockT * (3 - 2 * lockT);
    const dx = LOCK.shift * e;
    const dy = -LOCK.drop * e * camTarget.y;
    camBase.x += dx; camTarget.x += dx;
    camBase.y += dy; camTarget.y += dy;
  }
}

/* A station, pushed back for the window's aspect. Every flight goes through
   this — a summit framed at desktop width is half out of shot on a phone for
   exactly the same reason the wide view was. */
const _rc = new THREE.Vector3(), _re = new THREE.Vector3(), _rx = new THREE.Vector3();

const _fp = new THREE.Vector3();
function framed(st) {
  _fp.copy(st.pos).sub(st.tgt);
  return { tgt: st.tgt, pos: st.tgt.clone().addScaledVector(_fp, frameOut) };
}

/* ── the opening frame ───────────────────────────────────────────────────
   Put the camera on a summit's station with no flight and no climb: the state
   the section is in before anyone has scrolled into it, so the first frame of
   it anybody sees is already the shot rather than a wide view that then rushes
   somewhere. The route is left un-drawn, because the climb is what plays when
   they arrive.

   This is also where 'range' mode starts. There is no wide establishing
   station in this scene any more — the section opens on the first summit — so
   this is what puts the camera somewhere real at boot, which is why it is a
   function and not only a method on the API. */
function openOn(i) {
  if (i < 0 || i >= PROJECT_PEAKS.length) return;
  framing = 'case'; focused = i;
  if (camAnim) { camAnim.kill(); camTweening = false; }
  if (pathAnim) pathAnim.kill();
  gsap.killTweensOf(trailProgress);
  for (let k = 0; k < NTR; k++) trailProgress[k] = 0;

  const st = framed(CASE_CAM[i]);
  camBase.copy(st.pos);
  camTarget.copy(st.tgt);
  lightPeak(i, 0);

  const bs = TREK[i].base;
  baseDot.position.set(bs.x, mh(bs.x, bs.z) + 0.65, bs.z);
  baseDot.material.opacity = 0;
}

/* ─── Opening the scene ───────────────────────────────────────────────── */
framingReady = true;
syncFraming();

if (MODE_RANGE) {
  openOn(0);
  mountainGroup.position.y = 0;
  mountainMat.uniforms.uAlpha.value = 1;
  /* The routes are drawn in this mode — walkTo() climbs one at a time. Their
     geometry is always present; what makes a route visible is its progress,
     and every one of them starts at zero. */
  trailMesh.visible = true;
  baseDot.visible = true;
  baseDot.material.opacity = 0;
  MORPH.scrub = 1;                       // the studio's peak fully drained
  peakMorph[0] = peakTarget[0] = 1;
  rangeReveal = 1;
} else {
  trailMesh.visible = false;             // the hero has no routes on it either
  baseDot.visible = false;
  /* `ink: false` starts the peak where the redraw would have left it — fully
     drawn out as contour line, with the summit's accent rings already on. The
     sweep is the hero's opening move and costs a viewport of scroll; a page
     that only wants the finished drawing should not have to scroll past it to
     get there. */
  MORPH.scrub = opts.ink === false ? 1 : 0;
  peakMorph[0] = peakTarget[0] = MORPH.scrub;
  rangeReveal = 0;
  stepMorph(0.016);
  applyZoom();
}
stepMorph(0.016);

/* ══════════════════════════════════════════════════════════════════════════
   The API
   ═════════════════════════════════════════════════════════════════════════ */
return {
  canvas, camera, renderer, scene,

  /** 0 = the peak as lit surface, 1 = fully redrawn as contour line. */
  setHeroMorph(t) {
    /* held at 1 when the scene was built without the ink — there is no state
       for a caller to scrub to */
    if (MODE_RANGE || opts.ink === false) return;
    MORPH.scrub = Math.min(1, Math.max(0, t));
  },

  /** 0 sweep · 1 ink · 2 fade — how the fill leaves the peak. */
  setInkMode(m) { MORPH.mode = m | 0; },

  /** The contour rings that follow the cursor's elevation. */
  setHover(on) {
    hoverEnabled = !!on;
    if (!on) { hoverHit = false; canvas.style.cursor = ''; }
  },

  /* ── the lock ─────────────────────────────────────────────────────────
     0 leaves the peak where the hero left it; 1 has it turned, shrunk, moved
     aside and faded back, which is the state the metrics are read against. */
  lockTo(t) {
    if (MODE_RANGE) return;
    lockT = Math.min(1, Math.max(0, t));
    const e = lockT * lockT * (3 - 2 * lockT);
    mountainGroup.rotation.y = LOCK.yaw * e;
    mountainGroup.scale.setScalar(1 + (LOCK.scale - 1) * e);
    /* The ink fades, the fill is left alone — by the time anything locks, the
       fill has already been drawn out of the peak and has nothing left to
       fade. Touching uAlpha here would only bring the drained silhouette back
       up through the contours. */
    contourMat.uniforms.uOpacity.value = CT.OPACITY * (1 + (LOCK.opacity - 1) * e);
  },

  /** 0 = the wide hero station, 1 = in close on the summit. */
  zoomTo(t, dur) {
    zoomT = Math.min(1, Math.max(0, t));
    if (dur === 0) zoom = zoomT;
  },

  /* ── the walk ─────────────────────────────────────────────────────────
     One summit of the case study walk, exactly as the original page ran it:
     retract the route you are leaving, fly the survey camera to the next
     station, settle the range around it, then climb.

     The page owns the card, the rail and the counter — this owns the scene —
     so the flight time comes back out of it. That number is what the card has
     to be timed against: it is a function of how far the camera has to travel,
     so it is different for every hop and cannot be a constant on the page.  */
  walkTo(i) {
    if (i < 0 || i >= PROJECT_PEAKS.length || i === focused) return null;
    const prev = focused;
    framing = 'case'; focused = i;

    /* Retract the route you are leaving. Faster than the climb and eased in
       rather than out, so it reads as being withdrawn rather than un-drawn. */
    if (prev >= 0 && prev !== i) {
      gsap.killTweensOf(trailProgress);
      gsap.to(trailProgress, { [prev]: 0, duration: 0.5, ease: 'power2.in' });
    }

    const st = framed(CASE_CAM[i]);
    const dur = flightDur(st.pos);
    moveCam(st.pos, st.tgt, dur);

    /* The rest of the range recedes a little so the route has a quieter
       drawing to sit on. It starts partway through the flight, so it is
       already happening as the camera arrives rather than after it. */
    lightPeak(i, dur * MORPH.ARRIVE_DELAY);

    /* Then the climb — the whole highlight. The mountain keeps its own ink and
       the project's colour walks up it, trailhead to summit. */
    const delay = dur * MORPH.ARRIVE_DELAY + 0.35;
    trailProgress[i] = 0;
    if (pathAnim) pathAnim.kill();
    pathAnim = gsap.to(trailProgress, {
      [i]: 1, duration: MORPH.CLIMB, ease: 'power1.inOut', delay,
    });

    /* and the trailhead dot moves to the foot of this ascent */
    const bs = TREK[i].base;
    baseDot.position.set(bs.x, mh(bs.x, bs.z) + 0.65, bs.z);
    gsap.killTweensOf(baseDot.material);
    gsap.to(baseDot.material, { opacity: 0.55, duration: 0.4, delay });

    return { index: i, previous: prev, flight: dur, climbDelay: delay };
  },

  /** Which summit the walk is on, or -1 before it starts. */
  get focused() { return focused; },

  /* What the scene is actually made of, for the tuning panel: the peak table
     as it ended up (which in the hero is generated, so it is not something a
     reader can look up in the source) and the seed that produced it. */
  info() {
    return {
      seed: HERO_TERRAIN_SEED,
      maxH: MAX_H,
      peaks: PEAKS.map((p, i) => ({
        i, x: +p.x.toFixed(1), z: +p.z.toFixed(1),
        h: +p.h.toFixed(1), spread: +p.spread.toFixed(1),
        top: +PEAK_H[i].toFixed(1),
      })),
      camera: camera.position.toArray().map(n => +n.toFixed(1)),
      target: camTarget.toArray().map(n => +n.toFixed(1)),
    };
  },

  /* ── the tuning surface ───────────────────────────────────────────────
     What the dock's panel drives. Everything here is live: a uniform written
     this frame is on screen the next one, and the one control that cannot be
     (how many rings are dotted, which is baked into the geometry) says so by
     rebuilding it. */
  setAccent(hex) {
    contourMat.uniforms.uAccent.value.copy(srgbVec(hex));
  },

  setHeroCam(next) {
    if (MODE_RANGE) return;
    Object.assign(HERO_CAM, next);
    applyHeroCam(false);          // recompute H_POS / H_TGT in place
    applyZoom();                  // and put the camera on the new station now
  },

  /** The current hero station, so a panel can show what it is editing. */
  heroCam() { return { ...HERO_CAM }; },

  /* ── depth ────────────────────────────────────────────────────────────
     How hard the aerial fade bites. It is the one control that decides
     whether this reads as a flat survey sheet or as a landscape with air in
     it, and it is two uniforms rather than one: the distance the fade starts
     and the distance it finishes. Driven from a single 0..1 so the two cannot
     be set into a state where the far plane is nearer than the near one. */
  setDepth(t) {
    const d = Math.min(1, Math.max(0, t));
    /* at 0 the fade is pushed so far back that nothing reaches it; at 1 it
       closes to arm's length and the country dissolves a few peaks out */
    const near = 340 - 250 * d;
    const far  = near + 420 - 260 * d;
    for (const m of [mountainMat, contourMat, trailMat]) {
      m.uniforms.uFogNear.value = near;
      m.uniforms.uFogFar.value = far;
    }
    depthLock = d;
  },

  /* ── the survey views ─────────────────────────────────────────────────
     Straight down and straight on. Both are readings rather than shots: a
     plan and an elevation, which is how you actually check a contour sheet —
     the plan shows whether the rings are concentric and evenly spaced, the
     elevation shows whether the interval is constant up the slope. Neither is
     reachable by dragging a camera that is clamped to stop you going over the
     pole or under the ground, which is why they are buttons. */
  snapView(which, dur) {
    if (MODE_RANGE) return;
    /* 'hero' is the way back: it hands the camera to the scroll again. The
       two survey views keep it. */
    viewLock = which === 'top' || which === 'side';
    const top = PEAK_TOP[0] || { x: PEAKS[0].x, z: PEAKS[0].z };
    const h = PEAK_H[0] || MAX_H;
    const tgt = new THREE.Vector3(top.x, h * 0.35, top.z);
    let pos;

    if (which === 'top') {
      /* not exactly overhead: a camera on the axis has no up vector it can
         agree with, and the scene flips as it crosses. Two degrees off is
         indistinguishable and well defined. */
      pos = new THREE.Vector3(top.x + 4, h + 190, top.z + 0.1);
    } else if (which === 'side') {
      pos = new THREE.Vector3(top.x + 0.1, h * 0.45, top.z + 175);
    } else {
      applyHeroCam(false);
      pos = H_POS.clone(); tgt.copy(H_TGT);
    }
    moveCam(pos, tgt, dur == null ? 1.1 : dur);
  },

  setDots(next) {
    const u = contourMat.uniforms;
    if (next.period != null) u.uDotPeriod.value = next.period;
    if (next.on != null) { u.uDotOn.value = next.on; u.uDotOff.value = next.on * 1.9; }
    if (next.flow != null) u.uDotFlow.value = next.flow;
  },

  /* Which rings are dotted, and how many wear the accent, are both per-vertex
     flags — so these are the two controls that cost a geometry rebuild rather
     than a uniform write. Both go through the same path. */
  setDottedLevels(n) { CT.DOTTED_LEVELS = Math.max(0, n | 0); rebuildContours(); },
  setAccentTop(n)    { CT.ACCENT_TOP = Math.max(1, n | 0);    rebuildContours(); },

  /** Put the camera on a summit with no flight and no climb. */
  openOn,

  /* ── the summit's rings ───────────────────────────────────────────────
     Three accent contours at the top of the studio's massif, each with a line
     of copy attached to it on the page. The scene draws them and lifts the
     one it is told to; the page decides which, because hit-testing three
     small ellipses and putting a description beside them is a job the DOM
     does better than a ray march.

     ringScreen() hands back where each one is right now, in CSS pixels
     relative to the canvas, with the radius it projects to. `behind` is true
     once a ring has gone round the back of the camera, which is the one case
     a projected point is a real position and a nonsense one at the same
     time. */
  setRingHover(i) { ringHover = (i == null ? -1 : i); },

  ringScreen() {
    const w = vpW(), h = vpH();
    return ACCENT_RINGS.map((r, k) => {
      if (!r) return null;
      const lift = contourMat.uniforms.uRingLift.value[k] || 0;
      _rc.set(r.x, r.y + lift, r.z);
      mountainGroup.localToWorld(_rc);
      _re.copy(_rc).add(_rx.set(r.r, 0, 0));   // a point on the ring itself
      _rc.project(camera);
      _re.project(camera);
      return {
        x: (_rc.x * 0.5 + 0.5) * w,
        y: (-_rc.y * 0.5 + 0.5) * h,
        r: Math.abs(_re.x - _rc.x) * 0.5 * w,
        behind: _rc.z >= 1,
      };
    });
  },

  /* Climb the route on the summit the camera is already on. walkTo() does this
     at the end of a flight; this is the same move without one, for the summit
     the section opened on. */
  climb(i, delay) {
    if (i < 0 || i >= PROJECT_PEAKS.length) return 0;
    const d = delay == null ? 0.25 : delay;
    trailProgress[i] = 0;
    if (pathAnim) pathAnim.kill();
    pathAnim = gsap.to(trailProgress, {
      [i]: 1, duration: MORPH.CLIMB, ease: 'power1.inOut', delay: d,
    });
    gsap.killTweensOf(baseDot.material);
    gsap.to(baseDot.material, { opacity: 0.55, duration: 0.4, delay: d });
    return d;
  },

  /** Fly to one client summit (0–3) without climbing it. */
  focusPeak(i, dur) {
    if (i < 0 || i >= PROJECT_PEAKS.length) return;
    framing = 'case'; focused = i;
    const c = framed(CASE_CAM[i]);
    moveCam(c.pos, c.tgt, dur == null ? flightDur(c.pos) : dur);
    lightPeak(i, MORPH.ARRIVE_DELAY);
  },

  /* ── the loader's move ────────────────────────────────────────────────
     Starts hard in on the peak and pulls back to the wide hero station,
     bringing the terrain up out of the ground and fading the fill in as it
     goes. Returns the GSAP timeline so the page can hang the title's
     odometer and the navbar off the same clock — the brief asks for the
     zoom-out and the roll-in to be one piece of motion, and they can only be
     that if they share a timeline.  */
  playIntro(o) {
    const c = o || {};
    const dur = c.duration == null ? 2.4 : c.duration;
    if (introTl) introTl.kill();
    if (camAnim) camAnim.kill();

    camBase.copy(HERO_ZOOMED_IN.pos);
    camTarget.copy(HERO_ZOOMED_IN.tgt);
    mountainGroup.position.y = -3;
    mountainMat.uniforms.uAlpha.value = 0;
    camTweening = true;
    zoom = zoomT = 0;

    const gsap = window.gsap;
    introTl = gsap.timeline({
      onComplete() { introTl = null; camTweening = false; if (c.onComplete) c.onComplete(); },
    });
    introTl.to(mountainGroup.position, { y: 0, duration: dur * 0.72, ease: 'power2.out' }, 0);
    introTl.to(mountainMat.uniforms.uAlpha, { value: 1, duration: dur * 0.45, ease: 'power2.out' }, 0);
    const wide = HERO_WIDE.tgt.clone()
      .addScaledVector(HERO_WIDE.pos.clone().sub(HERO_WIDE.tgt), frameOut);
    introTl.to(camBase, {
      x: wide.x, y: wide.y, z: wide.z,
      duration: dur, ease: 'power2.inOut',
    }, 0);
    introTl.to(camTarget, {
      x: HERO_WIDE.tgt.x, y: HERO_WIDE.tgt.y, z: HERO_WIDE.tgt.z,
      duration: dur, ease: 'power2.inOut',
    }, 0);
    return introTl;
  },

  /** Park the render loop while the section is nowhere near the viewport. */
  setRunning(on) { running = !!on; },

  resize,

  dispose() {
    running = false;
    cancelAnimationFrame(rafId);
    ro.disconnect();
    renderer.dispose();
  },
};

}
