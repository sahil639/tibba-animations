/* ══════════════════════════════════════════════════════════════════════════
   The Getting Started globe
   ─────────────────────────────────────────────────────────────────────────
   After the globe-particles skill: a dense sphere of luminous points with a
   thinner orbital ring around it, a neutral white-hot core, and the accent
   taken from the client's colour rather than written in. Tilted so the ring
   reads as an orbit and not as an underline.

   Added for this case: a handful of markers on the surface with arcs
   running between them, because this section is about reporting across
   industries and regions — the globe is carrying the idea of many
   organisations reporting into one system, not just decorating the column.
   The markers pulse; the arcs draw themselves out along great circles and
   fade, one at a time, so there is always one conversation in flight.
   ═════════════════════════════════════════════════════════════════════════ */
import * as THREE from 'three';

const VERT = `
attribute float a_size;
attribute float a_layer;
uniform float u_time;
uniform float u_pointSize;
uniform float u_px;
varying float v_layer;
varying float v_depth;
varying float v_falloff;
void main() {
  vec3 pos = position;
  float breathe = 1.0 + sin(u_time * 0.65 + a_layer * 4.0) * 0.012;
  pos *= breathe;
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  /* u_px carries the device pixel ratio and the canvas's size, so a point
     is the same size on screen at 1x, at 2x, and in a small column */
  gl_PointSize = u_pointSize * u_px * a_size * (1.0 / max(0.18, -mv.z));
  gl_Position = projectionMatrix * mv;
  v_layer = a_layer;
  /* depth in VIEW space, so the near face is the bright one however the
     sphere has turned */
  v_depth = smoothstep(-7.8, -5.4, mv.z);
  v_falloff = smoothstep(2.45, 0.25, length(position));
}`;

const FRAG = `
precision highp float;
uniform vec3 u_coreColor;
uniform vec3 u_accentColor;
varying float v_layer;
varying float v_depth;
varying float v_falloff;
void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  float alpha = smoothstep(0.5, 0.0, d);
  alpha *= alpha;
  vec3 color = mix(u_coreColor, u_accentColor, smoothstep(0.35, 1.0, v_layer));
  color += vec3(1.0) * v_depth * 0.08;
  color = mix(color * 0.42, color, clamp(v_falloff + v_layer * 0.28, 0.0, 1.0));
  alpha *= mix(0.52, 1.0, clamp(v_falloff + v_layer * 0.24, 0.0, 1.0));
  alpha *= mix(0.55, 1.0, v_depth);
  gl_FragColor = vec4(color, alpha);
}`;

function buildParticles(o) {
  const { sphereCount, ringCount, radius, ringRadius, ringThickness } = o;
  const total = sphereCount + ringCount;
  const pos = new Float32Array(total * 3), size = new Float32Array(total), layer = new Float32Array(total);
  for (let i = 0; i < sphereCount; i++) {
    const z = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2;
    /* Most of the points on the SHELL, a thinner scatter inside it. The skill
       fills the whole volume; a shell-heavy mix gives the globe an edge you
       can read against the page, which a solid ball of points does not. */
    const shell = Math.random() < 0.72;
    const r = radius * (shell ? 0.965 + Math.random() * 0.035 : 0.58 + Math.pow(Math.random(), 0.42) * 0.38);
    const root = Math.sqrt(1 - z * z), k = i * 3;
    pos[k] = Math.cos(th) * root * r; pos[k + 1] = Math.sin(th) * root * r; pos[k + 2] = z * r;
    size[i] = (shell ? 0.62 : 0.72) + Math.random() * 0.7;
    layer[i] = Math.random() * 0.28;
  }
  for (let i = 0; i < ringCount; i++) {
    const p = sphereCount + i, a = Math.random() * Math.PI * 2;
    const r = ringRadius + (Math.random() - 0.5) * ringThickness;
    const y = (Math.random() - 0.5) * ringThickness * 0.58, k = p * 3;
    pos[k] = Math.cos(a) * r; pos[k + 1] = y; pos[k + 2] = Math.sin(a) * r;
    size[p] = 0.62 + Math.random() * 0.58;
    layer[p] = 0.72 + Math.random() * 0.28;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('a_size', new THREE.BufferAttribute(size, 1));
  g.setAttribute('a_layer', new THREE.BufferAttribute(layer, 1));
  return g;
}

/* latitude / longitude to a point on the sphere */
function ll(lat, lon, r) {
  const phi = (90 - lat) * Math.PI / 180, th = (lon + 180) * Math.PI / 180;
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th));
}

/* A great-circle arc lifted off the surface in the middle, built as a thin
   tube rather than a line: WebGL draws no line wider than one DEVICE pixel,
   which on a 2x screen is half a CSS pixel and all but disappears. The tube's
   own uv.x runs along its length, which is what the draw-in reads. */
function arcGeometry(a, b, r, lift, seg = 72) {
  const pts = [];
  for (let i = 0; i <= seg; i++) {
    const t = i / seg;
    const v = new THREE.Vector3().copy(a).lerp(b, t).normalize();
    v.multiplyScalar(r * (1 + Math.sin(Math.PI * t) * lift));
    pts.push(v);
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, 0.009, 5, false);
}

export function mountGlobe(canvas, b = {}) {
  if (!canvas) return () => {};
  const css = getComputedStyle(document.documentElement);
  const accentHex = (b.accent || css.getPropertyValue('--client') || '#4CAF70').trim();
  const accent = new THREE.Color(accentHex);

  const o = {
    sphereCount: 4200, ringCount: 2200, radius: 1.35, ringRadius: 2.05, ringThickness: 0.12,
    pointSize: 30, rotationSpeed: 0.09, mouseStrength: 0.08, tiltX: -0.42, tiltZ: 0.22,
    /* far enough back that the tilted ring clears the canvas edge */
    cameraDistance: 6.9, ...(b.options || {}),
  };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0, o.cameraDistance);

  /* Everything that turns with the planet sits in one group; the ring gets
     its own tilt inside it so it is not locked to the equator. */
  const world = new THREE.Group();
  world.rotation.set(o.tiltX, 0, o.tiltZ);
  scene.add(world);
  const spin = new THREE.Group();
  world.add(spin);

  const pMat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      u_time: { value: 0 }, u_pointSize: { value: o.pointSize }, u_px: { value: 1 },
      u_coreColor: { value: new THREE.Color(0xf4f2ee) }, u_accentColor: { value: accent },
    },
  });
  const pGeo = buildParticles(o);
  spin.add(new THREE.Points(pGeo, pMat));

  /* ── markers ────────────────────────────────────────────────────────── */
  const SITES = b.sites || [
    [19.08, 72.88], [12.97, 77.59], [28.61, 77.21], [1.35, 103.82],
    [25.2, 55.27], [51.5, -0.12], [40.71, -74.0], [-33.87, 151.21], [35.68, 139.69],
  ];
  const R = o.radius;
  const markGeo = new THREE.BufferGeometry().setFromPoints(SITES.map(([a, c]) => ll(a, c, R * 1.004)));
  const phase = new Float32Array(SITES.length).map(() => Math.random() * 6.28);
  markGeo.setAttribute('a_phase', new THREE.BufferAttribute(phase, 1));
  const markMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { u_time: { value: 0 }, u_col: { value: accent }, u_px: { value: 1 } },
    vertexShader: `attribute float a_phase; uniform float u_time; uniform float u_px;
      varying float v_p; varying float v_front;
      void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0);
        v_p = 0.5 + 0.5 * sin(u_time * 2.2 + a_phase);
        /* only markers on the near side of the planet */
        v_front = smoothstep(-7.2, -6.2, mv.z);
        gl_PointSize = (26.0 + 22.0 * v_p) * u_px;
        gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 u_col; varying float v_p; varying float v_front;
      void main(){ vec2 uv = gl_PointCoord - 0.5; float d = length(uv);
        float dotc = smoothstep(0.12, 0.05, d);
        float ring = smoothstep(0.04, 0.0, abs(d - (0.14 + 0.3 * v_p))) * (1.0 - v_p);
        float a = (dotc + ring * 0.9) * v_front;
        if (a < 0.01) discard;
        gl_FragColor = vec4(mix(u_col, vec3(1.0), dotc * 0.55), a); }`,
  });
  spin.add(new THREE.Points(markGeo, markMat));

  /* ── arcs ───────────────────────────────────────────────────────────── */
  const arcMat = () => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { u_head: { value: 0 }, u_tail: { value: 0 }, u_col: { value: accent } },
    vertexShader: `varying float v_u; varying float v_front;
      void main(){ v_u = uv.x; vec4 mv = modelViewMatrix * vec4(position,1.0);
        v_front = smoothstep(-7.4, -6.0, mv.z); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float u_head, u_tail; uniform vec3 u_col; varying float v_u; varying float v_front;
      void main(){ float on = step(u_tail, v_u) * step(v_u, u_head);
        float glow = smoothstep(u_head - 0.18, u_head, v_u);
        float a = on * (0.28 + 0.72 * glow) * mix(0.25, 1.0, v_front);
        if (a < 0.01) discard;
        gl_FragColor = vec4(mix(u_col, vec3(1.0), glow * 0.5), a); }`,
  });
  const PAIRS = b.arcs || [[0, 5], [1, 3], [2, 4], [0, 6], [3, 8], [1, 7], [4, 5], [2, 3]];
  const arcs = PAIRS.map(([i, j], k) => {
    const g = arcGeometry(ll(...SITES[i], R), ll(...SITES[j], R), R, 0.22 + (k % 3) * 0.05);
    const m = arcMat();
    const line = new THREE.Mesh(g, m);
    spin.add(line);
    return { g, m, curve: g.parameters.path, start: k * 1.3 };
  });
  const ARC_CYCLE = PAIRS.length * 1.3;

  const headGeo = new THREE.BufferGeometry();
  headGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(arcs.length * 3), 3));
  headGeo.setAttribute('a_on', new THREE.BufferAttribute(new Float32Array(arcs.length), 1));
  const headMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { u_col: { value: accent }, u_px: { value: 1 } },
    vertexShader: `attribute float a_on; uniform float u_px; varying float v_on;
      void main(){ v_on = a_on; vec4 mv = modelViewMatrix * vec4(position,1.0);
        gl_PointSize = 22.0 * u_px * a_on; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 u_col; varying float v_on;
      void main(){ float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d); a *= a;
        if (a * v_on < 0.01) discard;
        gl_FragColor = vec4(mix(u_col, vec3(1.0), smoothstep(0.25, 0.0, d)), a); }`,
  });
  spin.add(new THREE.Points(headGeo, headMat));

  /* ── lifecycle ──────────────────────────────────────────────────────── */
  const pointer = new THREE.Vector2();
  const smooth = new THREE.Vector2();
  let raf = 0, visible = true, t0 = performance.now();

  function resize() {
    const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight);
    const dpr = Math.min(devicePixelRatio || 1, 1.8);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const px = dpr * (h / 620);
    markMat.uniforms.u_px.value = px;
    pMat.uniforms.u_px.value = px;
    if (typeof headMat !== 'undefined') headMat.uniforms.u_px.value = px;
  }
  function onMove(e) {
    const r = canvas.getBoundingClientRect();
    pointer.x = clamp1(((e.clientX - r.left) / r.width - 0.5) * 2);
    pointer.y = clamp1(((e.clientY - r.top) / r.height - 0.5) * 2);
  }
  const clamp1 = v => Math.max(-1, Math.min(1, v));

  function render(now) {
    const t = (now - t0) / 1000;
    pMat.uniforms.u_time.value = t;
    markMat.uniforms.u_time.value = t;
    /* the mouse eases in: the globe drifts toward the pointer, never snaps */
    smooth.lerp(pointer, 0.045);
    spin.rotation.y = (reduce ? 0.6 : t * o.rotationSpeed) + 0.6;
    world.rotation.x = o.tiltX + smooth.y * o.mouseStrength;
    world.rotation.z = o.tiltZ + smooth.x * o.mouseStrength;
    world.scale.setScalar(1 + (reduce ? 0 : Math.sin(t * 0.55) * 0.02));

    const heads = headGeo.attributes.position, hv = headGeo.attributes.a_on;
    arcs.forEach((a, k) => {
      /* each arc grows out over 1.1s, holds, then its tail chases the head */
      const local = ((t - a.start) % ARC_CYCLE + ARC_CYCLE) % ARC_CYCLE;
      const head = Math.min(1, local / 1.1);
      const tail = Math.max(0, Math.min(1, (local - 2.2) / 1.1));
      a.m.uniforms.u_head.value = reduce ? 1 : head;
      a.m.uniforms.u_tail.value = reduce ? 0 : tail;
      const p = a.curve.getPointAt(Math.min(0.999, head));
      heads.setXYZ(k, p.x, p.y, p.z);
      hv.setX(k, !reduce && head < 1 ? 1 : 0);
    });
    heads.needsUpdate = true; hv.needsUpdate = true;
    renderer.render(scene, camera);
    if (!reduce && visible) raf = requestAnimationFrame(render);
    else raf = 0;
  }

  resize();
  new ResizeObserver(resize).observe(canvas);
  addEventListener('pointermove', onMove, { passive: true });
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf) raf = requestAnimationFrame(render);
  }).observe(canvas);
  raf = requestAnimationFrame(render);

  return () => {
    cancelAnimationFrame(raf);
    removeEventListener('pointermove', onMove);
    pGeo.dispose(); pMat.dispose(); markGeo.dispose(); markMat.dispose();
    arcs.forEach(a => { a.g.dispose(); a.m.dispose(); });
    headGeo.dispose(); headMat.dispose();
    renderer.dispose();
  };
}
