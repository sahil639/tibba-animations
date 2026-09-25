/* ══════════════════════════════════════════════════════════════════════════
   About — the summit, close up, with the studio's flag on it
   ─────────────────────────────────────────────────────────────────────────
   The same contour massif as the hero and the Active Peak — same module,
   same palette, same orange rings — with the camera brought right in on
   the summit, and a flag planted at the very top. The page asks what Tibba
   means and answers "a peak"; this is the peak, claimed.

   The flag is cloth, not a card: a subdivided plane whose vertices ride two
   travelling waves, pinned along the pole edge and freest at the fly end,
   shaded from the slope of the wave so the folds read as light and shadow.
   The logo on it is the nav's own mark, read out of the page, so the flag
   can never carry a different logo from the one in the header.
   ═════════════════════════════════════════════════════════════════════════ */
import * as THREE from 'three';
import { createRangeScene } from './range-scene.js';

const $ = s => document.querySelector(s);
const css = getComputedStyle(document.documentElement);
const ACCENT = (css.getPropertyValue('--accent') || '#E85D3D').trim();

export const F = {
  /* the camera, in close */
  elev: 16, azim: 24, dist: 50, offX: -14, offY: -2,
  /* the flag */
  pole: 8.4,          // pole height, world units
  width: 6.0, height: 3.7,
  wind: 1,            // wave speed
  wave: 1,            // wave amplitude
};

const scene = createRangeScene({
  canvas: $('#about-peak'),
  mode: 'hero',
  ink: false,
  palette: 'peak',
  backdrop: 'behind',
  hover: false,
});
scene.setAccent(ACCENT);
scene.setHover(false);

const top = scene.summit();

function frame() {
  scene.setHeroCam({
    elev: F.elev, azim: F.azim, dist: F.dist,
    tgtX: top.x + F.offX, tgtY: top.y + F.offY,
  });
}
frame();

/* ── the flag ──────────────────────────────────────────────────────────── */
const flag = new THREE.Group();
flag.position.set(top.x, top.y - 0.4, top.z);
scene.group.add(flag);

const poleMat = new THREE.MeshBasicMaterial({ color: 0xE8E3DC });
const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.1, 1, 10), poleMat);
flag.add(pole);
const finial = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), poleMat);
flag.add(finial);

/* the cloth's texture: the accent, with the nav's mark on it in white */
const tex = document.createElement('canvas');
tex.width = 1024; tex.height = 640;
const tctx = tex.getContext('2d');
const texture = new THREE.CanvasTexture(tex);
texture.colorSpace = THREE.SRGBColorSpace;
texture.anisotropy = 4;

function paintFlag(svgMarkup) {
  tctx.fillStyle = ACCENT;
  tctx.fillRect(0, 0, tex.width, tex.height);
  /* a faint weave, so the cloth has a surface and is not flat paint */
  tctx.globalAlpha = 0.06;
  tctx.fillStyle = '#000';
  for (let y = 0; y < tex.height; y += 6) tctx.fillRect(0, y, tex.width, 2);
  tctx.globalAlpha = 1;
  texture.needsUpdate = true;
  if (!svgMarkup) return;
  const img = new Image();
  img.onload = () => {
    const w = tex.width * 0.72, h = w * (img.height / img.width || 20 / 87.3);
    tctx.drawImage(img, (tex.width - w) / 2, (tex.height - h) / 2, w, h);
    texture.needsUpdate = true;
  };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgMarkup);
}
paintFlag(null);

/* The mark lives in the nav, which site-chrome.js builds after this module
   may already have run — so it is looked for until it is there. */
(function findMark(tries = 0) {
  const svg = document.querySelector('[data-site-nav] svg[aria-label="Tibba"], [data-site-nav] .mark svg, [data-site-nav] svg');
  if (!svg) { if (tries < 60) setTimeout(() => findMark(tries + 1), 100); return; }
  const c = svg.cloneNode(true);
  c.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const vb = (c.getAttribute('viewBox') || '0 0 87.3 20').split(/\s+/).map(Number);
  c.setAttribute('width', String(vb[2] * 20));
  c.setAttribute('height', String(vb[3] * 20));
  c.style.color = '#ffffff';
  c.querySelectorAll('[fill="currentColor"]').forEach(n => n.setAttribute('fill', '#ffffff'));
  paintFlag(c.outerHTML);
})();

const clothGeo = new THREE.PlaneGeometry(1, 1, 36, 20);
clothGeo.translate(0.5, -0.5, 0);           // hinge on the top-left corner
const cloth = new THREE.Mesh(clothGeo, new THREE.ShaderMaterial({
  side: THREE.DoubleSide,
  uniforms: {
    uMap: { value: texture },
    uTime: { value: 0 },
    uW: { value: F.width }, uH: { value: F.height },
    uAmp: { value: F.wave },
  },
  vertexShader: `
    uniform float uTime, uW, uH, uAmp;
    varying vec2 vUv; varying float vShade;
    void main(){
      vUv = vec2(position.x, 1.0 + position.y);
      float u = position.x;                  // 0 at the pole, 1 at the fly end
      float free = pow(u, 1.25);             // pinned at the hoist
      float ph = u * 7.0 - uTime * 3.4 + position.y * 1.6;
      float w = sin(ph) * 0.6 + sin(u * 13.0 - uTime * 5.3) * 0.22;
      vec3 p = vec3(u * uW, position.y * uH, 0.0);
      p.z += w * free * uAmp * uW * 0.11;
      p.y -= u * u * uH * 0.07;              // the fly end sags a little
      /* the wave's slope along the cloth, which is what light reads */
      float slope = cos(ph) * 0.6 * 7.0 + cos(u * 13.0 - uTime * 5.3) * 0.22 * 13.0;
      vShade = slope * free * uAmp * 0.05;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }`,
  fragmentShader: `
    uniform sampler2D uMap;
    varying vec2 vUv; varying float vShade;
    void main(){
      vec4 c = texture2D(uMap, vUv);
      float light = clamp(0.86 + vShade, 0.55, 1.18);
      gl_FragColor = vec4(c.rgb * light, 1.0);
      #include <colorspace_fragment>
    }`,
}));
flag.add(cloth);

function build() {
  pole.scale.set(1, F.pole, 1);
  pole.position.y = F.pole / 2;
  finial.position.y = F.pole + 0.1;
  cloth.position.set(0.08, F.pole - 0.25, 0);
  cloth.material.uniforms.uW.value = F.width;
  cloth.material.uniforms.uH.value = F.height;
}
build();

/* the flag faces across the view, so it is seen side-on and its waves read */
flag.rotation.y = -0.35;

const t0 = performance.now();
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
(function tick(now) {
  requestAnimationFrame(tick);
  cloth.material.uniforms.uTime.value = reduced ? 1.2 : (now - t0) / 1000 * F.wind;
  cloth.material.uniforms.uAmp.value = F.wave;
})(t0);

export const about = { scene, F, frame, build, flag };
window.tibbaAbout = about;
