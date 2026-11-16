/* The phone hero's mountain as one SVG: three depths (far range, a
   shoulder, the main peak), each a stack of solid contour rings so nearer
   rings hide the ones behind. Groups .far .mid .near move at different
   rates on scroll (website-v3-mobile.html). node tools/make-hero-svg.mjs */
import fs from 'fs';
const W = 750, H = 900;
function rng(seed) { let t = seed >>> 0; return () => { t = (t + 0x6D2B79F5) >>> 0; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
function peak({ cx, base, top, width, rings, seed, tilt = .3, op = 1, sharp = 1.35 }) {
  const R = rng(seed), harm = [2, 3, 5, 7].map(k => ({ k, a: (R() * 2 - 1) * (.16 / k * 2), p: R() * 6.28 }));
  let out = '';
  for (let i = rings - 1; i >= 0; i--) {
    const t = i / (rings - 1), r = 4 + Math.pow(t, sharp) * width;
    const y0 = top + (base - top) * Math.pow(t, .85) - r * tilt * .3;
    let d = '';
    for (let s = 0; s <= 96; s++) {
      const a = s / 96 * Math.PI * 2;
      const n = 1 + harm.reduce((acc, h) => acc + h.a * Math.sin(h.k * a + h.p + t * 2.2), 0);
      d += (s ? 'L' : 'M') + (cx + Math.cos(a) * r * n).toFixed(1) + ' ' + (y0 + Math.sin(a) * r * n * tilt).toFixed(1);
    }
    const o = (op * (.28 + .72 * (1 - t))).toFixed(2);
    out += `<path d="${d}Z" fill="#000" stroke="rgba(214,222,245,${o})" stroke-width="${(1.5 - t * .7).toFixed(2)}"/>`;
  }
  return out;
}
const far = peak({ cx: 150, base: 680, top: 500, width: 330, rings: 18, seed: 5, op: .45 }) + peak({ cx: 640, base: 660, top: 490, width: 300, rings: 18, seed: 9, op: .45 });
const mid = peak({ cx: 560, base: 800, top: 540, width: 380, rings: 22, seed: 13, op: .7 });
const near = peak({ cx: 360, base: 900, top: 400, width: 520, rings: 34, seed: 21, op: 1, sharp: 1.5 });
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice" aria-hidden="true" shape-rendering="geometricPrecision">
<rect width="${W}" height="${H}" fill="#000"/><g class="far">${far}</g><g class="mid">${mid}</g><g class="near">${near}</g></svg>`;
fs.writeFileSync('assets/hero-mountain.svg', svg);
console.log((svg.length / 1024).toFixed(0) + ' KB; summit at', 360 / W, 250 / H);
