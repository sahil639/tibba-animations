/* ══════════════════════════════════════════════════════════════════════════
   Top-view contours — a map drawn once, as vector lines
   ─────────────────────────────────────────────────────────────────────────
   The summits seen from straight above: a height field (rolling ground and
   any number of peaks) traced into contour lines with marching squares,
   joined into polylines and handed back as SVG path data, grouped by
   whatever key the caller gives each line (its brightness, its colour).

   Drawn once, at load and when the width changes — never per frame. The
   lines then move only as a whole, by transform, which the compositor does
   for free. That is what keeps the sections that use it light on a phone.

     TibbaTopo.noise(x, y)                      fbm value noise, ~0..1
     TibbaTopo.contours({ w, h, step, levels, field(x, y), key(levelIndex, x, y) })
        → [{ key, d }]                          one path per key
     TibbaTopo.svg(el, groups, style(key))      fills an <svg> with them
   ═════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  function h2(x, y) { let n = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263); n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967295; }
  function vn(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = h2(xi, yi), b = h2(xi + 1, yi), c = h2(xi, yi + 1), d = h2(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function noise(x, y) { return vn(x, y) * .55 + vn(x * 2.03 + 17, y * 2.03 + 9) * .28 + vn(x * 4.1 + 41, y * 4.1 + 3) * .17; }

  /* marching squares over a grid; segments are joined through the grid edges
     they cross, so the joins are exact and every ring closes */
  function contours({ w, h, step, levels, field, key }) {
    const nx = Math.ceil(w / step) + 1, ny = Math.ceil(h / step) + 1;
    const V = new Float32Array(nx * ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) V[j * nx + i] = field(i * step, j * step);
    const groups = new Map();
    levels.forEach((L, li) => {
      const segA = [], segB = [];                       // edge ids at each end
      const pt = new Map();                             // edge id → [x, y]
      const P = (id) => {
        let p = pt.get(id); if (p) return id;
        const n = id >> 1, i = n % nx, j = (n / nx) | 0;
        const a = V[n], b = (id & 1) ? V[n + nx] : V[n + 1];
        const t = (L - a) / (b - a);
        pt.set(id, (id & 1) ? [i * step, (j + t) * step] : [(i + t) * step, j * step]);
        return id;
      };
      for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
        const n = j * nx + i;
        const a = V[n] >= L, b = V[n + 1] >= L, c = V[n + nx + 1] >= L, d = V[n + nx] >= L;
        if (a === b && b === c && c === d) continue;
        const T = n * 2, B = (n + nx) * 2, Lf = n * 2 + 1, R = (n + 1) * 2 + 1;
        const e = [];
        if (a !== b) e.push(T); if (b !== c) e.push(R); if (c !== d) e.push(B); if (d !== a) e.push(Lf);
        if (e.length === 2) { segA.push(P(e[0])); segB.push(P(e[1])); continue; }
        const mid = (V[n] + V[n + 1] + V[n + nx + 1] + V[n + nx]) / 4 >= L;   // a saddle
        if (mid === a) { segA.push(P(T), P(B)); segB.push(P(R), P(Lf)); }
        else { segA.push(P(T), P(B)); segB.push(P(Lf), P(R)); }
      }
      /* join */
      const at = new Map();
      const add = (id, s) => { const l = at.get(id); l ? l.push(s) : at.set(id, [s]); };
      for (let s = 0; s < segA.length; s++) { add(segA[s], s); add(segB[s], s); }
      const used = new Uint8Array(segA.length);
      const other = (s, id) => segA[s] === id ? segB[s] : segA[s];
      const walk = (from, out) => {
        let id = from;
        for (;;) {
          const l = at.get(id); let nxt = -1;
          for (const s of l) if (!used[s]) { nxt = s; break; }
          if (nxt < 0) return;
          used[nxt] = 1; id = other(nxt, id); out.push(id);
        }
      };
      for (let s = 0; s < segA.length; s++) {
        if (used[s]) continue;
        used[s] = 1;
        const fwd = [segB[s]], back = [];
        walk(segB[s], fwd); walk(segA[s], back);
        const ids = back.reverse().concat([segA[s]], fwd);
        if (ids.length < 3) continue;
        const p0 = pt.get(ids[0]);
        const k = key(li, p0[0], p0[1]);
        if (k == null) continue;
        let d = 'M' + p0[0].toFixed(1) + ' ' + p0[1].toFixed(1) + 'L';
        for (let q = 1; q < ids.length; q++) { const p = pt.get(ids[q]); d += p[0].toFixed(1) + ' ' + p[1].toFixed(1) + ' '; }
        groups.set(k, (groups.get(k) || '') + d);
      }
    });
    return [...groups].map(([k, d]) => ({ key: k, d }));
  }

  function svg(el, groups, style) {
    el.innerHTML = groups.map(g => { const s = style(g.key) || {}; return `<path d="${g.d}"${Object.entries(s).map(([a, v]) => ` ${a}="${v}"`).join('')}/>`; }).join('');
  }

  global.TibbaTopo = { noise, contours, svg };
})(window);
