/* ══════════════════════════════════════════════════════════════════════════
   Landform — the mountain generator, shared
   ─────────────────────────────────────────────────────────────────────────
   Lifted out of assets/range-scene.js so there is one system for mountains:
   the hero's massif, the four client summits and whatever is built in the
   Mountains lab (mountains-lab.html) are all the same thing — a landform of
   summed parts, domain-warped, with spurs and flutes cut into its flanks —
   plus, now, an optional sculpt layer: a grid of height added on top, which
   is where the lab's brushes, erosion and imported depth maps end up.

   Nothing in the generator was retuned in the move. range-scene.js imports
   it, so the site draws exactly what it drew before.

   ── a landform ───────────────────────────────────────────────────────────
     { x, z, h, spread, seed, rot, aniso, warp, spur, spurF, flute, fluteF,
       parts: [{ dx, dz, h, spread, sharp | mesa, aniso }],
       sculpt?: { n, extent, data: Float32Array(n*n) } }      // optional

     prepareLandform(p)   caches what coneAt needs; call after any change
     coneAt(p, x, z)      its height at a world point

   ── presets from the lab ──────────────────────────────────────────────────
     A lab preset (JSON, version 1) carries a landform, its scale and its
     sculpt layer. peakFromPreset() turns one into a landform standing at a
     given point. "Use in hero" / "Use as summit" in the lab write
     localStorage['tibba.mountains.use']; applySiteLandforms() is how
     range-scene.js picks that up — so the override exists only in the
     browser that set it, and "Clear" in the lab takes it away.
   ═════════════════════════════════════════════════════════════════════════ */

/* ─── Noise ──────────────────────────────────────────────────── */
/* An integer bit-mix rather than the usual sin-based hash. The terrain below
   asks for roughly five times as many noise samples per point as a plain cone
   did, and a hash built on Math.sin would have put a second on the load; this
   is several times faster and has none of sin-hash's lattice banding. */
export function h2(x, y){
  let n = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
export function vn(x,y){
  const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
  const ux=fx*fx*(3-2*fx),uy=fy*fy*(3-2*fy);
  const a=h2(ix,iy),b=h2(ix+1,iy),c=h2(ix,iy+1),d=h2(ix+1,iy+1);
  return a+(b-a)*ux+(c-a)*uy+(d-c-b+a)*ux*uy;
}
export function fbmN(x,y,oct){ let v=0,a=0.5,f=1; for(let i=0;i<oct;i++){v+=a*vn(x*f,y*f);a*=0.5;f*=2.09;} return v; }
export function fbm(x,y){ return fbmN(x,y,5); }
export function sstep(t){ return t<=0?0:(t>=1?1:t*t*(3-2*t)); }

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
export const SITE_PEAKS = [
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

/** Caches the derived numbers coneAt reads. Call after changing a landform. */
export function prepareLandform(p) {
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
  return p;
}

/** A deep copy, safe to prepare and change. */
export function clonePeak(p) {
  const c = { ...p, parts: p.parts.map(t => ({ ...t })) };
  if (p.sculpt) c.sculpt = { ...p.sculpt };
  return c;
}

function coneShape(p, x, z){
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

/** One landform's height at a world point: the generated form, plus its
    sculpt layer if it has one. */
export function coneAt(p, x, z) {
  const h = coneShape(p, x, z);
  return p.sculpt ? h + sculptAt(p.sculpt, x - p.x, z - p.z) : h;
}

/** The sculpt layer at a point relative to its landform's centre: bilinear,
    and nothing outside its square. */
export function sculptAt(s, lx, lz) {
  const n = s.n, half = s.extent / 2;
  const gx = (lx + half) / s.extent * (n - 1), gz = (lz + half) / s.extent * (n - 1);
  if (gx < 0 || gz < 0 || gx > n - 1 || gz > n - 1) return 0;
  const i = Math.min(n - 2, Math.floor(gx)), j = Math.min(n - 2, Math.floor(gz));
  const fx = gx - i, fz = gz - j, d = s.data;
  const a = d[j * n + i], b = d[j * n + i + 1], c = d[(j + 1) * n + i], e = d[(j + 1) * n + i + 1];
  return a + (b - a) * fx + (c - a) * fz + (e - c - b + a) * fx * fz;
}

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
export const CT_PALETTE_RAMPS = {
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

/* ─── The library ──────────────────────────────────────────────────────────
   Starting points for the lab. The site's own five come first, moved to the
   origin; the named ranges after them are abstractions, built from the same
   parts — a crater is simply a part with a negative height. */
const at0 = p => ({ ...clonePeak(p), x: 0, z: 0 });
export const LANDFORM_LIBRARY = {
  'Tibba massif':   at0(SITE_PEAKS[0]),
  'Groww':          at0(SITE_PEAKS[1]),
  'Firstpost':      at0(SITE_PEAKS[2]),
  'Breathe ESG':    at0(SITE_PEAKS[3]),
  'Shyft & Mindhouse': at0(SITE_PEAKS[4]),
  'Alpine': { x: 0, z: 0, h: 38, spread: 30, seed: 18.4, rot: 0.4, aniso: 1.15, warp: 12,
    spur: 0.42, spurF: 3.0, flute: 0.16, fluteF: 14,
    parts: [ { dx: 0, dz: 0, h: 34, spread: 24, sharp: 1.25, aniso: 1.1 },
             { dx: 16, dz: 6, h: 18, spread: 18, sharp: 1.4, aniso: 1.3 },
             { dx: -14, dz: 10, h: 14, spread: 20, sharp: 1.5, aniso: 1.2 },
             { dx: 0, dz: 8, h: 6, spread: 42, mesa: 0.6, aniso: 1.2 } ] },
  'Andean': { x: 0, z: 0, h: 34, spread: 40, seed: 61.2, rot: -0.2, aniso: 2.6, warp: 14,
    spur: 0.36, spurF: 2.4, flute: 0.12, fluteF: 12,
    parts: [ { dx: 0, dz: 0, h: 30, spread: 40, sharp: 1.9, aniso: 2.8 },
             { dx: -26, dz: 2, h: 22, spread: 16, sharp: 1.5, aniso: 1.3 },
             { dx: 22, dz: -3, h: 26, spread: 15, sharp: 1.4, aniso: 1.2 } ] },
  'Himalayan Ridge': { x: 0, z: 0, h: 48, spread: 34, seed: 97.7, rot: 0.15, aniso: 1.9, warp: 10,
    spur: 0.5, spurF: 3.4, flute: 0.2, fluteF: 16,
    parts: [ { dx: 0, dz: 0, h: 44, spread: 20, sharp: 1.15, aniso: 1.15 },
             { dx: -22, dz: 4, h: 30, spread: 16, sharp: 1.2, aniso: 1.1 },
             { dx: 24, dz: -2, h: 34, spread: 17, sharp: 1.2, aniso: 1.15 },
             { dx: 0, dz: 0, h: 14, spread: 56, sharp: 2.2, aniso: 2.6 } ] },
  'Isolated Volcano': { x: 0, z: 0, h: 36, spread: 36, seed: 140.1, rot: 0, aniso: 1.04, warp: 6,
    spur: 0.18, spurF: 4.2, flute: 0.22, fluteF: 22,
    parts: [ { dx: 0, dz: 0, h: 40, spread: 34, sharp: 1.6, aniso: 1.04 },
             { dx: 0, dz: 0, h: -9, spread: 5.5, sharp: 2.4, aniso: 1.0 } ] },
  'Desert Mesa': { x: 0, z: 0, h: 22, spread: 36, seed: 203.9, rot: 0.6, aniso: 1.35, warp: 16,
    spur: 0.22, spurF: 2.2, flute: 0.1, fluteF: 9,
    parts: [ { dx: 0, dz: 0, h: 20, spread: 30, mesa: 0.16, aniso: 1.4 },
             { dx: 34, dz: 12, h: 13, spread: 10, mesa: 0.2, aniso: 1.1 },
             { dx: -30, dz: -14, h: 9, spread: 8, mesa: 0.24, aniso: 1.0 } ] },
};

/** A new landform from a seed — the same seed always gives the same one. */
export function randomLandform(seed) {
  let t = (seed >>> 0) || 1;
  const rnd = () => { t ^= t << 13; t >>>= 0; t ^= t >> 17; t ^= t << 5; t >>>= 0; return t / 4294967296; };
  const B = (a, b) => a + (b - a) * rnd();
  const h = B(26, 46), spread = B(24, 40), aniso = B(1, 2.2);
  const parts = [{ dx: 0, dz: 0, h: h * B(.75, .95), spread: spread * B(.6, .9), sharp: B(1.15, 2.2), aniso }];
  const extra = 1 + Math.floor(rnd() * 3);
  for (let i = 0; i < extra; i++) {
    const mesa = rnd() < .35;
    parts.push({ dx: B(-spread * .7, spread * .7), dz: B(-spread * .5, spread * .7), h: h * B(.2, .6), spread: spread * B(.4, 1.2),
      ...(mesa ? { mesa: B(.3, .65) } : { sharp: B(1.3, 2.4) }), aniso: B(1, 1.6) });
  }
  return { x: 0, z: 0, h, spread, seed: B(0, 300), rot: B(-Math.PI, Math.PI), aniso, warp: B(5, 18),
    spur: B(.15, .5), spurF: B(1.8, 3.6), flute: B(.05, .22), fluteF: B(8, 18), parts };
}

/* ─── Presets (from the lab) ───────────────────────────────────────────── */
export const USE_KEY = 'tibba.mountains.use';

/** Sculpt grid → a compact string (16-bit, scaled), and back. */
export function encodeSculpt(s) {
  let m = 0; for (let i = 0; i < s.data.length; i++) m = Math.max(m, Math.abs(s.data[i]));
  const scale = m > 0 ? m / 32767 : 1, q = new Int16Array(s.data.length);
  for (let i = 0; i < q.length; i++) q[i] = Math.round(s.data[i] / scale);
  const bytes = new Uint8Array(q.buffer); let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return { n: s.n, extent: s.extent, scale, q: btoa(bin) };
}
export function decodeSculpt(e) {
  if (!e || !e.q) return null;
  const bin = atob(e.q), bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const q = new Int16Array(bytes.buffer), data = new Float32Array(q.length);
  for (let i = 0; i < q.length; i++) data[i] = q[i] * e.scale;
  return { n: e.n, extent: e.extent, data };
}

/** A lab preset as a landform standing at (x, z). */
export function peakFromPreset(preset, x = 0, z = 0) {
  const L = preset.landform, k = preset.scale || { height: 1, width: 1 };
  const p = clonePeak(L);
  p.x = x; p.z = z;
  p.h *= k.height; p.spread *= k.width; p.warp *= k.width;
  p.parts.forEach(t => { t.h *= k.height; t.spread *= k.width; t.dx *= k.width; t.dz *= k.width; });
  const s = preset.sculpt && decodeSculpt(preset.sculpt);
  if (s) p.sculpt = s; else delete p.sculpt;
  return p;
}

/** What the lab has asked this browser to use, if anything. */
export function readSiteLandforms() {
  try { return JSON.parse(localStorage.getItem(USE_KEY) || 'null'); } catch (e) { return null; }
}

/** Swaps the hero's peak (index 0) or a client summit (1–4) for a lab preset,
    keeping each where it stands. Called by range-scene.js before it prepares
    its peaks; does nothing unless the lab has set something. */
export function applySiteLandforms(peaks, mode) {
  const use = readSiteLandforms();
  if (!use) return;
  if (mode !== 'range' && use.hero) peaks[0] = peakFromPreset(use.hero, peaks[0].x, peaks[0].z);
  if (mode === 'range' && use.summits) use.summits.forEach((pr, i) => {
    if (pr && peaks[i + 1]) peaks[i + 1] = peakFromPreset(pr, peaks[i + 1].x, peaks[i + 1].z);
  });
}
