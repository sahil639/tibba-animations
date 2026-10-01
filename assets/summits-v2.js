/* ══════════════════════════════════════════════════════════════════════════
   Our Summits — v2 and v3
   ─────────────────────────────────────────────────────────────────────────
   Four Summits' mountains, moved the way the Three Summits page moves.

     the land      the four client summits, now standing in a country:
                   ridges along each gap between neighbours and knolls round
                   them (range-scene's opts.fill), all held well below the
                   summits, so the contour work runs edge to edge and the
                   lowest rings carry the Active Peak's travelling dots.
     the camera    Three Summits': one focus value, chased smoothly toward
                   where the scroll says it should be and settling onto the
                   nearest summit when the scroll rests; between summits the
                   camera lifts toward the plan view and comes back down onto
                   the next; each summit has its own bearing; the pointer
                   tilts the view a little.
     the trails    no longer a single Bézier: each winds round its mountain
                   — a loose, noisy spiral from a trailhead low on one flank
                   up to the summit — over a soft dark shadow, and fades in
                   from its trailhead. Stateful as before: drawn once, the
                   first time its summit is in focus, then left drawn.
     click         a summit opens its case study.
     the rail      on the right, as on Three Summits.

   Two layouts, one module: 'cards' (v2) sets the case in Three Summits'
   editorial column on the right; 'text' (v3) has no cards — the section's
   copy sits bottom-left and names the summit in focus.

   Every tunable: SUMMITS2_CONFIG.
   ═════════════════════════════════════════════════════════════════════════ */
import * as THREE from 'three';
import { createRangeScene } from './range-scene.js';
import { cubicBezier } from './peak-trail.js';
import { CASES, EASES } from './four-summits.js';

const $ = s => document.querySelector(s);
const clamp01 = t => t < 0 ? 0 : t > 1 ? 1 : t;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const ACCENT = '#FF4B1F';
const N = CASES.length;
const pad = i => String(i + 1).padStart(2, '0');

export const SUMMITS2_CONFIG = {
  scroll: { height: 520, settleAfter: 0.26 },        // vh of scroll; s of quiet before settling on a summit
  focus: { chase: 3.2 },                            // how quickly the camera's focus follows (per s)
  camera: {
    dist: 118,              // distance from the summit at rest
    elev: 22,               // degrees above the horizon at rest
    lift: 26,               // extra degrees at the top of the lift between summits
    liftDist: 60,           // extra distance at the top of the lift
    bearings: [-34, -12, 10, 32],   // each summit's own azimuth, degrees
    aside: 0.12,            // summit framed left of centre by this share of the distance (cards layout)
    asideText: -0.04,       // … and for the text layout
    aimY: 0.5,              // look this far up the summit
    tilt: { yaw: 5, pitch: 3 },     // degrees of pointer tilt
    drift: 1.2,             // degrees of slow idle sway
  },
  fill: { count: 24, seed: 7, height: 0.6, ridges: true },    // range-scene opts.fill: extra landforms, held below the summits
                          // (also spacing: min distance between them, relief: the ground's noise)
  terrain: null,          // { levels, width } — contour density and line weight (range-scene opts.terrain)
  path: {
    duration: 3.4, ease: 'In-out (sine)', delay: 0.2,
    turns: 1.15,            // how far round its mountain a trail winds
    wander: 0.22,           // noise in the winding (0 = a clean spiral)
    start: 1.25,            // trailhead radius, × the summit's spread
    width: 2.2,             // px
    shadow: { width: 7, opacity: 0.6, offset: 2.5 },   // px, alpha, px down-screen
    fadeIn: 0.18,           // share of the trail over which it fades in from the trailhead
    dim: 0.3,
  },
};

export function mountSummitsV2({ layout = 'cards' } = {}) {
  const C = SUMMITS2_CONFIG;
  const scope = $('#scope');
  scope.style.height = C.scroll.height + 'vh';
  const stage = $('#stage');

  const scene = createRangeScene({
    canvas: $('#peak-canvas'), mode: 'range', palette: 'peak', hover: true, noStudio: true,
    fill: C.fill, terrain: C.terrain,
    onPeakClick: i => { location.href = CASES[i].file; },
  });
  scene.setAccent(ACCENT);
  scene.setDepth(0.1);
  document.documentElement.style.setProperty('--accent', ACCENT);
  const tops = scene.clientTops();

  /* ── the trails: a winding climb round each mountain ──────────────── */
  const hash = (i, k) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
  function trailPoints(top, i) {
    const P = C.path, R = top.spread * P.start, pts = [];
    const dir = i % 2 ? -1 : 1, a0 = Math.PI * 0.5 + (hash(i, 1) - 0.5) * 1.4;   // trailhead on the near side
    for (let s = 0; s <= 1.0001; s += 1 / 320) {
      const e = Math.pow(1 - s, 1.15);
      const w = P.wander * (Math.sin(s * 17 + i * 3) * 0.6 + Math.sin(s * 41 - i) * 0.4);
      const ang = a0 + dir * (s * P.turns * Math.PI * 2 + w);
      const r = R * e * (1 + w * 0.35);
      const x = top.x + Math.cos(ang) * r, z = top.z + Math.sin(ang) * r;
      pts.push(new THREE.Vector3(x, scene.heightAt(x, z) + 0.7, z));
    }
    pts[pts.length - 1].set(top.x, top.y + 0.7, top.z);
    return pts;
  }
  const ribbonVS = `
    attribute vec3 aPrev, aNext; attribute float aSide, aArc;
    uniform vec2 uHalfRes; uniform float uWidth, uDrop; varying float vArc, vSide;
    void main(){
      vec4 c = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      vec4 p = projectionMatrix * modelViewMatrix * vec4(aPrev, 1.0);
      vec4 n = projectionMatrix * modelViewMatrix * vec4(aNext, 1.0);
      vec2 cs = c.xy / max(1e-5, abs(c.w)) * uHalfRes, ps = p.xy / max(1e-5, abs(p.w)) * uHalfRes, ns = n.xy / max(1e-5, abs(n.w)) * uHalfRes;
      vec2 dA = cs - ps, dB = ns - cs;
      dA = length(dA) > 1e-4 ? normalize(dA) : vec2(0.0); dB = length(dB) > 1e-4 ? normalize(dB) : dA;
      if (length(dA) < 0.5) dA = dB;
      vec2 tg = normalize(dA + dB + 1e-5); vec2 mi = vec2(-tg.y, tg.x);
      float k = 1.0 / clamp(abs(dot(mi, vec2(-dA.y, dA.x))), 0.35, 1.0);
      c.xy += (mi * aSide * uWidth * 0.5 * k + vec2(0.0, -uDrop)) / uHalfRes * c.w;
      vArc = aArc; vSide = aSide; gl_Position = c;
    }`;
  function ribbonMat(colour, shadow) {
    return new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, depthTest: true, side: THREE.DoubleSide,
      uniforms: { uHalfRes: { value: new THREE.Vector2(1, 1) }, uWidth: { value: 2 }, uDrop: { value: 0 },
        uProgress: { value: 0 }, uAlpha: { value: 1 }, uFade: { value: C.path.fadeIn }, uColor: { value: new THREE.Color(colour) } },
      vertexShader: ribbonVS,
      fragmentShader: `
        precision highp float;
        uniform float uProgress, uAlpha, uFade; uniform vec3 uColor; varying float vArc, vSide;
        void main(){
          float on = 1.0 - smoothstep(uProgress - 0.004, uProgress + 0.002, vArc);
          if (on < 0.01) discard;
          float fade = smoothstep(0.0, max(0.001, uFade), vArc);          // the trailhead fades in
          ${shadow
            ? 'float edge = 1.0 - smoothstep(0.0, 1.0, abs(vSide)); gl_FragColor = vec4(0.0, 0.0, 0.0, on * fade * edge * edge * uAlpha);'
            : `float head = smoothstep(uProgress - 0.05, uProgress, vArc) * step(0.0005, uProgress) * step(uProgress, 0.9995);
               vec3 c = mix(uColor, vec3(1.0), head * 0.5);
               gl_FragColor = vec4(c, on * fade * uAlpha);`}
          #include <colorspace_fragment>
        }`,
    });
  }
  function ribbonGeo(pts) {
    const n = pts.length, cum = [0];
    for (let k = 1; k < n; k++) cum[k] = cum[k - 1] + pts[k].distanceTo(pts[k - 1]);
    const tot = cum[n - 1] || 1, pos = [], prev = [], next = [], side = [], arc = [], idx = [];
    for (let k = 0; k < n; k++) {
      const a = pts[k], b = pts[Math.max(0, k - 1)], c = pts[Math.min(n - 1, k + 1)];
      for (const sd of [-1, 1]) { pos.push(a.x, a.y, a.z); prev.push(b.x, b.y, b.z); next.push(c.x, c.y, c.z); side.push(sd); arc.push(cum[k] / tot); }
      if (k < n - 1) { const q = k * 2; idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aPrev', new THREE.Float32BufferAttribute(prev, 3));
    g.setAttribute('aNext', new THREE.Float32BufferAttribute(next, 3));
    g.setAttribute('aSide', new THREE.Float32BufferAttribute(side, 1));
    g.setAttribute('aArc', new THREE.Float32BufferAttribute(arc, 1));
    g.setIndex(idx);
    return { g, cum, tot };
  }
  const trails = tops.map((top, i) => {
    const pts = trailPoints(top, i), { g, cum, tot } = ribbonGeo(pts);
    const shadow = new THREE.Mesh(g, ribbonMat('#000', true)), line = new THREE.Mesh(g, ribbonMat(CASES[i].colour, false));
    shadow.frustumCulled = line.frustumCulled = false;
    shadow.renderOrder = 5; line.renderOrder = 6;
    scene.group.add(shadow, line);
    return { i, top, pts, cum, tot, shadow, line, p: 0, alpha: 1, alphaT: 1, state: 'idle', startAt: 0, t0: 0 };
  });
  const pointAt = (t, f, out) => {
    const d = clamp01(f) * t.tot, c = t.cum; let k = 1; while (k < c.length - 1 && c[k] < d) k++;
    return out.lerpVectors(t.pts[k - 1], t.pts[k], (d - c[k - 1]) / Math.max(1e-6, c[k] - c[k - 1]));
  };
  function rebuild() {
    trails.forEach(t => {
      t.pts = trailPoints(t.top, t.i);
      const r = ribbonGeo(t.pts); t.line.geometry.dispose();
      t.line.geometry = t.shadow.geometry = r.g; t.cum = r.cum; t.tot = r.tot;
    });
  }

  /* ── the summit markers and the walkers ───────────────────────────── */
  const layer = document.createElement('div');
  layer.className = 'fs-layer'; layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML = CASES.map((c, i) => `<span class="fs-peak" style="--c:${c.colour}"><i></i><em>${c.name}</em></span><span class="fs-head" style="--c:${c.colour}"></span>`).join('');
  stage.appendChild(layer);
  const peakEls = [...layer.querySelectorAll('.fs-peak')], headEls = [...layer.querySelectorAll('.fs-head')];
  const _w = new THREE.Vector3(), _h = new THREE.Vector3();
  const project = (v, cam) => {
    _w.copy(v); scene.group.localToWorld(_w); _w.project(cam);
    if (_w.z >= 1) return null;
    const r = scene.canvas.getBoundingClientRect();
    return [(_w.x * 0.5 + 0.5) * r.width, (-_w.y * 0.5 + 0.5) * r.height];
  };
  const place = (el, s) => { if (!s) { el.style.visibility = 'hidden'; return; } el.style.visibility = ''; el.style.transform = `translate3d(${s[0].toFixed(1)}px,${s[1].toFixed(1)}px,0)`; };
  trails[0].line.onBeforeRender = (renderer, _s, cam) => {
    const hr = renderer.getDrawingBufferSize(new THREE.Vector2()).multiplyScalar(0.5), px = renderer.getPixelRatio();
    trails.forEach((t, i) => {
      for (const [m, w, drop] of [[t.line, C.path.width, 0], [t.shadow, C.path.shadow.width, C.path.shadow.offset]]) {
        m.material.uniforms.uHalfRes.value.copy(hr); m.material.uniforms.uWidth.value = w * px; m.material.uniforms.uDrop.value = drop * px;
        m.material.uniforms.uFade.value = C.path.fadeIn;
      }
      place(peakEls[i], project(_h.set(t.top.x, t.top.y + 0.7, t.top.z), cam));
      peakEls[i].classList.toggle('arrived', t.p >= 0.999);
      place(headEls[i], t.p > 0.001 && t.p < 0.999 ? project(pointAt(t, t.p, _h), cam) : null);
    });
  };

  /* ── the rail ─────────────────────────────────────────────────────── */
  const rail = $('#rail');
  rail.innerHTML = CASES.map((c, i) => `<button type="button" aria-label="Show ${c.name}"><span class="tick"></span><span class="nm">${c.name}</span><span>${pad(i)}</span></button>`).join('');
  const railBtns = [...rail.children];
  railBtns.forEach((b, i) => b.addEventListener('click', () => goTo(i)));

  /* ── the copy: the editorial card (v2) or the bottom-left text (v3) ── */
  const panel = $('#panel');
  function showCase(i) {
    const c = CASES[i];
    railBtns.forEach((b, k) => b.setAttribute('aria-current', String(k === i)));
    peakEls.forEach((e, k) => e.classList.toggle('on', k === i));
    if (layout === 'cards' && panel) {
      panel.style.setProperty('--c', c.colour);
      panel.querySelector('#p-index').textContent = `${pad(i)} / ${pad(N - 1)}`;
      panel.querySelector('#p-years').textContent = c.years;
      panel.querySelector('#p-name').textContent = c.name;
      panel.querySelector('#p-tags').textContent = c.tags.join(' · ');
      panel.querySelector('#p-title').innerHTML = c.title;
      panel.querySelector('#p-body').textContent = c.body;
      panel.querySelector('#p-go').href = c.file;
      panel.classList.remove('swap'); void panel.offsetWidth; panel.classList.add('swap');
    }
    const nm = $('#tx-name'), ct = $('#tx-count');
    if (nm) { nm.textContent = c.name; nm.style.color = c.colour; nm.parentElement.classList.remove('swap'); void nm.offsetWidth; nm.parentElement.classList.add('swap'); }
    if (ct) ct.innerHTML = `<b>${pad(i)}</b>&thinsp;/&thinsp;${pad(N - 1)}`;
  }

  /* ── the focus: chased, and settling on a summit when the scroll rests ── */
  let focus = 0, focusTarget = 0, lastInput = -1e9, shown = -1;
  const scrollFocus = () => {
    const travel = scope.offsetHeight - innerHeight;
    return (travel > 0 ? clamp01(-scope.getBoundingClientRect().top / travel) : 0) * (N - 1);
  };
  addEventListener('scroll', () => { focusTarget = scrollFocus(); lastInput = performance.now(); }, { passive: true });
  function goTo(i) {
    const travel = scope.offsetHeight - innerHeight;
    scrollTo({ top: scope.offsetTop + travel * (i / (N - 1)), behavior: REDUCED ? 'auto' : 'smooth' });
  }
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  focusTarget = focus = scrollFocus();

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener('pointermove', e => { pointer.tx = e.clientX / innerWidth * 2 - 1; pointer.ty = e.clientY / innerHeight * 2 - 1; }, { passive: true });

  function queueTrail(i) {
    const t = trails[i]; if (t.state !== 'idle') return;
    t.state = 'waiting'; t.startAt = performance.now() + C.path.delay * 1000;
  }
  const easeFn = () => cubicBezier(...(EASES[C.path.ease] || EASES['In-out (cubic)']));
  const lerp = (a, b, t) => a + (b - a) * t, rad = d => d * Math.PI / 180;

  let last = performance.now();
  function tick(now) {
    requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    /* settle onto the nearest summit once the scroll goes quiet */
    if (now - lastInput > C.scroll.settleAfter * 1000) focusTarget += (Math.round(focusTarget) - focusTarget) * Math.min(1, dt * 3.4);
    focus += (focusTarget - focus) * Math.min(1, dt * (REDUCED ? 30 : C.focus.chase));
    pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 4); pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 4);

    const fi = Math.max(0, Math.min(N - 1.0001, focus)), i0 = Math.floor(fi), i1 = Math.min(N - 1, i0 + 1);
    const ft = fi - i0, fs = ft * ft * (3 - 2 * ft);
    const idx = Math.round(focus);
    if (idx !== shown) {
      shown = idx; showCase(idx); scene.light(idx);
      trails.forEach((t, k) => { t.alphaT = k === idx ? 1 : C.path.dim; if (k !== idx && t.state === 'waiting') t.state = 'idle'; });
    }
    /* a trail waits until its summit has actually arrived in frame */
    if (Math.abs(focus - idx) < 0.08) queueTrail(idx);

    /* Three Summits' camera: ride from summit to summit, lifting toward the
       plan view in the middle of the move and coming back down */
    const cam = C.camera, A = tops[i0], B = tops[i1];
    const lift = Math.sin(Math.PI * fs);
    const tx = lerp(A.x, B.x, fs), tz = lerp(A.z, B.z, fs), ty = lerp(A.y, B.y, fs) * cam.aimY;
    const yaw = rad(lerp(cam.bearings[i0], cam.bearings[i1], fs) + pointer.x * cam.tilt.yaw + (REDUCED ? 0 : Math.sin(now / 1000 * 0.11) * cam.drift));
    const elev = rad(cam.elev + lift * cam.lift - pointer.y * cam.tilt.pitch);
    const dist = cam.dist + lift * cam.liftDist;
    const aside = innerWidth > 820 ? (layout === 'cards' ? cam.aside : cam.asideText) : 0;
    const ax = tx + Math.cos(yaw) * aside * dist, az = tz - Math.sin(yaw) * aside * dist;
    scene.setView([ax + Math.sin(yaw) * Math.cos(elev) * dist, ty + Math.sin(elev) * dist, az + Math.cos(yaw) * Math.cos(elev) * dist], [ax, ty, az], 0);

    const ease = easeFn();
    trails.forEach(t => {
      if (t.state === 'waiting' && now >= t.startAt) { t.state = 'playing'; t.t0 = now; }
      if (t.state === 'playing') {
        const k = REDUCED ? 1 : clamp01((now - t.t0) / 1000 / Math.max(0.05, C.path.duration));
        t.p = ease(k); if (k >= 1) { t.state = 'done'; t.p = 1; }
      }
      t.alpha += (t.alphaT - t.alpha) * Math.min(1, dt * 4);
      for (const [m, a] of [[t.line, t.alpha], [t.shadow, t.alpha * C.path.shadow.opacity]]) {
        m.material.uniforms.uProgress.value = t.p; m.material.uniforms.uAlpha.value = a;
      }
    });
  }
  requestAnimationFrame(tick);

  /** The country round the summits, live — writes C.fill / C.terrain and
      rebuilds the ground, its contours and the trails that sit on it. */
  function setTerrain(o) {
    ['count', 'height', 'spacing', 'seed', 'ridges', 'relief'].forEach(k => { if (o[k] != null) C.fill[k] = o[k]; });
    C.terrain = Object.assign(C.terrain || {}, o.levels != null ? { levels: o.levels } : {}, o.width != null ? { width: o.width } : {});
    scene.setTerrain(o);
    scene.clientTops().forEach((t, i) => Object.assign(tops[i], t));
    rebuild();
  }
  return { scene, trails, CONFIG: C, rebuild, goTo, setTerrain,
    replay() { trails.forEach(t => { t.state = 'idle'; t.p = 0; }); },
    get focus() { return focus; } };
}
