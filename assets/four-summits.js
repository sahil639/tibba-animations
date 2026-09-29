/* ══════════════════════════════════════════════════════════════════════════
   Our Summits — the four summits, one at a time
   ─────────────────────────────────────────────────────────────────────────
   The final website's Our Summits section on a page of its own, in the
   hero's language: the range drawn in the Active Peak palette on black, the
   orange accent, the studio face.

   ── the walk ──────────────────────────────────────────────────────────────
   One mountain is in focus at a time, centred in the viewport. Scrolling
   through #scope moves the camera from summit to summit — 1 → 2 → 3 → 4 —
   and each summit, the first time it becomes the active one, draws its
   trail from the trailhead up to the orange square on its top. The draw is
   STATEFUL: idle → waiting → playing → done. Once a trail is done it stays
   drawn, so scrolling back and forth (or a trackpad's small jitters across a
   threshold) never restarts it. The thresholds carry hysteresis for the
   same reason.

   ── the cards ─────────────────────────────────────────────────────────────
   One card per summit, anchored to the focused mountain's projected centre
   and offset into the empty space beside it — right of the peak by default.
   Only the active card is shown; it fades and slides in after the camera
   has started moving, and the outgoing card fades out faster than the new
   one comes in so the two never read as a stack.

   ── controls ──────────────────────────────────────────────────────────────
   Every value above lives in SUMMITS_CONFIG, below. The page's panel writes
   into the same object, so a value found on the panel can be pasted back
   here as the new default.
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

/* ══════════════════════════════════════════════════════════════════════════
   SUMMITS_CONFIG — every tunable of the section
   ═════════════════════════════════════════════════════════════════════════ */
export const EASES = {
  'In-out (cubic)': [0.65, 0, 0.35, 1],
  'In-out (sine)':  [0.37, 0, 0.63, 1],
  'Out (expo)':     [0.16, 1, 0.3, 1],
  'In (quad)':      [0.55, 0, 1, 0.45],
  'Linear':         [0, 0, 1, 1],
};

export const SUMMITS_CONFIG = {
  /* When a summit becomes the active one. Values are progress through the
     section's scroll (0 = section top reaches viewport top, 1 = end of its
     travel). thresholds[i] is where summit i takes over. */
  scroll: {
    thresholds: [0, 0.24, 0.49, 0.74],
    hysteresis: 0.025,   // must pass a threshold by this much to switch — kills jitter
    height: 520,         // #scope height, in vh — more = slower walk per summit
  },

  /* The camera's station on each summit. It looks at the summit from the
     south-east, at elev°, from dist units away (scaled by the summit's
     spread so a broad mountain and a narrow one fill the frame alike). */
  camera: {
    duration: 1.6,            // seconds for the flight between two summits
    ease: 'power3.inOut',     // any GSAP ease: 'power2.inOut', 'expo.out', 'sine.inOut' …
    elev: 24,                 // degrees above the horizon
    azim: -22,                // degrees round from due south
    dist: 128,                // base distance, world units
    scaleBySpread: true,      // dist × (this summit's spread / the average)
    aimY: 0.42,               // aim this far up the summit (0 = foot, 1 = top)
    shiftX: 0,                // nudge the mountain off-centre, world units along the camera's right
    narrowDist: 1.45,         // distance multiplier under 820px wide
  },

  /* The trail draw. `defaults` applies to every summit; `perSummit[i]`
     overrides any of its keys for summit i. */
  path: {
    defaults: {
      duration: 3.0,          // seconds, trailhead → summit
      ease: 'In-out (cubic)', // a key of EASES
      delay: 0.25,            // seconds after the start point below
    },
    perSummit: [
      { duration: 3.0 },
      { duration: 3.2 },
      { duration: 2.8 },
      { duration: 3.4, ease: 'In-out (sine)' },
    ],
    afterCamera: 0.55,        // start once this fraction of the camera flight has run (0 = at once)
    width: 2.2,               // CSS px
    dim: 0.3,                 // opacity of trails that are drawn but not in focus
    curve: 1,                 // how far the Bézier handles bend the route
  },

  /* The case card beside the focused summit. Offsets are from the summit's
     projected centre, as fractions of the viewport (x of width, y of height).
     The card starts from the mountain's projected flank (its spread, times
     `clearance`), so a broad summit pushes it further out than a narrow one.
     side 'right' puts the card's left edge at flank + offsetX; 'left' puts
     its right edge at flank − offsetX. perSummit[i] overrides for one summit. */
  cards: {
    side: 'right',
    clearance: 0.8,           // × the summit's projected half-width
    offsetX: 0.02,
    offsetY: -0.02,
    perSummit: [{}, {}, {}, {}],   // e.g. { side: 'left', offsetX: .16, offsetY: .04 }
    width: 380,               // px
    fadeIn: 0.7,              // seconds
    fadeOut: 0.3,             // seconds
    delay: 0.35,              // seconds after the summit becomes active
    slide: 28,                // px the card travels as it enters
    ease: 'cubic-bezier(.16,.62,.36,1)',
    margin: 24,               // px the card is kept inside the viewport by
  },
};

export function mountFourSummits() {
  const C = SUMMITS_CONFIG;
  const stage = $('#stage');
  const scope = $('#scope');
  scope.style.height = C.scroll.height + 'vh';

  const scene = createRangeScene({ canvas: $('#peak-canvas'), mode: 'range', palette: 'peak', hover: true, noStudio: true });
  scene.setAccent(ACCENT);
  scene.setDepth(0.1);
  document.documentElement.style.setProperty('--accent', ACCENT);

  const tops = scene.clientTops();
  const avgSpread = tops.reduce((a, t) => a + t.spread, 0) / N;

  /* ── the station on one summit ────────────────────────────────────────
     The camera's target is a point partway up the summit, so that point —
     and with it the mountain — sits in the middle of the frame. */
  const aimOf = i => {
    const t = tops[i], a = C.camera.azim * Math.PI / 180;
    const sh = innerWidth <= 820 ? 0 : C.camera.shiftX;
    return [t.x + Math.cos(a) * sh, t.y * C.camera.aimY, t.z - Math.sin(a) * sh];
  };
  function station(i, dur = C.camera.duration) {
    const cam = C.camera, t = tops[i];
    const e = cam.elev * Math.PI / 180, a = cam.azim * Math.PI / 180;
    const d = cam.dist * (cam.scaleBySpread ? t.spread / avgSpread : 1) * (innerWidth <= 820 ? cam.narrowDist : 1);
    const [tx, ty, tz] = aimOf(i);
    scene.setView([tx + Math.sin(a) * Math.cos(e) * d, ty + Math.sin(e) * d, tz + Math.cos(a) * Math.cos(e) * d],
                  [tx, ty, tz], dur, cam.ease);
  }

  /* ── the trails ─────────────────────────────────────────────────────── */
  const pathOf = i => ({ ...C.path.defaults, ...(C.path.perSummit[i] || {}) });
  const easeCache = {};
  const easeFn = name => easeCache[name] || (easeCache[name] = cubicBezier(...(EASES[name] || EASES['In-out (cubic)'])));

  function bezierPoints(top, i) {
    const R = top.spread, side = i % 2 ? -1 : 1, k = C.path.curve;
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
        uHalfRes: { value: new THREE.Vector2(1, 1) }, uWidth: { value: C.path.width },
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
    const t = { i, top, mesh, mat, pts: null, p: 0, alpha: 1, alphaT: 1,
      state: 'idle', startAt: 0, t0: 0 };   // idle → waiting → playing → done
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

  const trails = tops.map((top, i) => buildTrail(top, i));

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

  /* ── the cards ──────────────────────────────────────────────────────── */
  const casesEl = $('#cases');
  casesEl.innerHTML = CASES.map((c, i) => `
    <article class="card" data-i="${i}" style="--c:${c.colour}">
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
  /* card timing lives in CSS variables, so a transition picks it up live */
  function applyCardVars() {
    const k = C.cards, st = document.documentElement.style;
    st.setProperty('--fs-card-w', k.width + 'px');
    st.setProperty('--fs-in', k.fadeIn + 's');
    st.setProperty('--fs-out', k.fadeOut + 's');
    st.setProperty('--fs-delay', k.delay + 's');
    st.setProperty('--fs-slide', k.slide + 'px');
    st.setProperty('--fs-ease', k.ease);
  }
  applyCardVars();
  const cardOf = i => ({ side: C.cards.side, offsetX: C.cards.offsetX, offsetY: C.cards.offsetY, ...(C.cards.perSummit[i] || {}) });
  /* each card rides its own summit's projected centre, so it travels with
     the mountain during the flight rather than sitting still over it */
  function placeCard(i, cam) {
    const el = cards[i], s = project(_h.set(...aimOf(i)), cam);
    if (!s) return;
    const r = scene.canvas.getBoundingClientRect(), W = r.width, H = r.height, m = C.cards.margin;
    if (innerWidth <= 820) { el.dataset.side = 'bottom'; return; }
    /* the flank: how far the summit's spread reaches across the screen */
    const t = tops[i], a = C.camera.azim * Math.PI / 180;
    const f = project(_h.set(t.x + Math.cos(a) * t.spread, t.y * C.camera.aimY, t.z - Math.sin(a) * t.spread), cam);
    const flank = f ? Math.abs(f[0] - s[0]) * C.cards.clearance : 0;
    const o = cardOf(i), w = el.offsetWidth, h = el.offsetHeight;
    let x = o.side === 'left' ? s[0] - flank - o.offsetX * W - w : s[0] + flank + o.offsetX * W;
    let y = s[1] + o.offsetY * H - h / 2;
    x = Math.max(m, Math.min(W - w - m, x));
    y = Math.max(m + 60, Math.min(H - h - m, y));
    el.dataset.side = o.side;
    el.style.left = x.toFixed(1) + 'px'; el.style.top = y.toFixed(1) + 'px';
  }

  trails[0].mesh.onBeforeRender = (renderer, _s, cam) => {
    const hr = renderer.getDrawingBufferSize(new THREE.Vector2()).multiplyScalar(0.5);
    trails.forEach((t, i) => {
      t.mat.uniforms.uHalfRes.value.copy(hr);
      t.mat.uniforms.uWidth.value = C.path.width * renderer.getPixelRatio();
      place(peakEls[i], project(_h.set(t.top.x, t.top.y + 0.7, t.top.z), cam));
      peakEls[i].classList.toggle('arrived', t.p >= 0.999);
      place(headEls[i], t.p > 0.001 && t.p < 0.999 ? project(pointAt(t, t.p, _h), cam) : null);
    });
    /* only the cards that can be seen need placing */
    cards.forEach((c, i) => { if (i === active || c.classList.contains('leaving')) placeCard(i, cam); });
  };

  /* ── the path state machine ─────────────────────────────────────────
       idle     never been the active summit (or left before it started)
       waiting  active; queued to start at startAt
       playing  drawing; runs to the end even if the user scrolls away
       done     drawn, and stays drawn — never replays on its own        */
  function queueTrail(i) {
    const t = trails[i];
    if (t.state !== 'idle') return;
    t.state = 'waiting';
    t.startAt = performance.now() + (C.camera.duration * C.path.afterCamera + pathOf(i).delay) * 1000;
  }

  /* ── the scroll: which summit is active ───────────────────────────── */
  let active = -1;
  const counter = $('#fs-count');
  function progress() {
    const travel = scope.offsetHeight - innerHeight;
    return travel > 0 ? clamp01(-scope.getBoundingClientRect().top / travel) : 0;
  }
  /* the summit a progress value belongs to, with hysteresis: moving on
     needs thresholds[i] + h, moving back needs thresholds[i] - h, so a
     scroll resting on a boundary cannot flip between two summits */
  function indexFor(p) {
    const th = C.scroll.thresholds, h = C.scroll.hysteresis;
    let idx = 0;
    for (let i = 1; i < N; i++) {
      const edge = th[i] + (active >= i ? -h : h);
      if (p >= edge) idx = i;
    }
    return idx;
  }
  function setActive(idx, dur) {
    const prev = active;
    active = idx;
    cards.forEach((c, k) => {
      const was = k === prev && prev !== idx;
      c.classList.toggle('active', k === idx);
      c.classList.toggle('live', k === idx);
      c.classList.toggle('leaving', was);
      c.dataset.dir = k === idx ? (prev > idx ? 'back' : 'fwd') : (k < idx ? 'back' : 'fwd');
      if (was) setTimeout(() => c.classList.remove('leaving'), C.cards.fadeOut * 1000 + 50);
    });
    scene.light(idx);
    peakEls.forEach((e, k) => e.classList.toggle('on', k === idx));
    trails.forEach((tr, k) => {
      tr.alphaT = k === idx ? 1 : C.path.dim;
      /* left before it began: put it back, so it plays when next in focus */
      if (k !== idx && tr.state === 'waiting') tr.state = 'idle';
    });
    queueTrail(idx);
    station(idx, dur);
    if (counter) counter.innerHTML = `<b>${pad(idx)}</b>&thinsp;/&thinsp;${pad(N - 1)}`;
  }
  function onScroll() {
    const idx = indexFor(progress());
    if (idx !== active) setActive(idx, active < 0 ? 0 : C.camera.duration);
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { if (active >= 0) station(active, 0); });
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  onScroll();

  let last = performance.now();
  function tick(now) {
    requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    trails.forEach((tr, i) => {
      if (tr.state === 'waiting' && now >= tr.startAt) { tr.state = 'playing'; tr.t0 = now; }
      if (tr.state === 'playing') {
        const P = pathOf(i);
        const k = REDUCED ? 1 : clamp01((now - tr.t0) / 1000 / Math.max(0.05, P.duration));
        tr.p = easeFn(P.ease)(k);
        if (k >= 1) { tr.state = 'done'; tr.p = 1; }
      }
      tr.mat.uniforms.uProgress.value = tr.p;
      tr.alpha += (tr.alphaT - tr.alpha) * Math.min(1, dt * 4);
      tr.mat.uniforms.uAlpha.value = tr.alpha;
    });
  }
  requestAnimationFrame(tick);

  return {
    scene, trails, CONFIG: C, EASES,
    /** Wipe every trail back to idle and play the focused one again. */
    replay() { trails.forEach(t => { t.state = 'idle'; t.p = 0; }); if (active >= 0) queueTrail(active); },
    setCurve(v) { C.path.curve = v; trails.forEach(rebuildTrail); },
    /** Re-seat the camera on the active summit — call after changing C.camera. */
    reframe(dur = 0) { if (active >= 0) station(active, dur); },
    applyCardVars,
    /** Re-read C.scroll after a change (height, thresholds). */
    rescroll() { scope.style.height = C.scroll.height + 'vh'; onScroll(); },
    get active() { return active; },
  };
}
