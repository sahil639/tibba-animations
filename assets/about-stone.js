/* ══════════════════════════════════════════════════════════════════════════
   About — the stone
   ─────────────────────────────────────────────────────────────────────────
   A slab of dark rock with the studio's mark cut into its face, standing in
   front of the About statement. Everything is made here, nothing is
   loaded: the slab is a rounded box pushed about by noise (chunky at the
   sides, nearly flat on the face that carries the mark), the mark is the
   favicon's own path drawn to a canvas, blurred for a chisel's bevel and
   pressed into the face, and the grain is a bump map of noise.

   It answers the hand: it leans toward the pointer, a drag turns it and it
   swings back when let go, and a low light follows the pointer across the
   face so the cut catches it. At rest it breathes — a slow float.

     STONE           every tunable (the panel writes here)
     mountStone(canvas, host) → { rebuild() }
   ═════════════════════════════════════════════════════════════════════════ */
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

export const STONE = {
  depth: 0.075,      // how deep the mark is cut (world units; the slab is 3 tall)
  rough: 1,          // the sides' chunkiness
  grain: 1,          // bump of the surface grain
  tilt: 1,           // how far it leans toward the pointer
  light: 1,          // the raking light's strength
  float: 1,          // the idle float
};

/* the mark: the favicon's path (assets/brand/favicon.svg), its own units */
const MARK = 'M39.0383 28H8L28.2219 8L39.0383 28ZM15.0685 24.6037L26.2673 20.151L34.3324 24.5768L27.5681 12.0807L15.0685 24.6037Z';
const MARK_BOX = { x0: 8, y0: 8, x1: 39.04, y1: 28 };

/* ── noise: improved Perlin, seeded ──────────────────────────────────── */
function makeNoise(seed = 7) {
  const p = new Uint8Array(512), perm = [...Array(256).keys()];
  let s = seed;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
  const grad = (h, x, y, z) => { const u = h < 8 ? x : y, v = h < 4 ? y : h === 12 || h === 14 ? x : z; return ((h & 1) ? -u : u) + ((h & 2) ? -v : v); };
  const lerp = (a, b, t) => a + (b - a) * t;
  function n3(x, y, z) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
    x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
    const u = fade(x), v = fade(y), w = fade(z);
    const A = p[X] + Y, AA = p[A] + Z, AB = p[A + 1] + Z, B = p[X + 1] + Y, BA = p[B] + Z, BB = p[B + 1] + Z;
    return lerp(lerp(lerp(grad(p[AA] & 15, x, y, z), grad(p[BA] & 15, x - 1, y, z), u),
                     lerp(grad(p[AB] & 15, x, y - 1, z), grad(p[BB] & 15, x - 1, y - 1, z), u), v),
                lerp(lerp(grad(p[AA + 1] & 15, x, y, z - 1), grad(p[BA + 1] & 15, x - 1, y, z - 1), u),
                     lerp(grad(p[AB + 1] & 15, x, y - 1, z - 1), grad(p[BB + 1] & 15, x - 1, y - 1, z - 1), u), v), w);
  }
  n3.fbm = (x, y, z, o = 4) => { let a = 0, f = 1, amp = .5; for (let i = 0; i < o; i++) { a += amp * n3(x * f, y * f, z * f); f *= 2.03; amp *= .5; } return a; };
  return n3;
}
const N = makeNoise(11);

/* ── the mark as a height mask: drawn, blurred for the bevel, sampled ─── */
const MASK = { size: 768, span: 1.9, cx: 0, cy: 0.12, w: 1.42 };
function markMask() {
  const S = MASK.size, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
  const bw = MARK_BOX.x1 - MARK_BOX.x0, bh = MARK_BOX.y1 - MARK_BOX.y0;
  const k = S / MASK.span * MASK.w / bw;
  g.filter = `blur(${(S / 150).toFixed(1)}px)`;
  g.translate(S / 2, S / 2); g.scale(k, k); g.translate(-(MARK_BOX.x0 + bw / 2), -(MARK_BOX.y0 + bh / 2));
  g.fillStyle = '#fff'; g.fill(new Path2D(MARK), 'evenodd');
  const d = g.getImageData(0, 0, S, S).data, out = new Float32Array(S * S);
  for (let i = 0; i < S * S; i++) out[i] = d[i * 4] / 255;
  return (x, y) => {
    const u = ((x - MASK.cx) / MASK.span + .5) * (S - 1), v = (.5 - (y - MASK.cy) / MASK.span) * (S - 1);
    if (u < 0 || v < 0 || u >= S - 1 || v >= S - 1) return 0;
    const i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j, o = j * S + i;
    return (out[o] * (1 - fu) + out[o + 1] * fu) * (1 - fv) + (out[o + S] * (1 - fu) + out[o + S + 1] * fu) * fv;
  };
}

/* ── the slab ─────────────────────────────────────────────────────────── */
const DIM = { w: 2.25, h: 3.0, d: 0.66, r: 0.27 };
function buildSlab(mask) {
  let g = new THREE.BoxGeometry(DIM.w, DIM.h, DIM.d, 168, 224, 26);
  g.deleteAttribute('normal'); g.deleteAttribute('uv');
  g = mergeVertices(g);
  const pos = g.attributes.position, n = pos.count;
  const col = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  const hx = DIM.w / 2 - DIM.r, hy = DIM.h / 2 - DIM.r, hz = DIM.d / 2 - DIM.r;
  const v = new THREE.Vector3(), c = new THREE.Vector3(), nn = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    v.fromBufferAttribute(pos, i);
    /* round the box: the core, plus the radius out along the way to the surface */
    c.set(clamp(v.x, -hx, hx), clamp(v.y, -hy, hy), clamp(v.z, -hz, hz));
    nn.subVectors(v, c); if (nn.lengthSq() < 1e-12) nn.set(0, 0, 1); nn.normalize();
    v.copy(c).addScaledVector(nn, DIM.r);
    /* a slight taper to the top, so it stands like a stone, not a tile */
    v.x *= 1 - 0.07 * (v.y / DIM.h + .5);
    const faceW = smooth(.55, .95, Math.abs(nn.z));               // 1 on the two broad faces
    const front = nn.z > 0 ? faceW : 0;
    /* the shape: chunky on the sides, a gentle undulation on the faces */
    const big = N.fbm(v.x * .8 + 3.1, v.y * .8, v.z * .8, 4) * .16 * STONE.rough * (1 - .82 * faceW);
    const chip = Math.max(0, N(v.x * 2.2 + 9, v.y * 2.2, v.z * 2.2) - .18) * .32 * STONE.rough * (1 - faceW);
    const med = N(v.x * 3.1, v.y * 3.1 + 5, v.z * 3.1) * .022;
    const grain = N(v.x * 15, v.y * 15, v.z * 15) * .005;
    /* the cut */
    const m = front > 0 ? smooth(.12, .88, mask(v.x, v.y)) * front : 0;
    const disp = big - chip + med + grain;
    v.addScaledVector(nn, disp);
    v.z -= STONE.depth * m;
    pos.setXYZ(i, v.x, v.y, v.z);
    /* colour: dark rock, faint strata, speckle; the cut a shade paler, as
       freshly worked stone is */
    const strata = Math.sin(v.y * 22 + N(v.x * 1.5, v.y * 1.5, 0) * 6) * .012;
    let k = .042 + N.fbm(v.x * 5, v.y * 5, v.z * 5, 3) * .03 + N(v.x * 31, v.y * 31, v.z * 31) * .014 + strata * .6;
    k += m * .03 - chip * .06;
    k = clamp(k, .015, .16);
    col[i * 3] = k * 1.02; col[i * 3 + 1] = k; col[i * 3 + 2] = k * .97;
    uv[i * 2] = (v.x + v.z * .6) / DIM.w + .5; uv[i * 2 + 1] = (v.y + v.z * .4) / DIM.h + .5;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

/* the grain's bump map: fine noise, tiled */
function grainTexture() {
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'), img = g.createImageData(S, S), d = img.data;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const u = x / S * 24, v = y / S * 24;
    const k = .5 + N.fbm(u, v, 1.7, 4) * .6 + (Math.random() - .5) * .18;
    const b = clamp(k, 0, 1) * 255, o = (y * S + x) * 4;
    d[o] = d[o + 1] = d[o + 2] = b; d[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2.6);
  return t;
}

export function mountStone(canvas, host = canvas.parentElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  camera.position.set(0, 0, 9.2);

  const mask = markMask();
  const bump = grainTexture();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .9, metalness: 0, bumpMap: bump, bumpScale: 1.4 * STONE.grain });
  const stone = new THREE.Mesh(buildSlab(mask), mat);
  const rig = new THREE.Group(); rig.add(stone); scene.add(rig);

  scene.add(new THREE.HemisphereLight(0x9aa0aa, 0x0a0806, .4));
  const key = new THREE.DirectionalLight(0xfff4ea, 2.1); key.position.set(-3, 4.5, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0xff4b1f, 1.6); rim.position.set(4.5, -1.5, -3); scene.add(rim);
  const rim2 = new THREE.DirectionalLight(0xb8c4ff, .8); rim2.position.set(-5, 1, -2.5); scene.add(rim2);
  const rake = new THREE.PointLight(0xffe2cc, 9, 14, 2); rake.position.set(1.5, 1, 2.6); scene.add(rake);

  /* the hand: lean toward the pointer, drag to turn, swing back */
  const ptr = { x: 0, y: 0, sx: 0, sy: 0 };
  const spin = { a: 0, v: 0, drag: false, lx: 0 };
  host.addEventListener('pointermove', e => {
    const r = host.getBoundingClientRect();
    ptr.x = (e.clientX - r.left) / r.width * 2 - 1; ptr.y = (e.clientY - r.top) / r.height * 2 - 1;
    if (spin.drag) { const dx = e.clientX - spin.lx; spin.lx = e.clientX; spin.a += dx * .009; spin.v = dx * .009 * 60; }
  }, { passive: true });
  canvas.addEventListener('pointerdown', e => { spin.drag = true; spin.lx = e.clientX; canvas.setPointerCapture(e.pointerId); host.classList.add('grab'); });
  const up = () => { spin.drag = false; host.classList.remove('grab'); };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  host.addEventListener('pointerleave', () => { ptr.x = 0; ptr.y = 0; });

  /* layout: the stone a little larger on a wide screen, smaller on a phone */
  let narrow = false;
  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    narrow = w < 760;
    camera.position.z = narrow ? Math.max(11, 8 / camera.aspect * .62) : 11.2;
    camera.updateProjectionMatrix();
  }
  resize();
  new ResizeObserver(resize).observe(host);

  let visible = true, raf = 0, last = performance.now(), t0 = last;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf) raf = requestAnimationFrame(frame); }, { threshold: 0 }).observe(host);
  function frame(now) {
    raf = 0;
    if (!visible) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    const t = (now - t0) / 1000;
    ptr.sx += (ptr.x - ptr.sx) * (1 - Math.exp(-dt * 4)); ptr.sy += (ptr.y - ptr.sy) * (1 - Math.exp(-dt * 4));
    /* the swing back: a critically damped spring to rest */
    if (!spin.drag) { const k = 18, c = 2 * Math.sqrt(k); spin.v += (-k * spin.a - c * spin.v) * dt; spin.a += spin.v * dt; }
    const intro = REDUCED ? 1 : smooth(0, 1.4, t);
    const f = REDUCED ? 0 : STONE.float;
    rig.rotation.y = -.32 + ptr.sx * .42 * STONE.tilt + spin.a + Math.sin(t * .5) * .05 * f;
    rig.rotation.x = .04 + ptr.sy * .22 * STONE.tilt + Math.sin(t * .37) * .02 * f;
    rig.rotation.z = -.035 + Math.sin(t * .29) * .012 * f;
    rig.position.y = (narrow ? .92 : .05) + Math.sin(t * .8) * .045 * f - (1 - intro) * .5;
    rig.scale.setScalar((narrow ? .6 : 1) * (.94 + .06 * intro));
    canvas.style.opacity = intro.toFixed(3);
    rake.position.set(ptr.sx * 3.2, -ptr.sy * 2.4 + .4, 2.4);
    rake.intensity = 9 * STONE.light;
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(frame);

  return {
    rebuild() { stone.geometry.dispose(); stone.geometry = buildSlab(mask); },
    setGrain(v) { STONE.grain = v; mat.bumpScale = 1.4 * v; },
    renderer,
  };
}
