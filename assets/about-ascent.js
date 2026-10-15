/* ══════════════════════════════════════════════════════════════════════════
   About — the ascent
   ─────────────────────────────────────────────────────────────────────────
   The About page's hero: one camera move from the foot of a very large
   mountain to its summit, and the title.

   ── the mountain ──────────────────────────────────────────────────────────
   Not a new drawing: it is the Firstpost summit from the home page's Our
   Summits section (Base Camp), from the same shared scene
   (assets/range-scene.js, range mode, the Active Peak palette). It is lit
   and inked exactly as Base Camp lights the summit in focus — lavender line,
   bold rings, the rest of the range receding cooler and lower — and drawn
   much taller (fgScale) so from its foot it fills the sky.

   Around it, terrain: the scene's fill (smaller landforms and the ground's
   own relief, all contoured in the same line), and a scatter of rocks —
   faceted stones with their creases drawn in the ink — thickest in the
   foreground the camera starts among, thinning up the slope.

   ── the move (1200ms by default) ──────────────────────────────────────────
   One continuous spline, camera and aim together, on one eased clock:
     base      low among the rocks, the mountain filling the frame
     glide     forward over the ground, slowly
     tilt      the aim swings up the face
     climb     straight up the face, close, past the cliffs
     peak      out over the summit, which it holds on
   The timing curve accelerates through the climb and eases out onto the
   summit (cubic-bezier .55 0 .15 1). Nothing cuts; the last frame holds.

     ASCENT            every tunable (the panel writes here)
     mountAscent(canvas, host) → { play, pause, restart, scrub(u), rebuild }
   ═════════════════════════════════════════════════════════════════════════ */
import * as THREE from 'three';
import { createRangeScene } from './range-scene.js';

export const ASCENT = {
  duration: 1.2,          // seconds, base to peak
  ease: [0.55, 0, 0.15, 1],
  peak: 1,                // which client summit: 1 = Firstpost
  height: 1.25,           // the summit's height, × as built (the camera makes it very large; the
                          // shared line work holds up to about 1.5× — past that the top loses its rings)
  rest: 0.42,             // the rest of the range's height while it leads
  relief: 7,              // the ground's own roughness
  fill: { count: 22, height: 0.6, seed: 11, ridges: true },
  levels: 46,             // contour density
  rocks: 70,              // stones scattered over the ground
  rockSize: 1,
  frame: 0.16,            // where the summit sits across the frame at the end (0 = centre, + = right)
};

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp01 = t => t < 0 ? 0 : t > 1 ? 1 : t;

/* the CSS curve, solved for x */
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = t => ((ax * t + bx) * t + cx) * t, Y = t => ((ay * t + by) * t + cy) * t;
  return x => {
    if (x <= 0) return 0; if (x >= 1) return 1;
    let lo = 0, hi = 1, t = x;
    for (let i = 0; i < 24; i++) { const v = X(t); if (Math.abs(v - x) < 1e-5) break; if (v < x) lo = t; else hi = t; t = (lo + hi) / 2; }
    return Y(t);
  };
}

export function mountAscent(canvas, host) {
  const scene = createRangeScene({
    canvas, mode: 'range', palette: 'peak', hover: false, noStudio: true,
    fill: { ...ASCENT.fill, spacing: 24 }, terrain: { levels: ASCENT.levels },
    onPeakClick: () => {},
  });
  scene.setAccent('#FF4B1F');
  scene.setDepth(0.16);
  /* lit and inked as Base Camp's summit in focus */
  function style() {
    scene.light(ASCENT.peak, true);
    scene.setFocusStyle({ local: true, thin: 0.5, cool: 0.55, coolTint: '#26304C', sparse: 0.4,
      litInk: '#EEF1F8', litInkMix: 0.45, litBoost: 0.5, bgScale: ASCENT.rest, fgScale: ASCENT.height,
      fill: '#2B3550', fillGrad: 0.0 });
  }
  style();
  scene.setTerrain({ relief: ASCENT.relief });

  /* ── the summit, and how high things are drawn ───────────────────── */
  let top = scene.clientTops()[ASCENT.peak];
  const onBody = (x, z) => Math.hypot(x - top.x, z - top.z) < top.spread * 1.25;
  const drawnH = (x, z) => scene.heightAt(x, z) * (onBody(x, z) ? ASCENT.height : ASCENT.rest);

  /* ── the rocks ────────────────────────────────────────────────────── */
  const rockGroup = new THREE.Group();
  scene.group.add(rockGroup);
  const rockFill = new THREE.MeshBasicMaterial({ color: 0x07080d, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  const rockLine = new THREE.LineBasicMaterial({ color: 0x9fb0e8, transparent: true, opacity: 0.55 });
  function buildRocks() {
    rockGroup.clear();
    let s = 97; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const R = top.spread;
    for (let i = 0; i < ASCENT.rocks; i++) {
      /* three bands: big ones right in front of where the camera starts,
         a field across the foot, and a few small ones on the slope so the
         climb passes some */
      const band = i < ASCENT.rocks * 0.3 ? 0 : i < ASCENT.rocks * 0.8 ? 1 : 2;
      const ang = Math.PI / 2 + (rnd() - 0.5) * (band === 0 ? 0.55 : band === 1 ? 1.9 : 2.4);
      const r = band === 0 ? R * (2.5 + rnd() * 1.1) : band === 1 ? R * (1.15 + rnd() * 1.9) : R * (0.35 + rnd() * 0.7);
      let x = top.x + Math.cos(ang) * r;
      const z = top.z + Math.sin(ang) * r;
      /* keep a lane clear down the camera's path: a stone in it would fill
         the lens at the start */
      const lane = R * 0.35, cx = top.x - R * 0.25;
      if (Math.abs(x - cx) < lane) x = cx + Math.sign(x - cx || 1) * (lane + rnd() * R * 0.4);
      const g = new THREE.IcosahedronGeometry(1, 0);
      const p = g.attributes.position, keyed = new Map();
      for (let k = 0; k < p.count; k++) {
        const id = `${p.getX(k).toFixed(3)},${p.getY(k).toFixed(3)},${p.getZ(k).toFixed(3)}`;
        if (!keyed.has(id)) keyed.set(id, 0.72 + rnd() * 0.45);
        const f = keyed.get(id);
        p.setXYZ(k, p.getX(k) * f, p.getY(k) * f * 0.7, p.getZ(k) * f);
      }
      g.computeVertexNormals();
      const size = (band === 0 ? 2.2 + rnd() * 4.2 : band === 1 ? 0.9 + rnd() * 2.6 : 0.5 + rnd() * 1.1) * ASCENT.rockSize;
      const m = new THREE.Mesh(g, rockFill);
      m.add(new THREE.LineSegments(new THREE.EdgesGeometry(g, 1), rockLine));
      m.scale.set(size * (1 + rnd() * 0.5), size, size * (0.8 + rnd() * 0.4));
      m.position.set(x, drawnH(x, z) + size * 0.35, z);
      m.rotation.set(rnd() * 0.4, rnd() * 6.28, rnd() * 0.4);
      rockGroup.add(m);
    }
  }
  buildRocks();

  /* ── the path: one spline for the camera, one for its aim ─────────── */
  let camCurve, aimCurve;
  function buildPath() {
    top = scene.clientTops()[ASCENT.peak];
    const R = top.spread, H = top.y * ASCENT.height, X = top.x, Z = top.z;
    const narrow = (host.clientWidth || innerWidth) < 760;
    const side = narrow ? 0 : ASCENT.frame;                  // final framing: the summit right of centre
    const near = (k) => Z + R * k;                           // toward the camera (+z) from the summit
    const g = (x, z, up) => Math.max(drawnH(x, z), 0) + up;  // clear of the ground
    const cam = [
      [X - R * 0.26, g(X - R * 0.26, near(2.9), 1.4), near(2.9)],    // base: low among the rocks, the mountain towering ahead
      [X - R * 0.20, g(X - R * 0.20, near(2.25), 2.0), near(2.25)],  // the glide, over the ground
      [X - R * 0.10, H * 0.24, near(1.45)],                          // the tilt, lifting off
      [X - R * 0.02, H * 0.55, near(0.98)],                          // the climb: close up the face
      [X + R * 0.04, H * 0.88, near(0.82)],                          //  … past the cliffs
      [X + R * 0.10, H * 1.22, near(1.3)],                           // out over the top
      [X + R * 0.16 - side * R * 2.2, H * 1.42, near(2.4)],          // the hold: the whole summit in view, right of the title
    ];
    const aim = [
      [X, H * 0.62, Z],
      [X, H * 0.72, Z],
      [X, H * 0.86, Z],
      [X, H * 1.05, Z - R * 0.1],
      [X, H * 1.2, Z - R * 0.2],
      [X, H * 0.98, Z],
      [X - side * R * 2.2, H * 0.72, Z],                     // aim left of the summit → it sits right
    ];
    camCurve = new THREE.CatmullRomCurve3(cam.map(p => new THREE.Vector3(...p)), false, 'centripetal');
    aimCurve = new THREE.CatmullRomCurve3(aim.map(p => new THREE.Vector3(...p)), false, 'centripetal');
  }
  buildPath();

  /* ── the summit's dot: Base Camp's live mark, on the top it climbs to ── */
  const dot = document.createElement('i');
  dot.className = 'asc-dot';
  dot.setAttribute('aria-hidden', 'true');
  host.appendChild(dot);
  const _d = new THREE.Vector3();
  function placeDot(k) {
    _d.set(top.x, top.y * ASCENT.height + 0.6, top.z);
    scene.group.localToWorld(_d);
    _d.project(scene.camera);
    const r = canvas.getBoundingClientRect();
    const on = _d.z < 1 && k > 0.86;
    dot.style.opacity = on ? String(Math.min(1, (k - 0.86) / 0.1)) : '0';
    dot.style.transform = `translate3d(${((_d.x * .5 + .5) * r.width).toFixed(1)}px, ${((-_d.y * .5 + .5) * r.height).toFixed(1)}px, 0)`;
  }

  /* ── the clock ────────────────────────────────────────────────────── */
  let ease = bezier(...ASCENT.ease);
  let u = REDUCED ? 1 : 0, playing = !REDUCED, t0 = performance.now(), from = 0, onEnd = null;
  const _p = new THREE.Vector3(), _a = new THREE.Vector3();
  function place(k) {
    camCurve.getPointAt(k, _p); aimCurve.getPointAt(k, _a);
    scene.setView(_p.toArray(), _a.toArray(), 0);
  }
  function frame(now) {
    requestAnimationFrame(frame);
    if (playing) {
      const raw = clamp01(from + (now - t0) / (ASCENT.duration * 1000));
      u = raw;
      if (raw >= 1) { playing = false; if (onEnd) onEnd(); }
    }
    place(ease(u));
    placeDot(ease(u));
    if (state) state(u, playing);
  }
  let state = null;
  place(ease(u));
  requestAnimationFrame(frame);
  addEventListener('resize', () => { buildPath(); place(ease(u)); });

  return {
    scene, ASCENT,
    play() { if (u >= 1) u = 0; from = u; t0 = performance.now(); playing = true; },
    pause() { playing = false; },
    restart() { u = 0; from = 0; t0 = performance.now(); playing = true; },
    scrub(v) { playing = false; u = clamp01(v); },
    get progress() { return u; },
    get playing() { return playing; },
    onState(fn) { state = fn; },
    onEnd(fn) { onEnd = fn; },
    setEase(e) { ASCENT.ease = e; ease = bezier(...e); },
    /* shape: the summit's height and the range's, the ground, the fill, the rocks */
    reshape(o = {}) {
      Object.assign(ASCENT, o);
      if (o.fill) Object.assign(ASCENT.fill, o.fill);
      style();
      const t = {};
      if (o.relief != null) t.relief = ASCENT.relief;
      if (o.levels != null) t.levels = ASCENT.levels;
      if (o.fill) Object.assign(t, o.fill);
      if (Object.keys(t).length) scene.setTerrain(t);
      buildRocks(); buildPath(); place(ease(u));
    },
  };
}
