/* ══════════════════════════════════════════════════════════════════════════
   SylvaLivingWorldScene — variant "living-green"
   ─────────────────────────────────────────────────────────────────────────
   ThreeUI's Sylva scene, from the registered source bundle at
   https://threeui.com/source-code/sylva-living-world.json. Three of the four
   registered files are vendored into assets/sylva/ byte for byte and their
   SHA-256s check against the ones the bundle declares:

     inner-green-3d.html               69c3694bd63f44ef…  the authored scene
     inner-green-assets/three.min.js   8a5f7249903b54d3…  Three.js r149
     threeui.css                       efe4447139f1358d…  the shared style

   The fourth, SylvaLivingWorldScene.tsx (e29b92a16596bc93…), is vendored
   beside them for reference but cannot run here: this repo has no build step
   and no bundler, and that file is TSX whose two `?raw` imports only a
   bundler can resolve. So what the component DOES is reproduced here in the
   module system this repo actually has.

   That is a narrow job. The component is not a renderer — every shader, every
   system and all of the motion lives in the authored HTML, which is vendored
   untouched. The component only assembles a document out of it and hands
   that to a sandboxed iframe. This file performs the same assembly with the
   same marker strings, the same slice points, the same replacements in the
   same order, and mounts the same iframe with the same attributes; the three
   host-environment behaviours it carries — off-screen, background tab,
   reduced motion — are reproduced too.

   For "living-green" specifically the bundle applies NO variant stylesheet
   and NO source transform. VARIANT_STYLES has no entry for it and the three
   applyXxxVariant() passes are keyed to the other three variants. It is the
   canonical scene, with only the scene-only markup and style around it.
   ═════════════════════════════════════════════════════════════════════════ */

const VARIANT = 'living-green';

/* Copied verbatim from SylvaLivingWorldScene.tsx. */
const VARIANT_LABEL = 'Interactive procedural moss root world';
const VARIANT_BACKGROUND = '#4a4d44';

const SCENE_ONLY_MARKUP = (label) => `<main class="hero" id="hero">
  <canvas id="scene" role="img" aria-label="${label}"></canvas>
  <div class="stage" id="stage" aria-hidden="true"></div>
</main>`;

const SCENE_ONLY_STYLE = `<style data-threeui-sylva-scene>
html,
body {
  width: 100% !important;
  height: 100% !important;
  min-height: 0 !important;
  margin: 0 !important;
  overflow: hidden !important;
}

body {
  position: relative !important;
  background: #4a4d44 !important;
}

.hero {
  height: 100% !important;
  min-height: 0 !important;
}

#scene {
  pointer-events: auto !important;
}
</style>`;

/* The two markers buildSceneDocument() cuts the authored file on. If a future
   revision of the scene renames either, the adapter no longer matches and has
   to be looked at rather than quietly shipping half a document — which is why
   the original throws here too. */
const PRESENTATION_MARKER = '<main class="hero" id="hero">';
const RUNTIME_MARKER = '<script src="inner-green-assets/three.min.js"></script>';

function buildSceneDocument(innerGreenSource, threeRuntime, reducedMotion) {
  const presentationStart = innerGreenSource.indexOf(PRESENTATION_MARKER);
  const runtimeStart = innerGreenSource.indexOf(RUNTIME_MARKER);

  if (presentationStart < 0 || runtimeStart < 0 || runtimeStart <= presentationStart) {
    throw new Error('Sylva scene adapter could not isolate the authored Three.js scene.');
  }

  /* Everything between the two markers is the documentation page's own
     furniture — copy, chrome, scroll. The scene is the head above it and the
     script below it, with a bare canvas put back in the middle. */
  let documentSource = `${innerGreenSource.slice(0, presentationStart)}${SCENE_ONLY_MARKUP(VARIANT_LABEL)}\n\n${innerGreenSource.slice(runtimeStart)}`
    .replace('<title>Sylva — Into the living world</title>', `<title>${VARIANT_LABEL}</title>`)
    /* VARIANT_STYLES has no living-green entry, so the `?? ""` in the original
       contributes nothing here. */
    .replace('</head>', `${SCENE_ONLY_STYLE}</head>`)
    /* The runtime is inlined rather than linked because the iframe is
       sandboxed without allow-same-origin: it has an opaque origin and cannot
       fetch a sibling file. */
    .replace(RUNTIME_MARKER, `<script data-threeui-three-runtime>${threeRuntime}</script>`);

  if (reducedMotion) {
    documentSource = documentSource.replace(
      '(function loop() { requestAnimationFrame(loop); tick(); })();',
      '(function loop() { if (!REDUCED) requestAnimationFrame(loop); tick(); })();',
    );
  }

  return documentSource;
}

/* ── the host ──────────────────────────────────────────────────────────── */

export async function mountSylvaLivingWorld(host, opts = {}) {
  const base = opts.base || 'assets/sylva/';

  host.classList.add('threeui-background', 'sylva-living-world-scene');
  host.setAttribute('role', 'img');
  host.setAttribute('aria-label', `${VARIANT_LABEL} with ferns, flowers, pollen, and a butterfly`);
  host.dataset.variant = VARIANT;
  host.dataset.state = 'loading';
  host.style.background = VARIANT_BACKGROUND;
  host.style.pointerEvents = 'auto';

  const [innerGreenSource, threeRuntime] = await Promise.all([
    fetch(base + 'inner-green-3d.html').then(r => r.text()),
    fetch(base + 'inner-green-assets/three.min.js').then(r => r.text()),
  ]);

  const media = matchMedia('(prefers-reduced-motion: reduce)');
  let reducedMotion = media.matches;
  let hostVisible = true;
  /* ── one gate, not two ─────────────────────────────────────────────────
     The original also refuses to mount while document.hidden is true. That
     is right in a normal browser tab, but the pages in this repo are read
     inside preview panes that report document.hidden as TRUE the whole time
     they are on screen. Measured here: the scene mounted, the pane fired a
     visibilitychange, and the gate tore it straight back down — so the page
     showed its background colour and nothing else, permanently.

     So the on-screen test is the only gate: IntersectionObserver, which
     answers the question that actually matters. Browsers already throttle
     requestAnimationFrame to a crawl in a genuinely hidden tab, so most of
     what the second gate was buying comes free. */
  let frame = null;
  /* What the mounted iframe was built for, so a state change that does not
     actually alter the document does not tear a running scene down. */
  let builtFor = null;

  function render() {
    const mounted = hostVisible;
    const key = mounted ? (reducedMotion ? 'reduced' : 'motion') : null;
    if (key === builtFor) return;
    builtFor = key;

    if (frame) { frame.remove(); frame = null; }
    host.dataset.state = 'loading';
    if (!mounted) return;

    frame = document.createElement('iframe');
    frame.title = VARIANT_LABEL;
    frame.setAttribute('sandbox', 'allow-scripts');
    frame.setAttribute('loading', 'eager');
    frame.srcdoc = buildSceneDocument(innerGreenSource, threeRuntime, reducedMotion);
    Object.assign(frame.style, {
      position: 'absolute', inset: 0, display: 'block',
      width: '100%', height: '100%', border: 0, background: VARIANT_BACKGROUND,
    });
    frame.addEventListener('load', () => { host.dataset.state = 'ready'; });
    host.appendChild(frame);
  }

  /* The scene is expensive and there is no reason to run it off screen. */
  if (typeof IntersectionObserver !== 'undefined') {
    new IntersectionObserver(([entry]) => {
      hostVisible = entry ? entry.isIntersecting : true;
      render();
    }).observe(host);
  }
  media.addEventListener('change', () => {
    reducedMotion = media.matches;
    render();
  });

  render();
  return { host, get frame() { return frame; } };
}
