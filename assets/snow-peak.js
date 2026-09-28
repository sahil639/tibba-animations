/* ══════════════════════════════════════════════════════════════════════════
   Snow Peak — the footer's massif, rebuilt to the reference
   ─────────────────────────────────────────────────────────────────────────
   The reference is a granite massif in cloud: one blocky pyramid summit, a
   crowd of needle spires (aiguilles) standing in front of it, snow caught on
   ledges and in cracks rather than lying as a cap, warm light on the faces
   turned to the sun, cold shadow on the rest, and banks of cloud wrapping
   the base and drifting between the spires. This file is that, in five
   layers:

     land     A pyramid with four arêtes, carved by couloirs that run down
              from the summit (ridged noise sampled in polar coordinates
              around the top, so the gullies are radial the way erosion
              makes them), plus two dozen needle spires joined on with a
              smooth max so each one grows out of the rock instead of
              being stuck to it.
     snow     The settled-snow mask from the four-seasons skill — altitude
              says where snow is possible, a softened upward normal says
              where it actually sits — plus a cavity term, so it gathers in
              cracks and leaves the arêtes bare. That is what makes the
              reference read as dusted granite rather than an iced cake.
     light    One sun, warm and low from the right, shared by the sky, the
              rock and the clouds. A cavity-based occlusion darkens the
              cracks and brightens the edges, which is most of the chiselled
              look.
     cloud    Five layers of fbm cloud on planes at different depths —
              behind the massif, among the spires, and a thick bank in the
              foreground — lit from the same sun, so they self-shade on the
              side away from it. Depth-tested against the land, so a spire
              can stand in front of one bank and behind the next.
     sky      A direction shader: zenith, a middle band and the horizon, the
              sun's halo and disk, and a thin veil of cirrus.

   ── the load-in ───────────────────────────────────────────────────────────
   playIntro() is one timeline with four things on it, so the mountain is
   revealed in layers rather than faded up:

     rise     the camera starts low, inside the cloud, and climbs out of it
              to its station on a slow ease-in-out
     part     each cloud layer starts lifted over the mountain and sinks to
              its bank, the nearer layers later and further, which is the
              parallax
     light    first light: the sun reaches the summit first and runs down
              the faces — a lit line with a band of alpenglow on it,
              descending from the top to the foot
     air      exposure and haze come up from dawn to day

   One tone map and one colour-space conversion, at the end of every
   fragment shader, once.
   ═════════════════════════════════════════════════════════════════════════ */
import * as THREE from 'three';

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function createSnowPeak(opts) {
  const canvas = opts.canvas;
  const vpW = () => canvas.clientWidth || innerWidth;
  const vpH = () => canvas.clientHeight || innerHeight;

  /* ── the dials ───────────────────────────────────────────────────────── */
  const P = {
    sunAzim: 66, sunElev: 19,      // degrees; warm, low, from the right
    snowLine: 0.26,                // where snow can start, as a fraction of height
    snowBlend: 0.14,
    snowSlope: 0.5,                // how flat a face must be to hold snow
    snowSmooth: 2,                 // cells of blur on the normal the snow mask reads
    exposure: 1.0,
    haze: 0.55,
    relief: 1.0,
    ridged: 0.78,                  // how sharp the couloirs are
    clouds: 1.0,                   // overall cloud density
    seed: 7,
  };

  /* ── renderer ────────────────────────────────────────────────────────── */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(1.75, devicePixelRatio || 1));
  renderer.setSize(vpW(), vpH(), false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = P.exposure;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, vpW() / vpH(), 1, 5000);

  /* The station. The page scrolls the camera a little on top of this (the
     parallax) and the intro starts it low and brings it up to here. */
  const CAM = { azim: 0, elev: 9, dist: 560, tgtY: 118 };
  const live = { azim: 0, elev: CAM.elev, dist: CAM.dist, tgtY: CAM.tgtY };
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  let scrollP = 0.5;
  function placeCamera() {
    const az = (live.azim + pointer.sx * 3.2) * Math.PI / 180;
    const el = (live.elev - pointer.sy * 1.2) * Math.PI / 180;
    const ty = live.tgtY + (scrollP - 0.5) * 16;
    const out = live.dist * Math.cos(el), up = live.dist * Math.sin(el);
    camera.position.set(Math.sin(az) * out, ty + up, Math.cos(az) * out - 30);
    camera.lookAt(0, ty, -30);
  }

  const sun = new THREE.Vector3();
  function placeSun() {
    const e = P.sunElev * Math.PI / 180, a = P.sunAzim * Math.PI / 180;
    sun.set(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e)).normalize();
  }
  placeSun();

  const lin = hex => new THREE.Color(hex).convertSRGBToLinear();
  const OUT = `
    #include <tonemapping_fragment>
    #include <colorspace_fragment>`;

  /* shared GLSL noise */
  const NOISE = `
    float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
    float vnoise(vec2 p){
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(h21(i), h21(i + vec2(1,0)), u.x), mix(h21(i + vec2(0,1)), h21(i + vec2(1,1)), u.x), u.y);
    }
    float fbm5(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ v += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; } return v; }`;

  /* ══════════════════════════════════════════════════════════════════════
     THE SKY
     ══════════════════════════════════════════════════════════════════════ */
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, depthTest: false,
    uniforms: {
      uSun:     { value: sun },
      uHorizon: { value: lin('#dfe7f0') },
      uMid:     { value: lin('#7d9ccb') },
      uZenith:  { value: lin('#1e3f74') },
      uSunCol:  { value: lin('#fff1dc') },
      uDawn:    { value: 0 },            // 1 = pre-dawn, during the intro
    },
    vertexShader: `
      varying vec3 vDir;
      void main(){
        vDir = (modelMatrix * vec4(position, 1.0)).xyz - cameraPosition;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      varying vec3 vDir;
      uniform vec3 uSun, uHorizon, uMid, uZenith, uSunCol;
      uniform float uDawn;
      ${NOISE}
      void main(){
        vec3 d = normalize(vDir);
        /* Re-based. At the footer's framing the camera looks down on the
           massif, and past the edge of the land the rays that miss it are
           BELOW the true horizon — the sky around the summit sits between
           about -7° and -1°. Read literally that is all haze band. The
           reference's deep blue sits right down on the peaks, so the
           gradient is measured from a horizon placed under the frame. */
        float h = clamp((d.y + 0.24) * 2.6, -1.0, 1.0);
        /* compressed toward the horizon: this camera looks almost level, so
           the frame only ever sees the lowest twenty degrees of sky — the
           blue has to arrive inside them */
        vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.22, h));
        col = mix(col, uZenith, smoothstep(0.18, 0.95, h));
        col = mix(col, uHorizon * 0.9, smoothstep(0.0, -0.2, h));

        /* the sun side of the sky is paler — the reference burns out to
           white on the right */
        float side = max(0.0, dot(normalize(d.xz), normalize(uSun.xz)));
        col = mix(col, uHorizon, pow(side, 3.0) * 0.6 * (1.0 - smoothstep(0.05, 0.5, h)));

        /* a thin veil of cirrus: stretched noise, only in the upper sky */
        vec2 q = d.xz / max(0.04, d.y + 0.27) * 0.28;
        float ci = fbm5(q * vec2(0.8, 2.4) + vec2(4.0, 1.0));
        ci = smoothstep(0.52, 0.95, ci) * smoothstep(0.2, 0.45, h) * (1.0 - smoothstep(0.8, 1.0, h));
        col = mix(col, uSunCol * 0.85, ci * 0.26);

        float c = max(0.0, dot(d, uSun));
        col += uSunCol * pow(c, 6.0) * 0.28;
        col += uSunCol * pow(c, 900.0) * 5.0;

        /* before the light comes: a cold, dim sky */
        col = mix(col, col * vec3(0.32, 0.36, 0.5), uDawn);
        gl_FragColor = vec4(col, 1.0);
        ${OUT}
      }`,
  });
  const sky = new THREE.Mesh(new THREE.BoxGeometry(4000, 4000, 4000), skyMat);
  sky.frustumCulled = false; sky.renderOrder = -10;
  scene.add(sky);

  /* ══════════════════════════════════════════════════════════════════════
     THE LAND
     ══════════════════════════════════════════════════════════════════════ */
  function makeNoise(seed) {
    const p = new Uint8Array(512);
    let s = seed >>> 0 || 1;
    const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    const t = new Uint8Array(256);
    for (let i = 0; i < 256; i++) t[i] = i;
    for (let i = 255; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; const v = t[i]; t[i] = t[j]; t[j] = v; }
    for (let i = 0; i < 512; i++) p[i] = t[i & 255];
    const fade = a => a * a * a * (a * (a * 6 - 15) + 10);
    const lerp = (a, b, k) => a + (b - a) * k;
    const grad = (hv, x, y) => { const h = hv & 3; return (h & 1 ? -x : x) + (h & 2 ? -y : y); };
    return (x, y) => {
      const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
      x -= Math.floor(x); y -= Math.floor(y);
      const u = fade(x), v = fade(y);
      const A = p[X] + Y, B = p[X + 1] + Y;
      return lerp(lerp(grad(p[A], x, y), grad(p[B], x - 1, y), u),
                  lerp(grad(p[A + 1], x, y - 1), grad(p[B + 1], x - 1, y - 1), u), v);
    };
  }
  let noise = makeNoise(P.seed);

  /* The spires. Placed from the seed so "New massif" gives a new crowd:
     most of them in an arc in front of and below the summit, the tallest
     nearest the middle, as in the reference. */
  let SPIRES = [];
  function placeSpires() {
    let s = (P.seed * 9301 + 49297) >>> 0;
    const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    SPIRES = [];
    /* the summit block's own horns */
    SPIRES.push({ x: -4,  z: -52, h: 176, r: 30, k: 1.05 });
    SPIRES.push({ x: -40, z: -40, h: 138, r: 24, k: 1.0 });
    SPIRES.push({ x: 30,  z: -36, h: 132, r: 26, k: 1.0 });
    /* The front towers, strung along the ridge in front of the summit.
       Walked left to right with a little jitter, the tallest in the middle
       and each a fin with a broad foot — the reference's aiguilles are rock
       towers standing on a ridge, not needles on a plain. */
    const n = 15;
    for (let i = 0; i < n; i++) {
      const u = (i / (n - 1)) * 2 - 1;
      const x = u * 128 + (rnd() - 0.5) * 18;
      const z = 18 + (rnd() - 0.5) * 34 - u * u * 26;
      const centre = 1 - Math.min(1, Math.abs(u));
      const h = (58 + centre * 70) * (0.78 + rnd() * 0.34);
      SPIRES.push({ x, z, h, r: 15 + rnd() * 12, k: 0.9 + rnd() * 0.35 });
    }
    /* a few lower, nearer ones, which is what gives the foreground its crowd */
    for (let i = 0; i < 6; i++) {
      const u = rnd() * 2 - 1;
      SPIRES.push({ x: u * 90, z: 48 + rnd() * 20, h: 38 + rnd() * 30, r: 12 + rnd() * 8, k: 1.0 });
    }
    /* the right-hand group, lower, going off into the cloud */
    for (let i = 0; i < 5; i++) {
      SPIRES.push({ x: 150 + rnd() * 70, z: -40 + rnd() * 50, h: 70 + rnd() * 30, r: 18 + rnd() * 10, k: 1.0 });
    }
  }
  placeSpires();

  /* polynomial smooth max — joins a spire onto the rock with a fillet */
  const smax = (a, b, k) => {
    const h = Math.max(k - Math.abs(a - b), 0) / k;
    return Math.max(a, b) + h * h * k * 0.25;
  };
  const ridged = (x, z) => { const n = 1 - Math.abs(noise(x, z)); return n * n; };

  const MAIN = { x: 0, z: -44, h: 150, R: 175, rot: 0.42 };
  function height(x, z) {
    /* ── the pyramid: four faces between four arêtes ─────────────────── */
    const dx = x - MAIN.x, dz = z - MAIN.z;
    const c = Math.cos(MAIN.rot), s = Math.sin(MAIN.rot);
    const u = dx * c - dz * s, v = dx * s + dz * c;
    const dDiamond = (Math.abs(u) + Math.abs(v)) / MAIN.R;
    const dRound = Math.hypot(u, v) / (MAIN.R * 0.82);
    const d = dDiamond * 0.62 + dRound * 0.38;
    let h = MAIN.h * Math.pow(Math.max(0, 1 - d), 1.45);

    /* couloirs: ridged noise in polar coordinates round the summit, so the
       gullies run straight down the fall line */
    const ang = Math.atan2(dz, dx), rad = Math.hypot(dx, dz);
    let coul = 0, amp = 1, norm = 0;
    for (let o = 0; o < 4; o++) {
      const f = 1 << o;
      coul += amp * ridged(Math.cos(ang) * 3.2 * f + 11.3 * o, Math.sin(ang) * 3.2 * f + rad * 0.012 * f);
      norm += amp; amp *= 0.55;
    }
    coul /= norm;
    const flank = Math.min(1, h / MAIN.h);
    h += (coul - 0.45) * 34 * P.ridged * Math.sin(Math.PI * Math.min(1, flank * 1.1));

    /* the ridge the front towers stand on: a long, low rock body across
       the front of the massif, so the towers share a foot */
    const rz = z - (20 - (x / 130) * (x / 130) * 24);
    const ridgeB = 46 * Math.exp(-(rz * rz) / (2 * 26 * 26)) * Math.exp(-Math.pow(x / 175, 4));
    h = smax(h, ridgeB + noise(x * 0.03, z * 0.03) * 8, 14);

    /* the plain the massif stands on, low and rough */
    h = Math.max(h, 6 + noise(x * 0.012, z * 0.012) * 10);

    /* ── the spires ───────────────────────────────────────────────────── */
    for (let i = 0; i < SPIRES.length; i++) {
      const sp = SPIRES[i];
      const ex = x - sp.x, ez = z - sp.z;
      if (Math.abs(ex) > sp.r * 1.5 || Math.abs(ez) > sp.r * 1.5) continue;
      /* each spire is fractured: its footprint wobbles with angle, so it is
         a fin of rock and not a cone */
      const a2 = Math.atan2(ez, ex);
      /* the footprint wobbles at two scales: a slow one that makes the
         tower a fin, and a fast ridged one that flutes it into columns */
      const flute = ridged(Math.cos(a2) * 4.2 + i * 1.7, Math.sin(a2) * 4.2 + i * 0.9);
      const rr = sp.r * (1 + 0.36 * noise(Math.cos(a2) * 1.9 + i * 3.1, Math.sin(a2) * 1.9) + 0.22 * (flute - 0.5));
      const t = Math.max(0, 1 - Math.hypot(ex, ez) / rr);
      if (t <= 0) continue;
      /* a fractured crest rather than a point */
      const crest = 1 - 0.16 * ridged(ex * 0.16 + i, ez * 0.16 - i) * t * t;
      const sh = sp.h * Math.pow(t, sp.k) * crest;
      h = smax(h, sh, 12);
    }

    /* ── fine rock: sharp, small, everywhere above the plain ──────────── */
    let det = 0; amp = 1; norm = 0;
    let f = 0.04;
    for (let o = 0; o < 4; o++) {
      det += amp * ridged(x * f + 3.7, z * f - 8.1); norm += amp; amp *= 0.5; f *= 2.1;
    }
    det /= norm;
    const env = Math.min(1, Math.max(0, (h - 12) / 60));
    h += (det - 0.4) * 15 * env * P.ridged;

    /* ── ledges: the rock is bedded, so the faces step. Each step is a
       near-flat shelf and a short wall, and the shelves are where the
       snow finds somewhere to lie — which is the whole look of the
       reference's dusted granite. The step height wanders, so the bands
       are not contour lines. */
    const stp = 7.5 + noise(x * 0.018 + 5.1, z * 0.018) * 3.5;
    const q = Math.floor(h / stp) * stp, fr = (h - q) / stp;
    const ter = q + stp * Math.pow(fr, 3.2);
    h += (ter - h) * 0.5 * env;

    return Math.max(0, h * P.relief);
  }

  const SIZE = 560, SEG = 460;
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const W = SEG + 1;
  const macro = new Float32Array(pos.count * 3);
  const cav = new Float32Array(pos.count);
  geo.setAttribute('aMacroN', new THREE.BufferAttribute(macro, 3));
  geo.setAttribute('aCav', new THREE.BufferAttribute(cav, 1));
  let MAXH = 170;

  function buildLand() {
    let mx = 0;
    for (let i = 0; i < pos.count; i++) {
      const y = height(pos.getX(i), pos.getZ(i));
      pos.setY(i, y); if (y > mx) mx = y;
    }
    MAXH = mx;
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    buildMacro();
    if (landMat) landMat.uniforms.uMaxH.value = MAXH;
  }

  /* A blurred copy of the heightfield gives two things: a smoothed normal
     for the snow mask (snow settles by the landform, not by the rubble),
     and a cavity term — how far a point sits below its neighbourhood —
     that shades the cracks and lets snow gather in them. */
  function buildMacro() {
    const R = Math.max(1, Math.round(P.snowSmooth));
    const H = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) H[i] = pos.getY(i);
    const B = boxBlur(H, R);
    const Bc = boxBlur(H, 3);
    const step = SIZE / SEG;
    const v = new THREE.Vector3();
    for (let r = 0; r < W; r++) for (let c = 0; c < W; c++) {
      const i = r * W + c;
      const cl = Math.max(0, c - 1), cr = Math.min(W - 1, c + 1);
      const rd = Math.max(0, r - 1), ru = Math.min(W - 1, r + 1);
      const dhx = (B[r * W + cr] - B[r * W + cl]) / ((cr - cl) * step);
      const dhz = (B[ru * W + c] - B[rd * W + c]) / ((ru - rd) * step);
      v.set(-dhx, 1, -dhz).normalize();
      macro[i * 3] = v.x; macro[i * 3 + 1] = v.y; macro[i * 3 + 2] = v.z;
      cav[i] = Math.max(-1, Math.min(1, (H[i] - Bc[i]) / 4));
    }
    geo.attributes.aMacroN.needsUpdate = true;
    geo.attributes.aCav.needsUpdate = true;
  }
  function boxBlur(H, R) {
    const tmp = new Float32Array(H.length), out = new Float32Array(H.length);
    for (let r = 0; r < W; r++) {
      let sum = 0, n = 0;
      for (let k = -R; k <= R; k++) { const cc = k; if (cc >= 0 && cc < W) { sum += H[r * W + cc]; n++; } }
      for (let c = 0; c < W; c++) {
        tmp[r * W + c] = sum / n;
        const add = c + R + 1, rem = c - R;
        if (add < W) { sum += H[r * W + add]; n++; }
        if (rem >= 0) { sum -= H[r * W + rem]; n--; }
      }
    }
    for (let c = 0; c < W; c++) {
      let sum = 0, n = 0;
      for (let k = -R; k <= R; k++) { if (k >= 0 && k < W) { sum += tmp[k * W + c]; n++; } }
      for (let r = 0; r < W; r++) {
        out[r * W + c] = sum / n;
        const add = r + R + 1, rem = r - R;
        if (add < W) { sum += tmp[add * W + c]; n++; }
        if (rem >= 0) { sum -= tmp[rem * W + c]; n--; }
      }
    }
    return out;
  }

  let landMat = null;
  buildLand();

  landMat = new THREE.ShaderMaterial({
    uniforms: {
      uSun:      { value: sun },
      uSunCol:   { value: lin('#ffe4c6') },
      uSkyCol:   { value: lin('#8fb0d8') },
      uHorizon:  { value: lin('#dfe7f0') },
      uRockLow:  { value: lin('#1f2024') },
      uRockHigh: { value: lin('#7b7771') },
      uSnow:     { value: lin('#f3f6fb') },
      uMaxH:     { value: MAXH },
      uSnowLine: { value: P.snowLine },
      uSnowBlend:{ value: P.snowBlend },
      uSnowSlope:{ value: P.snowSlope },
      uHaze:     { value: P.haze },
      uLight:    { value: -1 },     // the first-light line, as a fraction of height; below it is still in shadow
      uGlow:     { value: lin('#ff9a6a') },
    },
    vertexShader: `
      attribute vec3 aMacroN;
      attribute float aCav;
      varying vec3 vW; varying vec3 vN; varying vec3 vMN; varying float vH; varying float vCav;
      void main(){
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        vN = normalize(mat3(modelMatrix) * normal);
        vMN = normalize(mat3(modelMatrix) * aMacroN);
        vH = position.y; vCav = aCav;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: `
      varying vec3 vW; varying vec3 vN; varying vec3 vMN; varying float vH; varying float vCav;
      uniform vec3 uSun, uSunCol, uSkyCol, uHorizon, uRockLow, uRockHigh, uSnow, uGlow;
      uniform float uMaxH, uSnowLine, uSnowBlend, uSnowSlope, uHaze, uLight;
      ${NOISE}
      void main(){
        vec3 N = normalize(vN);
        float alt = clamp(vH / uMaxH, 0.0, 1.0);

        /* ── snow: possible by altitude, settled by the smoothed normal,
           gathered in the cracks, and blown off the arêtes ───────────── */
        float band = smoothstep(uSnowLine - uSnowBlend, uSnowLine + uSnowBlend, alt);
        /* the ledges are narrower than the blur, so the sharp normal gets a
           say too — a shelf two cells deep still holds snow */
        float ny = mix(normalize(vMN).y, N.y, 0.55);
        float lie  = smoothstep(uSnowSlope - 0.16, uSnowSlope + 0.14, ny);
        float crack = smoothstep(0.05, -0.35, vCav);          // concave: snow collects
        float edge  = smoothstep(0.0, 0.4, vCav);             // convex: wind-scoured
        float jit = vnoise(vW.xz * 0.09) * 0.6 + vnoise(vW.xz * 0.4) * 0.4;
        float snow = band * clamp(lie * 0.85 + crack * 0.55 * lie + (jit - 0.5) * 0.5, 0.0, 1.0);
        snow *= 1.0 - edge * 0.7;
        snow = smoothstep(0.25, 0.7, snow);

        /* ── rock: granite, darker low, warmer high, streaked ─────────── */
        float grain = vnoise(vW.xz * 0.5) * 0.5 + vnoise(vW.xz * 2.1 + vH * 0.3) * 0.5;
        float streak = vnoise(vec2(vW.x * 0.3, vH * 0.05));
        vec3 rock = mix(uRockLow, uRockHigh, clamp(alt * 0.55 + grain * 0.35 + streak * 0.2, 0.0, 1.0));
        vec3 albedo = mix(rock, uSnow, snow);

        /* ── light ─────────────────────────────────────────────────────── */
        float ndl = max(0.0, dot(N, uSun));
        /* occlusion from the cavity: dark cracks, bright edges */
        float ao = clamp(0.62 + vCav * 0.9, 0.25, 1.15);
        /* first light: the sun reaches the summit first and runs down */
        float lit = smoothstep(uLight - 0.05, uLight + 0.02, alt);
        float glowBand = exp(-pow((alt - uLight) / 0.045, 2.0)) * step(-0.5, uLight) * step(uLight, 1.1);

        vec3 key  = uSunCol * 3.1 * ndl * lit;
        vec3 fill = mix(uRockLow * 0.5, uSkyCol * 0.46, N.y * 0.5 + 0.5) * ao;
        vec3 V = normalize(cameraPosition - vW);
        float wrap = max(0.0, (dot(N, uSun) + 0.4) / 1.4);
        vec3 sss = uSnow * uSunCol * pow(wrap, 2.0) * snow * 0.35 * lit;
        vec3 H = normalize(uSun + V);
        float spec = pow(max(0.0, dot(N, H)), mix(18.0, 120.0, snow)) * mix(0.03, 0.4, snow) * lit;

        vec3 col = albedo * (key * mix(0.85, 1.0, ao) + fill) + sss + uSunCol * spec;
        col += uGlow * glowBand * (0.35 + ndl) * 0.9;

        /* ── aerial perspective, toward the horizon, thicker low down ─── */
        float d = length(cameraPosition - vW);
        float fog = 1.0 - exp(-pow(d * 0.00115 * uHaze, 2.0));
        fog = clamp(fog + (1.0 - smoothstep(0.0, 0.18, alt)) * 0.25 * uHaze, 0.0, 1.0);
        /* and the land's own edge dissolves into the horizon, so the plain
           never draws a line across the sky */
        fog = max(fog, smoothstep(150.0, 270.0, length(vW.xz)));
        col = mix(col, uHorizon * 0.92, fog);

        gl_FragColor = vec4(col, 1.0);
        ${OUT}
      }`,
  });
  landMat.uniforms.uMaxH.value = MAXH;
  const land = new THREE.Mesh(geo, landMat);
  scene.add(land);

  /* ══════════════════════════════════════════════════════════════════════
     THE CLOUDS
     ─────────────────────────────────────────────────────────────────────
     Big vertical planes facing the camera, each with its own fbm field,
     drift and density profile. `lift` is what the intro animates: at 1 the
     layer's bank has risen up over the mountain, at 0 it sits where it
     belongs. The shading is a two-tap self-shadow — density sampled a step
     toward the sun, subtracted — which gives lit tops and grey undersides
     for the cost of one extra fbm.
     ══════════════════════════════════════════════════════════════════════ */
  const LAYERS = [
    /* z,    y,   w,    h,   scale,        drift,  top,  cover, opacity, seed */
    { z: -260, y: 10,  w: 1700, h: 150, s: [3.4, 1.0], dr: 0.008, top: 0.5,  cover: 0.4,  op: 0.6,  seed: 1.3 },   // behind the massif
    { z: -90,  y: 0,   w: 1300, h: 150, s: [4.2, 1.4], dr: 0.014, top: 0.5,  cover: 0.44, op: 0.85, seed: 7.7 },   // round its base
    { z: 10,   y: -4,  w: 1100, h: 110, s: [4.6, 1.5], dr: 0.02,  top: 0.52, cover: 0.42, op: 0.9,  seed: 3.1 },   // among the spires
    { z: 110,  y: -14, w: 1100, h: 100, s: [4.0, 1.4], dr: 0.028, top: 0.58, cover: 0.48, op: 0.95, seed: 5.9 },   // the bank in front
    { z: 210,  y: -30, w: 1100, h: 90,  s: [3.4, 1.2], dr: 0.036, top: 0.62, cover: 0.52, op: 1.0,  seed: 9.4 },   // the foreground billow
  ];
  const clouds = LAYERS.map((L, i) => {
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, depthTest: true, side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uScale: { value: new THREE.Vector2(L.s[0], L.s[1]) },
        uDrift: { value: L.dr },
        uTop: { value: L.top },
        uCover: { value: L.cover },
        uOpacity: { value: L.op },
        uSeed: { value: L.seed },
        uLift: { value: 0 },
        uDensity: { value: P.clouds },
        uSun: { value: sun },
        uLitCol: { value: lin('#fff6ea') },
        uShadeCol: { value: lin('#76819a') },
        uHorizon: { value: lin('#dfe7f0') },
        uDim: { value: 0 },
        uFar: { value: i === 0 ? 0.3 : i === 1 ? 0.15 : 0.0 },
      },
      vertexShader: `
        varying vec2 vUv; varying vec3 vW;
        void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz;
          gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `
        varying vec2 vUv; varying vec3 vW;
        uniform float uTime, uDrift, uTop, uCover, uOpacity, uSeed, uLift, uDensity, uDim, uFar;
        uniform vec2 uScale;
        uniform vec3 uSun, uLitCol, uShadeCol, uHorizon;
        ${NOISE}
        float field(vec2 p){
          vec2 w = vec2(fbm5(p * 0.6 + 3.1), fbm5(p * 0.6 - 1.7));
          return fbm5(p + w * 0.9);
        }
        void main(){
          vec2 p = vUv * uScale + vec2(uTime * uDrift, 0.0) + uSeed;
          float n = field(p);
          /* the bank: dense at the bottom, a billowing top edge, lifted by
             the intro so it starts over the mountain and sinks */
          float y = vUv.y - uLift * 0.85;
          float topEdge = uTop + (n - 0.5) * 0.5;
          float prof = smoothstep(topEdge, topEdge - 0.28, y) * smoothstep(-0.02, 0.1, vUv.y + uLift);
          /* a second, finer octave on the edge only: billows, not blur */
          float fine = fbm5(p * 3.1 - uTime * uDrift * 2.0);
          float d = (n * prof + (fine - 0.5) * 0.3 * prof - (1.0 - uCover) * 0.55) * uDensity * (1.0 + uLift * 0.8);
          float a = smoothstep(0.0, 0.13, d);
          /* fade the plane's ends out so no edge ever shows */
          a *= smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x);
          if (a < 0.004) discard;

          /* self-shadow: density a step toward the sun, subtracted */
          vec2 toSun = normalize(vec2(uSun.x, uSun.y + 0.4)) * 0.07;
          float n2 = field(p + toSun * uScale / 3.0);
          float lit = clamp(0.5 + (n - n2) * 7.0 + (fine - 0.5) * 0.5 + (y - topEdge + 0.28) * 1.1, 0.0, 1.0);
          vec3 col = mix(uShadeCol, uLitCol * 1.35, lit);
          col = mix(col, uHorizon, uFar);
          /* before first light the cloud is blue-grey, not dimmed white */
          col *= mix(vec3(1.0), vec3(0.34, 0.4, 0.55), uDim);
          gl_FragColor = vec4(col, a * uOpacity);
          ${OUT}
        }`,
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(L.w, L.h), mat);
    m.position.set(0, L.y + L.h / 2, L.z);
    m.renderOrder = 2 + i;
    m.userData.base = m.position.y;
    m.userData.L = L;
    scene.add(m);
    return m;
  });

  /* ── keeping uniforms and dials in step ───────────────────────────────── */
  function sync() {
    placeSun();
    landMat.uniforms.uSnowLine.value = P.snowLine;
    landMat.uniforms.uSnowBlend.value = P.snowBlend;
    landMat.uniforms.uSnowSlope.value = P.snowSlope;
    landMat.uniforms.uHaze.value = P.haze;
    clouds.forEach(c => { c.material.uniforms.uDensity.value = P.clouds; });
    renderer.toneMappingExposure = P.exposure * intro.exposure;
  }

  function resize() {
    const w = vpW(), h = vpH();
    if (!w || !h) return;
    camera.aspect = w / h;
    /* a tall canvas on a narrow window: push back rather than widen the lens */
    const a = w / h;
    camera.fov = a < 1 ? Math.min(60, 34 / Math.pow(a, 0.55)) : 34;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  new ResizeObserver(resize).observe(canvas);
  addEventListener('resize', resize);
  resize();

  addEventListener('pointermove', e => {
    pointer.x = (e.clientX / innerWidth) * 2 - 1;
    pointer.y = (e.clientY / innerHeight) * 2 - 1;
  }, { passive: true });

  /* ══════════════════════════════════════════════════════════════════════
     THE LOAD-IN
     ══════════════════════════════════════════════════════════════════════ */
  const intro = { t: REDUCED ? 1 : 0, playing: false, start: 0, dur: 4.2, exposure: 1 };
  const ease = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };

  function applyIntro(t) {
    /* rise: low and close, inside the cloud → the station */
    const r = ease(0.0, 0.92, t);
    live.elev = CAM.elev + (-3 - CAM.elev) * (1 - r);
    live.dist = CAM.dist + (CAM.dist * 0.8 - CAM.dist) * (1 - r);
    live.tgtY = CAM.tgtY + (CAM.tgtY * 0.42 - CAM.tgtY) * (1 - r);
    live.azim = CAM.azim + (-7) * (1 - r);

    /* part: each layer sinks on its own clock, the near ones later */
    clouds.forEach((c, i) => {
      const k = ease(0.05 + i * 0.06, 0.62 + i * 0.08, t);
      c.material.uniforms.uLift.value = (1 - k) * (0.55 + i * 0.08);
      c.material.uniforms.uDim.value = 1 - ease(0.2, 0.85, t);
    });

    /* light: first light at the summit, running down the faces */
    const l = ease(0.22, 0.95, t);
    landMat.uniforms.uLight.value = 1.08 - l * 1.4;

    /* air: dawn to day */
    const a = ease(0.1, 0.9, t);
    skyMat.uniforms.uDawn.value = 1 - a;
    intro.exposure = 0.45 + 0.55 * a;
    renderer.toneMappingExposure = P.exposure * intro.exposure;
  }
  applyIntro(intro.t);

  function playIntro(dur) {
    intro.dur = dur || intro.dur;
    if (REDUCED) { intro.t = 1; applyIntro(1); return; }
    intro.t = 0; intro.start = performance.now(); intro.playing = true;
    applyIntro(0);
  }
  /** hold the pre-dawn state until the page says go */
  function resetIntro() { intro.playing = false; intro.t = REDUCED ? 1 : 0; applyIntro(intro.t); }

  /* ── the loop ─────────────────────────────────────────────────────────── */
  let running = true, raf = 0, t0 = performance.now(), last = t0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!running) { last = now; return; }
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const time = (now - t0) * 0.001;

    if (intro.playing) {
      intro.t = Math.min(1, (now - intro.start) / (intro.dur * 1000));
      applyIntro(intro.t);
      if (intro.t >= 1) intro.playing = false;
    } else if (intro.t >= 1) {
      /* a very slow drift once it has arrived */
      live.azim = CAM.azim + Math.sin(time * 0.05) * 2.2;
      live.elev = CAM.elev; live.dist = CAM.dist; live.tgtY = CAM.tgtY;
    }

    const pe = Math.min(1, dt * 2.4);
    pointer.sx += (pointer.x - pointer.sx) * pe;
    pointer.sy += (pointer.y - pointer.sy) * pe;
    placeCamera();

    clouds.forEach(c => { c.material.uniforms.uTime.value = time; c.lookAt(camera.position.x, c.position.y, camera.position.z); });
    sky.position.copy(camera.position);
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(frame);

  return {
    P, camera, renderer, scene, CAM,
    sync,
    setCamera(next) { Object.assign(CAM, next); if (intro.t >= 1) Object.assign(live, CAM); },
    rebuild(newSeed) {
      if (newSeed != null) { P.seed = newSeed; noise = makeNoise(P.seed); placeSpires(); }
      buildLand();
    },
    setColor(key, hex) {
      const u = skyMat.uniforms[key] || landMat.uniforms[key];
      if (u) u.value.set(hex).convertSRGBToLinear();
    },
    colorUniform(name) { return skyMat.uniforms[name] || landMat.uniforms[name]; },
    /** every material that carries this uniform — the horizon is shared */
    colorUniforms(name) {
      return [skyMat, landMat, ...clouds.map(c => c.material)].map(m => m.uniforms[name]).filter(Boolean);
    },
    setScroll(p) { scrollP = Math.min(1, Math.max(0, p)); },
    playIntro, resetIntro,
    get introDone() { return intro.t >= 1; },
    setRunning(v) { running = !!v; },
  };
}
