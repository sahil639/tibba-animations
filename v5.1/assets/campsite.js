/* ══════════════════════════════════════════════════════════════════════════
   The campsite — an isometric night diorama, in the Sylva manner
   ─────────────────────────────────────────────────────────────────────────
   A small island of moss at night: a tent, lit from inside, and beside it
   — on the right, smaller than the tent — a campfire in a ring of stones,
   two camp chairs drawn up to it, pines behind. After the reference
   photograph (tent, chairs, fire, a crescent moon over the trees), built
   in the register of the Sylva Living World scene: soft, crisp, alive but
   never busy.

     the moss    instanced blades over the island, Sylva's shader: slow
                 gusts, and the cursor parting the pile as it passes. The
                 blades nearest the fire take its warmth.
     the fire    crossed flame sheets, a bed of coals, embers, and a point
                 light that flickers on two clocks — the tent, stones and
                 chairs all move with it, with real shadows
     the tent    breathes: its cloth rises and falls on a slow loop, as a
                 tent does in a light wind
     the smoke   rises from the fire in a slow spiral, and keeps rising out
                 of its own section — the canvas extends above the section
                 (CAMPSITE_CONFIG.overflow) with a clear background, so the
                 smoke drifts up over whatever sits above
     the camera  a fixed isometric angle that leans a few degrees toward
                 the pointer, as Sylva's does

   Every loop and size is CAMPSITE_CONFIG, below.
   ═════════════════════════════════════════════════════════════════════════ */
import * as THREE from 'three';

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

export const CAMPSITE_CONFIG = {
  scene: {
    scale: 1,             // overall size of the diorama on screen
    offsetX: 0.08,        // fraction of the section's width (+ right)
    offsetY: 0.1,         // fraction of the section's height (+ down)
  },
  smoke: {
    height: 1,            // how high the column climbs (1 = up out of the section and over the one above)
    speed: 1,             // how fast it rises
    spiral: 1,            // turns of the spiral over its climb
    spread: 1,            // how wide it drifts as it rises
    opacity: 0.55,
    count: 150,
  },
  loops: {
    flicker: 1,           // fire flicker speed (the light and the flames)
    flickerAmount: 1,     // how far the light swings
    tentPeriod: 5.5,      // s for one breath of the tent
    tentAmount: 1,        // how far it breathes
    embers: 1,            // ember rate
    wind: 1,              // the moss's gusts
  },
  interaction: {
    parallax: 1,          // camera lean toward the pointer
    part: 1,              // how hard the cursor parts the moss
  },
  overflow: 0.85,         // how far the canvas reaches up into the section above (× viewport height)
};

/* isometric: 35.264° down, 45° round */
const ELEV = 35.264 * Math.PI / 180, AZIM = 45 * Math.PI / 180;
/* screen-aligned ground axes: x → right on screen, z → toward the viewer */
const RX = new THREE.Vector3(Math.cos(AZIM), 0, -Math.sin(AZIM));
const FZ = new THREE.Vector3(Math.sin(AZIM), 0, Math.cos(AZIM));
const at = (x, z, y = 0) => new THREE.Vector3().addScaledVector(RX, x).addScaledVector(FZ, z).setY(y);

/* value noise, for the island's rim and the moss */
const h2 = (x, y) => { let n = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263); n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
const vn = (x, y) => { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = h2(ix, iy), b = h2(ix + 1, iy), c = h2(ix, iy + 1), d = h2(ix + 1, iy + 1); return a + (b - a) * ux + (c - a) * uy + (d - c - b + a) * ux * uy; };

export function mountCampsite(section, canvas) {
  const C = CAMPSITE_CONFIG;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const world = new THREE.Group();
  scene.add(world);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -200, 200);

  /* ── light: a cold moon, a dark sky, and the fire ─────────────────── */
  scene.add(new THREE.HemisphereLight(0x4a5c90, 0x0b0c10, 0.9));
  const moon = new THREE.DirectionalLight(0x9fb4ff, 0.9);
  moon.position.copy(at(-6, -8, 12)); scene.add(moon);
  const FIRE = at(2.3, 0.9);
  const fireLight = new THREE.PointLight(0xff8a3a, 30, 16, 1.6);
  fireLight.position.copy(FIRE).setY(0.9);
  fireLight.castShadow = true;
  fireLight.shadow.mapSize.set(1024, 1024);
  fireLight.shadow.bias = -0.002; fireLight.shadow.radius = 4;
  world.add(fireLight);
  const TENT = at(-1.5, -0.2);
  const tentGlow = new THREE.PointLight(0xffb266, 6, 4, 2);
  tentGlow.position.copy(TENT).add(new THREE.Vector3(0, 0.7, 0)).addScaledVector(FZ, 0.6);
  world.add(tentGlow);

  const std = (color, rough = 0.85, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });
  const shadowy = m => { m.castShadow = true; m.receiveShadow = true; return m; };

  /* ── the island ─────────────────────────────────────────────────────── */
  const ISLAND_R = 5.4;
  const rim = th => ISLAND_R * (1 + 0.06 * (vn(Math.cos(th) * 2 + 5, Math.sin(th) * 2 + 5) - 0.5) * 2 + 0.03 * Math.sin(th * 5));
  {
    const seg = 128, top = [], shape = new THREE.Shape();
    for (let i = 0; i <= seg; i++) { const th = i / seg * Math.PI * 2, r = rim(th); top.push([Math.cos(th) * r, Math.sin(th) * r]); }
    top.forEach(([x, y], i) => i ? shape.lineTo(x, y) : shape.moveTo(x, y));
    const g = new THREE.ExtrudeGeometry(shape, { depth: 1.1, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.12, bevelSegments: 3, curveSegments: 64 });
    g.rotateX(Math.PI / 2); g.translate(0, -0.02, 0);
    /* top face moss-dark, the sides soil */
    const mats = [std(0x1d2a12, 0.95), std(0x2a1d14, 1)];
    const island = shadowy(new THREE.Mesh(g, mats));
    island.castShadow = false;
    world.add(island);
  }

  /* ── the tent: an A-frame, larger than the fire, lit from within ──── */
  const tent = new THREE.Group();
  tent.position.copy(TENT);
  tent.rotation.y = AZIM + 0.25;            // door turned toward the viewer and the fire
  world.add(tent);
  const TW = 2.6, TH = 2.1, TD = 3.0;       // width, ridge height, depth
  const clothMat = std(0x5d7a8a, 0.8, { side: THREE.DoubleSide });
  const flyMat = std(0xc9c28f, 0.75, { side: THREE.DoubleSide });
  /* The two slopes as one parametric grid each: u runs along the ridge
     (back → front), v from the eave (0) up to the ridge (1). Built this way
     the breathing is exact — each vertex moves along its slope's normal. */
  const slopes = [];
  const SU = 18, SV = 10;
  for (const side of [-1, 1]) {
    const pos = [], idx = [], uv = [];
    for (let j = 0; j <= SV; j++) for (let i = 0; i <= SU; i++) {
      const u = i / SU, v = j / SV;
      pos.push(side * (TW / 2) * (1 - v), TH * v, (u - 0.5) * TD);
      uv.push(u, v);
    }
    for (let j = 0; j < SV; j++) for (let i = 0; i < SU; i++) {
      const a0 = j * (SU + 1) + i, a1 = a0 + 1, b0 = a0 + SU + 1, b1 = b0 + 1;
      if (side > 0) idx.push(a0, b0, a1, a1, b0, b1); else idx.push(a0, a1, b0, a1, b1, b0);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    const m = shadowy(new THREE.Mesh(g, side < 0 ? clothMat : flyMat));
    tent.add(m);
    const n = new THREE.Vector3(side * TH, TW / 2, 0).normalize();     // the slope's outward normal
    slopes.push({ m, base: new Float32Array(pos), n, side });
  }
  /* the back wall, and the door: two flaps pulled open, the inside glowing */
  const tri = (w, h) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([-w / 2, 0, 0, w / 2, 0, 0, 0, h, 0], 3)); g.computeVertexNormals(); return g; };
  const back = shadowy(new THREE.Mesh(tri(TW, TH), clothMat)); back.position.z = -TD / 2; tent.add(back);
  const inside = new THREE.Mesh(tri(TW * 0.62, TH * 0.72), new THREE.MeshBasicMaterial({ color: 0xffb35c, side: THREE.DoubleSide }));
  inside.position.set(0, 0.01, TD / 2 - 0.05); tent.add(inside);
  for (const s of [-1, 1]) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([0, TH, 0, s * TW / 2, 0, 0, s * TW * 0.22, 0, 0.35], 3));
    g.computeVertexNormals();
    const flap = shadowy(new THREE.Mesh(g, flyMat)); flap.position.z = TD / 2; tent.add(flap);
  }
  /* ridge pole, guy lines and pegs */
  const pole = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, TD + 0.5, 8), std(0x3a2a1c))); pole.rotation.x = Math.PI / 2; pole.position.y = TH; tent.add(pole);
  const lineMat = new THREE.LineBasicMaterial({ color: 0xcfc6a8, transparent: true, opacity: 0.55 });
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const a = new THREE.Vector3(0, TH, sz * (TD / 2 + 0.2)), b = new THREE.Vector3(sx * (TW / 2 + 0.7), 0, sz * (TD / 2 + 0.6));
    tent.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), lineMat));
    const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.01, 0.2, 6), std(0x777066)); peg.position.copy(b).setY(0.06); tent.add(peg);
  }

  /* ── the fire ring: stones, logs, coals ────────────────────────────── */
  const fire = new THREE.Group(); fire.position.copy(FIRE); world.add(fire);
  const stoneMat = std(0x55524e, 0.95);
  for (let i = 0; i < 11; i++) {
    const th = i / 11 * Math.PI * 2 + h2(i, 3) * 0.3, r = 0.62 + h2(i, 4) * 0.06;
    const s = shadowy(new THREE.Mesh(new THREE.DodecahedronGeometry(0.16 + h2(i, 5) * 0.07, 1), stoneMat));
    s.position.set(Math.cos(th) * r, 0.08, Math.sin(th) * r); s.scale.set(1.3, 0.75, 1); s.rotation.set(h2(i, 6) * 3, h2(i, 7) * 3, 0);
    fire.add(s);
  }
  const logMat = std(0x3b2616, 0.9);
  for (let i = 0; i < 4; i++) {
    const log = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.085, 0.95, 10), logMat));
    const th = i / 4 * Math.PI * 2 + 0.4;
    log.position.set(Math.cos(th) * 0.16, 0.3, Math.sin(th) * 0.16);
    log.rotation.set(0, 0, 0); log.lookAt(new THREE.Vector3(0, 0.75, 0)); log.rotateX(Math.PI / 2);
    fire.add(log);
  }
  const coals = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24), new THREE.MeshBasicMaterial({ color: 0xff5a1e, transparent: true, opacity: 0.85 }));
  coals.rotation.x = -Math.PI / 2; coals.position.y = 0.03; fire.add(coals);

  /* flames: three crossed sheets, drawn by a noise shader, additive */
  const flameU = { uTime: { value: 0 }, uAmt: { value: 1 } };
  const flameMat = new THREE.ShaderMaterial({
    uniforms: flameU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform float uTime, uAmt; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h(i), h(i + vec2(1,0)), f.x), mix(h(i + vec2(0,1)), h(i + vec2(1,1)), f.x), f.y); }
      void main(){
        vec2 p = vUv; float t = uTime;
        float w = n(vec2(p.x * 4.0, p.y * 3.0 - t * 2.6)) * 0.5 + n(vec2(p.x * 9.0, p.y * 7.0 - t * 4.1)) * 0.25;
        float x = (p.x - 0.5) * 2.0 + (w - 0.37) * 0.9 * p.y;
        float body = 1.0 - smoothstep(0.0, 1.0, abs(x) / max(0.05, (1.0 - p.y) * 0.9));
        body *= smoothstep(0.0, 0.08, p.y) * (1.0 - smoothstep(0.55 + w * 0.35, 1.0, p.y));
        vec3 col = mix(vec3(1.0, 0.25, 0.04), vec3(1.0, 0.78, 0.35), smoothstep(0.2, 0.9, body));
        gl_FragColor = vec4(col * body * 1.7 * uAmt, body);
      }`,
  });
  const flames = new THREE.Group(); flames.position.y = 0.12; fire.add(flames);
  for (let i = 0; i < 3; i++) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.35), flameMat);
    f.position.y = 0.62; f.rotation.y = i / 3 * Math.PI; flames.add(f);
  }

  /* embers: stateless on the GPU, each on its own clock */
  const EMB = 90, eg = new THREE.BufferGeometry(), eSeed = new Float32Array(EMB * 3);
  for (let i = 0; i < EMB; i++) { eSeed[i * 3] = Math.random(); eSeed[i * 3 + 1] = Math.random(); eSeed[i * 3 + 2] = Math.random(); }
  eg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(EMB * 3), 3));
  eg.setAttribute('seed', new THREE.Float32BufferAttribute(eSeed, 3));
  const emberU = { uTime: { value: 0 }, uRate: { value: 1 }, uPx: { value: 1 } };
  const embers = new THREE.Points(eg, new THREE.ShaderMaterial({
    uniforms: emberU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute vec3 seed; uniform float uTime, uRate, uPx; varying float vA;
      void main(){
        float life = 2.2 + seed.x * 1.6, t = fract((uTime * uRate + seed.y * 10.0) / life);
        vec3 p = vec3(sin(seed.z * 30.0 + t * 6.0) * 0.25 * t, 0.3 + t * 2.4, cos(seed.x * 40.0 + t * 5.0) * 0.25 * t);
        vA = (1.0 - t) * step(0.35, fract(seed.z * 7.0 + uTime * (3.0 + seed.x * 4.0)));
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (2.0 + seed.x * 2.0) * uPx; gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(1.0, 0.6, 0.25, vA * (1.0 - d * 2.0)); }`,
  }));
  embers.frustumCulled = false; fire.add(embers);

  /* ── the smoke: a slow spiral out of the fire and up off the section ─ */
  const SMK = 260, sg = new THREE.BufferGeometry(), sSeed = new Float32Array(SMK * 3);
  for (let i = 0; i < SMK; i++) { sSeed[i * 3] = i / SMK; sSeed[i * 3 + 1] = Math.random(); sSeed[i * 3 + 2] = Math.random(); }
  sg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(SMK * 3), 3));
  sg.setAttribute('seed', new THREE.Float32BufferAttribute(sSeed, 3));
  const smokeU = { uTime: { value: 0 }, uHeight: { value: 12 }, uSpeed: { value: 1 }, uTurns: { value: 1 }, uSpread: { value: 1 },
    uOpacity: { value: 0.55 }, uCount: { value: 150 }, uPx: { value: 1 }, uScale: { value: 1 } };
  const smoke = new THREE.Points(sg, new THREE.ShaderMaterial({
    uniforms: smokeU, transparent: true, depthWrite: false,
    vertexShader: `
      attribute vec3 seed; uniform float uTime, uHeight, uSpeed, uTurns, uSpread, uCount, uPx, uScale; varying float vA, vT;
      void main(){
        float idx = seed.x * ${SMK}.0;
        float t = fract(seed.x + uTime * uSpeed * 0.035);            // 0 at the fire, 1 at the top of the column
        float y = 1.1 + t * uHeight;
        float ang = t * uTurns * 6.2832 + seed.y * 0.9;
        float r = (0.12 + t * 1.6 * uSpread) * (0.8 + seed.z * 0.4);
        vec3 p = vec3(cos(ang) * r, y, sin(ang) * r);
        p.x += sin(t * 3.0 + uTime * 0.2) * t * 0.8 * uSpread;         // a drift that bends the column
        vT = t;
        vA = smoothstep(0.0, 0.08, t) * (1.0 - smoothstep(0.55, 1.0, t)) * step(idx, uCount);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (26.0 + t * 110.0) * (0.7 + seed.z * 0.6) * uPx * uScale;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform float uOpacity; varying float vA, vT;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d); a *= a;
        vec3 col = mix(vec3(0.62, 0.55, 0.5), vec3(0.55, 0.58, 0.66), vT);   // warm near the fire, cooling as it climbs
        gl_FragColor = vec4(col, a * vA * uOpacity * 0.35);
      }`,
  }));
  smoke.frustumCulled = false; fire.add(smoke);

  /* ── camp chairs, drawn up to the fire ─────────────────────────────── */
  function chair(pos, facing) {
    const g = new THREE.Group(); g.position.copy(pos); g.lookAt(FIRE.clone().setY(0)); world.add(g);
    const frame = std(0x1a1a1c, 0.5), canvasM = std(0xc98a5a, 0.85, { side: THREE.DoubleSide });
    const leg = (x, z, rx) => { const l = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.62, 6), frame)); l.position.set(x, 0.28, z); l.rotation.x = rx; g.add(l); };
    leg(-0.28, 0, 0.45); leg(0.28, 0, 0.45); leg(-0.28, 0, -0.45); leg(0.28, 0, -0.45);
    const seat = shadowy(new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.5, 4, 4), canvasM)); seat.rotation.x = -Math.PI / 2 + 0.12; seat.position.y = 0.5; g.add(seat);
    const backM = shadowy(new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.55, 4, 4), canvasM)); backM.position.set(0, 0.8, -0.27); backM.rotation.x = -0.25; g.add(backM);
    return g;
  }
  chair(at(1.0, 2.2), 0); chair(at(3.9, 0.2), 0);

  /* ── pines round the back edge ─────────────────────────────────────── */
  const pineMat = std(0x22382a, 0.9), trunkMat = std(0x2b1d14);
  [[-4.1, -2.4, 1.25], [-2.6, -3.9, 1.0], [-0.4, -4.6, 1.35], [1.9, -4.2, 1.1], [3.8, -2.9, 0.9], [-4.5, 0.2, 0.8], [4.6, -0.9, 0.75]].forEach(([x, z, s], i) => {
    const p = new THREE.Group(); p.position.copy(at(x, z)); p.scale.setScalar(s); world.add(p);
    const tr = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.9, 8), trunkMat)); tr.position.y = 0.45; p.add(tr);
    for (let k = 0; k < 4; k++) {
      const cone = shadowy(new THREE.Mesh(new THREE.ConeGeometry(0.95 - k * 0.2, 1.1, 14, 1), pineMat));
      cone.position.y = 1.0 + k * 0.62; cone.rotation.y = h2(i, k) * 3; p.add(cone);
    }
  });
  /* a few loose rocks */
  for (let i = 0; i < 7; i++) {
    const th = h2(i, 9) * Math.PI * 2, r = 3.2 + h2(i, 10) * 1.8;
    const rk = shadowy(new THREE.Mesh(new THREE.DodecahedronGeometry(0.14 + h2(i, 11) * 0.22, 1), stoneMat));
    rk.position.set(Math.cos(th) * r, 0.05, Math.sin(th) * r); rk.scale.y = 0.6; world.add(rk);
  }

  /* ── the moss ─────────────────────────────────────────────────────── */
  const mossU = { uTime: { value: 0 }, uWind: { value: 1 }, uMouse: { value: new THREE.Vector3(0, -99, 0) }, uPart: { value: 1 },
    uFire: { value: FIRE.clone() }, uFireAmt: { value: 1 } };
  {
    const SEG = 3, bp = [], buv = [], bi = [];
    for (let s = 0; s <= SEG; s++) { const t = s / SEG, w = 0.5 * (1 - t * 0.85); bp.push(-w, 0, 0, w, 0, 0); buv.push(0, t, 1, t);
      if (s < SEG) { const q = s * 2; bi.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); } }
    const geo = new THREE.InstancedBufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(bp, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(buv, 2)); geo.setIndex(bi);
    const N = 26000, off = [], rnd = [];
    const clear = (x, z) => {
      const tp = new THREE.Vector3(x, 0, z);
      if (tp.distanceTo(FIRE) < 0.85) return false;
      const lt = tp.clone().sub(TENT).applyAxisAngle(new THREE.Vector3(0, 1, 0), -(AZIM + 0.25));
      return !(Math.abs(lt.x) < TW / 2 + 0.05 && Math.abs(lt.z) < TD / 2 + 0.05);
    };
    let tries = 0;
    while (off.length / 3 < N && tries++ < N * 4) {
      const th = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * rim(th) * 0.97;
      const x = Math.cos(th) * r, z = Math.sin(th) * r;
      if (!clear(x, z)) continue;
      off.push(x, 0.09, z);
      rnd.push(Math.random() * 6.283, 0.09 + Math.random() * 0.13 * (Math.random() < 0.06 ? 1.8 : 1), (Math.random() - 0.5), vn(x * 0.9 + 3, z * 0.9));
    }
    geo.setAttribute('offset', new THREE.InstancedBufferAttribute(new Float32Array(off), 3));
    geo.setAttribute('rnd', new THREE.InstancedBufferAttribute(new Float32Array(rnd), 4));
    geo.instanceCount = off.length / 3;
    const moss = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      uniforms: mossU, side: THREE.DoubleSide,
      vertexShader: `
        attribute vec3 offset; attribute vec4 rnd;
        uniform float uTime, uWind, uPart; uniform vec3 uMouse, uFire;
        varying float vT, vDark, vTone, vWarm;
        void main(){
          float t = uv.y, len = rnd.y;
          vec3 nrm = vec3(0.0, 1.0, 0.0), T0 = vec3(1.0, 0.0, 0.0), B0 = vec3(0.0, 0.0, 1.0);
          float ca = cos(rnd.x), sa = sin(rnd.x);
          vec3 wd = T0 * ca + B0 * sa, ld = T0 * -sa + B0 * ca;
          float bend = t * t;
          float gust = (sin(uTime * 1.75 + offset.x * 1.6 + rnd.x) * 0.12 + sin(uTime * 0.85 + offset.x * 0.55) * 0.07) * uWind;
          vec3 w = offset + nrm * (t * len) + wd * (position.x * 0.03) + ld * (rnd.z * 0.42 * len) * bend + (T0 * gust + B0 * gust * 0.6) * bend * len * 1.6;
          vec3 toB = offset - uMouse; toB.y = 0.0;
          float infl = smoothstep(0.9, 0.0, length(toB)); infl *= infl * uPart;
          vec3 push = length(toB) > 0.0001 ? normalize(toB) : T0;
          w += push * infl * bend * len * 2.2; w -= nrm * infl * bend * len;
          vT = t; vDark = infl; vTone = rnd.w;
          vWarm = 1.0 / (1.0 + pow(length(offset - uFire) * 0.9, 2.0));
          gl_Position = projectionMatrix * modelViewMatrix * vec4(w, 1.0);
        }`,
      fragmentShader: `
        uniform float uFireAmt; varying float vT, vDark, vTone, vWarm;
        void main(){
          vec3 deep = vec3(0.0126, 0.0192, 0.0031), mid = vec3(0.0488, 0.0744, 0.0121), tip = vec3(0.1222, 0.1860, 0.0304);
          vec3 col = mix(deep, mid, smoothstep(0.0, 0.62, vT));
          col = mix(col, tip, smoothstep(0.38, 1.0, vT) * (0.35 + 0.65 * vTone));
          col *= (0.62 + 0.72 * vTone) * 0.9;                     // night: the moss is low-lit
          col *= mix(vec3(0.7, 0.8, 1.2), vec3(1.0), 0.5);         // moonlight cools it
          col += vec3(1.0, 0.45, 0.12) * vWarm * 0.22 * uFireAmt * smoothstep(0.2, 1.0, vT);
          col *= 1.0 - vDark * 0.55;
          col *= mix(0.45, 1.0, smoothstep(0.0, 0.5, vT));
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }));
    moss.frustumCulled = false; world.add(moss);
  }

  /* ── the frame: section + the overflow above it ───────────────────── */
  const look = new THREE.Vector3(0, 0.8, 0);
  const lean = { x: 0, y: 0, tx: 0, ty: 0 };
  let unit = 1;                               // world units per CSS px
  function frame() {
    const W = section.clientWidth, Hs = section.clientHeight, over = Math.round(innerHeight * C.overflow);
    canvas.style.top = -over + 'px';
    canvas.style.height = (Hs + over) + 'px';
    const Hc = Hs + over;
    renderer.setSize(W, Hc, false);
    /* the diorama is ~14 units across; fit it to ~60% of the shorter of the section's sides */
    unit = 14 / (Math.min(W * 0.95, Hs * 1.35) * 0.62 * C.scene.scale);
    const halfW = W / 2 * unit, halfH = Hc / 2 * unit;
    /* centre the island in the SECTION (not the canvas), then offset */
    const cx = -C.scene.offsetX * W * unit;
    /* the section's centre sits (over + Hs/2 − Hc/2) px below the canvas's;
       the view centre moves UP by that much to put the island there */
    const cy = ((over + Hs / 2) - Hc / 2) * unit + C.scene.offsetY * Hs * unit;
    camera.left = cx - halfW; camera.right = cx + halfW; camera.top = cy + halfH; camera.bottom = cy - halfH;
    camera.updateProjectionMatrix();
    const px = Math.min(2, devicePixelRatio || 1);
    emberU.uPx.value = px; smokeU.uPx.value = px;
    smokeU.uScale.value = 0.028 / unit;       // smoke puffs scale with the diorama
  }
  function placeCamera() {
    const P = C.interaction.parallax;
    const e = ELEV + lean.y * 0.035 * P, a = AZIM + lean.x * 0.06 * P;
    camera.position.set(look.x + Math.sin(a) * Math.cos(e) * 50, look.y + Math.sin(e) * 50, look.z + Math.cos(a) * Math.cos(e) * 50);
    camera.lookAt(look);
  }

  /* ── the pointer: parallax, and a ray onto the ground for the moss ─── */
  const ndc = new THREE.Vector2(), ray = new THREE.Raycaster(), ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.1), hit = new THREE.Vector3();
  let over = false;
  addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect();
    lean.tx = (e.clientX / innerWidth) * 2 - 1; lean.ty = (e.clientY / innerHeight) * 2 - 1;
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    over = !!ray.ray.intersectPlane(ground, hit) && Math.hypot(hit.x, hit.z) < ISLAND_R;
  }, { passive: true });

  /* ── the loop ─────────────────────────────────────────────────────── */
  let running = false, last = performance.now(), time = 0, presence = 0;
  const m = mossU.uMouse.value;
  function tick(now) {
    if (!running) return;
    requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!REDUCED) time += dt;
    const L = C.loops;
    /* the fire: two flicker clocks out of phase */
    const ft = time * L.flicker;
    const fl = 1 + (Math.sin(ft * 9.1) * 0.08 + Math.sin(ft * 23.7 + 1.3) * 0.05 + Math.sin(ft * 3.3) * 0.07) * L.flickerAmount;
    fireLight.intensity = 30 * fl;
    fireLight.position.x = FIRE.x + Math.sin(ft * 5.1) * 0.05 * L.flickerAmount;
    flameU.uTime.value = ft; flames.scale.setScalar(0.94 + (fl - 1) * 0.8);
    coals.material.opacity = 0.7 + Math.sin(ft * 2.3) * 0.1;
    tentGlow.intensity = 6 * (0.92 + Math.sin(ft * 1.7) * 0.05);
    emberU.uTime.value = time; emberU.uRate.value = L.embers;
    /* the tent breathes: the slopes' free middles rise and fall */
    const br = Math.sin(time * Math.PI * 2 / Math.max(0.5, L.tentPeriod)) * 0.045 * L.tentAmount;
    slopes.forEach(s => {
      const p = s.m.geometry.attributes.position, b = s.base, uv = s.m.geometry.attributes.uv;
      for (let k = 0; k < p.count; k++) {
        /* pinned at the eave, the ridge and both ends; freest mid-panel */
        const w = br * Math.sin(uv.getX(k) * Math.PI) * Math.sin(uv.getY(k) * Math.PI);
        p.array[k * 3] = b[k * 3] + s.n.x * w; p.array[k * 3 + 1] = b[k * 3 + 1] + s.n.y * w;
      }
      p.needsUpdate = true;
      s.m.geometry.computeVertexNormals();
    });
    /* smoke */
    smokeU.uTime.value = time; smokeU.uSpeed.value = C.smoke.speed; smokeU.uTurns.value = C.smoke.spiral;
    smokeU.uSpread.value = C.smoke.spread; smokeU.uOpacity.value = C.smoke.opacity; smokeU.uCount.value = C.smoke.count;
    smokeU.uHeight.value = 30 * C.smoke.height;      // at 1×: out of the section and on up the page
    /* moss */
    mossU.uTime.value = time; mossU.uWind.value = REDUCED ? 0 : L.wind; mossU.uFireAmt.value = fl;
    presence += ((over ? 1 : 0) - presence) * (over ? 0.12 : 0.05);
    if (over) m.lerp(hit, 0.15);
    mossU.uPart.value = C.interaction.part * presence;
    lean.x += (lean.tx - lean.x) * 0.04; lean.y += (lean.ty - lean.y) * 0.04;
    placeCamera();
    renderer.render(scene, camera);
  }
  const io = new IntersectionObserver(([e]) => {
    const on = e.isIntersecting && !document.hidden;
    if (on && !running) { running = true; last = performance.now(); requestAnimationFrame(tick); }
    if (!on) running = false;
  }, { rootMargin: '120px' });
  io.observe(section);
  document.addEventListener('visibilitychange', () => { if (document.hidden) running = false; else { io.unobserve(section); io.observe(section); } });
  new ResizeObserver(() => { frame(); placeCamera(); renderer.render(scene, camera); }).observe(section);
  addEventListener('resize', frame);
  frame(); placeCamera();

  return { CONFIG: C, reframe: frame };
}
