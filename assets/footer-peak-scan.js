/* ══════════════════════════════════════════════════════════════════════════
   The footer massif — scan reveal and pointer orbit
   ─────────────────────────────────────────────────────────────────────────
   The same two moves the Sylva world opens and responds with, on a mountain
   instead of a moss root:

     the load-in   one world-space wavefront conducts BOTH representations.
                   A wire cage draws the topology at the front of the wave,
                   the solid surface follows a fixed distance behind it, and
                   the cage burns off once the wave has passed. It is not a
                   circular mask over a finished picture — the two fronts are
                   separate, which is the whole reason it reads as something
                   being surveyed rather than wiped on.

     the hover     ONE damped pointer value, split unequally across the
                   camera and the geometry. The camera swings a little, the
                   near ridge turns more than the far one, and the look-at
                   carries only 42% of the camera's travel so the peak stays
                   where the layout put it. Move everything by the same
                   amount and it reads as a flat poster following the cursor.

   Two departures from the reference, both forced and both narrow:

     polarity      That scene is light on a dark field, so its cage is
                   additive. This footer is white paper with the ridge
                   printed on it in ink, and additive blending on white is
                   invisible. The cage is ink at normal blend — same rim,
                   same trail, same fade, opposite polarity.

     scale         Its scan constants are world units tuned against its own
                   scene. This strip is a different size, so they are held
                   here as fractions of the reach and resolved after layout.
                   Copying 520 across unchanged would put the lag at a
                   different fraction of the run and lose the effect.
   ═════════════════════════════════════════════════════════════════════════ */
import * as THREE from 'three';

/* ── the dials ─────────────────────────────────────────────────────────── */
export const P = {
  duration: 3.4,        // seconds end to end
  /* fractions of the scan's reach, from the reference's landed world units */
  solidLag:  520 / 4540,
  rimWidth:  135 / 4540,
  wireTrail: 950 / 4540,
  wireFade: 0.72,       // fraction of the run after which the cage burns off

  /* The orbit. The reference's 26 and 16 are world units against ITS camera
     distance; this massif is framed from much further back, so the same
     numbers would be a tenth of the arc. They are held here as the same
     FRACTION of the camera distance instead, which keeps the angle — and so
     the feel — while the ratio between them (26:16) is untouched. */
  camSwing:  26 / 820,
  camSwingY: 16 / 820,
  lookCarry: 0.42,
  nearYaw: 0.055,
  nearPitch: 0.026,
  farYaw: 0.030,
  damping: 0.055,       // per 60Hz frame

  /* the mountain */
  seed: 21,
  snowLine: 0.58,
  showWire: true,
};

/* The strip is about four and a half times wider than it is tall, so the
   subject is a WIDE massif — one dominant summit with the land either side
   clearly subordinate to it. A single cone in a big plane reads as a pebble;
   a field of equal bumps reads as hills. */
const NEAR = {
  w: 4800, d: 1500, peak: 620, segX: 300, segZ: 110, cageX: 74, cageZ: 26,
  /* The summit sits LEFT of centre on purpose. The request form is the one
     dark object on this white footer and it lands in the middle of the
     strip — a peak at x=0 spends its whole life behind it. Off to the left
     the mountain is read first and the form then sits on its right flank,
     which is also the better composition. */
  masses: [
    { x: -1350, z:   60, h: 1.00, rx: 900, rz: 470 },
    { x:  -250, z:  -40, h: 0.52, rx: 680, rz: 390 },
    { x:   950, z:   30, h: 0.74, rx: 810, rz: 430 },
    { x: -2550, z:  140, h: 0.44, rx: 660, rz: 370 },
    { x:  2300, z:  120, h: 0.46, rx: 680, rz: 380 },
  ],
};

/* A second range further back, lower and softer. It exists so the orbit has
   two layers to separate: the near massif turns nearly twice as far as this
   does, which is what reads as depth rather than as a poster on a hinge. */
const FAR = {
  w: 7200, d: 900, peak: 330, segX: 200, segZ: 50, cageX: 48, cageZ: 12,
  z: -1500,
  masses: [
    { x: -2600, z: 0, h: 0.86, rx: 820, rz: 330 },
    { x:  -900, z: 0, h: 0.66, rx: 700, rz: 300 },
    { x:   700, z: 0, h: 0.94, rx: 880, rz: 340 },
    { x:  2500, z: 0, h: 0.72, rx: 760, rz: 320 },
  ],
};

const clamp01 = t => (t < 0 ? 0 : t > 1 ? 1 : t);
const smoothstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

function makeNoise(seed) {
  const p = new Uint8Array(512);
  let s = seed >>> 0 || 1;
  const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const perm = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; [perm[i], perm[j]] = [perm[j], perm[i]]; }
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a, b, t) => a + (b - a) * t;
  const grad = (h, x, y) => ((h & 1) ? -x : x) + ((h & 2) ? -y : y);
  return (x, y) => {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    x -= Math.floor(x); y -= Math.floor(y);
    const u = fade(x), v = fade(y), A = p[X] + Y, B = p[X + 1] + Y;
    return lerp(
      lerp(grad(p[A], x, y), grad(p[B], x - 1, y), u),
      lerp(grad(p[A + 1], x, y - 1), grad(p[B + 1], x - 1, y - 1), u), v);
  };
}

let noise = makeNoise(P.seed);

/* The mass envelope on its own, with the noise left off: a smooth 0..1 that
   says how far up the LANDFORM a point is. The snow line rides this rather
   than the drawn surface, because the drawn surface is five octaves of
   ridged noise and its normals point every which way — a slope test against
   them switches the cap off on the very ground it should be covering. */
function macroOn(spec, x, z) {
  let base = 0;
  for (const m of spec.masses) {
    const dx = (x - m.x) / m.rx, dz = (z - m.z) / m.rz;
    base = Math.max(base, m.h * Math.exp(-(dx * dx + dz * dz) * 0.95));
  }
  return base;
}

function heightOn(spec, x, z) {
  const base = macroOn(spec, x, z);
  /* ridged noise, so the flanks carry spurs and gullies rather than reading
     as a smooth bell */
  let amp = 1, freq = 0.0013, sum = 0, norm = 0;
  for (let o = 0; o < 5; o++) {
    const n = noise(x * freq + 7.1, z * freq - 3.3);
    const ridge = 1 - Math.abs(n);
    sum += amp * ridge * ridge;
    norm += amp;
    amp *= 0.5; freq *= 2.11;
  }
  const detail = (sum / norm) * 2 - 1;
  /* relief dies at the summit and on the plain and is strongest on the
     flanks, which is where weathering actually acts */
  const env = 4 * base * (1 - base);
  return Math.max(0, (base + detail * 0.20 * (0.25 + 0.75 * env)) * spec.peak);
}

function buildGrid(spec, nx, nz) {
  const g = new THREE.PlaneGeometry(spec.w, spec.d, nx, nz);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position;
  const macro = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    pos.setY(i, heightOn(spec, x, z));
    macro[i] = macroOn(spec, x, z);
  }
  pos.needsUpdate = true;
  g.setAttribute('aMacro', new THREE.BufferAttribute(macro, 1));
  g.computeVertexNormals();
  return g;
}

/* ── the shared wavefront ──────────────────────────────────────────────────
   One object, read by every material. The two fronts can never drift apart,
   which is the failure the whole effect turns on. */
const scan = {
  uScanOrigin:  { value: new THREE.Vector3(-2900, -120, 1500) },
  uScanRadius:  { value: 0 },
  uScanEnabled: { value: 1 },
  uWireOpacity: { value: 0 },
  uSolidLag:    { value: 860 },
};

/* The two long sine terms are load-bearing: a perfectly circular front reads
   as a clip-path rather than as a survey. */
const UNSCANNED = `
  uniform vec3 uScanOrigin;
  uniform float uScanRadius;
  uniform float uScanEnabled;

  bool unscanned(vec3 worldPosition, float lag) {
    if (uScanEnabled < 0.5) return false;
    float wobble =
        sin(worldPosition.y * 0.011 + worldPosition.x * 0.007) * 36.0
      + sin(worldPosition.z * 0.021 + worldPosition.y * 0.013) * 17.0;
    return distance(worldPosition, uScanOrigin)
         > uScanRadius - lag + wobble;
  }`;

function solidMaterial(spec, inkHi, inkLo, snow) {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...scan,
      uInk:      { value: new THREE.Color(inkHi) },
      uInkLow:   { value: new THREE.Color(inkLo) },
      uPaper:    { value: new THREE.Color('#ffffff') },
      uSnowLine: { value: P.snowLine },
      uSnowAmt:  { value: snow },
      uMaxH:     { value: spec.peak },
    },
    side: THREE.DoubleSide,
    vertexShader: `
      attribute float aMacro;
      varying vec3 vW; varying vec3 vN; varying float vH; varying float vMacro;
      void main(){
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        vN = normalize(mat3(modelMatrix) * normal);
        vH = position.y;
        vMacro = aMacro;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: `
      precision highp float;
      varying vec3 vW; varying vec3 vN; varying float vH; varying float vMacro;
      uniform vec3 uInk, uInkLow, uPaper;
      uniform float uSolidLag, uSnowLine, uSnowAmt, uMaxH;
      ${UNSCANNED}

      void main(){
        /* the solid trails the wire front — zero lag and the two arrive as
           one wipe, which is a mask again */
        if (unscanned(vW, uSolidLag)) discard;

        vec3 N = normalize(vN);
        float alt = clamp(vH / uMaxH, 0.0, 1.0);

        /* A printed massif, not a lit one: the page is paper and the ridge is
           ink on it. Shading is tonal — faces turned from the light carry
           more ink — rather than a light model. */
        float key = clamp(dot(N, normalize(vec3(-0.55, 0.62, 0.56))), 0.0, 1.0);
        vec3 col = mix(uInkLow, uInk, 0.30 + 0.70 * key);

        /* Snow, so the thing reads as a MOUNTAIN at a glance rather than as a
           dark hill. The line rides the smooth landform, not the drawn
           surface, so the cap is a cap and not a scatter of white specks.
           The normal still gets a say, but a gentle one — enough to keep the
           steepest faces bare, not enough to strip the summit. */
        float band = smoothstep(uSnowLine - 0.13, uSnowLine + 0.13, vMacro);
        float lies = mix(0.55, 1.0, smoothstep(0.15, 0.62, N.y));
        col = mix(col, uPaper * 0.97, band * lies * uSnowAmt);

        /* the ridgeline catch: where the surface turns edge-on to the view it
           picks up a thread of paper, which is what separates one spur from
           the one standing behind it */
        float edge = 1.0 - abs(dot(N, normalize(cameraPosition - vW)));
        col = mix(col, uPaper, pow(edge, 5.0) * 0.26);

        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

function cageMaterial(wire) {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...scan,
      uWire:  { value: new THREE.Color(wire) },
      uRim:   { value: 225 },
      uTrail: { value: 1570 },
    },
    transparent: true,
    depthWrite: false,
    vertexShader: `
      varying vec3 vW;
      void main(){
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: `
      precision highp float;
      varying vec3 vW;
      uniform vec3 uScanOrigin, uWire;
      uniform float uScanRadius, uWireOpacity, uRim, uTrail;
      void main(){
        float d = distance(vW, uScanOrigin);
        /* the bright band at the front, and the readable trail behind it */
        float rim = exp(-pow((d - uScanRadius) / uRim, 2.0));
        float trail = smoothstep(uScanRadius, uScanRadius - uTrail, d);
        float a = (rim * 1.60 + trail * 0.34) * uWireOpacity;
        if (a < 0.004) discard;
        gl_FragColor = vec4(uWire, min(1.0, a));
      }`,
  });
}

export function mountFooterPeak(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio));   // DPR capped at 2

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 1, 30000);

  const nearGroup = new THREE.Group();
  const farGroup = new THREE.Group();
  scene.add(nearGroup, farGroup);

  /* the far range is paler — distance takes ink out of a print the same way
     it takes contrast out of a view */
  const nearSolid = new THREE.Mesh(buildGrid(NEAR, NEAR.segX, NEAR.segZ),
                                   solidMaterial(NEAR, '#33333a', '#101013', 0.95));
  nearGroup.add(nearSolid);

  const farSolid = new THREE.Mesh(buildGrid(FAR, FAR.segX, FAR.segZ),
                                  solidMaterial(FAR,  '#a8a8ae', '#7e7e85', 0.60));
  farSolid.position.z = FAR.z;
  farGroup.add(farSolid);

  /* ── the cage ───────────────────────────────────────────────────────────
     Built from its own coarse grids, not from the solids'. The real cost of
     this effect is line coverage: a wireframe of the 300×110 sheet is an
     unreadable wall of ink as well as a great deal of overdraw. */
  let cages = [];
  function makeCage() {
    const a = new THREE.LineSegments(
      new THREE.WireframeGeometry(buildGrid(NEAR, NEAR.cageX, NEAR.cageZ)),
      cageMaterial('#1d1d20'));
    nearGroup.add(a);
    const b = new THREE.LineSegments(
      new THREE.WireframeGeometry(buildGrid(FAR, FAR.cageX, FAR.cageZ)),
      cageMaterial('#8d8d92'));
    b.position.z = FAR.z;
    farGroup.add(b);
    cages = [a, b];
  }
  function disposeCage() {
    for (const c of cages) {
      c.parent.remove(c);
      c.geometry.dispose();
      c.material.dispose();
    }
    cages = [];
  }
  makeCage();

  /* ── framing ────────────────────────────────────────────────────────────
     The centre pose is built first at every size, then the orbit offsets are
     applied on top of it. The other way round loses the composition the
     moment the strip changes shape. */
  let maxRadius = 1, swingX = 26, swingY = 16;
  const camHome = new THREE.Vector3();
  const lookHome = new THREE.Vector3(0, NEAR.peak * 0.40, 0);

  function layout() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;                      // guard a zero-sized root
    renderer.setSize(w, h, false);
    camera.aspect = w / h;

    /* Framed on HEIGHT, not width. The strip is four and a half times wider
       than it is tall, so fitting the whole 4800-unit massif across it
       squashes the summit to a sixth of its span and the thing stops reading
       as a mountain at all. Fitting the height instead lets the shoulders run
       off both edges, which is what a mountain in a letterbox looks like.
       The floor keeps a narrow window (a phone) from pushing the camera so
       close that it ends up inside the ridge. */
    const half = Math.tan(camera.fov * Math.PI / 360);
    const dist = Math.max(
      (NEAR.peak * 1.62) / 2 / half,
      (NEAR.peak * 3.1) / 2 / half / camera.aspect,
    );
    camHome.set(0, NEAR.peak * 0.46, dist);
    swingX = dist * P.camSwing;
    swingY = dist * P.camSwingY;
    camera.updateProjectionMatrix();

    /* Resolved AFTER layout, or the far corner is still clipped when the scan
       finishes. The scan constants ride this, so they stay the same fraction
       of the run at any size. */
    const diag = Math.hypot(NEAR.w, NEAR.d + Math.abs(FAR.z), NEAR.peak);
    maxRadius = diag * 1.3 + 900;
    scan.uSolidLag.value = maxRadius * P.solidLag;
    for (const c of cages) {
      c.material.uniforms.uRim.value = maxRadius * P.rimWidth;
      c.material.uniforms.uTrail.value = maxRadius * P.wireTrail;
    }
    /* low and to one side. A centred origin reads as a loading ring. */
    scan.uScanOrigin.value.set(-NEAR.w * 0.60, -120, NEAR.d * 1.1);
  }
  layout();
  new ResizeObserver(layout).observe(canvas);

  /* ── the pointer ────────────────────────────────────────────────────────
     The handler records intent only. No getBoundingClientRect here: a layout
     read on every pointermove turns a cheap effect into frame spikes. */
  const target = { x: 0, y: 0 }, smooth = { x: 0, y: 0 };
  const coarse = matchMedia('(pointer: coarse)').matches;
  let rect = canvas.getBoundingClientRect();
  const reread = () => { rect = canvas.getBoundingClientRect(); };
  new ResizeObserver(reread).observe(document.body);
  addEventListener('scroll', reread, { passive: true });

  if (!coarse) {
    addEventListener('pointermove', e => {
      if (e.pointerType === 'touch') return;
      target.x = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
      target.y = ((e.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1;
    }, { passive: true });
    canvas.addEventListener('pointerleave', () => { target.x = 0; target.y = 0; });
  }

  /* ── the run ───────────────────────────────────────────────────────────── */
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let elapsed = 0, last = performance.now(), raf = 0;
  let onScreen = true, done = false;

  /* Under reduced motion the scan does not run. It composes a designed still
     partway through instead — cage and solid both visible — so the technique
     stays legible rather than the scene simply being hidden. */
  function composeStill() {
    scan.uScanRadius.value = maxRadius * 0.62;
    scan.uWireOpacity.value = P.showWire ? 1 : 0;
    scan.uScanEnabled.value = 1;
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(1 / 30, (now - last) / 1000);   // clamped
    last = now;
    if (!onScreen) return;

    if (reduced.matches) {
      composeStill();
    } else if (!done) {
      elapsed += dt;
      const e = clamp01(elapsed / P.duration);
      /* one conductor: the radius drives the cage AND the solid */
      scan.uScanRadius.value = (1 - Math.pow(1 - e, 1.35)) * maxRadius;
      scan.uWireOpacity.value =
        (P.showWire ? 1 : 0) * Math.min(1, e / 0.06) * (1 - smoothstep(P.wireFade, 1, e));
      if (e >= 1) {
        /* the discard branch goes off and the cage is disposed — left at zero
           opacity it keeps duplicate geometry and shader work alive */
        scan.uScanEnabled.value = 0;
        disposeCage();
        done = true;
      }
    }

    /* the orbit: framerate-independent damping of one value */
    const alpha = 1 - Math.pow(1 - P.damping, dt * 60);
    smooth.x += (target.x - smooth.x) * alpha;
    smooth.y += (target.y - smooth.y) * alpha;

    camera.position.set(
      camHome.x - smooth.x * swingX,
      camHome.y + smooth.y * swingY,
      camHome.z,
    );
    /* the look-at carries only part of the travel, so the peak stays put */
    camera.lookAt(
      lookHome.x + (camera.position.x - camHome.x) * P.lookCarry,
      lookHome.y + (camera.position.y - camHome.y) * P.lookCarry,
      lookHome.z,
    );
    nearGroup.rotation.y = smooth.x * P.nearYaw;
    nearGroup.rotation.x = smooth.y * P.nearPitch;
    farGroup.rotation.y  = smooth.x * P.farYaw;

    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(frame);

  /* Pause off screen, and reset the time base on the way back so the scan
     does not jump forward by however long it was away. */
  new IntersectionObserver(([entry]) => {
    onScreen = entry ? entry.isIntersecting : true;
    if (onScreen) last = performance.now();
  }).observe(canvas);

  return {
    P,
    /* Replay disposes whatever is left of the last run before starting the
       next, so two presses cannot leave two cages in the scene. */
    replay() {
      disposeCage();
      makeCage();
      layout();
      elapsed = 0; done = false;
      last = performance.now();
      scan.uScanEnabled.value = 1;
      scan.uScanRadius.value = 0;
      scan.uWireOpacity.value = 0;
    },
    regenerate(seed) {
      P.seed = seed != null ? seed : (Math.random() * 1e6) | 0;
      noise = makeNoise(P.seed);
      nearSolid.geometry.dispose();
      nearSolid.geometry = buildGrid(NEAR, NEAR.segX, NEAR.segZ);
      farSolid.geometry.dispose();
      farSolid.geometry = buildGrid(FAR, FAR.segX, FAR.segZ);
    },
    sync() {
      nearSolid.material.uniforms.uSnowLine.value = P.snowLine;
      farSolid.material.uniforms.uSnowLine.value = P.snowLine;
      scan.uSolidLag.value = maxRadius * P.solidLag;
      for (const c of cages) {
        c.material.uniforms.uRim.value = maxRadius * P.rimWidth;
        c.material.uniforms.uTrail.value = maxRadius * P.wireTrail;
      }
    },
    dispose() {
      cancelAnimationFrame(raf);
      disposeCage();
      nearSolid.geometry.dispose(); nearSolid.material.dispose();
      farSolid.geometry.dispose();  farSolid.material.dispose();
      renderer.dispose();
    },
  };
}
