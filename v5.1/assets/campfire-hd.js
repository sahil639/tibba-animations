/* ══════════════════════════════════════════════════════════════════════════
   The campfire — high detail
   ─────────────────────────────────────────────────────────────────────────
   The About page's first campfire (assets/campfire.js) taken as far as it
   will go while staying one light, one scene and sixty frames. Everything
   the original does is still here — the flame sheets, the tongues, the
   embers and smoke, the cursor's push, wind and fanning — and on top:

     light      two fire lights flickering out of phase, so the shadows off
                the stones and logs move the way firelight shadows do; 2048
                shadow maps; a cold moon rim so the ring has a back edge
     coals      a bed of glowing coals under the teepee, each breathing on
                its own clock
     sparks     streaks as well as points: each spark is a short line from
                where it is to where it just was, so fast ones read as
                motion rather than as dots
     haze       heat shimmer — a screen-space ripple in the column of air
                above the flames, strongest just over them
     camera     drag to orbit the ring (with inertia), a slow drift when
                idle, and the original's pointer parallax on top
     grade      a soft vignette and a fine grain, after tone mapping

   Pools are larger (embers, tongues, smoke) but every particle is still
   stateless on the GPU, so the CPU cost per frame is the same few writes.
   ═════════════════════════════════════════════════════════════════════════ */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

export const C = {
  size: 1,          // how big the fire burns
  wind: 1,          // how much cursor movement becomes wind
  push: 1,          // how hard the cursor pushes things away
  embers: 1,        // share of the ember pool in use
  smoke: 1,         // smoke opacity
  glow: 0.48,       // bloom strength
  haze: 1,          // heat shimmer
  orbit: 1,         // how far a drag turns the ring
  grain: 1,         // film grain and vignette
};

const BG = new THREE.Color('#161617');

/* shared GLSL: value noise and fbm */
const NOISE = `
  float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float vnoise(vec2 p){
    vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1,0)), u.x), mix(h21(i + vec2(0,1)), h21(i + vec2(1,1)), u.x), u.y);
  }
  float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }
`;

/* ── the pointer field, shared by every particle system ──────────────────
   p is a particle's position, age is 0..1 through its life. Returns the
   offset to add. Older particles are pushed further: they have been in the
   pointer's draught for longer, and a flame's base is anchored to the wood
   while its tip is free. */
const FIELD = `
  uniform vec3 uPtr; uniform float uPtrOn; uniform vec3 uWindV; uniform float uPush;
  vec3 pointerField(vec3 p, float age){
    vec3 d = p - uPtr;
    float r = length(d.xy) + 1e-3;
    float near = exp(-r * r * 1.6) * uPtrOn;
    vec3 away = vec3(d.xy / r, 0.0) * near * 0.9 * uPush;
    vec3 wind = vec3(uWindV.x, uWindV.y * 0.3, 0.0);
    return (away + wind) * age * age;
  }
`;

export function mountHDFire(section, canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setClearColor(BG, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = BG;
  scene.fog = new THREE.Fog(BG, 7.5, 15);

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60);
  /* far enough back that the whole ring sits in frame with air around it,
     the way the reference is shot */
  const camHome = new THREE.Vector3(0, 2.6, 8.6);
  const look = new THREE.Vector3(0, 0.66, 0);
  camera.position.copy(camHome);
  camera.lookAt(look);

  /* ── light ─────────────────────────────────────────────────────────── */
  scene.add(new THREE.HemisphereLight(0x4a4f5a, 0x1a120c, 0.6));
  /* A soft key from the viewer's side. The fire lights the INSIDE of the
     ring; without this every face the camera can see is turned away from
     the only light there is, and the stones and logs read as black. */
  const key = new THREE.DirectionalLight(0xffe3c8, 1.25);
  key.position.set(2.5, 4.5, 7);
  scene.add(key);
  const moon = new THREE.DirectionalLight(0x7d8aa6, 0.18);
  moon.position.set(-4, 6, -3);
  scene.add(moon);
  const fireLight = new THREE.PointLight(0xff8a3a, 16, 10, 1.8);
  fireLight.position.set(0, 0.9, 0);
  fireLight.castShadow = true;
  fireLight.shadow.mapSize.set(2048, 2048);
  fireLight.shadow.bias = -0.004;
  fireLight.shadow.radius = 6;
  scene.add(fireLight);
  /* a second, smaller light out of phase with the first, low in the coals:
     two sources flickering independently is what makes shadows crawl */
  const coalLight = new THREE.PointLight(0xff5a1a, 6, 6, 2);
  coalLight.position.set(0.2, 0.25, 0.1);
  scene.add(coalLight);
  moon.intensity = 0.32;

  /* ── the shared uniforms ───────────────────────────────────────────── */
  const U = {
    uTime: { value: 0 },
    uLife: { value: 0 },          // 0 unlit → 1 burning; the ignition
    uBoost: { value: 0 },         // how hard the fire is being fanned
    uSize: { value: C.size },
    uPtr: { value: new THREE.Vector3(9, 9, 0) },
    uPtrOn: { value: 0 },
    uWindV: { value: new THREE.Vector3() },
    uPush: { value: C.push },
    uScale: { value: 400 },       // pixels per world unit at distance 1
    uSmoke: { value: C.smoke },
  };

  /* ── ground ────────────────────────────────────────────────────────── */
  const soot = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const g = c.getContext('2d');
    const r = g.createRadialGradient(256, 256, 10, 256, 256, 256);
    r.addColorStop(0, '#0a0807'); r.addColorStop(0.35, '#161210'); r.addColorStop(1, '#1d1c1b');
    g.fillStyle = r; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 1400; i++) {
      const a = Math.random() * 6.28, d = Math.pow(Math.random(), 0.7) * 150;
      g.fillStyle = `rgba(${40 + Math.random() * 30},${34 + Math.random() * 20},${30},${Math.random() * 0.5})`;
      g.fillRect(256 + Math.cos(a) * d, 256 + Math.sin(a) * d, 2, 2);
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const ground = new THREE.Mesh(new THREE.CircleGeometry(9, 64),
    new THREE.MeshStandardMaterial({ map: soot, roughness: 1, metalness: 0 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  /* a glow pooled on the ground under the fire — light the shadow map
     cannot give, because it is the bed of embers, not the flame */
  const bedTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'); const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    r.addColorStop(0, 'rgba(255,170,80,1)'); r.addColorStop(0.35, 'rgba(255,90,20,.45)'); r.addColorStop(1, 'rgba(255,60,0,0)');
    g.fillStyle = r; g.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c);
  })();
  const bed = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2),
    new THREE.MeshBasicMaterial({ map: bedTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.5 }));
  bed.rotation.x = -Math.PI / 2; bed.position.y = 0.012;
  scene.add(bed);

  /* ── stones ──────────────────────────────────────────────────────────
     Faceted like the reference: an icosahedron with its corners pushed in
     and out, flat shaded, and a pale line along every crease — the chalky
     worn edges that make them read as stone rather than as grey blobs. */
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xa8a39b, roughness: 0.9, metalness: 0, flatShading: true,
    /* faces pushed back a hair so the crease lines draw clean instead of
       fighting the surface for the same depth and breaking into dashes */
    polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  const edgeMat = new THREE.LineBasicMaterial({ color: 0xe6e0d6, transparent: true, opacity: 0.38 });
  const rng = (() => { let s = 17; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const STONES = 9;
  for (let i = 0; i < STONES; i++) {
    const a = (i / STONES) * Math.PI * 2 + rng() * 0.25;
    const g = new THREE.IcosahedronGeometry(1, 2);
    const pos = g.attributes.position, key = new Map();
    for (let k = 0; k < pos.count; k++) {
      const x = pos.getX(k), y = pos.getY(k), z = pos.getZ(k);
      const id = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
      if (!key.has(id)) {
        /* several scales of dent, so the stone has a shape and a surface */
        const n = Math.sin(x * 2.3 + i * 1.7) * Math.cos(z * 2.9 - i) * 0.16
                + Math.sin(y * 5.7 + z * 4.3 + i * 2) * 0.07
                + Math.sin(z * 11.0 + x * 9.0 + y * 7.0) * 0.03;
        /* a couple of flat fracture faces per stone: clamp against a plane */
        const cut = Math.max(0, (x * Math.cos(i) + z * Math.sin(i)) - 0.55) * 0.5;
        key.set(id, 0.84 + n - cut + rng() * 0.05);
      }
      const f = key.get(id);
      pos.setXYZ(k, x * f, y * f * 0.62, z * f);
    }
    g.computeVertexNormals();
    const s = 0.32 + rng() * 0.18;
    const mat = stoneMat.clone();
    mat.color.setHSL(0.08, 0.05 + rng() * 0.05, 0.36 + rng() * 0.12);
    mat.flatShading = rng() < 0.5;          // some weathered smooth, some fractured
    const m = new THREE.Mesh(g, mat);
    m.scale.set(s * (1.1 + rng() * 0.4), s, s * (0.9 + rng() * 0.3));
    const r = 1.55 + rng() * 0.18;
    m.position.set(Math.cos(a) * r, s * 0.42, Math.sin(a) * r);
    m.rotation.set(rng() * 0.3, rng() * 6.28, rng() * 0.3);
    m.castShadow = m.receiveShadow = true;
    m.add(new THREE.LineSegments(new THREE.EdgesGeometry(g, 34), edgeMat));
    scene.add(m);
  }

  /* ── logs ─────────────────────────────────────────────────────────────
     Bark from a canvas texture, pale end grain on the caps, and a glow
     painted into the wood: the closer a spot is to the heart of the fire,
     the hotter it burns, broken up with noise so it reads as charred and
     smouldering in patches rather than lit evenly. */
  const barkTex = (() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 512;
    const g = c.getContext('2d'); g.fillStyle = '#6b4a33'; g.fillRect(0, 0, 256, 512);
    for (let i = 0; i < 260; i++) {
      const x = Math.random() * 256, w = 1 + Math.random() * 4;
      g.fillStyle = Math.random() < .5 ? `rgba(40,24,14,${.25 + Math.random() * .4})` : `rgba(150,110,80,${.12 + Math.random() * .2})`;
      g.fillRect(x, 0, w, 512);
    }
    for (let i = 0; i < 90; i++) {
      g.fillStyle = `rgba(30,18,10,${.3 + Math.random() * .4})`;
      g.fillRect(Math.random() * 256, Math.random() * 512, 2 + Math.random() * 10, 1 + Math.random() * 3);
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  })();
  const endTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'); g.fillStyle = '#a07a55'; g.fillRect(0, 0, 256, 256);
    for (let r = 120; r > 4; r -= 7 + Math.random() * 5) {
      g.strokeStyle = `rgba(90,60,38,${.35 + Math.random() * .3})`; g.lineWidth = 1.5;
      g.beginPath(); g.arc(128 + Math.random() * 3, 128 + Math.random() * 3, r, 0, 6.28); g.stroke();
    }
    g.strokeStyle = '#3d2718'; g.lineWidth = 10; g.beginPath(); g.arc(128, 128, 124, 0, 6.28); g.stroke();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();

  function burning(mat) {
    mat.onBeforeCompile = sh => {
      sh.uniforms.uTime = U.uTime; sh.uniforms.uLife = U.uLife; sh.uniforms.uBoost = U.uBoost;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWP;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>\nvarying vec3 vWP;\nuniform float uTime, uLife, uBoost;\n${NOISE}`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          float dF = length(vWP - vec3(0.0, 0.55, 0.0));
          float heat = exp(-dF * dF * 3.2);
          float patches = smoothstep(0.42, 0.78, fbm(vWP.xz * 7.0 + vWP.y * 5.0 + vec2(uTime * 0.25, 0.0)));
          float flick = 0.7 + 0.3 * vnoise(vec2(uTime * 6.0, dF * 9.0));
          vec3 ember = mix(vec3(1.0, 0.25, 0.04), vec3(1.0, 0.72, 0.28), patches);
          totalEmissiveRadiance += ember * heat * (0.35 + patches * 2.6) * flick * uLife * (1.0 + uBoost * 0.6);`);
    };
    return mat;
  }
  const barkMat = burning(new THREE.MeshStandardMaterial({ map: barkTex, roughness: 0.95, metalness: 0 }));
  const endMat = burning(new THREE.MeshStandardMaterial({ map: endTex, roughness: 0.9, metalness: 0 }));

  function log(len, r, from, to) {
    const g = new THREE.CylinderGeometry(r * 0.92, r, len, 14, 6);
    const p = g.attributes.position;
    for (let k = 0; k < p.count; k++) {                   // a little knobbly
      const y = p.getY(k), a = Math.atan2(p.getZ(k), p.getX(k));
      const w = 1 + Math.sin(y * 9 + a * 3) * 0.03 + (rng() - .5) * 0.04;
      p.setX(k, p.getX(k) * w); p.setZ(k, p.getZ(k) * w);
    }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, [barkMat, endMat, endMat]);
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    m.castShadow = m.receiveShadow = true;
    scene.add(m);
  }
  /* laid across first, then the teepee leaning in over them */
  log(2.1, 0.12, [-1.05, 0.13, -0.55], [1.05, 0.13, -0.5]);
  log(1.7, 0.11, [-0.7, 0.12, 0.45], [0.8, 0.12, 0.3]);
  log(1.1, 0.1, [0.15, 0.1, 0.55], [0.55, 0.1, -0.2]);
  const TEEPEE = 6, apex = [0.02, 1.62, 0.02];
  for (let i = 0; i < TEEPEE; i++) {
    const a = (i / TEEPEE) * Math.PI * 2 + 0.3, r = 0.78 + (i % 2) * 0.12;
    log(1.95, 0.085 + (i % 3) * 0.01, [Math.cos(a) * r, 0.02, Math.sin(a) * r],
        [apex[0] + Math.cos(a) * 0.06, apex[1] - (i % 2) * 0.12, apex[2] + Math.sin(a) * 0.06]);
  }

  /* ── the flame body ──────────────────────────────────────────────────
     Three crossed sheets of a flame shader, each turned to the camera about
     its own vertical — a billboard that stays upright. Scrolling fbm noise
     carved by a teardrop shape, coloured by a ramp from deep red at the
     ragged edge through orange to a white-hot core pushed over 1.0, so the
     bloom has something to catch. The wind leans each sheet by the square
     of the height: the base stays in the wood, the tip goes with the air. */
  const flameMat = seed => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { ...U, uSeed: { value: seed } },
    vertexShader: `
      uniform float uTime, uLife, uBoost, uSize, uSeed; uniform vec3 uWindV, uPtr; uniform float uPtrOn, uPush;
      varying vec2 vUv; varying float vLean;
      void main(){
        vUv = uv;
        vec3 p = position;
        float h = uv.y;
        float grow = uLife * uSize * (1.0 + uBoost * 0.45);
        p.y *= grow; p.x *= mix(0.85, 1.05, uLife);
        /* lean: wind, plus a shove directly away from a near pointer */
        vec3 wp = (modelMatrix * vec4(0.0, 1.0, 0.0, 1.0)).xyz;
        vec2 d = wp.xy - uPtr.xy; float r = length(d) + 1e-3;
        float near = exp(-r * r * 1.3) * uPtrOn * uPush;
        float lean = uWindV.x * 0.9 + (d.x / r) * near * 1.1;
        lean += sin(uTime * 1.3 + uSeed) * 0.05;
        vLean = lean;
        p.x += lean * h * h * 0.9;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `
      uniform float uTime, uLife, uBoost, uSeed;
      varying vec2 vUv; varying float vLean;
      ${NOISE}
      void main(){
        vec2 p = vUv; float h = p.y;
        float speed = 1.7 + uBoost * 0.8;
        float n1 = fbm(vec2(p.x * 3.6 + uSeed, h * 2.6 - uTime * speed));
        float n2 = fbm(vec2(p.x * 8.0 - uSeed, h * 5.5 - uTime * speed * 1.7));
        /* The centreline itself wanders with the noise, more the higher it
           goes, so the flame splits and sways into separate tongues instead
           of standing as one clean cone. */
        float cx = 0.5 - vLean * h * 0.08 + (n1 - 0.5) * 0.34 * h;
        float w = mix(0.40, 0.02, pow(h, 0.72));
        float d = abs(p.x - cx) / w;
        float f = (1.0 - d) * 0.9 + (n1 * 1.25 + n2 * 0.6 - 1.02) - h * 0.45;
        /* the upper half tears apart into licks */
        f -= smoothstep(0.25, 1.0, h) * (1.0 - n2) * 0.7;
        f *= smoothstep(0.0, 0.08, h);                     /* soft root in the wood */
        float a = smoothstep(0.0, 0.36, f) * uLife;
        vec3 deep = vec3(0.55, 0.06, 0.01), orange = vec3(1.0, 0.36, 0.05),
             gold = vec3(1.0, 0.72, 0.22), core = vec3(1.35, 1.12, 0.62);
        vec3 col = mix(deep, orange, smoothstep(0.0, 0.2, f));
        col = mix(col, gold, smoothstep(0.2, 0.48, f));
        col = mix(col, core, smoothstep(0.62, 0.95, f) * (1.0 - h * 0.7));
        /* three sheets overlap additively, so each carries a share */
        gl_FragColor = vec4(col * a * 0.62, a);
      }`,
  });
  const flames = [];
  [[0, 1.55, 2.5, 1.3], [-0.14, 1.2, 1.95, 4.7], [0.16, 1.05, 1.75, 8.1]].forEach(([x, w, h, s]) => {
    const g = new THREE.PlaneGeometry(w, h, 1, 24); g.translate(0, h / 2, 0);
    const m = new THREE.Mesh(g, flameMat(s));
    m.position.set(x, 0.12, x * 0.4);
    m.renderOrder = 5;
    scene.add(m); flames.push(m);
  });

  /* ── particle systems ────────────────────────────────────────────────
     One helper for all three: N points, each with a seed and a random
     phase. Position, size and colour are functions of (time, seed) in the
     vertex shader, so there is no per-frame CPU work at all. */
  function particles(n, vs, fs, blending) {
    const g = new THREE.BufferGeometry();
    const seed = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { seed[i*4] = Math.random(); seed[i*4+1] = Math.random(); seed[i*4+2] = Math.random(); seed[i*4+3] = Math.random(); }
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
    const m = new THREE.ShaderMaterial({ uniforms: U, vertexShader: vs, fragmentShader: fs,
      transparent: true, depthWrite: false, blending });
    const pts = new THREE.Points(g, m);
    pts.frustumCulled = false;
    scene.add(pts);
    return pts;
  }
  const HEAD = `
    attribute vec4 aSeed;
    uniform float uTime, uLife, uBoost, uSize, uScale, uSmoke;
    ${NOISE}
    ${FIELD}`;

  /* flame tongues: short-lived licks that give the body its lapping edge */
  const tongues = particles(520, `${HEAD}
      varying float vAge; varying float vHot;
      void main(){
        float life = 0.55 + aSeed.x * 0.5;
        float age = fract(uTime * (1.0 + uBoost * 0.5) / life + aSeed.y);
        float a = aSeed.z * 6.2832, r = sqrt(aSeed.w) * 0.42;
        vec3 p = vec3(cos(a) * r, 0.2, sin(a) * r * 0.6);
        p.y += age * (1.25 + aSeed.x * 0.9) * uSize * (1.0 + uBoost * 0.5);
        p.x *= 1.0 - age * 0.75; p.z *= 1.0 - age * 0.75;   /* drawn into the column */
        p.x += (vnoise(vec2(aSeed.y * 40.0, uTime * 3.0)) - 0.5) * 0.25 * age;
        p += pointerField(p, age) * 0.8;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vAge = age; vHot = 1.0 - r * 1.5;
        gl_PointSize = (0.6 + aSeed.x * 0.4) * (1.0 - age * 0.7) * uScale / -mv.z * uLife;
        gl_Position = projectionMatrix * mv;
      }`, `
      varying float vAge; varying float vHot;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d); a *= a;
        a *= smoothstep(0.0, 0.12, vAge) * (1.0 - smoothstep(0.55, 1.0, vAge));
        vec3 col = mix(vec3(1.0, 0.8, 0.35) * 1.5, vec3(0.9, 0.2, 0.03), vAge);
        col = mix(col, vec3(1.3, 1.1, 0.7), max(vHot, 0.0) * (1.0 - vAge) * 0.5);
        gl_FragColor = vec4(col * a * 0.24, a * 0.24);
      }`, THREE.AdditiveBlending);

  /* embers: tiny sparks that climb well above the flames, sway and wink out */
  const EMBERS = 760;
  const embers = particles(EMBERS, `${HEAD}
      varying float vAge; varying float vFl;
      void main(){
        float life = 1.8 + aSeed.x * 2.4;
        float age = fract(uTime / life + aSeed.y);
        float a = aSeed.z * 6.2832, r = aSeed.w * 0.5;
        vec3 p = vec3(cos(a) * r, 0.35, sin(a) * r * 0.7);
        float rise = age * (2.4 + aSeed.x * 2.2) * (1.0 + uBoost * 0.35);
        p.y += rise;
        /* an outward pop for a few of them, then a drifting climb */
        p.xz += vec2(cos(a), sin(a)) * age * (0.15 + step(0.85, aSeed.w) * 0.9);
        p.x += sin(uTime * (1.2 + aSeed.x) + aSeed.y * 30.0) * 0.28 * age;
        p.z += cos(uTime * (0.9 + aSeed.z) + aSeed.x * 20.0) * 0.18 * age;
        p += pointerField(p, age) * 1.6;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vAge = age;
        vFl = 0.55 + 0.45 * sin(uTime * (14.0 + aSeed.z * 20.0) + aSeed.x * 50.0);
        gl_PointSize = (0.035 + aSeed.z * 0.03) * uScale / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`, `
      varying float vAge; varying float vFl;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.05, d);
        a *= smoothstep(0.0, 0.06, vAge) * (1.0 - smoothstep(0.6, 1.0, vAge)) * vFl;
        vec3 col = mix(vec3(1.9, 1.3, 0.6), vec3(1.0, 0.28, 0.04), vAge);
        gl_FragColor = vec4(col * a, a);
      }`, THREE.AdditiveBlending);

  /* smoke: soft grey puffs rising off the tips, growing and thinning as they go */
  const smoke = particles(150, `${HEAD}
      varying float vAge; varying float vSeed;
      void main(){
        float life = 4.5 + aSeed.x * 3.0;
        float age = fract(uTime / life + aSeed.y);
        vec3 p = vec3((aSeed.z - 0.5) * 0.4, 1.7 * uSize + age * 3.6, (aSeed.w - 0.5) * 0.3);
        p.x += sin(uTime * 0.4 + aSeed.y * 12.0) * 0.35 * age + age * age * 0.5;
        p += pointerField(p, age) * 2.4;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vAge = age; vSeed = aSeed.x;
        gl_PointSize = (0.7 + age * 2.4) * uScale / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`, `
      uniform float uTime, uSmoke, uLife;
      varying float vAge; varying float vSeed;
      ${NOISE}
      void main(){
        vec2 q = gl_PointCoord - 0.5;
        float d = length(q);
        float n = fbm(q * 4.0 + vec2(vSeed * 20.0, uTime * 0.2 - vAge * 2.0));
        float a = smoothstep(0.5, 0.1, d) * (0.4 + n * 0.9);
        a *= smoothstep(0.0, 0.2, vAge) * (1.0 - smoothstep(0.45, 1.0, vAge));
        a *= 0.05 * uSmoke * uLife;
        gl_FragColor = vec4(vec3(0.27, 0.26, 0.25), a);
      }`, THREE.NormalBlending);
  smoke.renderOrder = 6;

  /* a soft halo behind the fire — the air itself glowing */
  const haloTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'); const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    r.addColorStop(0, 'rgba(255,140,50,.26)'); r.addColorStop(0.4, 'rgba(255,90,20,.07)'); r.addColorStop(1, 'rgba(255,60,0,0)');
    g.fillStyle = r; g.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c);
  })();
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  halo.scale.set(4.2, 4.2, 1); halo.position.set(0, 1.0, -0.6);
  scene.add(halo);

  /* ── the coal bed ──────────────────────────────────────────────────── */
  const COALS = 70;
  const coalMat = new THREE.MeshStandardMaterial({ color: 0x1a1512, roughness: 0.9, flatShading: true });
  coalMat.onBeforeCompile = sh => {
    sh.uniforms.uTime = U.uTime; sh.uniforms.uLife = U.uLife; sh.uniforms.uBoost = U.uBoost;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vSeed; varying vec3 vLocal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSeed = fract(sin(dot(instanceMatrix[3].xz, vec2(12.9898, 78.233))) * 43758.5453); vLocal = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vSeed; varying vec3 vLocal; uniform float uTime, uLife, uBoost;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float breathe = 0.55 + 0.45 * sin(uTime * (0.8 + vSeed * 1.7) + vSeed * 40.0);
        float cracks = smoothstep(0.35, 0.0, abs(sin(vLocal.x * 13.0 + vSeed * 9.0) * sin(vLocal.z * 11.0 - vSeed * 7.0)));
        totalEmissiveRadiance += mix(vec3(1.0, 0.18, 0.02), vec3(1.0, 0.55, 0.15), breathe) * (0.25 + cracks * 1.6) * breathe * uLife * (1.0 + uBoost * 0.8);`);
  };
  const coals = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.07, 0), coalMat, COALS);
  { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
    for (let i = 0; i < COALS; i++) {
      const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * 0.75;
      v.set(Math.cos(a) * r, 0.03 + rng() * 0.04, Math.sin(a) * r);
      q.setFromEuler(e.set(rng() * 3, rng() * 3, rng() * 3));
      const k = 0.6 + rng() * 1.1; sc.set(k, k * 0.7, k);
      coals.setMatrixAt(i, m4.compose(v, q, sc));
    } }
  coals.receiveShadow = true;
  scene.add(coals);

  /* ── sparks as streaks: each a line from now back to a moment ago ───── */
  const SPARKS = 140;
  const spG = new THREE.BufferGeometry();
  const spSeed = new Float32Array(SPARKS * 2 * 4), spTail = new Float32Array(SPARKS * 2);
  for (let i = 0; i < SPARKS; i++) {
    const sd = [Math.random(), Math.random(), Math.random(), Math.random()];
    for (let e = 0; e < 2; e++) { spSeed.set(sd, (i * 2 + e) * 4); spTail[i * 2 + e] = e; }
  }
  spG.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SPARKS * 2 * 3), 3));
  spG.setAttribute('aSeed', new THREE.BufferAttribute(spSeed, 4));
  spG.setAttribute('aTail', new THREE.BufferAttribute(spTail, 1));
  const sparks = new THREE.LineSegments(spG, new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute vec4 aSeed; attribute float aTail;
      uniform float uTime, uLife, uBoost, uSize;
      ${FIELD}
      varying float vA;
      vec3 at(float t){
        float life = 0.9 + aSeed.x * 1.2;
        float age = fract(t / life + aSeed.y);
        float a = aSeed.z * 6.2832;
        vec3 p = vec3(cos(a) * aSeed.w * 0.35, 0.3, sin(a) * aSeed.w * 0.25);
        /* fast, ballistic: thrown up and out, then slowing and drifting */
        float v0 = 3.2 + aSeed.x * 2.6;
        p.y += v0 * age - 1.1 * age * age;
        p.xz += vec2(cos(a), sin(a)) * age * (0.4 + aSeed.w * 0.9);
        p.x += sin(t * 3.0 + aSeed.y * 40.0) * 0.12 * age;
        p += pointerField(p, age) * 1.4;
        vA = smoothstep(0.0, 0.05, age) * (1.0 - smoothstep(0.5, 1.0, age));
        return p;
      }
      void main(){
        vec3 p = at(uTime - aTail * 0.045);
        /* the head is lit and the tail fades to nothing, so each line is a
           streak; only some sparks fly at rest, and more when it is fanned */
        vA *= uLife * (1.0 - aTail) * step(0.55, aSeed.y + 0.45 * uBoost);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `varying float vA; void main(){ gl_FragColor = vec4(vec3(2.2, 1.3, 0.55) * vA, vA); }`,
  }));
  sparks.frustumCulled = false;
  scene.add(sparks);

  /* ── post ──────────────────────────────────────────────────────────── */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  /* a high threshold: only the flame's core should bloom, not the stones it lights */
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), C.glow, 0.55, 0.82);
  /* heat shimmer, in the column of air over the flames */
  const haze = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uC: { value: new THREE.Vector2(0.5, 0.5) }, uTop: { value: new THREE.Vector2(0.5, 0.2) }, uAmt: { value: 1 }, uAspect: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `
      uniform sampler2D tDiffuse; uniform float uTime, uAmt, uAspect; uniform vec2 uC, uTop; varying vec2 vUv;
      ${NOISE}
      void main(){
        /* a soft column from the fire's heart up past the tips */
        float h = clamp((vUv.y - uC.y) / max(1e-3, uTop.y - uC.y), 0.0, 1.0);
        float cx = mix(uC.x, uTop.x, h);
        float w = mix(0.05, 0.12, h);
        float m = exp(-pow((vUv.x - cx) * uAspect / w, 2.0)) * smoothstep(0.0, 0.15, h) * (1.0 - smoothstep(0.7, 1.0, h));
        vec2 q = vec2(vUv.x * 40.0, vUv.y * 22.0 - uTime * 3.2);
        vec2 off = vec2(vnoise(q) - 0.5, vnoise(q + 17.3) - 0.5) * 0.006 * m * uAmt;
        gl_FragColor = texture2D(tDiffuse, vUv + off);
      }`,
  });
  composer.addPass(haze);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  /* the grade: vignette and grain, after tone mapping */
  const grade = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uAmt: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime, uAmt; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){
        vec4 c = texture2D(tDiffuse, vUv);
        float v = smoothstep(1.05, 0.35, length((vUv - 0.5) * vec2(1.1, 1.0)));
        c.rgb *= mix(1.0, 0.55 + 0.45 * v, uAmt);
        c.rgb += (h(vUv * 900.0 + fract(uTime * 7.3)) - 0.5) * 0.035 * uAmt;
        gl_FragColor = c;
      }`,
  });
  composer.addPass(grade);

  /* ── sizing ────────────────────────────────────────────────────────── */
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(devicePixelRatio || 1, 1.75);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(dpr);
    composer.setSize(w, h);
    camera.aspect = w / h;
    /* keep the whole ring in frame on a narrow screen */
    camera.fov = w / h < 1 ? 48 : 34;
    camera.updateProjectionMatrix();
    U.uScale.value = h * dpr * 0.5 / Math.tan(camera.fov * Math.PI / 360);
  }
  resize();
  new ResizeObserver(resize).observe(canvas);

  /* ── the pointer ─────────────────────────────────────────────────────
     Projected onto the upright plane through the fire, so "near the fire"
     means near it on screen and in the scene at once. Its velocity, in
     world units, is smoothed into wind; its speed fans the fire. */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const hit = new THREE.Vector3(), last = new THREE.Vector3(), vel = new THREE.Vector3();
  let inside = false, lastT = performance.now(), fan = 0;
  section.addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    if (!ray.ray.intersectPlane(plane, hit)) return;
    const now = performance.now(), dt = Math.max(8, now - lastT) / 1000;
    if (inside) {
      const v = hit.clone().sub(last).divideScalar(dt);
      vel.lerp(v.clampLength(0, 12), 0.35);
      /* a fast pass near the fire is a gust */
      const near = Math.exp(-Math.pow(hit.distanceTo(new THREE.Vector3(0, 1, 0)), 2) * 0.35);
      fan = Math.min(1.6, fan + v.length() * near * dt * 0.9);
    }
    last.copy(hit); lastT = now; inside = true;
    U.uPtr.value.copy(hit);
  }, { passive: true });
  section.addEventListener('pointerleave', () => { inside = false; });

  /* drag to orbit */
  const orbit = { a: 0, e: 0, va: 0 };
  let dragging = false, dx0 = 0, dy0 = 0, lastDX = 0, lastDT = performance.now();
  section.addEventListener('pointerdown', e => { dragging = true; dx0 = e.clientX; dy0 = e.clientY; lastDX = e.clientX; section.setPointerCapture(e.pointerId); section.classList.add('dragging'); });
  section.addEventListener('pointermove', e => {
    if (!dragging) return;
    const now = performance.now(), ddt = Math.max(8, now - lastDT) / 1000;
    const d = (e.clientX - lastDX) / section.clientWidth;
    orbit.a -= d * 2.4 * C.orbit; orbit.va = -d * 2.4 * C.orbit / ddt;
    orbit.e += (e.clientY - dy0) / section.clientHeight * 0.02; dy0 = e.clientY;
    lastDX = e.clientX; lastDT = now;
  });
  const endDrag = () => { if (!dragging) return; dragging = false; section.classList.remove('dragging'); };
  section.addEventListener('pointerup', endDrag); section.addEventListener('pointercancel', endDrag);

  /* ── the run ───────────────────────────────────────────────────────── */
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let raf = 0, visible = false, t0 = performance.now(), prev = t0, ignite = 0;
  const lp = new THREE.Vector3(0, 0.9, 0);

  function frame(now) {
    raf = visible ? requestAnimationFrame(frame) : 0;
    /* Never negative. A frame's timestamp is when the frame STARTED, and can
       land a hair before a performance.now() taken just earlier (on
       becoming visible, say). A negative dt turns every eased follower
       below into one that runs backwards and overshoots — values that grow
       instead of settling. */
    const dt = Math.max(0, Math.min(0.05, (now - prev) / 1000)); prev = Math.max(prev, now);
    const t = reduced ? 3.0 : (now - t0) / 1000;
    U.uTime.value = t;

    /* the ignition: the fire catches as the section arrives */
    ignite = Math.min(1, ignite + dt / 2.4);
    U.uLife.value = reduced ? 1 : ignite * ignite * (3 - 2 * ignite);

    /* pointer: presence eases in and out, wind decays, fanning cools off */
    U.uPtrOn.value += ((inside ? 1 : 0) - U.uPtrOn.value) * Math.min(1, dt * 4);
    if (!inside) vel.multiplyScalar(Math.pow(0.1, dt));
    U.uWindV.value.lerp(vel.clone().multiplyScalar(0.07 * C.wind), Math.min(1, dt * 3));
    U.uWindV.value.multiplyScalar(Math.pow(0.35, dt));
    fan *= Math.pow(0.25, dt);
    U.uBoost.value += (fan - U.uBoost.value) * Math.min(1, dt * 5);
    U.uSize.value = C.size; U.uPush.value = C.push; U.uSmoke.value = C.smoke;
    bloom.strength = C.glow;
    embers.geometry.setDrawRange(0, Math.round(EMBERS * C.embers));

    /* the light breathes and dances with the flames */
    const f = 0.78 + 0.14 * Math.sin(t * 9.3) * Math.sin(t * 5.7 + 1.3) + 0.08 * Math.sin(t * 23.0);
    fireLight.intensity = 16 * f * U.uLife.value * (1 + U.uBoost.value * 0.55) * C.size;
    lp.set(Math.sin(t * 7.1) * 0.05 + U.uWindV.value.x * 0.25, 0.9 + Math.sin(t * 5.3) * 0.05, Math.cos(t * 6.2) * 0.05);
    fireLight.position.copy(lp);
    halo.material.opacity = (0.75 + 0.25 * f) * U.uLife.value;
    bed.material.opacity = (0.32 + 0.18 * f) * U.uLife.value;

    /* flame sheets turn about their own vertical to face the camera */
    for (const m of flames) m.rotation.y = Math.atan2(camera.position.x - m.position.x, camera.position.z - m.position.z);

    /* the camera: a drag orbits the ring (with inertia), an idle one drifts
       slowly round it, and the pointer's parallax rides on top */
    if (!dragging) {
      orbit.va *= Math.pow(0.08, dt);
      orbit.a += orbit.va * dt + (reduced ? 0 : Math.sin(t * 0.11) * 0.012 * dt);
      orbit.a *= Math.pow(0.6, dt * (Math.abs(orbit.va) < 0.02 ? 1 : 0));   // ease home when let go
    }
    orbit.a = Math.max(-0.55 * C.orbit, Math.min(0.55 * C.orbit, orbit.a));
    orbit.e = Math.max(-0.12, Math.min(0.22, orbit.e));
    const px = inside ? ndc.x : 0, py = inside ? ndc.y : 0;
    const R = Math.hypot(camHome.z, camHome.y - look.y);
    const ay = Math.atan2(camHome.y - look.y, camHome.z) + orbit.e + py * 0.02;
    const tx = Math.sin(orbit.a + px * 0.04) * Math.cos(ay) * R, tz = Math.cos(orbit.a + px * 0.04) * Math.cos(ay) * R, tyy = look.y + Math.sin(ay) * R;
    camera.position.x += (tx - camera.position.x) * Math.min(1, dt * 3);
    camera.position.y += (tyy - camera.position.y) * Math.min(1, dt * 3);
    camera.position.z += (tz - camera.position.z) * Math.min(1, dt * 3);
    camera.lookAt(look);

    /* the second light, out of phase; the post passes' clocks */
    coalLight.intensity = 6 * (0.7 + 0.3 * Math.sin(t * 6.1 + 2.0) * Math.sin(t * 3.7)) * U.uLife.value * (1 + U.uBoost.value * 0.8);
    const c0 = new THREE.Vector3(0, 0.6, 0).project(camera), c1 = new THREE.Vector3(U.uWindV.value.x * 0.8, 2.6 * C.size, 0).project(camera);
    haze.uniforms.uC.value.set(c0.x * 0.5 + 0.5, c0.y * 0.5 + 0.5);
    haze.uniforms.uTop.value.set(c1.x * 0.5 + 0.5, c1.y * 0.5 + 0.5);
    haze.uniforms.uTime.value = t; haze.uniforms.uAmt.value = C.haze * U.uLife.value;
    haze.uniforms.uAspect.value = camera.aspect;
    grade.uniforms.uTime.value = t; grade.uniforms.uAmt.value = C.grain;

    composer.render();
  }

  function setVisible(v, ratio = 1) {
    const was = visible;
    visible = v;
    if (visible && !was) {
      /* relight each time it comes back into view — the arrival is part of it */
      if (ratio < 0.6 && ignite >= 1) ignite = 0.35;
      prev = performance.now();
      if (!raf) raf = requestAnimationFrame(frame);
    }
    section.classList.toggle('is-lit', visible);
  }
  new IntersectionObserver(([e]) => setVisible(e.isIntersecting, e.intersectionRatio),
    { threshold: [0, 0.25, 0.6] }).observe(section);
  /* A plain scroll check as well. The observer can report late — some
     embedded browser panes hold its callbacks back for seconds — and a
     fire that has not lit when you arrive at it is the one failure this
     section cannot have. */
  const check = () => {
    const r = section.getBoundingClientRect();
    const on = r.bottom > 0 && r.top < innerHeight;
    if (on !== visible) setVisible(on, on ? Math.min(1, (Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)) / r.height) : 0);
  };
  addEventListener('scroll', check, { passive: true });
  addEventListener('resize', check);
  check();

  return {
    C, U,
    /* Advance the fire by hand, n frames of dt seconds. For checking it in
       places that stop requestAnimationFrame — a background tab, a hidden
       preview pane — where the loop would otherwise never run. */
    step(n = 1, dt = 1 / 60) {
      /* visible off so frame() does not queue a second loop; the running
         loop's handle is kept so it carries on untouched afterwards */
      const keepV = visible, keepR = raf; visible = false;
      for (let i = 0; i < n; i++) frame(prev + dt * 1000);
      visible = keepV; raf = keepR;
    },
    relight() { ignite = 0; if (!raf && visible) raf = requestAnimationFrame(frame); },
  };
}
