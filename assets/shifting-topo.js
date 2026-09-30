/* ══════════════════════════════════════════════════════════════════════════
   Shifting Topo — a stepped terrain that reconfigures per company stage
   ─────────────────────────────────────────────────────────────────────────
   After the reference: a square block of land cut into flat contour slabs,
   each slab's edge drawn as one white hairline, the block's own sides
   showing the strata, and small white trees standing on the terraces.

   ── how the slabs are made ────────────────────────────────────────────────
   One grid, three heightfields — one per stage, precomputed and stored on
   every vertex as a vec3. The vertex shader blends them with the stage
   weights and then QUANTISES the result to the slab interval, so the
   surface is always flat terraces with near-vertical risers between them.
   The fragment shader draws the outline wherever the continuous (unstepped)
   height crosses a slab boundary, one pixel wide by screen derivative, and
   takes its normal from derivatives too — the stepped surface has no
   normals of its own until the shader has made it.

   So changing stage is three numbers tweened on the GPU: the land flows
   from one survey to the next, slabs appearing and disappearing at the
   contours, with nothing rebuilt. The move is linear-in, linear-out on a
   restrained ease, and the slab count is shown in the readout as it goes.

   ── the stages ────────────────────────────────────────────────────────────
     early        a low plateau and one knoll beside a basin — few slabs
     mid          two ridges with a valley between, the reference's shape
     established  a tall central massif — the most slabs
   ═════════════════════════════════════════════════════════════════════════ */
import * as THREE from 'three';

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function createShiftingTopo(canvas, opts = {}) {
  const O = { step: 0.42, size: 20, res: 300, ...opts };
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -100, 200);

  /* ── the three fields ──────────────────────────────────────────────── */
  const hash = (x, y) => {
    let n = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  };
  const vn = (x, y) => {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
    return a + (b - a) * ux + (c - a) * uy + (d - c - b + a) * ux * uy;
  };
  const fbm = (x, y) => { let v = 0, a = 0.5, f = 1; for (let i = 0; i < 5; i++) { v += a * vn(x * f, y * f); a *= 0.5; f *= 2.03; } return v; };
  const g = (x, y, cx, cy, s) => Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) * s);

  /* x, y in -1..1 across the block; heights in slabs */
  const FIELDS = [
    (x, y) => 1.4 + 3.2 * g(x, y, -0.35, -0.25, 5) + 2.2 * g(x, y, 0.4, 0.35, 3.5)
      - 1.3 * g(x, y, 0.15, -0.1, 7) + (fbm(x * 1.6 + 3, y * 1.6) - 0.5) * 1.8,
    (x, y) => {
      /* two ridges running corner to corner with a valley between */
      const u = (x + y) * 0.7071, v = (x - y) * 0.7071;
      const r1 = Math.exp(-((v + 0.45 + Math.sin(u * 3) * 0.1) ** 2) * 7);
      const r2 = Math.exp(-((v - 0.5 + Math.sin(u * 2.4 + 1) * 0.12) ** 2) * 6);
      return 1.6 + 6.2 * r1 * (0.7 + 0.3 * (1 - u)) + 5.2 * r2 + (fbm(x * 1.7 - 1, y * 1.7 + 4) - 0.5) * 2.0
        - 1.2 * g(x, y, 0.05, 0.05, 9);
    },
    (x, y) => 1.8 + 11.5 * g(x, y, 0.02, -0.05, 2.6) * (0.75 + 0.5 * fbm(x * 3 + 7, y * 3))
      + 3 * g(x, y, -0.55, 0.45, 6) + (fbm(x * 1.6 + 9, y * 1.6 - 2) - 0.5) * 1.9,
  ];

  const N = O.res, S = O.size, BASE = 3;
  const geo = new THREE.PlaneGeometry(S, S, N, N);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const aH = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) / (S / 2), y = pos.getZ(i) / (S / 2);
    /* the block's rim is always at least the first slab, so every side
       shows strata */
    /* three slabs of bedrock under every stage, so the block's sides
       always show strata the way the reference's do */
    for (let k = 0; k < 3; k++) aH[i * 3 + k] = BASE + Math.max(1.05, FIELDS[k](x, y));
  }
  geo.setAttribute('aH', new THREE.BufferAttribute(aH, 3));

  const U = {
    uW: { value: new THREE.Vector3(1, 0, 0) },
    uStep: { value: O.step },
    uLine: { value: new THREE.Color('#e9ecf2') },
    uAccent: { value: new THREE.Color('#FF4B1F') },
    uTopLevel: { value: 12 },
    uRiser: { value: 0.22 },
    uLight: { value: new THREE.Vector3(-0.5, 1, 0.35).normalize() },
  };

  const SURF_VS = `
    attribute vec3 aH;
    uniform vec3 uW; uniform float uStep;
    /* The terrace profile. Flat for most of each slab, then a steep riser
       over the last uRiser of it — a smooth function of the continuous
       height, so the riser sits exactly on the contour at sub-cell precision
       instead of stepping along the grid, and every edge comes out clean. */
    uniform float uRiser;
    float terr(float h){ float f = fract(h); return floor(h) + smoothstep(1.0 - uRiser, 1.0, f); }
    varying vec3 vW; varying float vH;
    void main(){
      float h = dot(aH, uW);
      vH = h;
      vec3 p = position;
      p.y = terr(h) * uStep;                // the slab this point stands on
      vec4 w = modelMatrix * vec4(p, 1.0);
      vW = w.xyz;
      gl_Position = projectionMatrix * viewMatrix * w;
    }`;
  const SURF_FS = `
    uniform vec3 uLine, uAccent, uLight; uniform float uStep, uTopLevel;
    varying vec3 vW; varying float vH;
    void main(){
      vec3 N = normalize(cross(dFdx(vW), dFdy(vW)));
      if (N.y < 0.0) N = -N;
      float level = floor(vH);
      float flat_ = smoothstep(0.55, 0.8, N.y);
      /* slabs lighten a little as they climb; risers stay near black */
      /* linear values — the output conversion lifts them to roughly
         #161618 on the low slabs and #2c2c30 on the high ones */
      vec3 top = mix(vec3(0.0075, 0.0075, 0.0085), vec3(0.026, 0.026, 0.03), clamp(level / 14.0, 0.0, 1.0));
      vec3 wall = vec3(0.0018, 0.0018, 0.0022) + 0.004 * max(0.0, dot(N, uLight));
      vec3 col = mix(wall, top + 0.006 * max(0.0, dot(N, uLight)), flat_);
      /* the outline: the continuous height crossing a slab boundary */
      float d = abs(fract(vH + 0.5) - 0.5) / max(fwidth(vH), 1e-4);
      float line = 1.0 - smoothstep(0.5, 1.3, d);
      /* the outline belongs to the top of the riser: the level being
         stepped UP to, so the summit's own rim is the accent */
      float rimLevel = floor(vH + 0.5);
      vec3 lc = rimLevel >= uTopLevel ? uAccent : uLine;
      col = mix(col, lc, line * 0.9);
      gl_FragColor = vec4(col, 1.0);
      #include <colorspace_fragment>
    }`;
  const surf = new THREE.Mesh(geo, new THREE.ShaderMaterial({
    uniforms: U, vertexShader: SURF_VS, fragmentShader: SURF_FS,
  }));
  scene.add(surf);

  /* ── the sides: strata cut through the block ───────────────────────── */
  const sideVerts = [], sideH = [], sideTop = [];
  const edge = (fn) => {
    for (let i = 0; i <= N; i++) {
      const [ix, iz] = fn(i);
      const vi = iz * (N + 1) + ix;
      const x = pos.getX(vi), z = pos.getZ(vi);
      for (const top of [1, 0]) {
        sideVerts.push(x, 0, z);
        sideH.push(aH[vi * 3], aH[vi * 3 + 1], aH[vi * 3 + 2]);
        sideTop.push(top);
      }
    }
  };
  const idx = [];
  const strip = (fn) => {
    const base = sideVerts.length / 3;
    edge(fn);
    for (let i = 0; i < N; i++) {
      const a = base + i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  };
  strip(i => [i, N]);          // front (+z)
  strip(i => [N, N - i]);      // right (+x)
  strip(i => [N - i, 0]);      // back
  strip(i => [0, i]);          // left
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.Float32BufferAttribute(sideVerts, 3));
  sg.setAttribute('aH', new THREE.Float32BufferAttribute(sideH, 3));
  sg.setAttribute('aTop', new THREE.Float32BufferAttribute(sideTop, 1));
  sg.setIndex(idx);
  const side = new THREE.Mesh(sg, new THREE.ShaderMaterial({
    uniforms: U, side: THREE.DoubleSide,
    vertexShader: `
      attribute vec3 aH; attribute float aTop;
      uniform vec3 uW; uniform float uStep;
    /* The terrace profile. Flat for most of each slab, then a steep riser
       over the last uRiser of it — a smooth function of the continuous
       height, so the riser sits exactly on the contour at sub-cell precision
       instead of stepping along the grid, and every edge comes out clean. */
    uniform float uRiser;
    float terr(float h){ float f = fract(h); return floor(h) + smoothstep(1.0 - uRiser, 1.0, f); }
      varying float vY; varying float vTopY;
      void main(){
        float h = dot(aH, uW);
        float topY = terr(h) * uStep;
        vec3 p = position;
        p.y = aTop > 0.5 ? topY : -0.02;
        vY = p.y; vTopY = topY;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 uLine; uniform float uStep;
      varying float vY; varying float vTopY;
      void main(){
        float s = vY / uStep;
        float d = abs(fract(s + 0.5) - 0.5) / max(fwidth(s), 1e-4);
        float line = (1.0 - smoothstep(0.6, 1.4, d)) * step(0.02, vY);
        vec3 col = mix(vec3(0.0022, 0.0022, 0.0026), uLine * 0.8, line * 0.8);
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  }));
  scene.add(side);

  /* ── trees: small white cones in clusters on the terraces ──────────── */
  let rs = 11;
  const rnd = () => ((rs = (rs * 16807) % 2147483647) / 2147483647);
  const TREES = [];
  const clusters = [[-0.45, -0.3, 9], [0.5, 0.35, 11], [-0.1, 0.55, 6], [0.3, -0.55, 7], [-0.7, 0.3, 5], [0.72, -0.2, 6]];
  clusters.forEach(([cx, cy, n]) => {
    for (let i = 0; i < n; i++) {
      const x = cx + (rnd() - 0.5) * 0.16, y = cy + (rnd() - 0.5) * 0.16;
      TREES.push({ x, y, s: 0.55 + rnd() * 0.6, h: FIELDS.map(f => BASE + Math.max(1.05, f(x, y))) });
    }
  });
  const coneG = new THREE.ConeGeometry(0.16, 0.62, 6, 1);
  coneG.translate(0, 0.31, 0);
  const trees = new THREE.InstancedMesh(coneG, new THREE.MeshBasicMaterial({ color: 0xcfd3db }), TREES.length);
  scene.add(trees);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v3 = new THREE.Vector3(), sc = new THREE.Vector3();
  function placeTrees() {
    const w = U.uW.value;
    TREES.forEach((t, i) => {
      const h = t.h[0] * w.x + t.h[1] * w.y + t.h[2] * w.z;
      /* trees only where the ground is high enough to be a terrace */
      const show = h > BASE + 2.2 ? 1 : 0;
      const f = h - Math.floor(h), r = U.uRiser.value;
      const k = Math.min(1, Math.max(0, (f - (1 - r)) / r));
      v3.set(t.x * S / 2, (Math.floor(h) + k * k * (3 - 2 * k)) * O.step, t.y * S / 2);
      sc.setScalar(t.s * show);
      m4.compose(v3, q, sc);
      trees.setMatrixAt(i, m4);
    });
    trees.instanceMatrix.needsUpdate = true;
  }

  /* ── camera: an isometric survey view, with a little pointer drift ─── */
  const view = { azim: 45, elev: 33, zoom: 1, drift: 3 };
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  addEventListener('pointermove', e => { pointer.x = e.clientX / innerWidth - 0.5; pointer.y = e.clientY / innerHeight - 0.5; }, { passive: true });
  function placeCamera() {
    const a = (view.azim + pointer.sx * view.drift * 2) * Math.PI / 180;
    const e = (view.elev - pointer.sy * view.drift) * Math.PI / 180;
    const d = 60;
    camera.position.set(Math.sin(a) * Math.cos(e) * d, Math.sin(e) * d + 3.2, Math.cos(a) * Math.cos(e) * d);
    camera.lookAt(0, 3.2, 0);
  }
  function resize() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    /* fit the block: its diagonal across, its height and sides down */
    const a = w / h, half = Math.max(S * 0.5, (S * 0.64) / a) / view.zoom;
    camera.left = -half * a; camera.right = half * a; camera.top = half; camera.bottom = -half;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  /* ── the shift ─────────────────────────────────────────────────────── */
  const W = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];
  const MAXLV = [0, 1, 2].map(k => { let m = 0; for (let i = 0; i < pos.count; i++) m = Math.max(m, aH[i * 3 + k]); return Math.floor(m); });
  const easeIO = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  let tw = null, stage = 0;
  function setStage(i, dur = 1.6) {
    const from = U.uW.value.clone(), to = W[i];
    const top0 = U.uTopLevel.value, top1 = MAXLV[i];
    stage = i;
    if (REDUCED || dur === 0) { U.uW.value.copy(to); U.uTopLevel.value = top1; placeTrees(); return; }
    tw = { from, to, top0, top1, t0: performance.now(), dur: dur * 1000 };
  }

  let raf = 0, last = performance.now(), onLevel = null;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (tw) {
      const k = Math.min(1, (now - tw.t0) / tw.dur), e = easeIO(k);
      U.uW.value.copy(tw.from).lerp(tw.to, e);
      U.uTopLevel.value = tw.top0 + (tw.top1 - tw.top0) * e;
      placeTrees();
      if (onLevel) onLevel(Math.round(U.uTopLevel.value), k);
      if (k >= 1) tw = null;
    }
    const pe = Math.min(1, dt * 2.2);
    pointer.sx += (pointer.x - pointer.sx) * pe; pointer.sy += (pointer.y - pointer.sy) * pe;
    placeCamera();
    renderer.render(scene, camera);
  }
  U.uTopLevel.value = MAXLV[0];
  placeTrees();
  raf = requestAnimationFrame(frame);

  return {
    U, view, MAXLV, setStage, resize,
    get stage() { return stage; },
    onLevel(fn) { onLevel = fn; },
    setStep(v) { U.uStep.value = v; O.step = v; placeTrees(); },
    setRiser(v) { U.uRiser.value = v; placeTrees(); },
  };
}
