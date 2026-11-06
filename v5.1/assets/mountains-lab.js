/* ══════════════════════════════════════════════════════════════════════════
   Mountains Lab
   ─────────────────────────────────────────────────────────────────────────
   Build a mountain, sculpt it, decide how it is drawn and how the camera
   moves, and take it away as a still, a film or a preset.

   One rule runs through it: the contour drawing is the foundation. The
   surface underneath the lines (paper, texture, light, fog) is a layer
   that can be turned up from nothing, never a replacement for them, and
   every edit reflows the contours as it happens.

     the land       assets/mountains-lab-terrain.js — a heightfield built
                    from assets/landform.js (the generator the hero and the
                    four summits are drawn with) plus a sculpt layer
     the drawing    one ShaderMaterial: contours by screen-space distance
                    to the nearest interval (so they stay one weight at any
                    zoom), index lines, ridge emphasis, the survey palette
                    from the site, and the surface under them
     the motion     a keyframed camera path, line behaviours (draw in, scan,
                    crawl, pulse, flicker) and terrain motion (rise, morph
                    between checkpoints, a recorded time-lapse)
     the way out    PNG at 1–4× (transparent if wanted), WebM/MP4 through
                    MediaRecorder at a fixed frame step, and presets — JSON
                    files, a library in this browser, and "Use in hero" /
                    "Use as summit", which range-scene.js picks up

   Keys: V navigate · R raise · L lower · S smooth · N noise · C crease ·
   G ridge · F flatten · K valley · M mask · [ ] brush size · Space play ·
   P presentation · ⌘Z / ⇧⌘Z undo / redo.
   ═════════════════════════════════════════════════════════════════════════ */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { LANDFORM_LIBRARY, randomLandform, CT_PALETTE_RAMPS, encodeSculpt, decodeSculpt, USE_KEY, clonePeak } from './landform.js';
import { createTerrain } from './mountains-lab-terrain.js';

const $ = s => document.querySelector(s);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const EASE = {
  linear: t => t,
  'ease in-out': t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  'ease in': t => t * t * t,
  'ease out': t => 1 - Math.pow(1 - t, 3),
  sine: t => -(Math.cos(Math.PI * t) - 1) / 2,
  'accelerate, settle': t => t < .62 ? Math.pow(t / .62, 2.2) * .72 : .72 + (1 - Math.pow(1 - (t - .62) / .38, 3)) * .28,
};
const LIB_KEY = 'tibba.mountains.presets';
const store = { get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } },
                set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } } };

/* ── the state ──────────────────────────────────────────────────────────────
   Everything a preset carries. The UI writes here and calls the matching
   apply(); presets are this object serialised (with the sculpt layer). */
const S = {
  name: 'Untitled mountain',
  start: 'Tibba massif', seed: 2468, detail: 257,
  brush: { tool: 'nav', size: 12, strength: .5, hardness: .35, sym: 'none' },
  view: { cam: 'persp', fov: 34, section: false, sectionAt: 0, gizmo: false, gizmoMode: 'rotate', lockHorizon: true, exag: 1, rot: [0, 0, 0], pos: [0, 0, 0] },
  render: { mode: 'contour', spacing: 1.15, width: 1.1, indexEvery: 5, indexWeight: 2.1, ridge: .55, colour: 'survey', custom: '#e9ecf2', opacity: 1,
            shade: .28, tex: .7, material: 'rock', texScale: 40, rough: .72, bump: .5, showMask: true },
  light: { tod: .32, az: .62, ambient: .4, fog: .15, fogAuto: true, fogColour: '#0b0d12', haze: .25 },
  anim: { camera: 'orbit', lines: 'none', dir: 'up', speed: 1, amp: .6, terrain: 'none', duration: 8, fps: 30, loop: true },
  react: { source: 'off', target: 'brightness', gain: 1, data: '0, .2, .6, 1, .7, .3, .1, .5, .9, .4' },
  path: [],            // camera keys: { t, p:[x,y,z], q:[x,y,z], ease }
  exp: { scale: 2, transparent: false, res: '1080', vfps: 30, quality: 'high' },
};

/* ── the land ───────────────────────────────────────────────────────────── */
const T = createTerrain({ n: S.detail, extent: 260 });
T.landform = clonePeak(LANDFORM_LIBRARY[S.start]);
T.rebuildBase();

/* ── renderer, scene, cameras ───────────────────────────────────────────── */
const canvas = $('#lab');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, premultipliedAlpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.localClippingEnabled = true;
const scene = new THREE.Scene();
const persp = new THREE.PerspectiveCamera(S.view.fov, 1, .5, 6000);
const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, -4000, 6000);
let cam = persp;
persp.position.set(-150, 118, 210);
const controls = new OrbitControls(persp, canvas);
controls.enableDamping = true; controls.dampingFactor = .08;
controls.target.set(0, 16, 0);
controls.maxDistance = 1800;

const land = new THREE.Group();
scene.add(land);

/* geometry: one vertex per sample, rebuilt only when the detail changes */
let geo, mesh;
const attrs = {};
function buildGeometry() {
  const n = T.n, N = n * n;
  if (geo) geo.dispose();
  geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3), uv = new Float32Array(N * 2);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const q = j * n + i;
    pos[q * 3] = -T.extent / 2 + i * T.cell; pos[q * 3 + 2] = -T.extent / 2 + j * T.cell;
    uv[q * 2] = i / (n - 1); uv[q * 2 + 1] = j / (n - 1);
  }
  const index = new Uint32Array((n - 1) * (n - 1) * 6); let k = 0;
  for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
    const a = j * n + i, b = a + 1, c = a + n, d = c + 1;
    index[k++] = a; index[k++] = c; index[k++] = b; index[k++] = b; index[k++] = c; index[k++] = d;
  }
  geo.setIndex(new THREE.BufferAttribute(index, 1));
  geo.setAttribute('position', attrs.pos = new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', attrs.nor = new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  geo.setAttribute('aRidge', attrs.ridge = new THREE.BufferAttribute(new Float32Array(N), 1));
  geo.setAttribute('aMask', attrs.mask = new THREE.BufferAttribute(new Float32Array(N), 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), T.extent);
  if (mesh) mesh.geometry = geo;
  ridgeBuf = new Float32Array(N);
}
let ridgeBuf;

/* the displayed heights: the terrain, or what terrain motion makes of it */
let shown = T.H;
function pushGeometry() {
  const n = T.n, p = attrs.pos.array, nr = attrs.nor.array, ex = S.view.exag, c2 = 2 * T.cell;
  for (let q = 0; q < n * n; q++) p[q * 3 + 1] = shown[q];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const q = j * n + i;
    const hx = (shown[j * n + Math.min(n - 1, i + 1)] - shown[j * n + Math.max(0, i - 1)]) * ex / c2;
    const hz = (shown[Math.min(n - 1, j + 1) * n + i] - shown[Math.max(0, j - 1) * n + i]) * ex / c2;
    const l = 1 / Math.hypot(hx, 1, hz);
    nr[q * 3] = -hx * l; nr[q * 3 + 1] = l; nr[q * 3 + 2] = -hz * l;
  }
  T.ridges(ridgeBuf); attrs.ridge.array.set(ridgeBuf);
  attrs.mask.array.set(T.M);
  attrs.pos.needsUpdate = attrs.nor.needsUpdate = attrs.ridge.needsUpdate = attrs.mask.needsUpdate = true;
  U.uMaxH.value = T.maxH;
}

/* ── the drawing ────────────────────────────────────────────────────────── */
const MATERIALS = ['rock', 'snow', 'grass', 'volcanic', 'desert', 'custom'];
const U = {
  uExag: { value: 1 }, uMaxH: { value: 40 }, uExtent: { value: T.extent },
  uInterval: { value: 1.15 }, uLineW: { value: 1.1 }, uIndexEvery: { value: 5 }, uIndexW: { value: 2.1 }, uRidge: { value: .55 },
  uColMode: { value: 0 }, uLineCol: { value: new THREE.Vector3(.91, .93, .95) }, uLineA: { value: 1 }, uPx: { value: 1 },
  uPaper: { value: new THREE.Vector3(.022, .022, .026) }, uShade: { value: .28 }, uTex: { value: 0 },
  uMat: { value: 0 }, uAlbedo: { value: null }, uNormalMap: { value: null }, uHasAlbedo: { value: 0 }, uHasNormal: { value: 0 },
  uTexScale: { value: 40 }, uRough: { value: .72 }, uBump: { value: .5 },
  uSun: { value: new THREE.Vector3(.4, .7, .5).normalize() }, uSunCol: { value: new THREE.Vector3(1, .97, .92) },
  uAmb: { value: .4 }, uAmbCol: { value: new THREE.Vector3(.5, .58, .72) },
  uFog: { value: .15 }, uFogCol: { value: new THREE.Vector3(.04, .05, .07) }, uHaze: { value: .25 },
  uTransparent: { value: 0 }, uShowMask: { value: 1 },
  uKeyDir: { value: 0 }, uDraw: { value: 2 }, uScan: { value: -1 }, uScanOn: { value: 0 }, uShift: { value: 0 },
  uPulse: { value: 0 }, uPulseOn: { value: 0 }, uFlick: { value: 0 }, uFlickOn: { value: 0 }, uAmp: { value: .6 }, uBright: { value: 0 },
  uBrush: { value: new THREE.Vector4(0, 0, 0, 0) }, uSection: { value: 0 },
};
const vert = /* glsl */`
  attribute float aRidge; attribute float aMask;
  uniform float uExag;
  varying float vH; varying float vRidge; varying float vMask; varying vec3 vL; varying vec3 vW; varying vec3 vN;
  #include <clipping_planes_pars_vertex>
  void main(){
    vec3 p = position; vH = p.y; p.y *= uExag;
    vRidge = aRidge; vMask = aMask; vL = position;
    vec4 w = modelMatrix * vec4(p, 1.0); vW = w.xyz;
    vN = normalize(mat3(modelMatrix) * normal);
    vec4 mvPosition = viewMatrix * w;
    #include <clipping_planes_vertex>
    gl_Position = projectionMatrix * mvPosition;
  }`;
const frag = /* glsl */`
  #include <clipping_planes_pars_fragment>
  uniform float uMaxH, uExtent, uInterval, uLineW, uIndexEvery, uIndexW, uRidge, uLineA, uPx, uShade, uTex, uTexScale, uRough, uBump;
  uniform int uColMode, uMat, uKeyDir; uniform vec3 uLineCol, uPaper, uSun, uSunCol, uAmbCol, uFogCol;
  uniform float uAmb, uFog, uHaze, uTransparent, uShowMask, uDraw, uScan, uScanOn, uShift, uPulse, uPulseOn, uFlick, uFlickOn, uAmp, uBright, uHasAlbedo, uHasNormal;
  uniform sampler2D uAlbedo, uNormalMap; uniform vec4 uBrush;
  varying float vH; varying float vRidge; varying float vMask; varying vec3 vL; varying vec3 vW; varying vec3 vN;
  vec3 palette(float t){ ${CT_PALETTE_RAMPS.peak} }
  float hash(float n){ return fract(sin(n) * 43758.5453); }
  float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
    return mix(mix(h2(i), h2(i+vec2(1,0)), u.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), u.x), u.y); }
  float fbm(vec2 p){ float v = 0.0, a = .5; for (int i = 0; i < 4; i++){ v += a * vnoise(p); p *= 2.03; a *= .5; } return v; }

  vec3 material(vec3 L, float t, float slope, inout vec3 N){
    vec2 q = L.xz;
    float n = fbm(q * .06), n2 = fbm(q * .45 + 7.0);
    /* a little relief in the light, from the same noise */
    float e = .35, b0 = fbm(q * .45), bx = fbm((q + vec2(e, 0)) * .45), bz = fbm((q + vec2(0, e)) * .45);
    N = normalize(N + uBump * vec3(b0 - bx, 0.0, b0 - bz) * 3.0);
    vec3 rock = mix(vec3(.30, .29, .28), vec3(.50, .47, .43), n) * (.82 + .3 * n2);
    vec3 c = rock;
    if (uMat == 1) c = mix(rock, vec3(.93, .95, .99), smoothstep(.42, .6, t + (1.0 - slope) * .3 + n * .18 - .14));
    else if (uMat == 2) { vec3 grass = mix(vec3(.17, .27, .11), vec3(.33, .42, .19), n) * (.85 + .25 * n2);
      c = mix(grass, rock, smoothstep(.32, .58, slope + t * .55)); c = mix(c, vec3(.92, .94, .98), smoothstep(.8, .9, t + n * .1)); }
    else if (uMat == 3) { vec3 basalt = mix(vec3(.07, .065, .065), vec3(.2, .18, .17), n2);
      c = mix(basalt, vec3(.32, .29, .27), smoothstep(.55, .85, n)); c += vec3(.55, .12, .03) * smoothstep(.9, 1.0, t) * smoothstep(.4, .1, slope); }
    else if (uMat == 4) { float band = .5 + .5 * sin(L.y * 1.25 + n * 4.0);
      c = mix(vec3(.80, .62, .40), vec3(.62, .36, .21), band * smoothstep(.15, .5, slope)) * (.88 + .2 * n2); }
    else if (uMat == 5 && uHasAlbedo > .5) c = texture2D(uAlbedo, q / uTexScale).rgb;
    if (uHasNormal > .5) { vec3 tn = texture2D(uNormalMap, q / uTexScale).xyz * 2.0 - 1.0; N = normalize(N + vec3(tn.x, 0.0, tn.y) * uBump); }
    return c;
  }

  void main(){
    #include <clipping_planes_fragment>
    float t = clamp(vH / uMaxH, 0.0, 1.0);
    float key = uKeyDir == 0 ? t : (uKeyDir == 1 ? 1.0 - t : vL.x / uExtent + .5);

    /* the contours: distance to the nearest interval, in pixels */
    float f = (vH - uShift) / uInterval;
    float fw = max(fwidth(f), 1e-4);
    float d = abs(fract(f + .5) - .5) / fw;
    float ci = floor(f + .5);
    float isIdx = step(mod(ci + .5, uIndexEvery), 1.0);
    float rg = clamp(vRidge * 1.6, 0.0, 1.5);
    float scan = uScanOn * exp(-pow((key - uScan) / .045, 2.0));
    float pulse = uPulseOn * uAmp * clamp(rg, 0.0, 1.0) * (.5 + .5 * sin((key * 6.0 - uPulse) * 6.2832));
    float w = uLineW * uPx * mix(1.0, uIndexW, isIdx) * (1.0 + uRidge * rg) * (1.0 + scan * 1.6 * uAmp + pulse * 1.2);
    float a = 1.0 - smoothstep(w * .5 - .5, w * .5 + .5, d);
    a *= step(.5, ci + uShift / uInterval);                                    // no line at sea level: the clamped plain sits exactly on it
    /* where the lines crowd closer than a few pixels (the plain seen edge-on)
       they fade out rather than shimmer — the index lines hold on longest */
    float fwc = fw * max(uPx, .5);
    a *= 1.0 - smoothstep(mix(.14, .3, isIdx), mix(.32, .6, isIdx), fwc);
    /* the lowest contours, out on the plain, are the quiet ones */
    a *= .45 + .55 * smoothstep(.0, .18, t);
    a *= smoothstep(uDraw + .015, uDraw - .015, key);                         // draw-in
    a *= mix(1.0, step(.4, hash(ci * 1.37 + floor(uFlick))) * .8 + .2, uFlickOn * uAmp);
    float lift = (isIdx * .15 + scan * 1.3 * uAmp + pulse * 1.4 + uBright);
    vec3 lc = uColMode == 0 ? palette(t) : uLineCol;
    lc *= 1.0 + lift;

    /* the surface under them */
    vec3 N = normalize(vN);
    float lam = max(dot(N, uSun), 0.0);
    vec3 paper = uPaper * (1.0 - uShade + uShade * (.3 + 1.6 * lam));
    float slope = 1.0 - clamp(N.y, 0.0, 1.0);
    vec3 Nm = N;
    vec3 alb = material(vL, t, slope, Nm);
    vec3 V = normalize(cameraPosition - vW), Hh = normalize(uSun + V);
    float lamM = max(dot(Nm, uSun), 0.0);
    float spec = pow(max(dot(Nm, Hh), 0.0), mix(6.0, 60.0, 1.0 - uRough)) * (1.0 - uRough) * .5;
    vec3 lit = alb * (lamM * uSunCol + uAmb * uAmbCol * (.55 + .45 * Nm.y)) + spec * uSunCol;
    vec3 base = mix(paper, lit, uTex);

    vec3 col = mix(base, lc, a * uLineA);
    float dist = length(cameraPosition - vW);
    float fog = 1.0 - exp(-pow(dist * uFog * .0035, 2.0));
    float haze = uHaze * exp(-max(vW.y, 0.0) * .045) * smoothstep(60.0, 520.0, dist);
    col = mix(col, uFogCol, clamp(fog + haze, 0.0, 1.0));

    col = mix(col, vec3(1.0, .29, .12), vMask * .38 * uShowMask);
    if (uBrush.w > 0.0) {                                                     // the brush, drawn on the land
      float bd = length(vL.xz - uBrush.xy), bw = fwidth(bd);
      float ring = 1.0 - smoothstep(0.0, bw * 1.5, abs(bd - uBrush.z));
      float dot0 = 1.0 - smoothstep(0.0, bw * 2.0, bd - uBrush.z * .04);
      col = mix(col, vec3(1.0, .29, .12), max(ring, dot0) * uBrush.w);
    }
    float alpha = 1.0;
    if (uTransparent > .5) { alpha = clamp(max(a * uLineA, uTex), 0.0, 1.0); col *= alpha; }
    gl_FragColor = vec4(col, alpha);
  }`;
const mat = new THREE.ShaderMaterial({ uniforms: U, vertexShader: vert, fragmentShader: frag, clipping: true, side: THREE.DoubleSide, extensions: { derivatives: true } });
buildGeometry();
mesh = new THREE.Mesh(geo, mat);
mesh.frustumCulled = false;
land.add(mesh);
pushGeometry();

/* the section cut: a clipping plane through the land, for the profile view */
const sectionPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);

/* the gizmo */
const gizmo = new TransformControls(persp, canvas);
gizmo.setSize(.8);
gizmo.addEventListener('dragging-changed', e => { controls.enabled = !e.value; });
gizmo.addEventListener('objectChange', () => { S.view.rot = [land.rotation.x, land.rotation.y, land.rotation.z]; S.view.pos = land.position.toArray(); });
scene.add(gizmo.getHelper ? gizmo.getHelper() : gizmo);

/* ── light and air ──────────────────────────────────────────────────────────
   Time of day runs dawn → noon → golden hour → night; it sets the sun's
   height and colour, the ambient and the sky (which is the fog's colour
   unless one is picked). */
const TOD = [
  { t: 0,   name: 'Dawn',        elev: 7,  sun: [1, .64, .45], amb: [.36, .38, .55], sky: [.11, .1, .15] },
  { t: .32, name: 'Noon',        elev: 62, sun: [1, .98, .94], amb: [.52, .6, .74],  sky: [.38, .5, .66] },
  { t: .68, name: 'Golden hour', elev: 11, sun: [1, .66, .3],  amb: [.5, .42, .4],   sky: [.5, .33, .21] },
  { t: 1,   name: 'Night',       elev: 30, sun: [.3, .37, .58], amb: [.07, .09, .16], sky: [.012, .016, .032] },
];
function todAt(v) {
  let a = TOD[0], b = TOD[TOD.length - 1];
  for (let i = 0; i < TOD.length - 1; i++) if (v >= TOD[i].t && v <= TOD[i + 1].t) { a = TOD[i]; b = TOD[i + 1]; break; }
  const k = (v - a.t) / ((b.t - a.t) || 1), m = (x, y) => x.map((c, i) => lerp(c, y[i], k));
  return { name: k < .5 ? a.name : b.name, elev: lerp(a.elev, b.elev, k), sun: m(a.sun, b.sun), amb: m(a.amb, b.amb), sky: m(a.sky, b.sky) };
}
const hexToV = h => { const n = parseInt(h.slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
let skyNow = [0, 0, 0];
function applyLight() {
  const L = S.light, d = todAt(L.tod);
  const el = d.elev * Math.PI / 180, az = L.az * Math.PI * 2;
  U.uSun.value.set(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)).normalize();
  U.uSunCol.value.set(...d.sun); U.uAmbCol.value.set(...d.amb); U.uAmb.value = L.ambient;
  skyNow = S.render.mode === 'contour' ? [0, 0, 0] : d.sky;
  const fc = L.fogAuto ? (S.render.mode === 'contour' ? [.03, .035, .05] : d.sky) : hexToV(L.fogColour);
  U.uFogCol.value.set(...fc); U.uFog.value = L.fog; U.uHaze.value = L.haze;
  renderer.setClearColor(new THREE.Color().setRGB(...skyNow, THREE.SRGBColorSpace), 1);
  return d;
}

/* ── the render settings ────────────────────────────────────────────────── */
function applyRender() {
  const R = S.render;
  U.uInterval.value = R.spacing; U.uLineW.value = R.width; U.uIndexEvery.value = R.indexEvery; U.uIndexW.value = R.indexWeight;
  U.uRidge.value = R.ridge; U.uLineA.value = R.opacity; U.uShade.value = R.shade;
  U.uTex.value = R.mode === 'contour' ? 0 : R.mode === 'textured' ? 1 : R.tex;
  U.uColMode.value = R.colour === 'survey' ? 0 : 1;
  U.uLineCol.value.set(...(R.colour === 'ink' ? [.93, .94, .96] : R.colour === 'orange' ? [1, .29, .12] : hexToV(R.custom)));
  U.uMat.value = MATERIALS.indexOf(R.material); U.uTexScale.value = R.texScale; U.uRough.value = R.rough; U.uBump.value = R.bump;
  U.uShowMask.value = R.showMask ? 1 : 0;
  applyLight();
}
function applyView() {
  const V = S.view;
  U.uExag.value = V.exag;
  persp.fov = V.fov; persp.updateProjectionMatrix();
  mat.clippingPlanes = V.section ? [sectionPlane] : [];
  sectionPlane.constant = V.sectionAt;
  mat.needsUpdate = true;
  gizmo.enabled = V.gizmo; (gizmo.getHelper ? gizmo.getHelper() : gizmo).visible = V.gizmo;
  if (V.gizmo) gizmo.attach(land); else gizmo.detach();
  gizmo.setMode(V.gizmoMode === 'move' ? 'translate' : 'rotate');
  gizmo.showX = gizmo.showZ = !(V.gizmoMode === 'rotate' && V.lockHorizon); gizmo.showY = true;
}
function setCamera(kind) {
  const prev = cam, target = controls.target.clone();
  S.view.cam = kind;
  if (kind === 'persp') {
    cam = persp;
    if (prev !== persp) persp.position.copy(prev.position);
  } else {
    cam = ortho;
    if (kind === 'profile') {
      const s = T.summit();
      target.set(0, s.h * S.view.exag * .45, 0);
      ortho.position.set(0, target.y, 900); ortho.zoom = 1;
    } else ortho.position.copy(prev.position);
  }
  controls.object = cam; gizmo.camera = cam;
  controls.target.copy(target);
  controls.enableRotate = kind !== 'profile';
  resize(); controls.update();
}

/* ── sizing ─────────────────────────────────────────────────────────────── */
let W = 1, H = 1;
function resize(w = innerWidth, h = innerHeight, px = Math.min(devicePixelRatio, 2)) {
  W = w; H = h;
  renderer.setPixelRatio(px); renderer.setSize(w, h, false);
  /* line weights are in screen pixels of the page as seen: an export at any
     size draws them at the same weight relative to the frame */
  U.uPx.value = h * px / (innerHeight || h);
  persp.aspect = w / h; persp.updateProjectionMatrix();
  const half = S.view.cam === 'profile' ? T.extent * .32 : T.extent * .62;
  ortho.left = -half * w / h; ortho.right = half * w / h; ortho.top = half; ortho.bottom = -half; ortho.updateProjectionMatrix();
  drawTrack();
}
addEventListener('resize', () => { if (!exporting) resize(); });

/* ── history and checkpoints ────────────────────────────────────────────── */
const undo = [], redo = [];
function remember() { undo.push(T.snapshot()); if (undo.length > 40) undo.shift(); redo.length = 0; refreshTools(); }
function stepHistory(from, to) {
  const s = from.pop(); if (!s) return;
  to.push(T.snapshot()); T.restore(s); pushGeometry(); refreshTools();
}
let checkpoints = [], cpA = null, cpB = null, abSide = 'A';
function saveCheckpoint() {
  const c = { id: Math.random().toString(36).slice(2, 8), name: 'Checkpoint ' + (checkpoints.length + 1), at: new Date(),
    snap: T.snapshot(), H: T.H.slice(), landform: clonePeak(T.landform), useLandform: T.useLandform, scale: { ...T.scale }, ground: T.ground };
  checkpoints.push(c);
  if (!cpA) cpA = c.id; else if (!cpB) cpB = c.id;
  renderCheckpoints(); toast(c.name + ' saved');
}
function loadCheckpoint(c) {
  if (c.snap.n !== T.n) { toast('That checkpoint was made at another detail'); return; }
  remember();
  T.landform = clonePeak(c.landform); T.useLandform = c.useLandform; T.scale = { ...c.scale }; T.ground = c.ground;
  T.rebuildBase(); T.restore(c.snap); pushGeometry(); syncUI();
}

/* ── the pointer: sculpting ─────────────────────────────────────────────── */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
const inv = new THREE.Matrix4();
function pick(ev) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, cam);
  inv.copy(land.matrixWorld).invert();
  const o = ray.ray.origin.clone().applyMatrix4(inv), d = ray.ray.direction.clone().transformDirection(inv);
  const ex = S.view.exag, half = T.extent / 2, step = T.cell * .5;
  /* march the heightfield, then bisect the crossing */
  let t0 = 0, t1 = 4000;
  if (Math.abs(d.y) > 1e-6) { const ta = ((T.maxH * ex + 2) - o.y) / d.y; if (ta > 0 && o.y > T.maxH * ex) t0 = ta; }
  let prev = t0, prevAbove = true;
  for (let t = t0; t < t1; t += step) {
    const x = o.x + d.x * t, y = o.y + d.y * t, z = o.z + d.z * t;
    if (Math.abs(x) > half || Math.abs(z) > half) { if (t > t0 + T.extent * 3) break; prev = t; continue; }
    const above = y > T.at(x, z) * ex;
    if (!above && prevAbove && t > t0) {
      let a = prev, b = t;
      for (let k = 0; k < 18; k++) { const m = (a + b) / 2; const ym = o.y + d.y * m, xm = o.x + d.x * m, zm = o.z + d.z * m;
        if (ym > T.at(xm, zm) * ex) a = m; else b = m; }
      const m = (a + b) / 2;
      return { x: o.x + d.x * m, z: o.z + d.z * m };
    }
    prevAbove = above; prev = t;
    if (y < -50) break;
  }
  return null;
}
let stroke = null, lastDab = null, geoDirty = false;
const isSculpt = () => S.brush.tool !== 'nav';
canvas.addEventListener('pointerdown', ev => {
  if (!isSculpt() || ev.button !== 0 || playing || gizmoHot) return;
  const p = pick(ev); if (!p) return;
  remember();
  stroke = { id: ev.pointerId, flatH: T.at(p.x, p.z), seed: Math.random() * 100 };
  canvas.setPointerCapture(ev.pointerId);
  dabAt(p, true);
});
canvas.addEventListener('pointermove', ev => {
  if (!isSculpt()) return;
  const p = pick(ev);
  U.uBrush.value.set(p ? p.x : 0, p ? p.z : 0, S.brush.size, p ? 1 : 0);
  if (stroke && p && ev.pointerId === stroke.id) dabAt(p);
});
const endStroke = ev => { if (stroke && ev.pointerId === stroke.id) { stroke = null; lastDab = null; renderCheckpoints(); } };
canvas.addEventListener('pointerup', endStroke); canvas.addEventListener('pointercancel', endStroke);
canvas.addEventListener('pointerleave', () => { U.uBrush.value.w = 0; });
function dabAt(p, first) {
  const spacing = Math.max(.6, S.brush.size * .18);
  const go = q => T.dab(S.brush.tool, q.x, q.z, { size: S.brush.size, strength: S.brush.strength, hardness: S.brush.hardness, sym: S.brush.sym, seed: stroke.seed, flatH: stroke.flatH });
  if (first || !lastDab) { go(p); lastDab = p; }
  else {
    const dx = p.x - lastDab.x, dz = p.z - lastDab.z, L = Math.hypot(dx, dz);
    const k = Math.floor(L / spacing);
    for (let i = 1; i <= k; i++) go({ x: lastDab.x + dx * i / k * (k * spacing / L), z: lastDab.z + dz * i / k * (k * spacing / L) });
    if (k) lastDab = { x: lastDab.x + dx * (k * spacing / L), z: lastDab.z + dz * (k * spacing / L) };
  }
  geoDirty = true;
}
let gizmoHot = false;
gizmo.addEventListener('mouseDown', () => { gizmoHot = true; }); gizmo.addEventListener('mouseUp', () => { gizmoHot = false; });
function setTool(t) {
  S.brush.tool = t;
  document.body.classList.toggle('sculpting', t !== 'nav');
  controls.mouseButtons = t === 'nav' ? { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN } : { LEFT: null, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
  controls.touches = t === 'nav' ? { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN } : { ONE: null, TWO: THREE.TOUCH.DOLLY_ROTATE };
  if (t === 'nav') U.uBrush.value.w = 0;
  refreshTools();
}

/* ── erosion, run over a few frames so it can be watched ────────────────── */
let working = false;
function erode(kind, passes = 1, after) {
  if (working) { toast('One moment — the last pass is still running'); return; }
  working = true; remember();
  const steps = kind === 'wind' ? 24 : kind === 'river' ? 12 : 8;
  let i = 0;
  const seed = (Math.random() * 1e6) | 0;
  (function tick() {
    for (let p = 0; p < passes; p++) {
      if (kind === 'wind') T.thermal(2, 1, [Math.cos(S.light.az * 6.283), Math.sin(S.light.az * 6.283)]);
      else if (kind === 'river') T.hydraulic(1400, 1, seed + i * 31 + p);
      else T.glacial(.6);
    }
    pushGeometry();
    if (++i < steps) requestAnimationFrame(tick);
    else { working = false; if (after) after(); }
  })();
}
/* story presets: an erosion run recorded as frames, played back as terrain
   motion — a valley deepening, a glacier carving, a ridge wearing down */
let lapse = null;
function story(kind) {
  if (working) { toast('One moment — the last pass is still running'); return; }
  const frames = [T.H.slice()], start = T.snapshot();
  working = true; remember();
  let i = 0; const steps = 14;
  busy(true, 'Recording a time-lapse');
  (function tick() {
    for (let k = 0; k < 2; k++) {
      if (kind === 'river') T.hydraulic(2600, 1.2, 77 + i * 13 + k);
      else if (kind === 'glacial') T.glacial(.8);
      else T.thermal(6, 1.4);
    }
    frames.push(T.H.slice()); pushGeometry(); busyAt((i + 1) / steps);
    if (++i < steps && !cancelled) requestAnimationFrame(tick);
    else {
      working = false; busy(false);
      lapse = { frames, n: T.n };
      S.anim.terrain = 'timelapse'; syncUI();
      toast('Time-lapse recorded — press play');
    }
  })();
}

/* ── camera moves ───────────────────────────────────────────────────────────
   Every preset writes keys into the path, so a preset is a starting point
   for the timeline rather than a mode — move a key and it is yours. */
function summitWorld() {
  const s = T.summit(); return new THREE.Vector3(s.x, s.h * S.view.exag, s.z).applyMatrix4(land.matrixWorld);
}
function cameraPreset(kind) {
  S.anim.camera = kind;
  const s = summitWorld(), R = T.extent * .78, Y = Math.max(40, s.y * 1.25), keys = [];
  const tgt = [s.x, s.y * .45, s.z];
  const K = (t, p, q = tgt, ease = 'linear') => keys.push({ t, p: p.map(v => +v.toFixed(2)), q: q.map(v => +v.toFixed(2)), ease });
  if (kind === 'static') { S.path = []; renderPathUI(); return; }
  if (kind === 'orbit') for (let i = 0; i <= 8; i++) { const a = -2.2 + i / 8 * Math.PI * 2; K(i / 8, [s.x + Math.cos(a) * R, Y, s.z + Math.sin(a) * R]); }
  if (kind === 'fly') for (let i = 0; i <= 8; i++) { const a = -2.2 + i / 8 * Math.PI * 2, r = R * (1 + .32 * Math.sin(i / 8 * Math.PI * 4)), y = Y * (1 + .45 * Math.cos(i / 8 * Math.PI * 2));
    K(i / 8, [s.x + Math.cos(a) * r, y, s.z + Math.sin(a) * r], [s.x, s.y * (.35 + .2 * Math.sin(i)), s.z]); }
  if (kind === 'dolly') { K(0, [s.x - R * .9, Y * 1.1, s.z + R * 1.25], tgt, 'ease in-out'); K(1, [s.x - R * .3, s.y * .9, s.z + R * .42], [s.x, s.y * .7, s.z]); }
  if (kind === 'pan') { K(0, [s.x - R, Y * .55, s.z + R * .8], [s.x - R * .35, s.y * .4, s.z], 'sine'); K(1, [s.x + R, Y * .55, s.z + R * .8], [s.x + R * .35, s.y * .4, s.z]); }
  if (kind === 'summit') for (let i = 0; i <= 6; i++) { const a = i / 6 * Math.PI * 2;
    K(i / 6, [s.x, s.y + 4, s.z], [s.x + Math.cos(a) * 160, s.y * .35, s.z + Math.sin(a) * 160]); }
  if (kind === 'zoom') { K(0, [s.x - R * 2.6, Y * 3.2, s.z + R * 3.2], [s.x, s.y * .3, s.z], 'accelerate, settle');
    K(.7, [s.x - R * .5, s.y * 1.3, s.z + R * .6], [s.x, s.y * .75, s.z], 'ease out'); K(1, [s.x - 14, s.y + 6, s.z + 22], [s.x, s.y, s.z]); }
  if (kind === 'sweep') {                  // along the landform's long axis, low, beside the ridge
    const rot = (T.landform ? T.landform.rot : 0) + land.rotation.y, ax = Math.cos(rot), az = -Math.sin(rot), nx = -az, nz = ax;
    for (let i = 0; i <= 4; i++) { const u = -1 + i / 2, px = s.x + ax * u * R * .9, pz = s.z + az * u * R * .9;
      const h = T.at(clamp(px, -129, 129), clamp(pz, -129, 129)) * S.view.exag;
      K(i / 4, [px + nx * R * .7, Math.max(h, s.y * .5) + 10, pz + nz * R * .7], [px, h * .8, pz], i ? 'linear' : 'sine'); }
  }
  S.path = keys; selKey = -1; renderPathUI();
}
/* Catmull-Rom through the keys; each segment eased by its starting key */
function cr(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return p1.map((_, i) => .5 * ((2 * p1[i]) + (-p0[i] + p2[i]) * t + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t2 + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * t3));
}
function pathAt(u) {
  const K = S.path; if (!K.length) return null;
  if (K.length === 1 || u <= K[0].t) return { p: K[0].p, q: K[0].q };
  if (u >= K[K.length - 1].t) return { p: K[K.length - 1].p, q: K[K.length - 1].q };
  let i = 0; while (i < K.length - 2 && u > K[i + 1].t) i++;
  const a = K[i], b = K[i + 1], loopClosed = S.anim.loop && K.length > 3 && dist3(K[0].p, K[K.length - 1].p) < 1;
  const prevK = K[i - 1] || (loopClosed ? K[K.length - 2] : a), nextK = K[i + 2] || (loopClosed ? K[1] : b);
  const e = (EASE[a.ease] || EASE.linear)((u - a.t) / ((b.t - a.t) || 1));
  return { p: cr(prevK.p, a.p, b.p, nextK.p, e), q: cr(prevK.q, a.q, b.q, nextK.q, e) };
}
const dist3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
function applyPath(u) {
  const c = pathAt(u); if (!c) return;
  cam.position.set(...c.p); controls.target.set(...c.q); cam.lookAt(controls.target);
  /* an orthographic camera has no distance: a move toward the summit is a zoom */
  if (cam === ortho && S.view.cam === 'ortho') { ortho.zoom = clamp(T.extent * .9 / Math.max(1, dist3(c.p, c.q)), .2, 12); ortho.updateProjectionMatrix(); }
}

/* ── time ───────────────────────────────────────────────────────────────── */
let playing = false, clockT = 0, last = 0;
function animateAt(t, opts = {}) {
  const A = S.anim, D = A.duration, u = clamp(t / D, 0, 1);
  if (S.path.length && (playing || opts.force)) applyPath(u);
  /* the lines: speed is whole cycles per loop when looping, so a loop is seamless */
  const cyc = A.loop ? Math.max(1, Math.round(A.speed)) : A.speed;
  U.uKeyDir.value = A.dir === 'up' ? 0 : A.dir === 'down' ? 1 : 2;
  U.uAmp.value = A.amp;
  U.uDraw.value = A.lines === 'draw' ? (A.loop ? (u < .85 ? u / .85 : 1) * 1.04 : u * 1.04) : 2;
  U.uScanOn.value = A.lines === 'scan' ? 1 : 0; U.uScan.value = ((u * cyc) % 1) * 1.2 - .1;
  U.uShift.value = A.lines === 'crawl' ? ((u * cyc) % 1) * S.render.spacing * (A.dir === 'down' ? -1 : 1) : 0;
  U.uPulseOn.value = A.lines === 'pulse' ? 1 : 0; U.uPulse.value = u * cyc;
  U.uFlickOn.value = A.lines === 'flicker' ? 1 : 0; U.uFlick.value = u * D * 10 * A.speed;
  /* the land */
  terrainAt(u);
  /* reactive input */
  const lvl = reactLevel(t);
  U.uBright.value = S.react.target === 'brightness' ? lvl * 1.4 : 0;
  U.uInterval.value = S.render.spacing * (S.react.target === 'spacing' ? 1 + lvl * .9 : 1);
  if (S.react.target === 'motion') U.uShift.value += lvl * S.render.spacing;
  U.uExag.value = S.view.exag * (S.react.target === 'elevation' ? 1 + lvl * .6 : 1);
}
let terrainActive = false;
function terrainAt(u) {
  const mode = S.anim.terrain, n = T.n;
  const want = mode !== 'none' && (playing || scrubbing || exporting);
  if (!want) { if (terrainActive) { shown = T.H; pushGeometry(); terrainActive = false; } return; }
  if (!(shown instanceof Float32Array) || shown === T.H) shown = new Float32Array(n * n);
  const v = S.anim.loop ? (u < .5 ? EASE['ease in-out'](u * 2) : EASE['ease in-out'](2 - u * 2)) : EASE['ease in-out'](u);
  if (mode === 'rise') {
    for (let q = 0; q < n * n; q++) { const k = clamp(v * 1.35 - (1 - T.H[q] / T.maxH) * .35, 0, 1); shown[q] = T.H[q] * (k * k * (3 - 2 * k)); }
  } else if (mode === 'morph') {
    const a = checkpoints.find(c => c.id === cpA), b = checkpoints.find(c => c.id === cpB);
    if (!a || !b || a.H.length !== n * n || b.H.length !== n * n) { shown = T.H; return; }
    for (let q = 0; q < n * n; q++) shown[q] = lerp(a.H[q], b.H[q], v);
  } else if (mode === 'timelapse') {
    if (!lapse || lapse.n !== n) { shown = T.H; return; }
    const F = lapse.frames, x = v * (F.length - 1), i = Math.min(F.length - 2, Math.floor(x)), f = x - i;
    for (let q = 0; q < n * n; q++) shown[q] = lerp(F[i][q], F[i + 1][q], f);
  }
  terrainActive = true;
  pushGeometry();
}

/* ── reactive: audio or a data series ───────────────────────────────────── */
let audioEl = null, analyser = null, abuf = null, aLevel = 0;
function reactLevel(t) {
  const R = S.react;
  if (R.source === 'audio' && analyser) {
    analyser.getByteFrequencyData(abuf);
    let s = 0; for (let i = 0; i < abuf.length; i++) s += abuf[i];
    aLevel = lerp(aLevel, s / abuf.length / 160, .3);
    return clamp(aLevel * R.gain, 0, 2);
  }
  if (R.source === 'data') {
    const v = R.data.split(/[\s,;]+/).map(Number).filter(x => !isNaN(x)); if (!v.length) return 0;
    const lo = Math.min(...v), hi = Math.max(...v), x = clamp(t / S.anim.duration, 0, 1) * (v.length - 1), i = Math.min(v.length - 2, Math.floor(x));
    const y = v.length > 1 ? lerp(v[i], v[i + 1], x - i) : v[0];
    return clamp((y - lo) / ((hi - lo) || 1) * R.gain, 0, 2);
  }
  return 0;
}
function loadAudio(file) {
  if (audioEl) { audioEl.pause(); URL.revokeObjectURL(audioEl.src); }
  audioEl = new Audio(URL.createObjectURL(file)); audioEl.loop = true;
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const src = ctx.createMediaElementSource(audioEl);
  analyser = ctx.createAnalyser(); analyser.fftSize = 256; abuf = new Uint8Array(analyser.frequencyBinCount);
  src.connect(analyser); analyser.connect(ctx.destination);
  S.react.source = 'audio'; syncUI(); toast(file.name + ' loaded — press play');
}

/* ── the loop ───────────────────────────────────────────────────────────── */
let scrubbing = false;
function frame(now) {
  requestAnimationFrame(frame);
  if (exporting) return;
  const dt = last ? Math.min(.1, (now - last) / 1000) : 0; last = now;
  if (playing) {
    clockT += dt;
    if (clockT >= S.anim.duration) { if (S.anim.loop) clockT %= S.anim.duration; else { clockT = S.anim.duration; setPlaying(false); } }
  }
  animateAt(clockT);
  if (geoDirty) { pushGeometry(); geoDirty = false; }
  if (!playing || !S.path.length) controls.update();
  renderer.render(scene, cam);
  if (playing || scrubbing) drawTrack();
  hud();
}
function setPlaying(on) {
  playing = on;
  if (on && clockT >= S.anim.duration - 1e-3) clockT = 0;
  if (audioEl && S.react.source === 'audio') { if (on) { audioEl.currentTime = clockT; audioEl.play(); } else audioEl.pause(); }
  controls.enabled = !on || !S.path.length;
  const b = $('#play'); if (b) b.innerHTML = on ? ICON.pause : ICON.play;
  drawTrack();
}

/* ── export ───────────────────────────────────────────────────────────────── */
let exporting = false, cancelled = false;
function busy(on, label) { $('#busy').hidden = !on; if (label) $('#busy-t').textContent = label; busyAt(0); cancelled = false; }
function busyAt(f) { $('#busy-bar').style.width = (f * 100).toFixed(1) + '%'; }
$('#busy-x').addEventListener('click', () => { cancelled = true; });
function download(blob, name) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
const slug = s => (s || 'mountain').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function savePNG() {
  const k = S.exp.scale, transparent = S.exp.transparent && S.render.mode !== 'textured';
  exporting = true;
  const keepW = W, keepH = H, keepPx = renderer.getPixelRatio();
  resize(keepW, keepH, keepPx * k);
  U.uBrush.value.w = 0;
  if (transparent) { U.uTransparent.value = 1; renderer.setClearColor(0x000000, 0); }
  (gizmo.getHelper ? gizmo.getHelper() : gizmo).visible = false;
  renderer.render(scene, cam);
  canvas.toBlob(b => {
    download(b, slug(S.name) + (transparent ? '-transparent' : '') + '.png');
    U.uTransparent.value = 0; applyLight(); applyView();
    resize(keepW, keepH, keepPx); exporting = false;
    toast('PNG saved — ' + Math.round(keepW * keepPx * k) + ' × ' + Math.round(keepH * keepPx * k));
  }, 'image/png');
}
const RES = { '720': [1280, 720], '1080': [1920, 1080], '1440': [2560, 1440], '2160': [3840, 2160] };
function videoType() {
  const c = ['video/mp4;codecs=avc1.640033', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  return c.find(t => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || '';
}
async function saveVideo() {
  const type = videoType();
  if (!type) { toast('This browser cannot record video'); return; }
  const [vw, vh] = RES[S.exp.res], fps = +S.exp.vfps, D = S.anim.duration, frames = Math.round(D * fps);
  const bits = { draft: .05, high: .14, max: .3 }[S.exp.quality] * vw * vh * fps / 10;
  setPlaying(false); exporting = true; busy(true, 'Rendering ' + vw + ' × ' + vh + ' · ' + fps + ' fps');
  const keepW = W, keepH = H, keepPx = renderer.getPixelRatio();
  resize(vw, vh, 1); U.uBrush.value.w = 0;
  (gizmo.getHelper ? gizmo.getHelper() : gizmo).visible = false;
  const stream = canvas.captureStream(0), track = stream.getVideoTracks()[0];
  const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: Math.round(bits) });
  const chunks = []; rec.ondataavailable = e => e.data.size && chunks.push(e.data);
  const done = new Promise(r => { rec.onstop = r; });
  rec.start();
  const wasPlaying = playing; playing = true;            // let path & terrain motion run
  for (let i = 0; i < frames && !cancelled; i++) {
    const t = i / fps;
    animateAt(t, { force: true });
    if (!S.path.length) controls.update();
    renderer.render(scene, cam);
    if (track.requestFrame) track.requestFrame();
    busyAt(i / frames);
    await new Promise(r => setTimeout(r, 1000 / fps));
  }
  playing = wasPlaying;
  rec.stop(); await done;
  applyView(); resize(keepW, keepH, keepPx); exporting = false; busy(false);
  if (cancelled) { toast('Video cancelled'); return; }
  const ext = type.startsWith('video/mp4') ? 'mp4' : 'webm';
  download(new Blob(chunks, { type: type.split(';')[0] }), slug(S.name) + '-' + vh + 'p.' + ext);
  toast('Video saved (' + ext.toUpperCase() + ')');
}

/* ── presets ──────────────────────────────────────────────────────────────── */
function toPreset() {
  const nullLand = { x: 0, z: 0, h: 1, spread: 1, seed: 0, rot: 0, aniso: 1, warp: 0, spur: 0, spurF: 1, flute: 0, fluteF: 1, parts: [] };
  const clean = o => JSON.parse(JSON.stringify(o, (k, v) => k.startsWith('_') || k === 'sculpt' ? undefined : v));
  return {
    v: 1, kind: 'tibba.mountain', name: S.name, created: new Date().toISOString(),
    start: S.start, seed: S.seed,
    landform: T.useLandform && T.landform ? clean(T.landform) : nullLand,
    scale: { ...T.scale }, ground: T.ground, detail: T.n,
    sculpt: encodeSculpt({ n: T.n, extent: T.extent, data: T.D }),
    view: { ...S.view, camPos: cam.position.toArray(), camTarget: controls.target.toArray() },
    render: { ...S.render }, light: { ...S.light }, anim: { ...S.anim }, path: S.path.map(k => ({ ...k })),
  };
}
function fromPreset(P) {
  if (!P || P.kind !== 'tibba.mountain') { toast('Not a Mountains Lab preset'); return; }
  remember();
  S.name = P.name || S.name; S.start = P.start || 'Custom'; S.seed = P.seed ?? S.seed;
  Object.assign(S.view, P.view || {}); Object.assign(S.render, P.render || {}); Object.assign(S.light, P.light || {}); Object.assign(S.anim, P.anim || {});
  S.path = (P.path || []).map(k => ({ ...k }));
  if (P.detail && P.detail !== T.n) { T.resize(P.detail); S.detail = P.detail; buildGeometry(); }
  T.landform = clonePeak(P.landform); T.useLandform = !!(P.landform && P.landform.parts && P.landform.parts.length);
  T.scale = { ...(P.scale || { height: 1, width: 1 }) }; T.ground = P.ground ?? 6;
  T.rebuildBase();
  const s = decodeSculpt(P.sculpt); T.D.fill(0); T.M.fill(0);
  if (s && s.n === T.n) T.D.set(s.data);
  T.recompute(); pushGeometry();
  land.rotation.set(...(S.view.rot || [0, 0, 0])); land.position.set(...(S.view.pos || [0, 0, 0]));
  setCamera(S.view.cam || 'persp');
  if (P.view && P.view.camPos) { cam.position.fromArray(P.view.camPos); controls.target.fromArray(P.view.camTarget); }
  applyRender(); applyView(); syncUI(); renderPathUI();
  toast('Loaded “' + S.name + '”');
}
function library() { return store.get(LIB_KEY, []); }
function saveToLibrary() {
  const lib = library().filter(p => p.name !== S.name);
  lib.unshift(toPreset());
  if (!store.set(LIB_KEY, lib.slice(0, 24))) { toast('Browser storage is full — download the preset instead'); return; }
  renderLibrary(); toast('Saved to this browser’s library');
}
function useOnSite(where) {
  const use = store.get(USE_KEY, null) || {};
  const P = toPreset();
  if (where === 'hero') use.hero = P;
  else { use.summits = use.summits || [null, null, null, null]; use.summits[+where] = P; }
  if (!store.set(USE_KEY, use)) { toast('Browser storage is full'); return; }
  renderSiteUse(); toast(where === 'hero' ? 'The hero’s peak is now this mountain (this browser)' : 'Summit ' + (+where + 1) + ' is now this mountain (this browser)');
}
function clearSite() { try { localStorage.removeItem(USE_KEY); } catch (e) {} renderSiteUse(); toast('The site’s own mountains are back'); }

/* ── depth maps and textures ────────────────────────────────────────────── */
function readImage(file) {
  return new Promise((res, rej) => { const img = new Image(); img.onload = () => res(img); img.onerror = rej; img.src = URL.createObjectURL(file); });
}
async function importDepth(file) {
  const img = await readImage(file), n = T.n, c = document.createElement('canvas'); c.width = c.height = n;
  const g = c.getContext('2d'), s = Math.min(img.width, img.height);
  g.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, n, n);
  const px = g.getImageData(0, 0, n, n).data, lum = new Float32Array(n * n);
  for (let i = 0; i < n * n; i++) { const v = (px[i * 4] * .299 + px[i * 4 + 1] * .587 + px[i * 4 + 2] * .114) / 255; lum[i] = S.depth.invert ? 1 - v : v; }
  /* the edge of the map falls to the ground, so it reads as a mountain and not a tile */
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const e = Math.min(i, j, n - 1 - i, n - 1 - j) / (n * .08); lum[j * n + i] *= Math.min(1, e); }
  remember(); T.importDepth(lum, S.depth.height, S.depth.mode); pushGeometry(); syncUI();
  toast('Depth map imported — sculpt away');
}
async function loadTexture(file, which) {
  const img = await readImage(file), tex = new THREE.Texture(img);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.colorSpace = which === 'albedo' ? THREE.SRGBColorSpace : THREE.NoColorSpace; tex.needsUpdate = true;
  if (which === 'albedo') { U.uAlbedo.value = tex; U.uHasAlbedo.value = 1; S.render.material = 'custom'; }
  else { U.uNormalMap.value = tex; U.uHasNormal.value = 1; }
  if (S.render.mode === 'contour') S.render.mode = 'hybrid';
  applyRender(); syncUI(); toast((which === 'albedo' ? 'Texture' : 'Normal map') + ' applied');
}
S.depth = { height: 42, invert: false, mode: 'replace' };

/* ── terrain changes from the panel ─────────────────────────────────────── */
function startFrom(name) {
  remember();
  S.start = name;
  if (name === 'Random') T.landform = randomLandform(S.seed); else T.landform = clonePeak(LANDFORM_LIBRARY[name]);
  T.useLandform = true; if (T.ground === 0) T.ground = 6;
  T.D.fill(0); T.M.fill(0);
  T.rebuildBase(); pushGeometry(); syncUI();
}
function rebase() { T.rebuildBase(); pushGeometry(); }

/* ══════════════════════════════════════════════════════════════════════════
   The UI
   ═════════════════════════════════════════════════════════════════════════ */
const ICON = {
  play: '<svg viewBox="0 0 14 14"><path d="M3 1.5v11l9-5.5z"/></svg>',
  pause: '<svg viewBox="0 0 14 14"><path d="M3 1.5h3v11H3zM8 1.5h3v11H8z"/></svg>',
};
const TOOL_ICONS = {
  nav: '<path d="M8 2v12M2 8h12M8 2l-2 2M8 2l2 2M8 14l-2-2M8 14l2-2M2 8l2-2M2 8l2 2M14 8l-2-2M14 8l-2 2"/>',
  raise: '<path d="M2 13l4-6 2 3 2-5 4 8z"/><path d="M8 1v3M6.5 2.5L8 1l1.5 1.5"/>',
  lower: '<path d="M2 4l4 6 2-3 2 5 4-8"/><path d="M8 15v-3M6.5 13.5L8 15l1.5-1.5"/>',
  smooth: '<path d="M1 10c3-5 5-5 7-2s4 3 7-2"/>',
  noise: '<path d="M1 10l2-3 1 2 2-4 1 3 2-2 1 4 2-5 1 3 2-1"/>',
  crease: '<path d="M2 13L8 3l6 10"/><path d="M5 13L8 8l3 5"/>',
  ridge: '<path d="M1 12l3-4 2 2 3-6 3 5 3-2"/><path d="M4 8l5-4 3 5" stroke-dasharray="1.5 1.5"/>',
  flatten: '<path d="M1 12h3l2-5h4l2 5h3"/><path d="M6 7h4" stroke-width="2"/>',
  valley: '<path d="M1 4l7 9 7-9"/><path d="M5 6l3 4 3-4"/>',
  mask: '<rect x="2.5" y="2.5" width="11" height="11"/><path d="M2.5 9l5-6.5M5 13.5l8.5-10M10 13.5l3.5-4"/>',
  unmask: '<rect x="2.5" y="2.5" width="11" height="11" stroke-dasharray="2 1.5"/>',
};
const TOOL_KEYS = { nav: 'V', raise: 'R', lower: 'L', smooth: 'S', noise: 'N', crease: 'C', ridge: 'G', flatten: 'F', valley: 'K', mask: 'M', unmask: '⇧M' };
const TOOL_NAMES = { nav: 'Move', raise: 'Raise', lower: 'Lower', smooth: 'Smooth', noise: 'Noise', crease: 'Crease', ridge: 'Ridge', flatten: 'Flatten', valley: 'Valley', mask: 'Mask', unmask: 'Unmask' };

/* small builders: every control reads and writes one path in S */
const get = p => p.split('.').reduce((o, k) => o[k], S);
const set = (p, v) => { const k = p.split('.'), last = k.pop(); k.reduce((o, x) => o[x], S)[last] = v; };
const binders = [], FMT = {};
function range(path, label, min, max, step, fmt = v => v, on) {
  const id = 'c-' + path.replace(/\./g, '-');
  FMT[id] = fmt;
  binders.push(() => { const el = document.getElementById(id); if (!el) return; el.value = get(path); el.previousElementSibling.querySelector('i').textContent = fmt(+get(path)); });
  return `<div class="ml-row"><label for="${id}">${label}<i>${fmt(+get(path))}</i></label><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${get(path)}" data-path="${path}" data-on="${on || ''}"></div>`;
}
function seg(path, opts, on, label) {
  const id = 'g-' + path.replace(/\./g, '-');
  binders.push(() => { const el = document.getElementById(id); if (!el) return; el.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === String(get(path)))); });
  return `${label ? `<p class="ml-lab">${label}</p>` : ''}<div class="ml-seg" id="${id}" data-path="${path}" data-on="${on || ''}">${opts.map(([v, l]) => `<button type="button" data-v="${v}"${String(get(path)) === String(v) ? ' class="on"' : ''}>${l}</button>`).join('')}</div>`;
}
function tog(path, label, on) {
  const id = 't-' + path.replace(/\./g, '-');
  binders.push(() => { const el = document.getElementById(id); if (el) el.checked = !!get(path); });
  return `<label class="ml-tog">${label}<input type="checkbox" id="${id}" data-path="${path}" data-on="${on || ''}"${get(path) ? ' checked' : ''}></label>`;
}
const btn = (act, label, cls = '') => `<button type="button" class="ml-btn ${cls}" data-act="${act}">${label}</button>`;
const sec = (id, title, body, open, sub) => `<details class="ml-sec" id="s-${id}"${open ? ' open' : ''}><summary>${title}${sub ? ` <small>${sub}</small>` : ''}</summary><div class="ml-body">${body}</div></details>`;
const f1 = v => v.toFixed(1), f2 = v => v.toFixed(2), pc = v => Math.round(v * 100) + '%', xk = v => '×' + v.toFixed(2);

function buildPanel() {
  const libOpts = [...Object.keys(LANDFORM_LIBRARY), 'Random'];
  $('#panel').innerHTML = `
    <div class="ml-head"><h1>Mountains <b>Lab</b></h1><span>Contour first</span></div>
    ${sec('terrain', 'Terrain', `
      <div class="ml-row"><p class="ml-lab">Start from</p>
        <select class="ml-sel" id="start">${libOpts.map(n => `<option${n === S.start ? ' selected' : ''}>${n}</option>`).join('')}${S.start === 'Custom' ? '<option selected>Custom</option>' : ''}</select></div>
      <div class="ml-pair"><input class="ml-in" id="seed" type="number" value="${S.seed}" aria-label="Seed"><button type="button" class="ml-btn" data-act="randomize">Randomize</button></div>
      <p class="ml-note">The site’s five peaks are first in the list. A seed always rebuilds the same random mountain.</p>
      ${tog('landformOn', 'Landform under the sculpt', 'landform')}
      ${range('scaleH', 'Height', .3, 2, .01, xk, 'scale')}
      ${range('scaleW', 'Base width', .5, 1.8, .01, xk, 'scale')}
      ${range('view.exag', 'Vertical exaggeration', .3, 3, .01, xk, 'exag')}
      ${range('groundRelief', 'Ground relief', 0, 16, .1, f1, 'ground')}
      ${seg('detail', [[129, 'Draft'], [257, 'Standard'], [385, 'Fine']], 'detail', 'Detail')}
      <p class="ml-sub">Depth map</p>
      <div class="ml-btn ml-file">Import a grayscale image…<input type="file" accept="image/*" id="depth-file"></div>
      ${seg('depth.mode', [['replace', 'Replace'], ['add', 'Add on top']])}
      ${range('depth.height', 'Height of white', 5, 90, 1, v => v + ' m')}
      ${tog('depth.invert', 'Invert (dark is high)')}
      <div class="ml-btns">${btn('reset-sculpt', 'Clear sculpt')}${btn('reset-all', 'Reset mountain')}</div>
    `, true)}
    ${sec('sculpt', 'Sculpt', `
      ${range('brush.size', 'Brush size', 2, 60, .5, v => v.toFixed(0) + ' m')}
      ${range('brush.strength', 'Strength', .02, 1, .01, pc)}
      ${range('brush.hardness', 'Hardness', 0, .95, .01, pc)}
      ${seg('brush.sym', [['none', 'No mirror'], ['x', 'Mirror X'], ['z', 'Mirror Z'], ['xz', 'Both']], '', 'Symmetry')}
      ${tog('render.showMask', 'Show the mask', 'render')}
      <div class="ml-btns">${btn('mask-clear', 'Clear mask')}${btn('mask-invert', 'Invert mask')}</div>
      <p class="ml-sub">Erosion</p>
      <div class="ml-btns">${btn('erode-wind', 'Wind')}${btn('erode-glacial', 'Glacial')}${btn('erode-river', 'River')}</div>
      <p class="ml-note">Each pass reshapes the land a little over a second. The mask keeps erosion out.</p>
      <p class="ml-sub">Geological time-lapse</p>
      <div class="ml-btns">${btn('story-river', 'Valley deepening')}${btn('story-glacial', 'Glacier carving')}${btn('story-wind', 'Wearing down')}</div>
    `, false, 'R L S N C G F K M')}
    ${sec('view', 'View', `
      ${seg('view.cam', [['persp', 'Perspective'], ['ortho', 'Orthographic'], ['profile', 'Profile']], 'cam', 'Camera')}
      ${range('view.fov', 'Lens (field of view)', 12, 70, 1, v => v + '°', 'view')}
      ${tog('view.section', 'Section cut', 'view')}
      ${range('view.sectionAt', 'Cut position', -120, 120, .5, v => v.toFixed(0) + ' m', 'view')}
      ${tog('view.gizmo', 'Gizmo on the mountain', 'view')}
      ${seg('view.gizmoMode', [['rotate', 'Rotate / tilt'], ['move', 'Nudge X Y Z']], 'view')}
      ${tog('view.lockHorizon', 'Lock the horizon', 'view')}
      <div class="ml-btns">${btn('frame', 'Frame the summit')}${btn('reset-transform', 'Reset transform')}</div>
    `)}
    ${sec('render', 'Render', `
      ${seg('render.mode', [['contour', 'Contour'], ['hybrid', 'Hybrid'], ['textured', 'Textured']], 'render', 'Mode')}
      ${range('render.spacing', 'Line spacing', .3, 6, .05, v => v.toFixed(2) + ' m', 'render')}
      ${range('render.width', 'Line weight', .4, 4, .05, v => v.toFixed(2) + ' px', 'render')}
      ${range('render.indexEvery', 'Index line every', 2, 12, 1, v => v, 'render')}
      ${range('render.indexWeight', 'Index weight', 1, 4, .05, xk, 'render')}
      ${range('render.ridge', 'Ridge emphasis', 0, 2, .01, pc, 'render')}
      ${seg('render.colour', [['survey', 'Survey'], ['ink', 'Ink'], ['orange', 'Tibba'], ['custom', 'Custom']], 'render', 'Line colour')}
      <div class="ml-col"><input type="color" id="line-col" value="${S.render.custom}"><span class="ml-note">Custom colour</span></div>
      ${range('render.opacity', 'Line opacity', 0, 1, .01, pc, 'render')}
      ${range('render.shade', 'Surface shade under the lines', 0, 1, .01, pc, 'render')}
      <p class="ml-sub">Texture (hybrid · textured)</p>
      ${range('render.tex', 'Texture strength', 0, 1, .01, pc, 'render')}
      ${seg('render.material', [['rock', 'Rock'], ['snow', 'Snow'], ['grass', 'Grass'], ['volcanic', 'Volcanic'], ['desert', 'Desert'], ['custom', 'Custom']], 'render', 'Material')}
      <div class="ml-btns"><div class="ml-btn ml-file">Albedo…<input type="file" accept="image/*" id="albedo-file"></div><div class="ml-btn ml-file">Normal map…<input type="file" accept="image/*" id="normal-file"></div></div>
      ${range('render.texScale', 'Texture scale', 8, 160, 1, v => v + ' m', 'render')}
      ${range('render.rough', 'Roughness', 0, 1, .01, pc, 'render')}
      ${range('render.bump', 'Surface detail', 0, 1.5, .01, pc, 'render')}
    `)}
    ${sec('light', 'Light & air', `
      ${range('light.tod', 'Time of day', 0, 1, .005, v => todAt(v).name, 'light')}
      ${range('light.az', 'Sun direction', 0, 1, .005, v => Math.round(v * 360) + '°', 'light')}
      ${range('light.ambient', 'Ambient', 0, 1.2, .01, pc, 'light')}
      ${range('light.fog', 'Fog density', 0, 1, .01, pc, 'light')}
      ${tog('light.fogAuto', 'Fog takes the sky’s colour', 'light')}
      <div class="ml-col"><input type="color" id="fog-col" value="${S.light.fogColour}"><span class="ml-note">Fog colour</span></div>
      ${range('light.haze', 'Atmospheric haze', 0, 1, .01, pc, 'light')}
      <p class="ml-note">In contour mode the ground stays black and light only shades the surface under the lines.</p>
    `)}
    ${sec('animate', 'Animate', `
      <p class="ml-lab">Camera move</p>
      <div class="ml-btns">${[['static', 'Static'], ['orbit', 'Orbit'], ['dolly', 'Dolly in'], ['fly', 'Fly-around'], ['pan', 'Side pan'], ['summit', 'Summit view'], ['zoom', 'Far to summit'], ['sweep', 'Profile sweep']]
        .map(([k, l]) => `<button type="button" class="ml-btn${S.anim.camera === k ? ' on' : ''}" data-cam="${k}">${l}</button>`).join('')}</div>
      <p class="ml-note">A move writes keys into the timeline below — drag them, re-ease them, add your own.</p>
      ${seg('anim.lines', [['none', 'Still'], ['draw', 'Draw in'], ['scan', 'Scanline'], ['crawl', 'Crawl'], ['pulse', 'Pulse'], ['flicker', 'Flicker']], 'anim', 'The lines')}
      ${seg('anim.dir', [['up', 'Bottom-up'], ['down', 'Top-down'], ['lateral', 'Lateral']], 'anim', 'Direction')}
      ${range('anim.speed', 'Speed', .25, 6, .25, v => v + (S.anim.loop ? ' cycles' : '×'), 'anim')}
      ${range('anim.amp', 'Intensity', 0, 1.5, .01, pc, 'anim')}
      ${seg('anim.terrain', [['none', 'Still'], ['rise', 'Rise from flat'], ['morph', 'Morph A → B'], ['timelapse', 'Time-lapse']], 'anim', 'The land')}
      ${range('anim.duration', 'Duration', 2, 40, .5, v => v + ' s', 'anim')}
      ${seg('anim.fps', [[24, '24 fps'], [30, '30 fps'], [60, '60 fps']], 'anim', 'Frame rate')}
      ${tog('anim.loop', 'Loop seamlessly', 'anim')}
    `)}
    ${sec('react', 'Reactive', `
      ${seg('react.source', [['off', 'Off'], ['audio', 'Audio'], ['data', 'Data']], 'react', 'Source')}
      <div class="ml-btn ml-file">Load an audio track…<input type="file" accept="audio/*" id="audio-file"></div>
      <textarea class="ml-ta" id="react-data" aria-label="Data series">${S.react.data}</textarea>
      ${seg('react.target', [['brightness', 'Brightness'], ['spacing', 'Spacing'], ['motion', 'Motion'], ['elevation', 'Elevation']], 'react', 'It drives')}
      ${range('react.gain', 'Gain', 0, 3, .01, xk, 'react')}
      <p class="ml-note">Data is a list of numbers spread across the duration. Audio plays with the timeline.</p>
    `)}
    ${sec('checkpoints', 'Checkpoints', `
      <div class="ml-btns">${btn('cp-save', 'Save checkpoint', 'go')}${btn('cp-ab', 'A / B')}</div>
      <div class="ml-list" id="cp-list"></div>
    `)}
    ${sec('export', 'Export', `
      <p class="ml-sub">Still</p>
      ${seg('exp.scale', [[1, '1×'], [2, '2×'], [4, '4×']], '', 'Resolution')}
      ${tog('exp.transparent', 'Transparent background (contour · hybrid)')}
      ${btn('png', 'Save PNG', 'go')}
      <p class="ml-sub">Video</p>
      ${seg('exp.res', [['720', '720p'], ['1080', '1080p'], ['1440', '1440p'], ['2160', '4K']], '', 'Resolution')}
      ${seg('exp.vfps', [[24, '24'], [30, '30'], [60, '60']], '', 'Frames per second')}
      ${seg('exp.quality', [['draft', 'Draft'], ['high', 'High'], ['max', 'Maximum']], '', 'Quality')}
      ${btn('video', 'Render video', 'go')}
      <p class="ml-note" id="vid-note"></p>
      <p class="ml-sub">Preset</p>
      <input class="ml-in" id="pname" value="${S.name}" aria-label="Preset name">
      <div class="ml-btns">${btn('lib-save', 'Save to library')}${btn('json', 'Download .json')}<div class="ml-btn ml-file">Import .json<input type="file" accept="application/json,.json" id="json-file"></div></div>
      <div class="ml-list" id="lib-list"></div>
      <p class="ml-sub">On the site</p>
      <div class="ml-btns">${btn('use-hero', 'Use in hero')}<select class="ml-sel" id="use-summit"><option value="">Use as summit…</option><option value="0">Groww</option><option value="1">Firstpost</option><option value="2">Breathe ESG</option><option value="3">Shyft &amp; Mindhouse</option></select></div>
      <p class="ml-note" id="site-use"></p>
      ${btn('use-clear', 'Clear the site’s overrides')}
    `)}`;
  const vt = videoType();
  $('#vid-note').textContent = vt ? 'Records as ' + (vt.includes('mp4') ? 'MP4 (H.264)' : 'WebM') + ', one frame per step — a long or 4K render takes its full running time.' : 'This browser has no video recorder — try Chrome.';
}
/* a few controls read derived values */
Object.defineProperty(S, 'scaleH', { get: () => T.scale.height, set: v => { T.scale.height = v; }, enumerable: false });
Object.defineProperty(S, 'scaleW', { get: () => T.scale.width, set: v => { T.scale.width = v; }, enumerable: false });
Object.defineProperty(S, 'groundRelief', { get: () => T.ground, set: v => { T.ground = v; }, enumerable: false });
Object.defineProperty(S, 'landformOn', { get: () => T.useLandform, set: v => { T.useLandform = v; }, enumerable: false });

let baseTimer = 0;
const ON = {
  scale: () => { clearTimeout(baseTimer); baseTimer = setTimeout(rebase, 30); },
  ground: () => { clearTimeout(baseTimer); baseTimer = setTimeout(rebase, 30); },
  landform: () => rebase(),
  exag: () => { pushGeometry(); },
  detail: () => { remember(); T.resize(+S.detail); buildGeometry(); pushGeometry(); undo.length = 0; checkpoints = checkpoints.filter(c => c.snap.n === T.n); renderCheckpoints(); },
  cam: () => setCamera(S.view.cam),
  view: () => applyView(),
  render: () => applyRender(),
  light: () => applyRender(),
  anim: () => { syncUI(); drawTrack(); },
  react: () => { if (S.react.source !== 'audio' && audioEl) audioEl.pause(); },
};
function bindPanel() {
  const P = $('#panel');
  P.addEventListener('input', e => {
    const el = e.target, path = el.dataset.path;
    if (el.type === 'range' && path) {
      set(path, +el.value);
      el.previousElementSibling.querySelector('i').textContent = (FMT[el.id] || (v => v))(+el.value);
      if (ON[el.dataset.on]) ON[el.dataset.on]();
    }
    if (el.id === 'line-col') { S.render.custom = el.value; S.render.colour = 'custom'; applyRender(); syncUI(); }
    if (el.id === 'fog-col') { S.light.fogColour = el.value; S.light.fogAuto = false; applyLight(); syncUI(); }
    if (el.id === 'react-data') S.react.data = el.value;
    if (el.id === 'pname') S.name = el.value || 'Untitled mountain';
  });
  P.addEventListener('change', e => {
    const el = e.target, path = el.dataset.path;
    if (el.type === 'checkbox' && path) { set(path, el.checked); if (ON[el.dataset.on]) ON[el.dataset.on](); }
    if (el.type === 'range' && path && el.dataset.on === 'scale') renderCheckpoints();
    if (el.id === 'start') startFrom(el.value);
    if (el.id === 'seed') S.seed = +el.value | 0;
    if (el.id === 'depth-file' && el.files[0]) { importDepth(el.files[0]); el.value = ''; }
    if (el.id === 'albedo-file' && el.files[0]) { loadTexture(el.files[0], 'albedo'); el.value = ''; }
    if (el.id === 'normal-file' && el.files[0]) { loadTexture(el.files[0], 'normal'); el.value = ''; }
    if (el.id === 'audio-file' && el.files[0]) { loadAudio(el.files[0]); el.value = ''; }
    if (el.id === 'json-file' && el.files[0]) { el.files[0].text().then(t => { try { fromPreset(JSON.parse(t)); } catch (x) { toast('That file is not valid JSON'); } }); el.value = ''; }
    if (el.id === 'use-summit' && el.value !== '') { useOnSite(el.value); el.value = ''; }
  });
  P.addEventListener('click', e => {
    const sg = e.target.closest('.ml-seg button');
    if (sg) {
      const box = sg.parentNode, path = box.dataset.path, cur = get(path);
      set(path, typeof cur === 'number' ? +sg.dataset.v : sg.dataset.v);
      box.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === sg));
      if (ON[box.dataset.on]) ON[box.dataset.on]();
      return;
    }
    const c = e.target.closest('[data-cam]');
    if (c) { cameraPreset(c.dataset.cam); P.querySelectorAll('[data-cam]').forEach(b => b.classList.toggle('on', b === c)); clockT = 0; if (S.path.length) applyPath(0); return; }
    const b = e.target.closest('[data-act]'); if (!b) return;
    ACT[b.dataset.act] && ACT[b.dataset.act](b);
  });
}
const ACT = {
  randomize: () => { S.seed = (Math.random() * 1e6) | 0; startFrom('Random'); },
  'reset-sculpt': () => { remember(); T.D.fill(0); T.recompute(); pushGeometry(); },
  'reset-all': () => { T.scale = { height: 1, width: 1 }; T.ground = 6; S.view.exag = 1; startFrom(S.start === 'Custom' ? 'Tibba massif' : S.start); applyView(); },
  'mask-clear': () => { remember(); T.M.fill(0); pushGeometry(); },
  'mask-invert': () => { remember(); for (let i = 0; i < T.M.length; i++) T.M[i] = 1 - T.M[i]; pushGeometry(); },
  'erode-wind': () => erode('wind'), 'erode-glacial': () => erode('glacial'), 'erode-river': () => erode('river'),
  'story-river': () => story('river'), 'story-glacial': () => story('glacial'), 'story-wind': () => story('wind'),
  frame: () => frameSummit(),
  'reset-transform': () => { land.rotation.set(0, 0, 0); land.position.set(0, 0, 0); S.view.rot = [0, 0, 0]; S.view.pos = [0, 0, 0]; },
  'cp-save': () => saveCheckpoint(),
  'cp-ab': () => abToggle(),
  png: () => savePNG(), video: () => saveVideo(),
  'lib-save': () => saveToLibrary(),
  json: () => download(new Blob([JSON.stringify(toPreset())], { type: 'application/json' }), slug(S.name) + '.mountain.json'),
  'use-hero': () => useOnSite('hero'), 'use-clear': () => clearSite(),
};
function frameSummit() {
  const s = summitWorld(), R = T.extent * .7;
  if (S.view.cam === 'profile') { setCamera('profile'); return; }
  cam.position.set(s.x - R * .62, Math.max(60, s.y * 1.9), s.z + R * .85); controls.target.set(s.x, s.y * .45, s.z); controls.update();
}
function abToggle() {
  const a = checkpoints.find(c => c.id === cpA), b = checkpoints.find(c => c.id === cpB);
  if (!a || !b) { toast('Pick an A and a B in the list first'); return; }
  abSide = abSide === 'A' ? 'B' : 'A';
  loadCheckpoint(abSide === 'A' ? a : b); toast('Showing ' + abSide + ' — ' + (abSide === 'A' ? a : b).name);
}
function syncUI() { binders.forEach(f => f()); const st = $('#start'); if (st) { if (![...st.options].some(o => o.value === S.start)) st.add(new Option(S.start)); st.value = S.start; } const sd = $('#seed'); if (sd) sd.value = S.seed; const pn = $('#pname'); if (pn) pn.value = S.name;
  document.querySelectorAll('[data-cam]').forEach(b => b.classList.toggle('on', b.dataset.cam === S.anim.camera)); refreshTools(); }

/* a little map of a heightfield, for the lists */
function miniMap(cv, Hs, n) {
  const g = cv.getContext('2d'), s = 40; cv.width = cv.height = s;
  const im = g.createImageData(s, s); let m = 1; for (let i = 0; i < Hs.length; i += 7) m = Math.max(m, Hs[i]);
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const h = Hs[Math.floor(y / s * n) * n + Math.floor(x / s * n)] / m, band = (h * 12) % 1 < .14 ? 1 : 0;
    const v = band ? 70 + h * 185 : 6 + h * 18, o = (y * s + x) * 4;
    im.data[o] = im.data[o + 1] = v; im.data[o + 2] = v + 8; im.data[o + 3] = 255;
  }
  g.putImageData(im, 0, 0);
}
function renderCheckpoints() {
  const L = $('#cp-list'); if (!L) return;
  L.innerHTML = checkpoints.map(c => `<div class="ml-item" data-id="${c.id}"><canvas></canvas><p>${c.name}<small>${c.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small></p>
    <span class="acts"><button type="button" data-a="load">Load</button><button type="button" data-a="A"${cpA === c.id ? ' class="on"' : ''}>A</button><button type="button" data-a="B"${cpB === c.id ? ' class="on"' : ''}>B</button><button type="button" data-a="del" aria-label="Delete">×</button></span></div>`).join('')
    || '<p class="ml-note">Save the land as it is, try something, and come back — or set two as A and B to flick between them, or to morph one into the other.</p>';
  L.querySelectorAll('.ml-item').forEach(el => { const c = checkpoints.find(x => x.id === el.dataset.id); miniMap(el.querySelector('canvas'), c.H, c.snap.n); });
}
function renderLibrary() {
  const L = $('#lib-list'); if (!L) return;
  const lib = library();
  L.innerHTML = lib.map((p, i) => `<div class="ml-item" data-i="${i}"><canvas></canvas><p>${p.name}<small>${new Date(p.created).toLocaleDateString()}</small></p>
    <span class="acts"><button type="button" data-a="load">Load</button><button type="button" data-a="del" aria-label="Delete">×</button></span></div>`).join('')
    || '<p class="ml-note">Presets saved here stay in this browser. Download the .json to keep one anywhere.</p>';
  L.querySelectorAll('.ml-item').forEach(el => { const p = lib[+el.dataset.i], s = decodeSculpt(p.sculpt); if (s) miniMap(el.querySelector('canvas'), s.data, s.n); });
}
function renderSiteUse() {
  const u = store.get(USE_KEY, null), el = $('#site-use'); if (!el) return;
  const names = ['Groww', 'Firstpost', 'Breathe ESG', 'Shyft & Mindhouse'];
  const bits = [];
  if (u && u.hero) bits.push('<b>Hero</b>: ' + u.hero.name);
  if (u && u.summits) u.summits.forEach((p, i) => p && bits.push('<b>' + names[i] + '</b>: ' + p.name));
  el.innerHTML = bits.length ? 'In this browser the site draws — ' + bits.join(' · ') + '. Open the home page to see it.' : 'The site draws its own mountains. A preset sent here replaces one, in this browser only.';
}
document.addEventListener('click', e => {
  const a = e.target.closest('#cp-list [data-a]');
  if (a) { const id = a.closest('.ml-item').dataset.id, c = checkpoints.find(x => x.id === id);
    if (a.dataset.a === 'load') loadCheckpoint(c);
    if (a.dataset.a === 'A') cpA = id; if (a.dataset.a === 'B') cpB = id;
    if (a.dataset.a === 'del') { checkpoints = checkpoints.filter(x => x !== c); if (cpA === id) cpA = null; if (cpB === id) cpB = null; }
    renderCheckpoints(); return; }
  const l = e.target.closest('#lib-list [data-a]');
  if (l) { const i = +l.closest('.ml-item').dataset.i, lib = library();
    if (l.dataset.a === 'load') fromPreset(lib[i]);
    if (l.dataset.a === 'del') { lib.splice(i, 1); store.set(LIB_KEY, lib); renderLibrary(); } }
});

/* ── the tools bar ────────────────────────────────────────────────────── */
function buildTools() {
  const t = Object.keys(TOOL_ICONS);
  $('#tools').innerHTML = `
    <div class="ml-tg ml-fold"><button type="button" data-ui="panel"><svg viewBox="0 0 16 16"><path d="M2 4h12M2 8h12M2 12h12"/></svg>Panel</button></div>
    <div class="ml-tg" id="tool-row">${t.map(k => `<button type="button" data-tool="${k}" title="${TOOL_NAMES[k]} (${TOOL_KEYS[k]})"><svg viewBox="0 0 16 16">${TOOL_ICONS[k]}</svg>${TOOL_NAMES[k]}<kbd>${TOOL_KEYS[k]}</kbd></button>`).join('')}</div>
    <div class="ml-tg"><button type="button" data-ui="undo" title="Undo (⌘Z)"><svg viewBox="0 0 16 16"><path d="M5 3L2 6l3 3"/><path d="M2 6h8a4 4 0 010 8H7"/></svg>Undo</button><button type="button" data-ui="redo" title="Redo (⇧⌘Z)"><svg viewBox="0 0 16 16"><path d="M11 3l3 3-3 3"/><path d="M14 6H6a4 4 0 000 8h3"/></svg>Redo</button></div>
    <div class="ml-spacer"></div>
    <div class="ml-tg"><button type="button" data-ui="present" title="Presentation (P)"><svg viewBox="0 0 16 16"><path d="M2 5V2h3M11 2h3v3M14 11v3h-3M5 14H2v-3"/></svg>Present</button></div>`;
  $('#tools').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.tool) setTool(b.dataset.tool);
    if (b.dataset.ui === 'undo') stepHistory(undo, redo);
    if (b.dataset.ui === 'redo') stepHistory(redo, undo);
    if (b.dataset.ui === 'present') present(true);
    if (b.dataset.ui === 'panel') document.body.classList.toggle('panel-open');
  });
}
function refreshTools() {
  document.querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === S.brush.tool));
  const u = document.querySelector('[data-ui=undo]'), r = document.querySelector('[data-ui=redo]');
  if (u) u.disabled = !undo.length; if (r) r.disabled = !redo.length;
}

/* ── the timeline ───────────────────────────────────────────────────────── */
let selKey = -1, dragKey = -1;
function buildTimeline() {
  $('#timeline').innerHTML = `
    <button type="button" class="ml-play" id="play" aria-label="Play">${ICON.play}</button>
    <div class="ml-clock"><b id="clock">0.00</b><span id="clock-k">of 8 s</span></div>
    <div class="ml-track" id="track"><canvas id="track-c"></canvas></div>
    <div class="ml-keys">
      <select class="ml-sel" id="key-ease" aria-label="Key easing">${Object.keys(EASE).map(e => `<option>${e}</option>`).join('')}</select>
      <button type="button" class="ml-btn" data-k="add" title="Add a key here from the current view">+ Key</button>
      <button type="button" class="ml-btn" data-k="upd" title="Move the selected key to the current view">Update</button>
      <button type="button" class="ml-btn" data-k="del" title="Delete the selected key">Delete</button>
    </div>`;
  $('#play').addEventListener('click', () => setPlaying(!playing));
  $('#timeline').addEventListener('click', e => {
    const b = e.target.closest('[data-k]'); if (!b) return;
    const u = clockT / S.anim.duration;
    if (b.dataset.k === 'add') {
      const k = { t: +u.toFixed(4), p: cam.position.toArray().map(v => +v.toFixed(2)), q: controls.target.toArray().map(v => +v.toFixed(2)), ease: $('#key-ease').value };
      S.path = S.path.filter(x => Math.abs(x.t - k.t) > .004); S.path.push(k); S.path.sort((a, b) => a.t - b.t); selKey = S.path.indexOf(k);
      S.anim.camera = 'custom'; syncUI();
    }
    if (b.dataset.k === 'upd' && S.path[selKey]) { S.path[selKey].p = cam.position.toArray(); S.path[selKey].q = controls.target.toArray(); }
    if (b.dataset.k === 'del' && S.path[selKey]) { S.path.splice(selKey, 1); selKey = -1; }
    renderPathUI();
  });
  $('#key-ease').addEventListener('change', e => { if (S.path[selKey]) S.path[selKey].ease = e.target.value; });
  const tr = $('#track');
  const uAt = ev => { const r = tr.getBoundingClientRect(); return clamp((ev.clientX - r.left - 8) / (r.width - 16), 0, 1); };
  tr.addEventListener('pointerdown', ev => {
    const u = uAt(ev), r = tr.getBoundingClientRect(), px = 1 / (r.width - 16);
    const hit = S.path.findIndex(k => Math.abs(k.t - u) < 7 * px && ev.clientY - r.top > r.height * .45);
    tr.setPointerCapture(ev.pointerId);
    if (hit >= 0) { selKey = dragKey = hit; $('#key-ease').value = S.path[hit].ease || 'linear'; clockT = S.path[hit].t * S.anim.duration; }
    else { scrubbing = true; clockT = u * S.anim.duration; }
    animateAt(clockT, { force: true }); drawTrack();
  });
  tr.addEventListener('pointermove', ev => {
    if (dragKey >= 0) { const k = S.path[dragKey]; k.t = uAt(ev); S.path.sort((a, b) => a.t - b.t); dragKey = selKey = S.path.indexOf(k); clockT = k.t * S.anim.duration; drawTrack(); }
    else if (scrubbing) { clockT = uAt(ev) * S.anim.duration; animateAt(clockT, { force: true }); drawTrack(); }
  });
  const up = () => { dragKey = -1; if (scrubbing) { scrubbing = false; animateAt(clockT); } };
  tr.addEventListener('pointerup', up); tr.addEventListener('pointercancel', up);
  tr.addEventListener('dblclick', () => { if (S.path[selKey]) { cam.position.fromArray(S.path[selKey].p); controls.target.fromArray(S.path[selKey].q); } });
}
function renderPathUI() { drawTrack(); }
function drawTrack() {
  const cv = $('#track-c'); if (!cv) return;
  const r = cv.getBoundingClientRect(), d = Math.min(devicePixelRatio, 2);
  if (!r.width) return;
  cv.width = r.width * d; cv.height = r.height * d;
  const g = cv.getContext('2d'); g.scale(d, d);
  const w = r.width - 16, x0 = 8, h = r.height, D = S.anim.duration;
  g.clearRect(0, 0, r.width, h);
  g.font = '9px "F37 Analog", system-ui'; g.fillStyle = 'rgba(233,236,242,.4)'; g.strokeStyle = 'rgba(233,236,242,.14)'; g.lineWidth = 1;
  for (let s = 0; s <= D; s += D > 20 ? 5 : 1) { const x = x0 + s / D * w; g.beginPath(); g.moveTo(x + .5, h * .62); g.lineTo(x + .5, h); g.stroke(); if (s % (D > 20 ? 10 : 2) === 0) g.fillText(s + 's', x + 3, h * .56); }
  g.strokeStyle = 'rgba(233,236,242,.28)'; g.beginPath(); g.moveTo(x0, h * .78 + .5); g.lineTo(x0 + w, h * .78 + .5); g.stroke();
  /* what is animating, as a band */
  const on = [S.path.length && 'camera', S.anim.lines !== 'none' && 'lines: ' + S.anim.lines, S.anim.terrain !== 'none' && 'land: ' + S.anim.terrain, S.react.source !== 'off' && 'reactive'].filter(Boolean);
  g.font = '9.5px "F37 Analog", system-ui'; g.fillStyle = 'rgba(233,236,242,.62)';
  g.fillText((on.join('  ·  ') || 'nothing animates yet — pick a camera move or a line behaviour').toUpperCase(), x0, 10);
  S.path.forEach((k, i) => { const x = x0 + k.t * w, y = h * .78;
    g.save(); g.translate(x, y); g.rotate(Math.PI / 4); g.fillStyle = i === selKey ? '#FF4B1F' : '#E9ECF2'; g.fillRect(-4, -4, 8, 8); g.restore(); });
  const px = x0 + clockT / D * w;
  g.fillStyle = '#FF4B1F'; g.fillRect(px - .5, 0, 1.5, h);
  $('#clock').textContent = clockT.toFixed(2); $('#clock-k').textContent = 'of ' + D + ' s' + (S.anim.loop ? ' · loop' : '');
}

/* ── hud, toast, presentation, keys ─────────────────────────────────────── */
let hudT = 0;
function hud(force) {
  const now = performance.now(); if (!force && now - hudT < 250) return; hudT = now;
  const s = T.summit();
  $('#hud').innerHTML = `${S.name}<br>Summit <b>${(s.h * S.view.exag).toFixed(1)} m</b> · ${T.n} × ${T.n}<br>${S.render.mode} · ${S.view.cam === 'persp' ? 'perspective' : S.view.cam === 'ortho' ? 'orthographic' : 'profile'} · ${todAt(S.light.tod).name.toLowerCase()}`;
}
let toastT = 0;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('in'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('in'), 2400); }
function present(on) {
  document.body.classList.toggle('present', on);
  if (on) { setTool('nav'); toast('Presentation — move the pointer for controls, Esc to leave'); }
  /* nothing of the editor over the mountain while presenting */
  const g = gizmo.getHelper ? gizmo.getHelper() : gizmo;
  if (on) { g.visible = false; gizmo.enabled = false; } else applyView();
  setTimeout(() => resize(), 0);
}
$('#present-bar').innerHTML = `<button type="button" data-p="play">Play / pause</button><button type="button" data-p="png">PNG</button><button type="button" data-p="exit">Exit</button>`;
$('#present-bar').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.p === 'play') setPlaying(!playing); if (b.dataset.p === 'png') savePNG(); if (b.dataset.p === 'exit') present(false); });
let hoverT = 0;
addEventListener('pointermove', () => { if (!document.body.classList.contains('present')) return; document.body.classList.add('hovering'); clearTimeout(hoverT); hoverT = setTimeout(() => document.body.classList.remove('hovering'), 1600); });
addEventListener('keydown', e => {
  if (e.target.closest('input, textarea, select')) return;
  const k = e.key.toLowerCase(), mod = e.metaKey || e.ctrlKey;
  if (mod && k === 'z') { e.preventDefault(); e.shiftKey ? stepHistory(redo, undo) : stepHistory(undo, redo); return; }
  if (mod) return;
  const map = { v: 'nav', r: 'raise', l: 'lower', s: 'smooth', n: 'noise', c: 'crease', g: 'ridge', f: 'flatten', k: 'valley', m: e.shiftKey ? 'unmask' : 'mask' };
  if (map[k]) { setTool(map[k]); return; }
  if (k === '[') { S.brush.size = Math.max(2, S.brush.size / 1.15); syncUI(); U.uBrush.value.z = S.brush.size; }
  if (k === ']') { S.brush.size = Math.min(60, S.brush.size * 1.15); syncUI(); U.uBrush.value.z = S.brush.size; }
  if (k === ' ') { e.preventDefault(); setPlaying(!playing); }
  if (k === 'p') present(!document.body.classList.contains('present'));
  if (k === 'escape' && document.body.classList.contains('present')) present(false);
});

/* ── go ─────────────────────────────────────────────────────────────────── */
buildPanel(); bindPanel(); buildTools(); buildTimeline();
renderCheckpoints(); renderLibrary(); renderSiteUse();
setTool('nav'); applyRender(); applyView(); resize();
cameraPreset('orbit'); frameSummit();
requestAnimationFrame(frame);
window.mountainsLab = { S, T, U, toPreset, fromPreset };   // for the console
