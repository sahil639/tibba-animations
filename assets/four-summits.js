/* ══════════════════════════════════════════════════════════════════════════
   Our Summits — the four summits, as one scene
   ─────────────────────────────────────────────────────────────────────────
   The final website's Our Summits section on a page of its own, redone in
   the hero's language: the range drawn in the Active Peak palette on black,
   the orange accent, the studio face. Not the hero's layout — no plan view,
   no aside — just the four client summits held in one wide frame, centred
   to the right, with the case cards in the bottom-left corner.

   ── each summit ───────────────────────────────────────────────────────────
   One orange square on the true top, and a trail up to it: a single cubic
   Bézier from a trailhead on the lower slope to the summit, laid out in plan
   and then draped on the terrain (scene.heightAt), drawn as a screen-space
   ribbon in that client's own colour. The draw is a timed tween whose
   duration, easing, speed and stagger all live on the panel.

   ── the cards ─────────────────────────────────────────────────────────────
   Range – L2's behaviour: four containers, each entering its own way — wipe,
   fold, focus, draw — scrubbed by its scroll band, the active one opening
   its body. Stacked bottom-left, first at the foot. The active case lights
   its summit, brightens its trail and leans the camera a few units its way.
   ═════════════════════════════════════════════════════════════════════════ */
import * as THREE from 'three';
import { createRangeScene } from './range-scene.js';
import { cubicBezier } from './peak-trail.js';

const $ = s => document.querySelector(s);
const clamp01 = t => t < 0 ? 0 : t > 1 ? 1 : t;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const ACCENT = '#FF4B1F';

export const CASES = [
  { name: 'Groww', colour: '#4DD9C0', file: 'case-groww.html', years: '2024 — Present',
    tags: ['Mobile app', 'Website', 'Fintech', 'Growth'],
    title: 'How we helped Groww <span class="hi">boost engagement</span> on their app',
    body: 'A deep engagement with Groww to design and improve features that engage users on their consumer app, along with design support for other product initiatives.' },
  { name: 'Firstpost', colour: '#E05555', file: 'case-firstpost.html', years: '2023',
    tags: ['App design', 'News & media', 'Website'],
    title: 'How we helped Firstpost <span class="hi">2× their traffic</span> through a strategic redesign',
    body: "A design overhaul of Firstpost's website and the creation of their first mobile app, with a significant pivot for their business and content strategy." },
  { name: 'Breathe ESG', colour: '#4CAF70', file: 'case-breathe-esg.html', years: '2023',
    tags: ['Dashboard', 'SaaS', 'ESG', 'Design sprints'],
    title: 'How we helped Breathe ESG <span class="hi">accelerate sales</span> and streamline releases',
    body: "An MVP to v1 redesign of Breathe ESG's SaaS platform, to make it easier for companies to track their ESG metrics and regulatory compliance." },
  { name: 'Shyft & Mindhouse', colour: '#7B8FF5', file: 'case-shyft-mindhouse.html', years: '2023',
    tags: ['Mobile app', 'Website', 'Fitness', 'Mental health'],
    title: 'How we helped Shyft &amp; Mindhouse <span class="hi">grow their business</span> and supercharge PLG',
    body: 'Conceptualising and designing a therapy experience, alongside redesigning their websites and apps to impact revenue.' },
];
const N = CASES.length;
const pad = i => String(i + 1).padStart(2, '0');

/* ── the timing, all of it on the panel ───────────────────────────────── */
export const EASES = {
  'In-out (cubic)': [0.65, 0, 0.35, 1],
  'In-out (sine)':  [0.37, 0, 0.63, 1],
  'Out (expo)':     [0.16, 1, 0.3, 1],
  'In (quad)':      [0.55, 0, 1, 0.45],
  'Linear':         [0, 0, 1, 1],
};
export const T = {
  duration: 3.2,        // seconds for one trail, foot to summit, at speed 1
  speed: 1,             // multiplier on every trail's pace
  delay: 0.45,          // seconds between one trail starting and the next
  start: 0.4,           // seconds before the first starts
  ease: 'In-out (cubic)',
  curve: 1,             // how far the Bézier handles bend the route
  loop: false,          // redraw forever
  hold: 2.4,            // seconds each set stays drawn before a loop redraws it
  width: 2.2,           // CSS px
  dim: 0.35,            // how far inactive trails drop back
};

export function mountFourSummits() {
  const stage = $('#stage');
  const scene = createRangeScene({ canvas: $('#peak-canvas'), mode: 'range', palette: 'peak', hover: true, noStudio: true });
  scene.setAccent(ACCENT);
  scene.setDepth(0.1);
  document.documentElement.style.setProperty('--accent', ACCENT);

  const tops = scene.clientTops();

  /* ── the wide station ───────────────────────────────────────────────
     Looking north over all four, the aim point pulled LEFT of the range's
     middle so the range itself sits centred-to-right of the frame. */
  const cx = tops.reduce((a, t) => a + t.x, 0) / N, cz = tops.reduce((a, t) => a + t.z, 0) / N;
  const VIEW = { elev: 24, azim: -30, dist: 272, shiftX: -40, y: 12, lean: 3 };
  let lean = 0;
  function station(dur) {
    const narrow = innerWidth <= 820;
    /* turned a little off the range's own line, so the four recede on a
       diagonal instead of standing in a row too wide for the frame; the
       offset is along the camera's right, which is what slides the range
       to the right of the frame without turning it */
    const e = VIEW.elev * Math.PI / 180, a = VIEW.azim * Math.PI / 180, d = VIEW.dist * (narrow ? 1.5 : 1);
    const sh = (narrow ? 0 : VIEW.shiftX) + lean;
    const tx = cx + Math.cos(a) * sh, tz = cz - Math.sin(a) * sh;
    scene.setView([tx + Math.sin(a) * Math.cos(e) * d, VIEW.y + Math.sin(e) * d, tz + Math.cos(a) * Math.cos(e) * d], [tx, VIEW.y, tz], dur);
  }
  station(0);
  addEventListener('resize', () => station(0));

  /* ── the trails ─────────────────────────────────────────────────────── */
  const trails = tops.map((top, i) => buildTrail(top, i));
  function bezierPoints(top, i) {
    const R = top.spread, side = i % 2 ? -1 : 1, k = T.curve;
    /* trailhead on the near, lower slope; handles bend the line across the
       face and back so it climbs the way a path would, not straight up */
    const P0 = [top.x + side * 0.55 * R, top.z + 1.3 * R];
    const P1 = [P0[0] - side * 1.05 * R * k, P0[1] - 0.35 * R];
    const P2 = [top.x + side * 0.85 * R * k, top.z + 0.55 * R];
    const P3 = [top.x, top.z];
    const pts = [];
    for (let s = 0; s <= 1.0001; s += 1 / 220) {
      const u = 1 - s;
      const x = u * u * u * P0[0] + 3 * u * u * s * P1[0] + 3 * u * s * s * P2[0] + s * s * s * P3[0];
      const z = u * u * u * P0[1] + 3 * u * u * s * P1[1] + 3 * u * s * s * P2[1] + s * s * s * P3[1];
      pts.push(new THREE.Vector3(x, scene.heightAt(x, z) + 0.7, z));
    }
    pts[pts.length - 1].y = top.y + 0.7;
    return pts;
  }

  function buildTrail(top, i) {
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, depthTest: true, side: THREE.DoubleSide,
      uniforms: {
        uHalfRes: { value: new THREE.Vector2(1, 1) }, uWidth: { value: T.width },
        uProgress: { value: 0 }, uAlpha: { value: 1 },
        uColor: { value: new THREE.Color(CASES[i].colour) },
      },
      vertexShader: `
        attribute vec3 aPrev, aNext; attribute float aSide, aArc;
        uniform vec2 uHalfRes; uniform float uWidth; varying float vArc;
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
          c.xy += (mi * aSide * uWidth * 0.5 * k) / uHalfRes * c.w;
          vArc = aArc; gl_Position = c;
        }`,
      fragmentShader: `
        precision highp float;
        uniform float uProgress, uAlpha; uniform vec3 uColor; varying float vArc;
        void main(){
          float on = 1.0 - smoothstep(uProgress - 0.004, uProgress + 0.002, vArc);
          if (on < 0.01) discard;
          float head = smoothstep(uProgress - 0.06, uProgress, vArc) * step(0.0005, uProgress) * step(uProgress, 0.9995);
          vec3 c = mix(uColor, vec3(1.0), head * 0.5);
          gl_FragColor = vec4(c, on * uAlpha);
          #include <colorspace_fragment>
        }`,
    });
    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = 6;
    scene.group.add(mesh);
    const t = { i, top, mesh, mat, pts: null, p: 0, alpha: 1, alphaT: 1 };
    rebuildTrail(t);
    return t;
  }

  function rebuildTrail(t) {
    const pts = bezierPoints(t.top, t.i);
    t.pts = pts;
    const n = pts.length, cum = [0];
    for (let k = 1; k < n; k++) cum[k] = cum[k - 1] + pts[k].distanceTo(pts[k - 1]);
    const tot = cum[n - 1] || 1;
    const pos = [], prev = [], next = [], side = [], arc = [], idx = [];
    for (let k = 0; k < n; k++) {
      const a = pts[k], b = pts[Math.max(0, k - 1)], c = pts[Math.min(n - 1, k + 1)];
      for (const sd of [-1, 1]) {
        pos.push(a.x, a.y, a.z); prev.push(b.x, b.y, b.z); next.push(c.x, c.y, c.z);
        side.push(sd); arc.push(cum[k] / tot);
      }
      if (k < n - 1) { const q = k * 2; idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aPrev', new THREE.Float32BufferAttribute(prev, 3));
    g.setAttribute('aNext', new THREE.Float32BufferAttribute(next, 3));
    g.setAttribute('aSide', new THREE.Float32BufferAttribute(side, 1));
    g.setAttribute('aArc', new THREE.Float32BufferAttribute(arc, 1));
    g.setIndex(idx);
    t.mesh.geometry.dispose();
    t.mesh.geometry = g;
    t.cum = cum; t.tot = tot;
  }
  const pointAt = (t, f, out) => {
    const d = clamp01(f) * t.tot, c = t.cum;
    let k = 1; while (k < c.length - 1 && c[k] < d) k++;
    const a = t.pts[k - 1], b = t.pts[k], u = (d - c[k - 1]) / Math.max(1e-6, c[k] - c[k - 1]);
    return out.lerpVectors(a, b, u);
  };

  /* ── the orange squares, and the walkers ────────────────────────────── */
  const layer = document.createElement('div');
  layer.className = 'fs-layer';
  layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML = CASES.map((c, i) => `
    <span class="fs-peak" data-i="${i}" style="--c:${c.colour}"><i></i><em>${c.name}</em></span>
    <span class="fs-head" data-i="${i}" style="--c:${c.colour}"></span>`).join('');
  stage.appendChild(layer);
  const peakEls = [...layer.querySelectorAll('.fs-peak')], headEls = [...layer.querySelectorAll('.fs-head')];
  const _w = new THREE.Vector3(), _h = new THREE.Vector3();
  const project = (v, cam) => {
    _w.copy(v); scene.group.localToWorld(_w); _w.project(cam);
    if (_w.z >= 1) return null;
    const r = scene.canvas.getBoundingClientRect();
    return [(_w.x * 0.5 + 0.5) * r.width, (-_w.y * 0.5 + 0.5) * r.height];
  };
  const place = (el, s) => {
    if (!s) { el.style.visibility = 'hidden'; return; }
    el.style.visibility = ''; el.style.transform = `translate3d(${s[0].toFixed(1)}px, ${s[1].toFixed(1)}px, 0)`;
  };
  trails[0].mesh.onBeforeRender = (renderer, _s, cam) => {
    const hr = renderer.getDrawingBufferSize(new THREE.Vector2()).multiplyScalar(0.5);
    trails.forEach((t, i) => {
      t.mat.uniforms.uHalfRes.value.copy(hr);
      t.mat.uniforms.uWidth.value = T.width * renderer.getPixelRatio();
      place(peakEls[i], project(_h.set(t.top.x, t.top.y + 0.7, t.top.z), cam));
      peakEls[i].classList.toggle('arrived', t.p >= 0.999);
      place(headEls[i], t.p > 0.001 && t.p < 0.999 ? project(pointAt(t, t.p, _h), cam) : null);
    });
  };

  /* ── the draw ───────────────────────────────────────────────────────── */
  let ease = cubicBezier(...EASES[T.ease]);
  let t0 = performance.now();
  function replay() { t0 = performance.now(); trails.forEach(t => { t.p = 0; }); }
  function setEase(name) { T.ease = name; ease = cubicBezier(...EASES[name]); }

  /* ── the cards (Range – L2's) ──────────────────────────────────────── */
  const FX = ['wipe', 'fold', 'focus', 'draw'];
  const casesEl = $('#cases');
  casesEl.innerHTML = CASES.map((c, i) => `
    <article class="card" data-i="${i}" data-fx="${FX[i]}" style="--c:${c.colour}">
      <svg class="frame" preserveAspectRatio="none" aria-hidden="true"><rect x=".5" y=".5" pathLength="1"/></svg>
      <div class="in">
        <span class="k l1"><b>${pad(i)} / ${pad(N - 1)}</b><em>${c.name} · ${c.years}</em></span>
        <h3 class="t l2">${c.title}</h3>
        <p class="tags l3">${c.tags.map(x => `<span>${x}</span>`).join('')}</p>
        <div class="more"><div><p class="body">${c.body}</p>
          <a class="go" href="${c.file}"><span>View project</span><i></i></a></div></div>
      </div>
      <span class="pin" aria-hidden="true"></span>
    </article>`).join('');
  const cards = [...casesEl.querySelectorAll('.card')];
  const prog = new Array(N).fill(0), shown = new Array(N).fill(0);
  let active = -1;
  const scope = $('#scope');
  const counter = $('#fs-count');

  function onScroll() {
    const travel = scope.offsetHeight - innerHeight;
    const t = travel > 0 ? clamp01(-scope.getBoundingClientRect().top / travel) : 0;
    /* the first card is already in when the page opens: the scene should
       never be empty of copy */
    const bandT = 0.46 + t * (N - 0.46);
    for (let i = 0; i < N; i++) prog[i] = clamp01((bandT - i) / 0.45);
    const idx = Math.min(N - 1, Math.floor(bandT));
    if (idx !== active) {
      active = idx;
      cards.forEach((c, k) => { c.classList.toggle('active', k === idx); c.classList.toggle('past', k < idx); });
      scene.light(idx);
      trails.forEach((tr, k) => { tr.alphaT = k === idx ? 1 : T.dim; });
      peakEls.forEach((e, k) => e.classList.toggle('on', k === idx));
      lean = (tops[idx].x - cx) / 226 * VIEW.lean;
      station(1.6);
      if (counter) counter.innerHTML = `<b>${pad(idx)}</b>&thinsp;/&thinsp;${pad(N - 1)}`;
    }
  }
  addEventListener('scroll', onScroll, { passive: true });
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  onScroll();

  let last = performance.now();
  function tick(now) {
    requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    /* trails: each on its own delayed clock */
    const el = (now - t0) / 1000;
    const dur = T.duration / Math.max(0.05, T.speed);
    const setLen = T.start + T.delay * (N - 1) + dur;
    const local = T.loop ? el % (setLen + T.hold) : el;
    trails.forEach((tr, i) => {
      const k = REDUCED ? 1 : clamp01((local - T.start - i * T.delay) / dur);
      tr.p = ease(k);
      tr.mat.uniforms.uProgress.value = tr.p;
      tr.alpha += (tr.alphaT - tr.alpha) * Math.min(1, dt * 4);
      tr.mat.uniforms.uAlpha.value = tr.alpha;
    });
    /* cards, chased so a wheel notch never jumps them */
    const f = REDUCED ? 1 : Math.min(1, dt * 7);
    cards.forEach((c, i) => {
      shown[i] += (prog[i] - shown[i]) * f;
      c.style.setProperty('--p', shown[i].toFixed(4));
      c.classList.toggle('live', shown[i] > 0.002);
    });
  }
  requestAnimationFrame(tick);

  return {
    scene, trails, T, VIEW, EASES, replay, setEase,
    setCurve(v) { T.curve = v; trails.forEach(rebuildTrail); },
    station,
  };
}
