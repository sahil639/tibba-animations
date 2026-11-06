/* ══════════════════════════════════════════════════════════════════════════
   The campfire — low-poly
   ─────────────────────────────────────────────────────────────────────────
   The About page's first campfire (assets/campfire.js), re-cut as facets:
   the same ring of stones, the same teepee over the same laid logs, the
   same fire and the same answers to the cursor — every surface reduced to
   a few flat planes.

     stones    icosahedra at detail 0 — twenty faces each — with every
               corner pushed in or out, flat shaded, the creases outlined
     logs      six-sided prisms, flat shaded, burning in facets
     ground    a jittered low-poly disc, each triangle its own tone
     flame     no noise sheets: stacked faceted crystals — an outer red
               shell, an orange body, a gold core — each tongue an
               elongated octahedron that stretches, sways and leans away
               from the cursor, with its facets catching the light
     embers    square sparks, not round ones; smoke is a few slow facets

   The cursor is the original's: near the fire the flames lean away, a
   quick pass fans them taller and brighter, and movement becomes wind.
   ═════════════════════════════════════════════════════════════════════════ */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export const C = { size: 1, wind: 1, push: 1, embers: 1, glow: 0.5, facets: 1 };
const BG = new THREE.Color('#161617');

export function mountLowPolyFire(section, canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setClearColor(BG, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background = BG;
  scene.fog = new THREE.Fog(BG, 7.5, 15);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60);
  const camHome = new THREE.Vector3(0, 2.6, 8.6), look = new THREE.Vector3(0, 0.66, 0);
  camera.position.copy(camHome); camera.lookAt(look);

  scene.add(new THREE.HemisphereLight(0x4a4f5a, 0x1a120c, 0.65));
  const key = new THREE.DirectionalLight(0xffe3c8, 1.2); key.position.set(2.5, 4.5, 7); scene.add(key);
  const fireLight = new THREE.PointLight(0xff8a3a, 16, 10, 1.8);
  fireLight.position.set(0, 0.9, 0); fireLight.castShadow = true;
  fireLight.shadow.mapSize.set(1024, 1024); fireLight.shadow.bias = -0.004;
  scene.add(fireLight);

  let s = 17; const rng = () => (s = (s * 16807) % 2147483647) / 2147483647;

  /* ── ground: a jittered low-poly disc ─────────────────────────────── */
  {
    const g = new THREE.CircleGeometry(9, 28, 0, Math.PI * 2).toNonIndexed();
    /* subdivide by rebuilding as rings, so the disc has facets to shade */
    const rings = 9, seg = 28, pos = [], col = [];
    const pt = (ri, si) => {
      const r = (ri / rings) * 9, a = (si / seg) * Math.PI * 2 + (ri % 2) * (Math.PI / seg);
      const j = ri === 0 ? 0 : 0.18 * Math.sin(si * 12.9898 + ri * 78.233) ;
      return [Math.cos(a) * (r + j), (ri === 0 ? 0 : 0.03 * Math.sin(si * 3.1 + ri * 1.7)), Math.sin(a) * (r + j)];
    };
    for (let ri = 0; ri < rings; ri++) for (let si = 0; si < seg; si++) {
      const a = pt(ri, si), b = pt(ri, si + 1), c = pt(ri + 1, si), d = pt(ri + 1, si + 1);
      for (const tri of [[a, c, b], [b, c, d]]) {
        const tone = 0.07 + (ri < 2 ? 0.0 : 0.03) + rng() * 0.035;
        tri.forEach(v => { pos.push(...v); col.push(tone * 1.05, tone, tone * 0.95); });
      }
    }
    g.dispose();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.computeVertexNormals();
    const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }));
    ground.receiveShadow = true;
    scene.add(ground);
  }

  /* ── stones: twenty faces each ────────────────────────────────────── */
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xa8a39b, roughness: 0.9, flatShading: true, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  const edgeMat = new THREE.LineBasicMaterial({ color: 0xe6e0d6, transparent: true, opacity: 0.42 });
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + rng() * 0.25;
    const g = new THREE.IcosahedronGeometry(1, 0);
    const p = g.attributes.position, keyM = new Map();
    for (let k = 0; k < p.count; k++) {
      const id = `${p.getX(k).toFixed(3)},${p.getY(k).toFixed(3)},${p.getZ(k).toFixed(3)}`;
      if (!keyM.has(id)) keyM.set(id, 0.78 + rng() * 0.36);
      const f = keyM.get(id);
      p.setXYZ(k, p.getX(k) * f, p.getY(k) * f * 0.62, p.getZ(k) * f);
    }
    g.computeVertexNormals();
    const sc = 0.36 + rng() * 0.2, m = new THREE.Mesh(g, stoneMat);
    m.scale.set(sc * (1.1 + rng() * 0.4), sc, sc * (0.9 + rng() * 0.3));
    const r = 1.55 + rng() * 0.18;
    m.position.set(Math.cos(a) * r, sc * 0.42, Math.sin(a) * r);
    m.rotation.set(rng() * 0.3, rng() * 6.28, rng() * 0.3);
    m.castShadow = m.receiveShadow = true;
    m.add(new THREE.LineSegments(new THREE.EdgesGeometry(g, 1), edgeMat));
    scene.add(m);
  }

  /* ── the shared uniforms ──────────────────────────────────────────── */
  const U = { uTime: { value: 0 }, uLife: { value: 0 }, uBoost: { value: 0 } };

  /* ── logs: hexagonal prisms, burning in facets ────────────────────── */
  const logMat = new THREE.MeshStandardMaterial({ color: 0x5e4231, roughness: 0.95, flatShading: true });
  const endMat = new THREE.MeshStandardMaterial({ color: 0x9a7552, roughness: 0.9, flatShading: true });
  [logMat, endMat].forEach(mat => {
    mat.onBeforeCompile = sh => {
      sh.uniforms.uTime = U.uTime; sh.uniforms.uLife = U.uLife; sh.uniforms.uBoost = U.uBoost;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;\nuniform float uTime, uLife, uBoost;')
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          float dF = length(vWP - vec3(0.0, 0.55, 0.0));
          float heat = exp(-dF * dF * 3.4);
          /* per-facet flicker: quantise position so a whole face glows together */
          vec3 cell = floor(vWP * 7.0);
          float n = fract(sin(dot(cell, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
          float flick = 0.6 + 0.4 * sin(uTime * (3.0 + n * 5.0) + n * 30.0);
          totalEmissiveRadiance += mix(vec3(1.0, 0.25, 0.04), vec3(1.0, 0.7, 0.25), n) * heat * (0.4 + step(0.55, n) * 2.2) * flick * uLife * (1.0 + uBoost * 0.6);`);
    };
  });
  function log(len, r, from, to) {
    const g = new THREE.CylinderGeometry(r * 0.94, r, len, 6, 1);
    const m = new THREE.Mesh(g, [logMat, endMat, endMat]);
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    m.rotateY(rng() * 3);
    m.castShadow = m.receiveShadow = true;
    scene.add(m);
  }
  log(2.1, 0.13, [-1.05, 0.13, -0.55], [1.05, 0.13, -0.5]);
  log(1.7, 0.12, [-0.7, 0.12, 0.45], [0.8, 0.12, 0.3]);
  log(1.1, 0.11, [0.15, 0.1, 0.55], [0.55, 0.1, -0.2]);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3, r = 0.78 + (i % 2) * 0.12;
    log(1.95, 0.095 + (i % 3) * 0.01, [Math.cos(a) * r, 0.02, Math.sin(a) * r], [0.02 + Math.cos(a) * 0.06, 1.62 - (i % 2) * 0.12, 0.02 + Math.sin(a) * 0.06]);
  }

  /* ── the flame: faceted crystals ──────────────────────────────────────
     Each tongue is an elongated octahedron, pivoted at its base so it
     stretches upward. Three layers from the outside in; the inner layers
     are shorter and hotter. They are emissive enough to bloom, but flat
     shaded so each facet reads as a plane. */
  const flameG = new THREE.OctahedronGeometry(1, 0);
  flameG.translate(0, 1, 0);
  const LAYERS = [
    { n: 7, col: 0xc92f10, em: 0xb3260a, r: 0.42, h: [1.25, 1.9], w: 0.26, o: 0.95 },
    { n: 6, col: 0xff6a1f, em: 0xff5a14, r: 0.28, h: [0.95, 1.45], w: 0.22, o: 0.95 },
    { n: 4, col: 0xffc766, em: 0xffb347, r: 0.12, h: [0.6, 0.95], w: 0.17, o: 1 },
  ];
  const tongues = [];
  LAYERS.forEach((L, li) => {
    const mat = new THREE.MeshStandardMaterial({ color: L.col, emissive: L.em, emissiveIntensity: 1.3 + li * 0.5, flatShading: true, roughness: 0.6, transparent: true, opacity: L.o });
    for (let i = 0; i < L.n; i++) {
      const a = (i / L.n) * Math.PI * 2 + li * 0.4 + rng() * 0.4;
      const m = new THREE.Mesh(flameG, mat);
      const baseH = L.h[0] + rng() * (L.h[1] - L.h[0]);
      m.position.set(Math.cos(a) * L.r, 0.16, Math.sin(a) * L.r * 0.8);
      m.userData = { baseH, w: L.w * (0.8 + rng() * 0.5), ph: rng() * 20, sp: 1.6 + rng() * 1.8, li, tilt: (rng() - 0.5) * 0.3, a };
      m.rotation.y = rng() * Math.PI;
      m.renderOrder = 5 + li;
      scene.add(m); tongues.push(m);
    }
  });

  /* ── embers: square sparks ─────────────────────────────────────────── */
  const EMBERS = 260;
  const eg = new THREE.BufferGeometry();
  const seed = new Float32Array(EMBERS * 4); for (let i = 0; i < seed.length; i++) seed[i] = Math.random();
  eg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(EMBERS * 3), 3));
  eg.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  const EU = { uTime: U.uTime, uBoost: U.uBoost, uScale: { value: 400 }, uWind: { value: new THREE.Vector3() } };
  const embers = new THREE.Points(eg, new THREE.ShaderMaterial({
    uniforms: EU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec4 aSeed; uniform float uTime, uBoost, uScale; uniform vec3 uWind; varying float vAge;
      void main(){
        float life = 1.8 + aSeed.x * 2.2, age = fract(uTime / life + aSeed.y);
        float a = aSeed.z * 6.2832, r = aSeed.w * 0.45;
        vec3 p = vec3(cos(a) * r, 0.4, sin(a) * r * 0.7);
        p.y += age * (2.2 + aSeed.x * 2.0) * (1.0 + uBoost * 0.35);
        p.x += sin(uTime * (1.2 + aSeed.x) + aSeed.y * 30.0) * 0.26 * age + uWind.x * age * age * 1.4;
        vec4 mv = modelViewMatrix * vec4(p, 1.0); vAge = age;
        gl_PointSize = (0.05 + aSeed.z * 0.04) * uScale / -mv.z; gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `varying float vAge;
      void main(){
        vec2 q = abs(gl_PointCoord - 0.5);
        if (max(q.x, q.y) > 0.36) discard;               // a square, not a disc
        float a = smoothstep(0.0, 0.06, vAge) * (1.0 - smoothstep(0.55, 1.0, vAge));
        gl_FragColor = vec4(mix(vec3(1.8, 1.2, 0.5), vec3(1.0, 0.28, 0.04), vAge) * a, a);
      }`,
  }));
  embers.frustumCulled = false; scene.add(embers);

  /* ── smoke: a few slow grey facets ─────────────────────────────────── */
  const smokeG = new THREE.IcosahedronGeometry(0.22, 0);
  const smokeMat = new THREE.MeshStandardMaterial({ color: 0x3b3a39, flatShading: true, transparent: true, opacity: 0.12, depthWrite: false, roughness: 1 });
  const smoke = Array.from({ length: 14 }, (_, i) => {
    const m = new THREE.Mesh(smokeG, smokeMat.clone()); m.userData = { ph: i / 14, sp: 0.09 + rng() * 0.05, x: (rng() - .5) * .3 };
    scene.add(m); return m;
  });

  /* ── post ──────────────────────────────────────────────────────────── */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), C.glow, 0.45, 0.8);
  composer.addPass(bloom); composer.addPass(new OutputPass());

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
    const dpr = Math.min(devicePixelRatio || 1, 1.75);
    renderer.setPixelRatio(dpr); renderer.setSize(w, h, false); composer.setPixelRatio(dpr); composer.setSize(w, h);
    camera.aspect = w / h; camera.fov = w / h < 1 ? 48 : 34; camera.updateProjectionMatrix();
    EU.uScale.value = h * dpr * 0.5 / Math.tan(camera.fov * Math.PI / 360);
  }
  resize(); new ResizeObserver(resize).observe(canvas);

  /* ── the pointer: the original's push, wind and fanning ───────────── */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const hit = new THREE.Vector3(), last = new THREE.Vector3(), vel = new THREE.Vector3();
  let inside = false, lastT = performance.now(), fan = 0, ptrOn = 0;
  const wind = new THREE.Vector3();
  section.addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera); if (!ray.ray.intersectPlane(plane, hit)) return;
    const now = performance.now(), dt = Math.max(8, now - lastT) / 1000;
    if (inside) {
      const v = hit.clone().sub(last).divideScalar(dt); vel.lerp(v.clampLength(0, 12), 0.35);
      const near = Math.exp(-Math.pow(hit.distanceTo(new THREE.Vector3(0, 1, 0)), 2) * 0.35);
      fan = Math.min(1.6, fan + v.length() * near * dt * 0.9);
    }
    last.copy(hit); lastT = now; inside = true;
  }, { passive: true });
  section.addEventListener('pointerleave', () => { inside = false; });

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let raf = 0, visible = false, t0 = performance.now(), prev = t0, ignite = 0;
  function frame(now) {
    raf = visible ? requestAnimationFrame(frame) : 0;
    const dt = Math.max(0, Math.min(0.05, (now - prev) / 1000)); prev = Math.max(prev, now);
    const t = reduced ? 3 : (now - t0) / 1000;
    U.uTime.value = t;
    ignite = Math.min(1, ignite + dt / 2.2);
    const life = reduced ? 1 : ignite * ignite * (3 - 2 * ignite);
    U.uLife.value = life;
    ptrOn += ((inside ? 1 : 0) - ptrOn) * Math.min(1, dt * 4);
    if (!inside) vel.multiplyScalar(Math.pow(0.1, dt));
    wind.lerp(vel.clone().multiplyScalar(0.07 * C.wind), Math.min(1, dt * 3)); wind.multiplyScalar(Math.pow(0.35, dt));
    fan *= Math.pow(0.25, dt); U.uBoost.value += (fan - U.uBoost.value) * Math.min(1, dt * 5);
    EU.uWind.value.copy(wind);
    embers.geometry.setDrawRange(0, Math.round(EMBERS * C.embers));
    bloom.strength = C.glow;

    /* each tongue: stretch, sway and lean — as a whole solid, so it stays faceted */
    for (const m of tongues) {
      const d = m.userData;
      const flick = 0.78 + 0.22 * Math.sin(t * d.sp * 2.3 + d.ph) * Math.sin(t * d.sp * 1.3 + d.ph * 2.0);
      const h = d.baseH * flick * life * C.size * (1 + U.uBoost.value * 0.45) * 0.5;
      m.scale.set(d.w * (0.85 + 0.15 * flick), Math.max(0.001, h), d.w * (0.85 + 0.15 * flick));
      /* lean away from the pointer, plus wind */
      const dx = m.position.x - hit.x, dy = 1 - hit.y, r = Math.hypot(dx, dy) + 1e-3;
      const push = Math.exp(-r * r * 1.3) * ptrOn * C.push * (dx / r);
      m.rotation.z = -(wind.x * 0.9 + push * 0.9 + d.tilt * 0.4 + Math.sin(t * 1.3 + d.ph) * 0.06);
      m.rotation.x = Math.sin(t * 1.1 + d.ph) * 0.06;
      m.rotation.y += dt * 0.25 * (d.li % 2 ? 1 : -1);
    }
    smoke.forEach(m => {
      const a = (t * m.userData.sp + m.userData.ph) % 1;
      m.position.set(m.userData.x + Math.sin(t * 0.4 + m.userData.ph * 9) * 0.3 * a + wind.x * a * 2, 1.8 * C.size + a * 3.4, 0);
      m.scale.setScalar(0.6 + a * 2.6); m.rotation.set(t * .2, t * .3 + m.userData.ph * 9, 0);
      m.material.opacity = 0.14 * Math.sin(Math.PI * a) * life;
    });

    const f = 0.8 + 0.12 * Math.sin(t * 9.3) * Math.sin(t * 5.7 + 1.3) + 0.08 * Math.sin(t * 23.0);
    fireLight.intensity = 16 * f * life * (1 + U.uBoost.value * 0.55) * C.size;
    fireLight.position.set(Math.sin(t * 7.1) * 0.05 + wind.x * 0.25, 0.9, Math.cos(t * 6.2) * 0.05);
    const px = inside ? ndc.x : 0, py = inside ? ndc.y : 0;
    camera.position.x += (camHome.x + px * 0.35 - camera.position.x) * Math.min(1, dt * 1.5);
    camera.position.y += (camHome.y + py * 0.18 - camera.position.y) * Math.min(1, dt * 1.5);
    camera.lookAt(look);
    composer.render();
  }
  function setVisible(v) {
    const was = visible; visible = v;
    if (visible && !was) { prev = performance.now(); if (!raf) raf = requestAnimationFrame(frame); }
    section.classList.toggle('is-lit', visible);
  }
  new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: [0, 0.25] }).observe(section);
  const check = () => { const r = section.getBoundingClientRect(); const on = r.bottom > 0 && r.top < innerHeight; if (on !== visible) setVisible(on); };
  addEventListener('scroll', check, { passive: true }); addEventListener('resize', check); check();
  return { C, relight() { ignite = 0; } };
}
