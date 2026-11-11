/* ══════════════════════════════════════════════════════════════════════════
   A small contour mountain, drawn as SVG, with a pulsing peak
   ─────────────────────────────────────────────────────────────────────────
   Light stand-in for the live range where a page cannot afford WebGL (the
   phone's case cards, the Services case card). Rings of a lone summit seen
   from a low angle, each a solid black band, so the nearer ones hide the
   ones behind, as the contour scenes do. The dot on top pulses in --c.

     mountMiniPeak(el, { seed: 3, colour: '#4DD9C0' })
   ═════════════════════════════════════════════════════════════════════════ */
const css = `
.mpk { position: relative; width: 100%; height: 100%; }
.mpk svg { display: block; width: 100%; height: 100%; }
.mpk .dot { position: absolute; width: 0; height: 0; }
.mpk .dot::before { content: ''; position: absolute; left: -3.5px; top: -3.5px; width: 7px; height: 7px; border-radius: 50%; background: var(--pc, #fff);
  box-shadow: 0 0 14px 4px color-mix(in srgb, var(--pc, #fff) 55%, transparent); }
.mpk .dot::after { content: ''; position: absolute; left: -5px; top: -5px; width: 10px; height: 10px; border-radius: 50%; border: 1px solid var(--pc, #fff);
  animation: mpk-ping 1.8s cubic-bezier(.16,.62,.36,1) infinite; }
@keyframes mpk-ping { from { transform: scale(1); opacity: .9; } to { transform: scale(4.2); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .mpk .dot::after { animation: none; } }`;
let styled = false;

function rng(seed) { let t = (seed * 2654435761) >>> 0; return () => { t = (t + 0x6D2B79F5) >>> 0; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }

export function mountMiniPeak(el, { seed = 1, colour = '#fff', rings = 22, peakX = 0.5 } = {}) {
  if (!styled) { styled = true; const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s); }
  const W = 400, H = 260, R = rng(seed);
  /* a few lumps of noise round each ring, the same for every ring, so the
     slopes have spurs and gullies rather than perfect ellipses */
  const harm = [2, 3, 5].map(k => ({ k, a: (R() * 2 - 1) * (0.1 / k * 2), p: R() * 6.28 }));
  const cx = W * peakX, base = H * 0.98, top = H * 0.12, tilt = 0.32;
  let paths = '';
  for (let i = rings - 1; i >= 0; i--) {
    const t = i / (rings - 1);                       // 0 summit → 1 foot
    const r = 6 + Math.pow(t, 1.35) * W * 0.62;      // a steep top, a wide apron
    const y0 = top + (base - top) * Math.pow(t, 0.9) - r * tilt * 0.35;
    let d = '';
    for (let s = 0; s <= 64; s++) {
      const a = s / 64 * Math.PI * 2;
      const n = 1 + harm.reduce((acc, h) => acc + h.a * Math.sin(h.k * a + h.p + t * 1.5), 0);
      const x = cx + Math.cos(a) * r * n, y = y0 + Math.sin(a) * r * n * tilt;
      d += (s ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
    }
    const op = (0.35 + 0.6 * (1 - t)).toFixed(2);
    paths += `<path d="${d}Z" fill="#000" stroke="rgba(233,236,242,${op})" stroke-width="${(1.3 - t * 0.5).toFixed(2)}"/>`;
  }
  el.innerHTML = `<div class="mpk" style="--pc:${colour}"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax meet" aria-hidden="true">${paths}</svg><i class="dot"></i></div>`;
  /* the dot on the summit ring, wherever the fit puts it */
  const box = el.querySelector('.mpk'), dot = el.querySelector('.dot');
  const place = () => {
    const bw = box.clientWidth, bh = box.clientHeight, k = Math.min(bw / W, bh / H);
    dot.style.left = ((bw - W * k) / 2 + cx * k) + 'px';
    dot.style.top = ((bh - H * k) + (top - 6 * tilt * 0.35) * k) + 'px';
  };
  place(); new ResizeObserver(place).observe(box);
}
