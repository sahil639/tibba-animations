/* ══════════════════════════════════════════════════════════════════════════
   Snow Peak — a lit massif for the footer
   ─────────────────────────────────────────────────────────────────────────
   Everything else in this repo draws mountains as line: contours, ribbons,
   ink. This one is the opposite — a solid, shaded, snow-capped massif under
   a real sky, for the footer to sit against.

   Built following three of MengTo's agent skills (~/.claude/skills):

     3d-sky-background   the sky is a direction shader, not a texture, so the
                         sun can move; horizon, middle band and zenith are
                         three separate colours; and the visible disk, its
                         halo and the directional light all read ONE sun
                         vector, which is the thing that keeps a sky coherent
     3d-four-seasons     the settled-snow mask — winter weight × upward-facing
                         world normal × exposure — rather than painting white
                         above a height, which is what makes snow sit on
                         ledges and leave the steep faces bare
     3d-high-res-…       texel density reasoning: detail is carried by two
                         noise octaves in the fragment rather than by a
                         texture, so there is nothing to download and nothing
                         to mip

   One renderer, one sun, one atmosphere. The skill's warning is the useful
   one: a background does not light anything and an environment does not cast
   a shadow — so the sky colour, the key light and the aerial haze are all
   derived here from the same two uniforms.
   ═════════════════════════════════════════════════════════════════════════ */
import * as THREE from 'three';

export function createSnowPeak(opts) {
  const canvas = opts.canvas;
  const vpW = () => canvas.clientWidth || innerWidth;
  const vpH = () => canvas.clientHeight || innerHeight;

  /* ── the dials ───────────────────────────────────────────────────────── */
  const P = {
    sunAzim: 44, sunElev: 30,      // degrees; one vector, everything reads it
    snowLine: 0.50,                // where snow begins, as a fraction of height
    snowBlend: 0.13,               // how soft that line is
    snowSlope: 0.52,               // how flat a face must be to hold snow
    snowSmooth: 6,                 // cells of blur on the normal the snow mask reads
    exposure: 1.0,
    haze: 0.60,                    // aerial perspective
    relief: 1.0,                   // vertical exaggeration
    ridged: 0.72,                  // how sharp the ridges are
    seed: 7,
  };

  /* ── renderer ────────────────────────────────────────────────────────── */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.setSize(vpW(), vpH(), false);
  /* One tone map and one output conversion, at the end, once — the skill's
     point about not tone-mapping twice. */
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = P.exposure;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, vpW() / vpH(), 0.5, 4000);

  /* Outside the land, not on it. The plane is 620 across, so a camera 240
     out is standing ON the terrain looking at whatever ridge happens to be
     in front of it — which is why the first framing showed a rocky rim and
     no summit at all. Past the edge and higher, the massif is the subject. */
  const CAM = { azim: 0, elev: 17, dist: 390, tgtY: 46 };
  function placeCamera() {
    const e = CAM.elev * Math.PI / 180, a = CAM.azim * Math.PI / 180;
    const out = CAM.dist * Math.cos(e), up = CAM.dist * Math.sin(e);
    camera.position.set(Math.sin(a) * out, CAM.tgtY + up, Math.cos(a) * out);
    camera.lookAt(0, CAM.tgtY, 0);
  }
  placeCamera();

  const sun = new THREE.Vector3();
  function placeSun() {
    const e = P.sunElev * Math.PI / 180, a = P.sunAzim * Math.PI / 180;
    sun.set(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e)).normalize();
  }
  placeSun();

  /* ══════════════════════════════════════════════════════════════════════
     THE SKY
     ─────────────────────────────────────────────────────────────────────
     A box rendered from the inside with depth writes off, coloured from the
     normalised view direction. Not a dome and not a texture: the sun has to
     be movable, and a direction shader is the only one of the three that
     costs nothing to move it.
     ══════════════════════════════════════════════════════════════════════ */
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, depthTest: false,
    uniforms: {
      uSun:     { value: sun },
      uHorizon: { value: new THREE.Color('#dfe6ee').convertSRGBToLinear() },
      uMid:     { value: new THREE.Color('#8fa9c8').convertSRGBToLinear() },
      uZenith:  { value: new THREE.Color('#2f5590').convertSRGBToLinear() },
      uSunCol:  { value: new THREE.Color('#fff2dc').convertSRGBToLinear() },
    },
    vertexShader: `
      varying vec3 vDir;
      void main(){
        /* the direction from the camera to this face, in world space — the
           box is only a way of covering the frame */
        vDir = (modelMatrix * vec4(position, 1.0)).xyz - cameraPosition;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      varying vec3 vDir;
      uniform vec3 uSun, uHorizon, uMid, uZenith, uSunCol;
      void main(){
        vec3 d = normalize(vDir);
        float h = clamp(d.y, -1.0, 1.0);

        /* Three bands, not two. A straight horizon-to-zenith ramp reads as a
           gradient; the middle band is what makes it read as air. */
        vec3 col = mix(uHorizon, uMid, smoothstep(-0.02, 0.26, h));
        col = mix(col, uZenith, smoothstep(0.18, 0.78, h));

        /* Below the horizon, carry the horizon colour down rather than
           letting the box show an edge. */
        col = mix(col, uHorizon * 0.92, smoothstep(0.0, -0.16, h));

        float c = max(0.0, dot(d, uSun));
        /* halo and disk are separate terms — one wide and weak, one tiny and
           bright. Together as a single power they make a white blob. */
        col += uSunCol * pow(c, 5.0) * 0.30;
        col += uSunCol * pow(c, 900.0) * 6.0;

        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const sky = new THREE.Mesh(new THREE.BoxGeometry(3000, 3000, 3000), skyMat);
  sky.frustumCulled = false;
  sky.renderOrder = -1;
  scene.add(sky);

  /* ══════════════════════════════════════════════════════════════════════
     THE LAND
     ─────────────────────────────────────────────────────────────────────
     Ridged fractal noise: the absolute value of a signed octave, inverted,
     which folds each octave's zero crossing into a crease. That crease is
     what a mountain's arête is, and it is the reason plain fbm always reads
     as hills however high you scale it.
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
    const grad = (hv, x, y) => {
      const h = hv & 3;
      return (h & 1 ? -x : x) + (h & 2 ? -y : y);
    };
    return (x, y) => {
      const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
      x -= Math.floor(x); y -= Math.floor(y);
      const u = fade(x), v = fade(y);
      const A = p[X] + Y, B = p[X + 1] + Y;
      return lerp(
        lerp(grad(p[A], x, y), grad(p[B], x - 1, y), u),
        lerp(grad(p[A + 1], x, y - 1), grad(p[B + 1], x - 1, y - 1), u), v);
    };
  }

  let noise = makeNoise(P.seed);

  function height(x, z) {
    /* the massif: a broad cone the ridges are carved out of, so the summit
       is in a known place and the silhouette is a mountain rather than a
       patch of rough ground */
    const r = Math.hypot(x, z) / 120;
    let base = Math.exp(-r * r * 1.15) * 86;

    let amp = 1, freq = 0.011, sum = 0, norm = 0;
    for (let o = 0; o < 6; o++) {
      const n = noise(x * freq + 11.3, z * freq - 4.7);
      /* ridged: fold the octave at zero and invert, then square to sharpen */
      const ridge = 1 - Math.abs(n);
      sum += amp * (ridge * ridge * P.ridged + (1 - P.ridged) * (n * 0.5 + 0.5));
      norm += amp;
      amp *= 0.5; freq *= 2.07;
    }
    const detail = (sum / norm) * 2 - 1;

    /* Erosion rides on the mass: relief dies at the summit and at the plain
       and is strongest on the flanks, which is where real weathering acts. */
    const u = Math.min(1, base / 86);
    const env = 4 * u * (1 - u);
    return Math.max(0, (base + detail * 46 * (0.35 + 0.65 * env)) * P.relief);
  }

  const SIZE = 620, SEG = 420;
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;

  /* A second normal, computed from a BLURRED copy of the heightfield.
     The drawn surface is deliberately jagged — six octaves of ridged noise
     on a 1.5-unit grid — so its per-vertex normals point every which way,
     and a slope test against them reads the facet under the fragment rather
     than the landform. Measured on the summit vertices, normal.y ran 0.34
     to 0.87, so the snow mask was being switched off on the very ground it
     was meant to cover. Snow settles by the shape of the mountain, not by
     the shape of the rubble, so the mask gets its own smoothed normal while
     the lighting keeps the sharp one. */
  const W = SEG + 1;
  const macro = new Float32Array(pos.count * 3);
  geo.setAttribute('aMacroN', new THREE.BufferAttribute(macro, 3));

  function buildLand() {
    for (let i = 0; i < pos.count; i++) pos.setY(i, height(pos.getX(i), pos.getZ(i)));
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    buildMacroNormals();
  }

  function buildMacroNormals() {
    const R = Math.max(0, Math.round(P.snowSmooth));
    let H = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) H[i] = pos.getY(i);

    /* separable box blur, run in grid-index space in two passes */
    if (R > 0) {
      const tmp = new Float32Array(pos.count);
      for (let r = 0; r < W; r++) for (let c = 0; c < W; c++) {
        let sum = 0, n = 0;
        for (let k = -R; k <= R; k++) {
          const cc = c + k; if (cc < 0 || cc >= W) continue;
          sum += H[r * W + cc]; n++;
        }
        tmp[r * W + c] = sum / n;
      }
      for (let r = 0; r < W; r++) for (let c = 0; c < W; c++) {
        let sum = 0, n = 0;
        for (let k = -R; k <= R; k++) {
          const rr = r + k; if (rr < 0 || rr >= W) continue;
          sum += tmp[rr * W + c]; n++;
        }
        H[r * W + c] = sum / n;
      }
    }

    /* central differences against the real world spacing, so the gradient is
       per world unit and the normal is comparable across any SIZE/SEG */
    const step = SIZE / SEG;
    const v = new THREE.Vector3();
    for (let r = 0; r < W; r++) for (let c = 0; c < W; c++) {
      const i = r * W + c;
      const cl = Math.max(0, c - 1), cr = Math.min(W - 1, c + 1);
      const rd = Math.max(0, r - 1), ru = Math.min(W - 1, r + 1);
      const dhx = (H[r * W + cr] - H[r * W + cl]) / ((cr - cl) * step);
      const dhz = (H[ru * W + c] - H[rd * W + c]) / ((ru - rd) * step);
      v.set(-dhx, 1, -dhz).normalize();
      macro[i * 3] = v.x; macro[i * 3 + 1] = v.y; macro[i * 3 + 2] = v.z;
    }
    geo.attributes.aMacroN.needsUpdate = true;
  }

  buildLand();

  const landMat = new THREE.ShaderMaterial({
    uniforms: {
      uSun:      { value: sun },
      uSunCol:   { value: new THREE.Color('#fff7ec').convertSRGBToLinear() },
      uSkyCol:   { value: new THREE.Color('#a9c2e0').convertSRGBToLinear() },
      uHorizon:  { value: new THREE.Color('#dfe6ee').convertSRGBToLinear() },
      uRockLow:  { value: new THREE.Color('#54514c').convertSRGBToLinear() },
      uRockHigh: { value: new THREE.Color('#8a857d').convertSRGBToLinear() },
      uSnow:     { value: new THREE.Color('#f4f7fb').convertSRGBToLinear() },
      /* The tallest the field actually reaches — 86 of cone plus about 16 of
         relief at the summit, where the erosion envelope has died away. The
         snow line is a fraction of THIS, so it has to be the real number or
         the line lands somewhere nobody asked for. */
      uMaxH:     { value: 104 },
      uSnowLine: { value: P.snowLine },
      uSnowBlend:{ value: P.snowBlend },
      uSnowSlope:{ value: P.snowSlope },
      uHaze:     { value: P.haze },
    },
    vertexShader: `
      attribute vec3 aMacroN;
      varying vec3 vW; varying vec3 vN; varying vec3 vMN; varying float vH;
      void main(){
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        /* the world normal, which the snow mask needs — an object normal
           would put snow on the uphill side of a rotated mesh */
        vN = normalize(mat3(modelMatrix) * normal);
        vMN = normalize(mat3(modelMatrix) * aMacroN);
        vH = position.y;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: `
      varying vec3 vW; varying vec3 vN; varying vec3 vMN; varying float vH;
      uniform vec3 uSun, uSunCol, uSkyCol, uHorizon, uRockLow, uRockHigh, uSnow;
      uniform float uMaxH, uSnowLine, uSnowBlend, uSnowSlope, uHaze;

      /* two cheap octaves, for surface break-up. Detail in the fragment
         rather than in a texture: nothing to download, nothing to mip, and
         it holds at any camera distance. */
      float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vnoise(vec2 p){
        vec2 i = floor(p), f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(h21(i), h21(i + vec2(1,0)), u.x),
                   mix(h21(i + vec2(0,1)), h21(i + vec2(1,1)), u.x), u.y);
      }

      void main(){
        vec3 N = normalize(vN);
        float alt = clamp(vH / uMaxH, 0.0, 1.0);

        /* ── settled snow ────────────────────────────────────────────────
           Altitude decides WHERE snow is possible; the upward-facing normal
           decides where it actually sits. Altitude alone paints a white band
           straight across every cliff face, which is the single thing that
           makes CG mountains look like painted cones. */
        float band  = smoothstep(uSnowLine - uSnowBlend, uSnowLine + uSnowBlend, alt);
        /* Not named "flat": that is an interpolation qualifier in GLSL ES 3.0
           and cannot be a variable. The shader compiles on WebGL1 and fails
           on WebGL2, which is the version Three picks when it can. */
        float lie   = smoothstep(uSnowSlope - 0.30, uSnowSlope + 0.22, normalize(vMN).y);
        /* and a little noise on the line, so it is weather rather than a
           contour of the height function */
        float jitter = (vnoise(vW.xz * 0.05) - 0.5) * 0.22;
        float snow = clamp(band * lie + jitter * band, 0.0, 1.0);

        /* ── rock ───────────────────────────────────────────────────────── */
        float grain = vnoise(vW.xz * 0.34) * 0.5 + vnoise(vW.xz * 1.6) * 0.5;
        vec3 rock = mix(uRockLow, uRockHigh, alt * 0.75 + grain * 0.35);
        /* strata: the flat-lying bands a bedded massif shows on its faces */
        rock *= 0.88 + 0.12 * sin(vH * 0.55 + grain * 2.0);

        vec3 albedo = mix(rock, uSnow, snow);
        float rough = mix(0.92, 0.55, snow);

        /* ── light ───────────────────────────────────────────────────────
           One key from the sun vector the sky is drawn with, one hemisphere
           fill from the sky itself, and a weak bounce off the ground. A
           background does not light anything; this is what does. */
        float ndl = max(0.0, dot(N, uSun));
        vec3 key  = uSunCol * ndl;
        vec3 fill = mix(uHorizon * 0.42, uSkyCol * 0.78, N.y * 0.5 + 0.5);
        vec3 bounce = uRockLow * 0.22 * max(0.0, -N.y * 0.5 + 0.5);

        /* a wide forward-scatter on snow, which is most of why snow reads as
           snow rather than as white rock */
        vec3 V = normalize(cameraPosition - vW);
        float wrap = max(0.0, (dot(N, uSun) + 0.45) / 1.45);
        vec3 sss = uSnow * uSunCol * pow(wrap, 2.2) * snow * 0.45;

        /* one specular lobe, narrow on snow and almost absent on rock */
        vec3 H = normalize(uSun + V);
        float spec = pow(max(0.0, dot(N, H)), mix(14.0, 150.0, snow)) * mix(0.02, 0.35, snow);

        vec3 col = albedo * (key + fill + bounce) + sss + uSunCol * spec * (1.0 - rough);

        /* ── aerial perspective ──────────────────────────────────────────
           Toward the sky's own horizon colour, not toward grey, and stronger
           low down where the air is thickest. This is what puts the far
           ridges behind the near ones. */
        float d = length(cameraPosition - vW);
        float fog = 1.0 - exp(-pow(d * 0.0016 * uHaze, 2.2));
        fog *= mix(1.0, 0.55, smoothstep(0.2, 0.9, alt));
        col = mix(col, uHorizon, clamp(fog, 0.0, 1.0));

        gl_FragColor = vec4(col, 1.0);
      }`,
  });

  const land = new THREE.Mesh(geo, landMat);
  scene.add(land);

  /* ── keeping the uniforms and the dials in step ───────────────────────── */
  function sync() {
    placeSun();
    landMat.uniforms.uSnowLine.value = P.snowLine;
    landMat.uniforms.uSnowBlend.value = P.snowBlend;
    landMat.uniforms.uSnowSlope.value = P.snowSlope;
    landMat.uniforms.uHaze.value = P.haze;
    renderer.toneMappingExposure = P.exposure;
  }

  function resize() {
    const w = vpW(), h = vpH();
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  new ResizeObserver(resize).observe(canvas);
  addEventListener('resize', resize);

  let running = true, raf = 0, t0 = performance.now();
  function frame() {
    raf = requestAnimationFrame(frame);
    if (!running) return;
    const t = (performance.now() - t0) * 0.001;
    /* a very slow drift, so the scene is alive without asking to be watched */
    CAM.azim = Math.sin(t * 0.045) * 5;
    placeCamera();
    sky.position.copy(camera.position);
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(frame);

  return {
    P, camera, renderer, scene, CAM,
    sync,
    setCamera(next) { Object.assign(CAM, next); placeCamera(); },
    rebuild(newSeed) {
      if (newSeed != null) { P.seed = newSeed; noise = makeNoise(P.seed); }
      buildLand();
    },
    setColor(key, hex) {
      const u = key === 'sky' ? skyMat.uniforms : landMat.uniforms;
      if (u[key]) u[key].value.set(hex).convertSRGBToLinear();
    },
    colorUniform(name) {
      return skyMat.uniforms[name] || landMat.uniforms[name];
    },
    setRunning(v) { running = !!v; },
  };
}
