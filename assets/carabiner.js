/* ══════════════════════════════════════════════════════════════════════════
   The carabiner — Contact page
   ─────────────────────────────────────────────────────────────────────────
   After the reference: a lavender carabiner with an orange, hatched screw
   sleeve on its gate, clipped through a stone drawn in contour lines.

   It is a small rigid system hung from a string, integrated every frame
   rather than keyframed, so the motion always reads as weight:

     drop     the string pays out from above the frame onto a damped spring;
              the load overshoots its rest length and settles in two or
              three diminishing bounces
     swing    a real pendulum about the string's anchor (θ'' = −g/L·sinθ),
              lightly damped
     twist    the load turning on the string, a torsion spring that is
              softer and slower than the swing
     stone    the stone hangs in the basket as a second, shorter pendulum,
              so it lags the carabiner — the secondary motion

   Clicking the carabiner kicks the swing and the twist and opens the gate:
   the sleeve backs off, the gate swings in, holds, and snaps shut on a
   critically damped spring — firm, no rattle.

   Every force is scaled by M.intensity, and M.reduced replaces the whole
   simulation with the carabiner simply hanging at rest.
   ═════════════════════════════════════════════════════════════════════════ */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export const M = { intensity: 1, reduced: matchMedia('(prefers-reduced-motion: reduce)').matches, stone: true, gateOnClick: true };

export function mountCarabiner(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0.2, 14);

  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(4, 6, 8); scene.add(key);
  const rim = new THREE.DirectionalLight(0xff8a5a, 0.9); rim.position.set(-6, 2, -4); scene.add(rim);
  scene.add(new THREE.AmbientLight(0x404656, 0.6));

  /* ── the load: one group hung from the string's end ─────────────────── */
  const pivot = new THREE.Group();          // at the string's end; swings and twists
  scene.add(pivot);
  const load = new THREE.Group();           // the carabiner, hung below the pivot
  pivot.add(load);

  const metal = new THREE.MeshPhysicalMaterial({ color: 0xb9c3ec, metalness: 0.55, roughness: 0.28, clearcoat: 0.6, clearcoatRoughness: 0.25 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x14151a, metalness: 0.3, roughness: 0.5 });

  /* the body: an asymmetric D, gate side open. Points traced off the
     reference, in the carabiner's own frame (top of the bend ≈ y 2.9). */
  const bodyPts = [
    [-0.95, 1.55], [-0.95, 2.15], [-0.7, 2.7], [-0.1, 2.98], [0.6, 2.85], [1.1, 2.35],
    [1.28, 1.5], [1.2, 0.5], [0.95, -0.55], [0.55, -1.45], [0.05, -1.9], [-0.45, -1.8], [-0.62, -1.42], [-0.5, -1.18],
  ].map(([x, y]) => new THREE.Vector3(x, y, 0));
  const bodyCurve = new THREE.CatmullRomCurve3(bodyPts, false, 'centripetal');
  const body = new THREE.Mesh(new THREE.TubeGeometry(bodyCurve, 220, 0.17, 24, false), metal);
  load.add(body);
  [bodyPts[0], bodyPts[bodyPts.length - 1]].forEach(p => {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 16), metal); cap.position.copy(p); load.add(cap);
  });

  /* the gate: hinged at the top-left, closing onto the nose */
  const hinge = new THREE.Vector3(-0.95, 1.55, 0), nose = new THREE.Vector3(-0.55, -1.2, 0);
  const gate = new THREE.Group(); gate.position.copy(hinge); load.add(gate);
  const gLen = hinge.distanceTo(nose);
  const gDir = nose.clone().sub(hinge).normalize();
  const gAng = Math.atan2(gDir.x, -gDir.y);           // lean of the gate off vertical
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, gLen, 20), metal);
  rod.position.set(0, -gLen / 2, 0); const gateArm = new THREE.Group(); gateArm.rotation.z = gAng; gateArm.add(rod); gate.add(gateArm);

  /* the screw sleeve: orange, hatched, between two dark collars */
  const hatch = (() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 256;
    const g = c.getContext('2d'); g.fillStyle = '#0c0c0e'; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = '#ff5a2a'; g.lineWidth = 11;
    for (let i = -256; i < 512; i += 34) { g.beginPath(); g.moveTo(i, 256); g.lineTo(i + 256, 0); g.stroke(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 1); return t;
  })();
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.95, 32, 1, true),
    new THREE.MeshStandardMaterial({ map: hatch, emissive: 0xff4b1f, emissiveMap: hatch, emissiveIntensity: 0.35, roughness: 0.6, side: THREE.DoubleSide }));
  const collarA = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.235, 0.16, 32), dark);
  const collarB = collarA.clone();
  const sleeveG = new THREE.Group(); sleeveG.add(sleeve, collarA, collarB);
  collarA.position.y = 0.55; collarB.position.y = -0.55;
  sleeveG.position.set(0, -0.72, 0); gateArm.add(sleeveG);
  /* thin pale outlines on the collars, the reference's drawn edge */
  [collarA, collarB].forEach(c => c.add(new THREE.LineSegments(new THREE.EdgesGeometry(c.geometry, 30), new THREE.LineBasicMaterial({ color: 0xb9c3ec, transparent: true, opacity: .55 }))));

  /* ── the stone, drawn in contour lines, hanging in the basket ───────── */
  const stonePivot = new THREE.Group(); stonePivot.position.set(0.05, -1.7, 0); load.add(stonePivot);
  const sg = new THREE.IcosahedronGeometry(1.25, 5);
  { const p = sg.attributes.position, v = new THREE.Vector3();
    const n3 = (x, y, z) => Math.sin(x * 2.1 + y * 1.3) * 0.5 + Math.sin(y * 3.7 - z * 2.2) * 0.3 + Math.sin(z * 5.1 + x * 3.3) * 0.2;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const d = 1 + n3(v.x, v.y, v.z) * 0.14;
      v.multiplyScalar(d); v.y *= 1.35; if (v.y < 0) v.x *= 1.15;
      p.setXYZ(i, v.x, v.y, v.z);
    }
    sg.computeVertexNormals(); }
  const stone = new THREE.Mesh(sg, new THREE.ShaderMaterial({
    uniforms: { uLine: { value: new THREE.Color('#b9c3ec') }, uStep: { value: 0.17 } },
    vertexShader: `varying vec3 vP; varying vec3 vN; varying vec3 vV;
      void main(){ vP = position; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.0); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uLine; uniform float uStep; varying vec3 vP; varying vec3 vN; varying vec3 vV;
      void main(){
        /* contours of a tilted, wobbled height through the stone, so the
           lines swirl across it rather than standing in flat bands */
        float h = vP.y + 0.35 * sin(vP.x * 2.3 + vP.z * 1.7) + 0.25 * vP.z;
        float s = h / uStep;
        float d = abs(fract(s + 0.5) - 0.5) / max(fwidth(s), 1e-4);
        float line = 1.0 - smoothstep(0.6, 1.5, d);
        float rim = pow(1.0 - max(0.0, dot(normalize(vN), normalize(vV))), 2.2);
        vec3 col = mix(vec3(0.0), uLine, line * 0.9) + uLine * rim * 0.35;
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  }));
  stone.position.y = -1.35;
  stonePivot.add(stone);

  /* the carabiner hangs from the top of its bend */
  load.position.y = -2.98;

  /* ── the string ─────────────────────────────────────────────────────── */
  const stringMat = new THREE.MeshBasicMaterial({ color: 0xe9ecf2, transparent: true, opacity: 0.75 });
  const stringMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1, 8), stringMat);
  scene.add(stringMesh);

  /* ── the simulation ──────────────────────────────────────────────────── */
  const S = { anchorY: 9.5, L0: 5.9, L: -2, vL: 0, th: 0, vth: 0, ph: 0, vph: 0, st: 0, vst: 0, gate: 0, gateT: 0, gateHold: 0 };
  function drop() {
    S.L = -1.5; S.vL = 0; S.th = 0.06; S.vth = 0; S.ph = 0.5; S.vph = 0; S.st = 0; S.vst = 0;
  }
  drop();

  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let hover = false;
  function hit(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return ray.intersectObjects([body, rod, sleeve, stone], false).length > 0;
  }
  canvas.addEventListener('pointermove', e => { hover = hit(e); canvas.style.cursor = hover ? 'pointer' : ''; });
  canvas.addEventListener('click', e => { if (hit(e)) kick(ndc.x); });
  function kick(side = 0.3) {
    const k = M.intensity;
    S.vth += (side >= 0 ? -1 : 1) * 1.15 * k;
    S.vph += 2.6 * k;
    S.vst += (side >= 0 ? 1 : -1) * 1.4 * k;
    if (M.gateOnClick) { S.gateT = 1; S.gateHold = 0.7; }
  }

  function step(dt) {
    const k = M.intensity;
    /* drop: string pays out onto a spring; under-damped so the weight shows */
    const wL = 7.5, zL = 0.28;
    S.vL += (-(wL * wL) * (S.L - S.L0) - 2 * zL * wL * S.vL) * dt;
    S.L += S.vL * dt;
    /* the first fall carries a kick of swing, the way a dropped weight never
       lands dead straight */
    /* swing: pendulum about the anchor, g scaled to screen units */
    const g = 26, len = Math.max(2, S.L + 3);
    S.vth += (-(g / len) * Math.sin(S.th) - 0.55 * S.vth) * dt;
    S.th += S.vth * dt;
    /* twist: torsion on the string, soft and slow */
    S.vph += (-3.2 * S.ph - 0.7 * S.vph) * dt;
    S.ph += S.vph * dt;
    /* the stone: a short pendulum in the basket, driven by the swing */
    S.vst += (-14 * S.st - 2.2 * S.vst - (-(g / len) * Math.sin(S.th)) * 0.25 * k) * dt;
    S.st += S.vst * dt;
    /* the gate: open, hold, snap shut — critically damped both ways */
    if (S.gateHold > 0) { S.gateHold -= dt; if (S.gateHold <= 0) S.gateT = 0; }
    const wg = S.gateT ? 11 : 22;
    S.gv = (S.gv || 0) + (wg * wg * (S.gateT - S.gate) - 2 * wg * (S.gv || 0)) * dt;
    S.gate += S.gv * dt;
  }

  function apply() {
    const L = M.reduced ? S.L0 : S.L;
    const ax = 0, ay = S.anchorY;
    const th = M.reduced ? 0 : S.th, ph = M.reduced ? 0.35 : S.ph;
    pivot.position.set(ax + Math.sin(th) * L, ay - Math.cos(th) * L, 0);
    pivot.rotation.set(0, ph, th);
    stonePivot.rotation.z = M.reduced ? 0 : S.st * 0.8;
    stonePivot.visible = M.stone;
    /* gate swings inward about its hinge; the sleeve backs off up the gate first */
    const gOpen = Math.max(0, Math.min(1, S.gate));
    gate.rotation.z = -gOpen * 0.42;
    sleeveG.position.y = -0.72 + gOpen * 0.18;
    /* the string: anchor to the pivot */
    const a = new THREE.Vector3(ax, ay + 20, 0), b = pivot.position;
    const mid = a.clone().add(b).multiplyScalar(0.5);
    stringMesh.position.copy(mid);
    stringMesh.scale.y = a.distanceTo(b);
    stringMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), a.clone().sub(b).normalize());
  }

  /* a whisper of air on the load while it hangs, so it is never dead still */
  let t = 0;
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    camera.position.z = w / h < 0.8 ? 21 : 16.5;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas); resize();

  let last = performance.now();
  (function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(1 / 30, (now - last) / 1000); last = now; t += dt;
    if (!M.reduced) {
      const sub = 4;
      for (let i = 0; i < sub; i++) step(dt / sub);
      S.vth += Math.sin(t * 0.7) * 0.004 * M.intensity;
      S.vph += Math.sin(t * 0.43 + 1) * 0.006 * M.intensity;
    }
    apply();
    renderer.render(scene, camera);
  })(last);

  return { M, S, drop, kick, get hover() { return hover; } };
}
