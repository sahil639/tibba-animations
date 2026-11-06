/* ══════════════════════════════════════════════════════════════════════════
   Footer meadow — a green range along the foot of the page
   ─────────────────────────────────────────────────────────────────────────
   A range of mountains across the bottom edge of the footer, grown over
   with moss the way the Sylva Living World scene grows its roots
   (misc-sylva-living-world.html → assets/sylva/inner-green-3d.html):

     the ground   one heightfield, finely subdivided (MEADOW_CONFIG.mountains
                  .subdivisions), shaped by a row of summits and ridged
                  noise. Lit, smooth-shaded, and coloured in Sylva's moss
                  ramp — deep in the folds, yellow-green on the crests.
     the moss     tens of thousands of instanced blades planted on the
                  gentler slopes; the crags stay bare, which is most of what
                  keeps the geometry reading crisp.
     the motion   Sylva's, kept to its register: slow gusts roll through the
                  pile, the cursor PARTS the moss where it passes (pushed
                  sideways and pressed down, darker in the hollow it makes),
                  and the camera leans a few degrees toward the pointer.
                  Nothing snaps; every input is chased.

   Heights, subdivision and noise rebuild the ground; interaction strength,
   radius and the animation speeds are live uniforms. All of it is
   MEADOW_CONFIG, below, and on the page's panel.
   ═════════════════════════════════════════════════════════════════════════ */
import * as THREE from 'three';

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

export const MEADOW_CONFIG = {
  mountains: {
    height: 1,               // multiplies every height
    subdivisions: 360,       // grid cells across the range (depth gets ~1/3 of that)
    peaks: 7,                // summits along the range
    noise: 0.55,             // ridged detail on the flanks (0 = smooth domes)
    variation: 0.45,         // how different the summits are from each other
    seed: 7,
  },
  moss: {
    count: 70000,            // blades
    length: 0.2,             // world units, before per-blade variation
    width: 0.028,
    maxSlope: 0.62,          // steeper than this stays bare (0 = only flats, 1 = everywhere)
  },
  interaction: {
    intensity: 1,            // how hard the cursor parts the moss (0 = off)
    radius: 1.35,            // world units
    follow: 0.12,            // how quickly the parting chases the cursor (0–1 per frame)
    parallax: 1,             // camera lean toward the pointer (0 = still)
  },
  animation: {
    speed: 1,                // time scale of the gusts
    wind: 1,                 // gust strength
  },
  colour: { sky: '#161617' },
};

/* ── noise ─────────────────────────────────────────────────────────────── */
const hash2 = (x, y, s) => {
  let n = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};
const vnoise = (x, y, s) => {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy, s), b = hash2(ix + 1, iy, s), c = hash2(ix, iy + 1, s), d = hash2(ix + 1, iy + 1, s);
  const t = a + (b - a) * ux;
  return t + ((c + (d - c) * ux) - t) * uy;
};
/* rotated octaves, as Sylva's fbm2 does, so the lattice never resolves */
function fbm(x, y, s, oct = 5) {
  let v = 0, amp = 0.5, nx;
  for (let i = 0; i < oct; i++) {
    v += amp * vnoise(x, y, s + i);
    nx = 0.8 * x + 0.6 * y; y = -0.6 * x + 0.8 * y; x = nx * 2.07 + 3.1; y = y * 2.07 - 1.7; amp *= 0.5;
  }
  return v / (1 - Math.pow(0.5, oct));
}
function ridged(x, y, s, oct = 5) {
  let v = 0, amp = 0.5, w = 1, nx;
  for (let i = 0; i < oct; i++) {
    let n = 1 - Math.abs(vnoise(x, y, s + i) * 2 - 1); n *= n * w; w = Math.min(1, n * 1.6);
    v += amp * n;
    nx = 0.8 * x + 0.6 * y; y = -0.6 * x + 0.8 * y; x = nx * 2.03 + 1.3; y = y * 2.03 + 4.7; amp *= 0.5;
  }
  return v;
}
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/* ── the world's size ─────────────────────────────────────────────────── */
const W = 40, D = 12;          // range width (x) and depth (z); front edge at +D/2

export function createFooterMeadow(canvas) {
  const C = MEADOW_CONFIG;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(1.75, devicePixelRatio || 1));
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 200);
  scene.fog = new THREE.Fog(new THREE.Color(C.colour.sky), 24, 58);

  /* light: a low sun from the left and a cool sky, the way Sylva lights its moss */
  const sun = new THREE.DirectionalLight(0xfff2d8, 2.3); sun.position.set(-8, 10, 6); scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xbfd6c0, 0x0b0d08, 0.75));

  const uniforms = {
    uTime: { value: 0 }, uWind: { value: C.animation.wind },
    uMouse: { value: new THREE.Vector3(0, -99, 0) }, uMouseR: { value: C.interaction.radius },
    uPush: { value: C.interaction.intensity }, uWidth: { value: C.moss.width },
    uFogColor: { value: new THREE.Color(C.colour.sky) }, uFogNear: { value: 24 }, uFogFar: { value: 58 },
  };

  let ground = null, moss = null, H = null, NX = 0, NZ = 0;

  /* ── the heightfield ────────────────────────────────────────────────── */
  function heightAt(x, z, peaks) {
    const M = C.mountains;
    const back = sstep(D / 2, -D * 0.2, z);                        // 0 at the front edge, 1 behind
    let h = 0;
    for (const p of peaks) {
      const dx = (x - p.x) / p.r, dz = (z - p.z) / (p.r * 0.8);
      const d = Math.sqrt(dx * dx + dz * dz);
      h = Math.max(h, p.h * Math.pow(Math.max(0, 1 - d), 1.35));
    }
    const rid = ridged(x * 0.16, z * 0.16, M.seed + 11) * M.noise;
    const fine = (fbm(x * 0.55, z * 0.55, M.seed + 31, 4) - 0.5) * 0.35;
    h = h * (0.7 + rid * 0.8) + rid * 1.2 * back + fine * (0.4 + back);
    h += (fbm(x * 0.2, z * 0.2, M.seed + 3, 3) - 0.5) * 0.8;       // foothills at the front
    return Math.max(-0.3, h * M.height * (0.25 + 0.75 * back));
  }
  function makePeaks() {
    const M = C.mountains, out = [];
    for (let i = 0; i < M.peaks; i++) {
      const u = (i + 0.5) / M.peaks, r1 = hash2(i, 1, M.seed), r2 = hash2(i, 2, M.seed), r3 = hash2(i, 3, M.seed);
      out.push({
        x: -W / 2 + u * W + (r1 - 0.5) * (W / M.peaks) * 0.7,
        z: -D * 0.18 - r2 * D * 0.28,
        h: 3.4 * (1 - M.variation * 0.5 + M.variation * r3) + (i % 2 ? 0 : 0.6),
        r: 3.2 + r2 * 2.6,
      });
    }
    return out;
  }
  const sampleH = (x, z) => {
    const gx = (x + W / 2) / W * (NX - 1), gz = (z + D / 2) / D * (NZ - 1);
    const i = Math.max(0, Math.min(NX - 2, Math.floor(gx))), j = Math.max(0, Math.min(NZ - 2, Math.floor(gz)));
    const fx = Math.min(1, Math.max(0, gx - i)), fz = Math.min(1, Math.max(0, gz - j));
    const a = H[j * NX + i], b = H[j * NX + i + 1], c = H[(j + 1) * NX + i], d = H[(j + 1) * NX + i + 1];
    return (a * (1 - fx) + b * fx) * (1 - fz) + (c * (1 - fx) + d * fx) * fz;
  };

  /* the moss ramp, Sylva's linear-space channels (hue ≈ 77°) */
  const DEEP = new THREE.Color(0.0126, 0.0192, 0.0031), MID = new THREE.Color(0.0488, 0.0744, 0.0121);
  const TIP = new THREE.Color(0.1222, 0.1860, 0.0304), ROCK = new THREE.Color(0.030, 0.034, 0.028);

  function buildGround() {
    if (ground) { scene.remove(ground); ground.geometry.dispose(); }
    NX = Math.round(C.mountains.subdivisions) + 1; NZ = Math.round(C.mountains.subdivisions * D / W * 1.4) + 1;
    const peaks = makePeaks();
    H = new Float32Array(NX * NZ);
    const g = new THREE.PlaneGeometry(W, D, NX - 1, NZ - 1);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    for (let k = 0; k < pos.count; k++) {
      const x = pos.getX(k), z = pos.getZ(k), h = heightAt(x, z, peaks);
      pos.setY(k, h);
      const i = Math.round((x + W / 2) / W * (NX - 1)), j = Math.round((z + D / 2) / D * (NZ - 1));
      H[j * NX + i] = h;
    }
    g.computeVertexNormals();
    /* colour by crest, fold and slope: moss where it can hold, rock on the crags */
    const nrm = g.attributes.normal, col = new Float32Array(pos.count * 3), c = new THREE.Color();
    for (let k = 0; k < pos.count; k++) {
      const x = pos.getX(k), z = pos.getZ(k), h = pos.getY(k), ny = nrm.getY(k);
      const tone = fbm(x * 0.4 + 7, z * 0.4, 91, 3);
      c.copy(DEEP).lerp(MID, sstep(-0.2, 2.2, h) * (0.6 + 0.6 * tone));
      c.lerp(TIP, sstep(2.4, 4.6, h) * 0.5 * tone);
      c.lerp(ROCK, sstep(C.moss.maxSlope + 0.12, C.moss.maxSlope - 0.12, ny) * 0.85);
      col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    ground = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true }));
    scene.add(ground);
  }

  /* ── the moss ───────────────────────────────────────────────────────── */
  function buildMoss() {
    if (moss) { scene.remove(moss); moss.geometry.dispose(); }
    const SEG = 4, blade = new THREE.BufferGeometry(), bp = [], buv = [], bi = [];
    for (let s = 0; s <= SEG; s++) {
      const t = s / SEG, w = 0.5 * (1 - t * 0.85);
      bp.push(-w, 0, 0, w, 0, 0); buv.push(0, t, 1, t);
      if (s < SEG) { const q = s * 2; bi.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); }
    }
    const geo = new THREE.InstancedBufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(bp, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(buv, 2));
    geo.setIndex(bi);
    const N = Math.round(C.moss.count), off = new Float32Array(N * 3), nr = new Float32Array(N * 3), rnd = new Float32Array(N * 4);
    let n = 0, tries = 0, rs = C.mountains.seed * 977 + 13;
    const rng = () => { rs = (rs * 16807) % 2147483647; return rs / 2147483647; };
    const e = W / (NX - 1);
    while (n < N && tries++ < N * 6) {
      /* denser toward the camera, where a blade is big enough to read */
      const z = D / 2 - Math.pow(rng(), 1.6) * D, x = (rng() - 0.5) * W;
      const h = sampleH(x, z);
      const gx = (sampleH(x + e, z) - sampleH(x - e, z)) / (2 * e), gz = (sampleH(x, z + e) - sampleH(x, z - e)) / (2 * e);
      const len = Math.hypot(gx, 1, gz), ny = 1 / len;
      if (ny < C.moss.maxSlope + (rng() - 0.5) * 0.1) continue;
      off[n * 3] = x; off[n * 3 + 1] = h - 0.01; off[n * 3 + 2] = z;
      nr[n * 3] = -gx / len; nr[n * 3 + 1] = ny; nr[n * 3 + 2] = -gz / len;
      const stray = rng() < 1 / 16 ? 1.7 : 1;                           // one in sixteen is a long hair
      rnd[n * 4] = rng() * Math.PI * 2;
      rnd[n * 4 + 1] = C.moss.length * (0.55 + 0.6 * rng()) * stray * (1.25 - 0.5 * sstep(0, 4, h));
      rnd[n * 4 + 2] = (rng() - 0.5) * 1.2;
      rnd[n * 4 + 3] = fbm(x * 0.85 + 17, z * 0.85, 5, 3);
      n++;
    }
    geo.setAttribute('offset', new THREE.InstancedBufferAttribute(off.subarray(0, n * 3), 3));
    geo.setAttribute('nrm', new THREE.InstancedBufferAttribute(nr.subarray(0, n * 3), 3));
    geo.setAttribute('rnd', new THREE.InstancedBufferAttribute(rnd.subarray(0, n * 4), 4));
    geo.instanceCount = n;
    moss = new THREE.Mesh(geo, mossMaterial);
    moss.frustumCulled = false;
    scene.add(moss);
  }

  /* Sylva's blade shader, cut down to the ground it grows on here: the same
     gusts, the same parting (tangential push + press along the normal,
     scaled by the blade's own length), the same darkening in the hollow. */
  const mossMaterial = new THREE.ShaderMaterial({
    uniforms, side: THREE.DoubleSide,
    vertexShader: `
      attribute vec3 offset; attribute vec3 nrm; attribute vec4 rnd;
      uniform float uTime, uWind, uMouseR, uPush, uWidth; uniform vec3 uMouse;
      varying float vT, vShade, vDark, vTone, vDepth;
      void main(){
        float t = uv.y, len = rnd.y;
        vec3 ref = abs(nrm.y) < 0.95 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
        vec3 T0 = normalize(cross(nrm, ref)), B0 = cross(nrm, T0);
        float ca = cos(rnd.x), sa = sin(rnd.x);
        vec3 widthDir = T0 * ca + B0 * sa, leanDir = T0 * -sa + B0 * ca;
        float bend = t * t;
        float gust = (sin(uTime * 1.75 + offset.x * 1.6 + rnd.x) * 0.12
                   +  sin(uTime * 0.85 + offset.x * 0.55) * 0.07
                   +  sin(uTime * 0.38 + offset.x * 0.21 + offset.z * 0.35) * 0.10) * uWind;
        vec3 world = offset + nrm * (t * len) + widthDir * (position.x * uWidth * (0.6 + len * 3.0))
                   + leanDir * (rnd.z * 0.42 * len) * bend
                   + (vec3(1.0, 0.0, 0.25) * gust) * bend * len * 1.6;
        vec3 toB = offset - uMouse;
        float infl = smoothstep(uMouseR, 0.0, length(toB * vec3(1.0, 0.6, 1.0)));
        infl *= infl * uPush;
        vec3 push = toB - nrm * dot(toB, nrm); float pl = length(push);
        push = pl > 0.0001 ? push / pl : T0;
        world += push * infl * bend * len * 2.2;
        world -= nrm * infl * bend * len * 1.0;
        vT = t; vDark = min(1.0, infl); vTone = smoothstep(0.16, 0.86, rnd.w);
        vShade = (0.7 + 0.3 * fract(rnd.x * 7.13)) * (0.46 + 0.54 * clamp(nrm.y * 0.5 + 0.62, 0.0, 1.0));
        vec4 mv = modelViewMatrix * vec4(world, 1.0);
        vDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uFogColor; uniform float uFogNear, uFogFar;
      varying float vT, vShade, vDark, vTone, vDepth;
      void main(){
        vec3 deep = vec3(0.0126, 0.0192, 0.0031), mid = vec3(0.0488, 0.0744, 0.0121), tip = vec3(0.1222, 0.1860, 0.0304);
        vec3 col = mix(deep, mid, smoothstep(0.0, 0.62, vT));
        col = mix(col, tip, smoothstep(0.38, 1.0, vT) * (0.35 + 0.65 * vTone));
        col *= (0.62 + 0.72 * vTone) * vShade * 2.4;
        col *= 1.0 - vDark * 0.55;
        col *= mix(0.45, 1.0, smoothstep(0.0, 0.5, vT));          // self-shadow down in the pile
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
        gl_FragColor.rgb = mix(gl_FragColor.rgb, uFogColor, smoothstep(uFogNear, uFogFar, vDepth));
      }`,
  });

  /* ── the camera: fitted to the range, leaning toward the pointer ───── */
  const look = new THREE.Vector3(0, 1.3, 0);
  const lean = { x: 0, y: 0, tx: 0, ty: 0 };
  function frame() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    /* the range's width fills the frame: distance from the horizontal FOV */
    const hf = Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
    const dist = (W * 0.47) / Math.tan(hf);
    camera.userData.dist = Math.max(14, dist);
    camera.updateProjectionMatrix();
    /* aim so the range's front edge sits just under the bottom of the frame:
       the moss runs off the page instead of stopping on a visible edge */
    const saved = { x: lean.x, y: lean.y };
    lean.x = 0; lean.y = 0;
    let lo = -4, hi = 6;
    for (let k = 0; k < 24; k++) {
      look.y = (lo + hi) / 2; placeCamera(); camera.updateMatrixWorld();
      const y = _edge.set(0, 0, D / 2).project(camera).y;
      if (y > -1.04) lo = look.y; else hi = look.y;     // raising the aim drops the edge
    }
    lean.x = saved.x; lean.y = saved.y;
  }
  const _edge = new THREE.Vector3();
  function placeCamera() {
    const d = camera.userData.dist || 30, P = C.interaction.parallax;
    const yaw = lean.x * 0.05 * P, pitch = 0.2 + lean.y * 0.03 * P;
    camera.position.set(look.x + Math.sin(yaw) * d * Math.cos(pitch), look.y + Math.sin(pitch) * d, look.z + Math.cos(yaw) * d * Math.cos(pitch));
    camera.lookAt(look);
  }

  /* ── the pointer: a ray marched down onto the heightfield ─────────── */
  const ndc = new THREE.Vector2(), ray = new THREE.Raycaster(), target = new THREE.Vector3(0, -99, 0);
  let over = false;
  function onMove(e) {
    const r = canvas.getBoundingClientRect();
    lean.tx = (e.clientX / innerWidth) * 2 - 1; lean.ty = (e.clientY / innerHeight) * 2 - 1;
    if (e.clientY < r.top - 40 || e.clientY > r.bottom) { over = false; return; }
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const o = ray.ray.origin, d = ray.ray.direction;
    over = false;
    for (let s = 0, t = 0; s < 400; s++, t += 0.12) {
      const x = o.x + d.x * t, y = o.y + d.y * t, z = o.z + d.z * t;
      if (Math.abs(x) > W / 2 || z < -D / 2) { if (z < -D / 2) break; continue; }
      if (z > D / 2) continue;
      if (y <= sampleH(x, z)) { target.set(x, y, z); over = true; break; }
    }
  }
  addEventListener('pointermove', onMove, { passive: true });
  addEventListener('pointerleave', () => { over = false; });

  /* ── the loop: runs only while the footer is on screen ─────────────── */
  let running = false, last = performance.now(), time = 0, presence = 0;
  function tick(now) {
    if (!running) return;
    requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!REDUCED) time += dt * C.animation.speed;
    uniforms.uTime.value = time;
    uniforms.uWind.value = REDUCED ? 0 : C.animation.wind;
    uniforms.uMouseR.value = C.interaction.radius;
    /* the hollow trails the cursor, and the moss closes back over it when
       the cursor leaves — presence fades rather than the hollow jumping */
    const f = C.interaction.follow, m = uniforms.uMouse.value;
    presence += ((over ? 1 : 0) - presence) * (over ? f : f * 0.4);
    if (over) { if (m.y < -50) m.copy(target); else m.lerp(target, f); }
    uniforms.uPush.value = C.interaction.intensity * presence;
    lean.x += (lean.tx - lean.x) * 0.04; lean.y += (lean.ty - lean.y) * 0.04;
    placeCamera();
    renderer.render(scene, camera);
  }
  const io = new IntersectionObserver(([e]) => {
    const on = e.isIntersecting && !document.hidden;
    if (on && !running) { running = true; last = performance.now(); requestAnimationFrame(tick); }
    if (!on) running = false;
  }, { rootMargin: '80px' });
  io.observe(canvas);
  /* a background tab stops the loop; coming back re-asks the observer */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) running = false;
    else { io.unobserve(canvas); io.observe(canvas); }
  });
  new ResizeObserver(() => { frame(); placeCamera(); if (!running) renderer.render(scene, camera); }).observe(canvas);

  buildGround(); buildMoss(); frame(); placeCamera();

  return {
    CONFIG: C,
    /** Re-read C.mountains / C.moss: rebuild the ground and replant the moss. */
    rebuild() { buildGround(); buildMoss(); },
    /** Re-plant only (count, length, slope). */
    replant() { buildMoss(); },
    setSky(hex) { C.colour.sky = hex; scene.fog.color.set(hex); uniforms.uFogColor.value.set(hex); },
  };
}
