/* ══════════════════════════════════════════════════════════════════════════
   The summit trail
   ─────────────────────────────────────────────────────────────────────────
   One more layer on the Active Peak scene: a walking route from the foot of
   the massif to its summit, drawn on as a timed move and finished on the
   studio's pen mark.

   ── the route ─────────────────────────────────────────────────────────────
   Not a line up the fall line. A real trail on a slope this steep zig-zags:
   long traverses across the face at a steady grade, a tight turn, and back —
   and the traverses shorten as the mountain narrows, so the last switchbacks
   under the summit are a fraction of the width of the first ones.

   So the route is written in polar terms around the summit. The radius falls
   steadily from the trailhead to the top (that is the climb), while the angle
   swings back and forth across the face the camera sees (the traverses). The
   swing is a triangle wave with its corners rounded rather than a sine: a sine
   spends as long turning as it does traversing and reads as a squiggle; a
   rounded triangle is straight legs and hairpins, which is what a switchback
   is. Its amplitude is in radians, so the same swing that is thirty units of
   traverse at the bottom is three at the top without any extra rule.

   On top of that, a little low-frequency wobble in both the radius and the
   angle, so no two legs are the same length — a path that is perfectly
   periodic reads as drawn, not walked.

   Every point is then dropped onto the terrain through scene.heightAt(), the
   same field the contours are extracted from, so the route crosses each
   contour exactly where it should and hides behind the ridges it goes round.

   ── the draw ──────────────────────────────────────────────────────────────
   One number, 0 → 1, eased on a cubic bezier (0.65, 0, 0.35, 1): a slow
   start off the trailhead, the long even middle of the climb, and a slow
   arrival at the top. The line is a screen-space ribbon — the contours' own
   technique — so it holds its width at any depth and any pixel density, and
   it is dashed by arc length the way a route is printed on a survey sheet.

   The walker (the bright head) and the pen mark are DOM, positioned from the
   trail mesh's onBeforeRender — the one moment in the frame when the camera
   the scene is about to draw with is final. Placed from a separate rAF they
   would trail the picture by a frame whenever the scroll moves the camera.
   ═════════════════════════════════════════════════════════════════════════ */
import * as THREE from 'three';

/* The studio's pen mark: an orange square with a pen nib cut into it. One
   definition, used here and anywhere else the mark appears. */
export const PEN_SVG = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="0" y="0" width="24" height="24" rx="3" fill="var(--pen-bg, #FF4B1F)"/>
    <path d="M8.2 5.2h7.6v2.1H8.2z" fill="#fff"/>
    <path d="M8.4 8.2h7.2l2.9 4.6-6.5 7.3-6.5-7.3z" fill="#fff"/>
    <path d="M12 12.1v7.2" stroke="var(--pen-bg, #FF4B1F)" stroke-width="1.1"/>
    <circle cx="12" cy="12.2" r="1.45" fill="var(--pen-bg, #FF4B1F)"/>
  </svg>`;

/* A cubic-bezier timing function, the same curve CSS would draw for
   cubic-bezier(x1, y1, x2, y2). Solved for t by Newton, falling back to
   bisection on the flat ends where the derivative is too small to trust. */
export function cubicBezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = t => ((ax * t + bx) * t + cx) * t;
  const sy = t => ((ay * t + by) * t + cy) * t;
  const dx = t => (3 * ax * t + 2 * bx) * t + cx;
  return x => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 6; i++) {
      const e = sx(t) - x, d = dx(t);
      if (Math.abs(e) < 1e-5) return sy(t);
      if (Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    let lo = 0, hi = 1; t = x;
    for (let i = 0; i < 24; i++) {
      const v = sx(t);
      if (Math.abs(v - x) < 1e-5) break;
      if (v < x) lo = t; else hi = t;
      t = (lo + hi) / 2;
    }
    return sy(t);
  };
}

export const EASE_IN_OUT = cubicBezier(0.65, 0, 0.35, 1);

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function createPeakTrail(scene, o = {}) {
  const opt = {
    color: '#FF4B1F',
    width: 2.2,            // CSS px
    duration: 4.6,         // seconds, trailhead to summit
    legs: 7,               // traverses across the face
    swing: 0.62,           // radians either side of the face at the trailhead
    reach: 1.12,           // trailhead distance, in spreads of the massif
    /* The face the route climbs, as an angle around the summit in the group's
       own frame (0 = +z, toward the camera). The Aside state turns the group
       by +0.58 rad and the camera sits at +14°, so a face at -0.2 rad is the
       one still looking at the camera once the peak has moved over. */
    face: -0.2,
    camps: [0.2, 0.44, 0.68, 0.9],   // arc fractions the page can pin things to
    host: null,            // element the DOM markers are positioned in
    ...o,
  };

  const top = scene.summit();
  const P0 = (scene.info().peaks[0]) || { spread: 44 };
  const R0 = P0.spread * opt.reach;

  /* ── the route ──────────────────────────────────────────────────────── */
  /* a rounded triangle wave in -1..1: straight traverses, soft hairpins */
  const K = 0.965;
  const tri = u => Math.asin(K * Math.sin(u * Math.PI * 2)) / Math.asin(K);
  /* smooth deterministic wobble, so every leg is a slightly different length */
  const wob = (s, f, ph) => Math.sin(s * f + ph) * 0.6 + Math.sin(s * f * 2.3 + ph * 1.7) * 0.4;

  const N = 520;
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    /* The climb: radius falls on a curve that spends longer low down, where
       the mountain is wide and the legs are long. */
    const r = R0 * Math.pow(1 - s, 1.08) * (1 + 0.05 * wob(s, 9.0, 1.3));
    /* The traverses: swing shrinks as the face narrows, and dies out over the
       last few percent so the final approach walks straight onto the top
       instead of hooking round it. */
    const amp = opt.swing * (0.28 + 0.72 * Math.pow(1 - s, 0.7)) * (1 - smooth(0.9, 1.0, s));
    const phase = tri(s * opt.legs * 0.5 + 0.25) * amp;
    const th = opt.face + phase + 0.05 * wob(s, 5.0, 0.4);
    const x = top.x + Math.sin(th) * r;
    const z = top.z + Math.cos(th) * r;
    pts.push(new THREE.Vector3(x, 0, z));
  }
  /* Soften, then drape. Two passes of a small box filter take the corners off
     the wobble without rounding the hairpins away. */
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 1; i < pts.length - 1; i++) {
      pts[i].x = (pts[i - 1].x + pts[i].x * 2 + pts[i + 1].x) / 4;
      pts[i].z = (pts[i - 1].z + pts[i].z * 2 + pts[i + 1].z) / 4;
    }
  }
  const LIFT = 0.7;
  for (const p of pts) p.y = scene.heightAt(p.x, p.z) + LIFT;
  pts[pts.length - 1].set(top.x, top.y + LIFT, top.z);

  /* cumulative arc length, so progress is distance walked, not index */
  const cum = new Float32Array(pts.length);
  let total = 0;
  for (let i = 1; i < pts.length; i++) { total += pts[i].distanceTo(pts[i - 1]); cum[i] = total; }

  function pointAt(f, out) {
    const d = Math.min(1, Math.max(0, f)) * total;
    let lo = 0, hi = cum.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] < d) lo = m; else hi = m; }
    const k = (d - cum[lo]) / Math.max(1e-6, cum[hi] - cum[lo]);
    return out.lerpVectors(pts[lo], pts[hi], k);
  }

  /* ── the ribbon ─────────────────────────────────────────────────────── */
  const n = pts.length;
  const pos = new Float32Array(n * 2 * 3), prev = new Float32Array(n * 2 * 3),
        next = new Float32Array(n * 2 * 3), side = new Float32Array(n * 2),
        arc = new Float32Array(n * 2), len = new Float32Array(n * 2);
  const idx = new Uint16Array((n - 1) * 6);
  for (let i = 0, v = 0; i < n; i++) {
    const p = pts[i], pp = pts[Math.max(0, i - 1)], np = pts[Math.min(n - 1, i + 1)];
    for (let sd = 0; sd < 2; sd++, v++) {
      pos.set([p.x, p.y, p.z], v * 3);
      prev.set([pp.x, pp.y, pp.z], v * 3);
      next.set([np.x, np.y, np.z], v * 3);
      side[v] = sd ? 1 : -1;
      arc[v] = cum[i] / total;
      len[v] = cum[i];
    }
  }
  for (let i = 0, k = 0; i < n - 1; i++) {
    const a = i * 2;
    idx[k++] = a; idx[k++] = a + 1; idx[k++] = a + 2;
    idx[k++] = a + 1; idx[k++] = a + 3; idx[k++] = a + 2;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aPrev', new THREE.BufferAttribute(prev, 3));
  geo.setAttribute('aNext', new THREE.BufferAttribute(next, 3));
  geo.setAttribute('aSide', new THREE.BufferAttribute(side, 1));
  geo.setAttribute('aArc', new THREE.BufferAttribute(arc, 1));
  geo.setAttribute('aLen', new THREE.BufferAttribute(len, 1));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));

  const col = new THREE.Color(opt.color);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: true, side: THREE.DoubleSide,
    uniforms: {
      uHalfRes: { value: new THREE.Vector2(1, 1) },
      uWidth:   { value: opt.width },
      uProgress:{ value: 0 },
      uAlpha:   { value: 1 },
      uGhost:   { value: 0.0 },
      uColor:   { value: new THREE.Vector3(col.r, col.g, col.b) },
      uDash:    { value: new THREE.Vector2(2.4, 0.62) },   // period (world), duty
    },
    vertexShader: `
      attribute vec3 aPrev, aNext;
      attribute float aSide, aArc, aLen;
      uniform vec2 uHalfRes;
      uniform float uWidth;
      varying float vArc, vLen;
      void main(){
        vec4 cur = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        vec4 prv = projectionMatrix * modelViewMatrix * vec4(aPrev, 1.0);
        vec4 nxt = projectionMatrix * modelViewMatrix * vec4(aNext, 1.0);
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
        vArc = aArc; vLen = aLen;
        gl_Position = cur;
      }`,
    fragmentShader: `
      precision highp float;
      varying float vArc, vLen;
      uniform float uProgress, uAlpha, uGhost;
      uniform vec3 uColor;
      uniform vec2 uDash;
      void main(){
        /* walked: everything behind the head, feathered over a hair */
        float walked = 1.0 - smoothstep(uProgress - 0.004, uProgress + 0.002, vArc);
        /* printed-route dashes, by distance along the ground */
        float ph = fract(vLen / uDash.x);
        float dash = smoothstep(0.0, 0.06, ph) * (1.0 - smoothstep(uDash.y - 0.06, uDash.y, ph));
        /* the last stretch behind the head is solid and hot — it reads as the
           line being laid, not as dashes that happen to be growing */
        float lead = smoothstep(uProgress - 0.05, uProgress, vArc) * step(0.0005, uProgress) * step(uProgress, 0.9995);
        float a = walked * max(dash, lead) + (1.0 - walked) * uGhost * dash;
        if (a < 0.01) discard;
        vec3 c = mix(uColor, vec3(1.0, 0.93, 0.86), lead * 0.55);
        gl_FragColor = vec4(c, a * uAlpha);
      }`,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 5;       // over the contours and the client routes
  scene.group.add(mesh);

  /* ── the DOM markers ─────────────────────────────────────────────────── */
  const host = opt.host || scene.canvas.parentElement;
  const layer = document.createElement('div');
  layer.className = 'trail-layer';
  layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML = `
    <span class="trail-head"></span>
    <span class="trail-base"></span>
    ${opt.camps.map((_, i) => `<span class="trail-camp" data-i="${i}"><i></i><b>${String(i + 1).padStart(2, '0')}</b></span>`).join('')}
    <span class="trail-pen">${PEN_SVG}<em>Summit</em></span>`;
  host.appendChild(layer);
  const headEl = layer.querySelector('.trail-head');
  const baseEl = layer.querySelector('.trail-base');
  const penEl = layer.querySelector('.trail-pen');
  const campEls = [...layer.querySelectorAll('.trail-camp')];

  const campPts = opt.camps.map(f => pointAt(f, new THREE.Vector3()));
  const headPt = new THREE.Vector3();
  const penPt = new THREE.Vector3(top.x, top.y + LIFT, top.z);
  const _w = new THREE.Vector3();
  const screen = { head: null, pen: null, base: null, camps: [] };

  function project(p, camera) {
    _w.copy(p);
    scene.group.localToWorld(_w);
    _w.project(camera);
    if (_w.z >= 1) return null;
    return { x: (_w.x * 0.5 + 0.5) * cw, y: (-_w.y * 0.5 + 0.5) * ch };
  }
  let cw = 1, ch = 1;
  const place = (el, s) => {
    if (!s) { el.style.visibility = 'hidden'; return; }
    el.style.visibility = '';
    el.style.transform = `translate3d(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px, 0)`;
  };

  /* Where the canvas sits inside the host, so markers land on the picture
     rather than on the host's top-left corner. */
  let offX = 0, offY = 0;
  function measure() {
    const c = scene.canvas.getBoundingClientRect(), h = host.getBoundingClientRect();
    cw = c.width || 1; ch = c.height || 1;
    offX = c.left - h.left; offY = c.top - h.top;
    layer.style.left = offX + 'px'; layer.style.top = offY + 'px';
    layer.style.width = cw + 'px'; layer.style.height = ch + 'px';
  }
  measure();
  new ResizeObserver(measure).observe(scene.canvas);
  addEventListener('resize', measure);

  mesh.onBeforeRender = (renderer, _s, camera) => {
    renderer.getDrawingBufferSize(mat.uniforms.uHalfRes.value);
    mat.uniforms.uHalfRes.value.multiplyScalar(0.5);
    /* the ribbon's width is in CSS px, the buffer is in device px */
    mat.uniforms.uWidth.value = opt.width * renderer.getPixelRatio();

    const p = state.p;
    screen.head = p > 0.0005 && p < 0.9995 ? project(pointAt(p, headPt), camera) : null;
    screen.pen = project(penPt, camera);
    screen.base = project(pts[0], camera);
    screen.camps = campPts.map(c => project(c, camera));

    place(headEl, screen.head);
    place(penEl, screen.pen);
    place(baseEl, screen.base);
    campEls.forEach((el, i) => {
      place(el, screen.camps[i]);
      el.classList.toggle('on', p >= opt.camps[i] - 0.002);
    });
    if (onFrame) onFrame(screen, p);
  };

  /* ── the draw ────────────────────────────────────────────────────────── */
  const state = { p: 0, shown: true, target: 0 };
  let raf = 0, onFrame = null;

  function setProgress(p) {
    state.p = Math.min(1, Math.max(0, p));
    mat.uniforms.uProgress.value = state.p;
    layer.classList.toggle('started', state.p > 0.001);
    layer.classList.toggle('arrived', state.p >= 0.999);
  }

  /* Tween progress from where it is to `to` on the ease-in-out curve. The
     duration scales with the distance still to go, so a draw interrupted
     half-way and resumed does not take the full four seconds to finish. */
  function tweenTo(to, dur, ease = EASE_IN_OUT) {
    cancelAnimationFrame(raf);
    const from = state.p;
    if (REDUCED || dur === 0) { setProgress(to); return; }
    const d = (dur != null ? dur : opt.duration) * Math.max(0.2, Math.abs(to - from));
    const t0 = performance.now();
    const step = now => {
      const k = Math.min(1, (now - t0) / (d * 1000));
      setProgress(from + (to - from) * ease(k));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  function setVisible(on) {
    state.shown = !!on;
    layer.classList.toggle('hidden', !on);
    mesh.visible = true;
    /* fade the ribbon rather than pop it */
    const a0 = mat.uniforms.uAlpha.value, a1 = on ? 1 : 0, t0 = performance.now();
    const step = now => {
      const k = Math.min(1, (now - t0) / 380);
      mat.uniforms.uAlpha.value = a0 + (a1 - a0) * EASE_IN_OUT(k);
      if (k < 1) requestAnimationFrame(step); else mesh.visible = on;
    };
    requestAnimationFrame(step);
  }

  setProgress(0);

  return {
    mesh, layer, points: pts, camps: opt.camps, screen,
    get progress() { return state.p; },
    get visible() { return state.shown; },
    /** draw from the trailhead to the summit */
    play(dur) { tweenTo(1, dur); },
    /** from the trailhead again, whatever state it is in */
    replay(dur) { setProgress(0); tweenTo(1, dur); },
    /** take the line back down, quicker than it went up */
    retract(dur) { tweenTo(0, dur != null ? dur : opt.duration * 0.35, cubicBezier(0.55, 0, 0.75, 0.2)); },
    /** draw to a fraction of the route and stop — a camp, say */
    drawTo(f, dur) { tweenTo(f, dur); },
    set: setProgress,
    setVisible,
    onFrame(fn) { onFrame = fn; },
    setColor(hex) { const c = new THREE.Color(hex); mat.uniforms.uColor.value.set(c.r, c.g, c.b); },
    setGhost(v) { mat.uniforms.uGhost.value = v; },
  };
}

function smooth(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
