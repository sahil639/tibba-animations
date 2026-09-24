/* ══════════════════════════════════════════════════════════════════════════
   Topo Lines — an animated contour field
   ─────────────────────────────────────────────────────────────────────────
   Ported from the Framer component of the same name. The algorithm is
   untouched and it is the interesting half: contours are extracted from a
   LIVE noise field with marching squares every frame and joined into
   continuous polylines, so lines merge, split, are born and die the way real
   elevation data does as the ground under it moves. Every other contour
   drawing in this repo extracts its lines once from a fixed heightfield;
   this one re-extracts them sixty times a second from a moving one.

   What changed is the wrapper. useEffect, useRef, RenderTarget,
   addPropertyControls and the type annotations have all gone — this repo has
   no build step, so a .tsx cannot run in it, and each of those has a plain
   equivalent here. The twelve props became one live object the panel writes
   into, which is how everything else here is tuned.

   That last one is not only a port detail. The Framer version re-ran its
   entire effect whenever any prop changed — hence its twelve-entry dependency
   array — which meant every slider rebuilt the field, the buffers and the
   noise table. Reading a live object instead, a control is a write and the
   next frame picks it up; only detail and seed, which change the size of the
   buffers and the permutation table, rebuild anything.
   ═════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* The component's defaults, live. */
  const P = {
    pattern: 'Topographic',
    background: '#232324',
    lineColor: '#FFFFFF',
    speed: 1,
    scale: 1,
    lines: 26,
    weight: 1.1,
    dashed: 0.18,
    broken: 0.16,
    detail: 5,
    markers: 1,
    seed: 7,
  };

  let rebuild = function () {};

function makeNoise(seed) {
    const p = new Uint8Array(256)
    for (let i = 0; i < 256; i++) p[i] = i
    let s = seed >>> 0 || 1
    const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
    for (let i = 255; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1))
        const t = p[i]
        p[i] = p[j]
        p[j] = t
    }
    const perm = new Uint8Array(512)
    const permMod12 = new Uint8Array(512)
    for (let i = 0; i < 512; i++) {
        perm[i] = p[i & 255]
        permMod12[i] = perm[i] % 12
    }
    const gx = [1, -1, 1, -1, 1, -1, 1, -1, 0, 0, 0, 0]
    const gy = [1, 1, -1, -1, 0, 0, 0, 0, 1, -1, 1, -1]

    const F2 = 0.5 * (Math.sqrt(3) - 1)
    const G2 = (3 - Math.sqrt(3)) / 6

    return function noise2(xin, yin) {
        const sk = (xin + yin) * F2
        const i = Math.floor(xin + sk)
        const j = Math.floor(yin + sk)
        const t = (i + j) * G2
        const x0 = xin - (i - t)
        const y0 = yin - (j - t)
        let i1 = 0
        let j1 = 1
        if (x0 > y0) {
            i1 = 1
            j1 = 0
        }
        const x1 = x0 - i1 + G2
        const y1 = y0 - j1 + G2
        const x2 = x0 - 1 + 2 * G2
        const y2 = y0 - 1 + 2 * G2
        const ii = i & 255
        const jj = j & 255
        let n0 = 0
        let n1 = 0
        let n2 = 0
        let t0 = 0.5 - x0 * x0 - y0 * y0
        if (t0 > 0) {
            const g = permMod12[ii + perm[jj]]
            t0 *= t0
            n0 = t0 * t0 * (gx[g] * x0 + gy[g] * y0)
        }
        let t1 = 0.5 - x1 * x1 - y1 * y1
        if (t1 > 0) {
            const g = permMod12[ii + i1 + perm[jj + j1]]
            t1 *= t1
            n1 = t1 * t1 * (gx[g] * x1 + gy[g] * y1)
        }
        let t2 = 0.5 - x2 * x2 - y2 * y2
        if (t2 > 0) {
            const g = permMod12[ii + 1 + perm[jj + 1]]
            t2 *= t2
            n2 = t2 * t2 * (gx[g] * x2 + gy[g] * y2)
        }
        return 70 * (n0 + n1 + n2)
    }
}

function fbm(n, x, y, oct) {
    let a = 1
    let f = 1
    let sum = 0
    let norm = 0
    for (let i = 0; i < oct; i++) {
        sum += a * n(x * f, y * f)
        norm += a
        a *= 0.5
        f *= 2
    }
    return sum / norm
}

const hash = (n) => {
    const v = Math.sin(n * 127.1 + 311.7) * 43758.5453
    return v - Math.floor(v)
}

/* --------------------------------------------------------------- patterns */

const PATTERNS = [
    "Topographic",
    "Liquid marble",
    "Ridge flow",
    "Dune bands",
    "Crater rings",
]

function sampleField(pattern, n, x, y, t, w, h) {
    switch (pattern) {
        case "Liquid marble": {
            // Domain warping — closest to the reference artwork.
            const q1 = fbm(n, x, y, 3)
            const q2 = fbm(n, x + 5.2, y + 1.3, 3)
            const r1 = fbm(n, x + 2.4 * q1 + 0.09 * t, y + 2.4 * q2 + 1.7, 3)
            const r2 = fbm(n, x + 2.4 * q1 + 8.3, y + 2.4 * q2 - 0.06 * t, 3)
            return fbm(n, x + 2.6 * r1, y + 2.6 * r2, 3)
        }
        case "Ridge flow": {
            const v = fbm(n, x * 0.7 + 0.14 * t, y * 1.25, 4)
            return 1 - 2 * Math.abs(v)
        }
        case "Dune bands": {
            const warp = fbm(n, x * 0.5, y * 0.35 + 0.05 * t, 3)
            return Math.sin((y * 2.1 + warp * 3.4 + t * 0.12) * 1.6) * 0.75
        }
        case "Crater rings": {
            const cx = 0.52 * w
            const cy = 0.46 * h
            const dx = (x - cx * 0.0035) * 1.0
            const dy = (y - cy * 0.0035) * 1.0
            const d = Math.sqrt(dx * dx + dy * dy)
            const warp = fbm(n, x * 0.8 + 0.05 * t, y * 0.8, 3)
            return Math.sin(d * 7.5 - t * 0.35 + warp * 2.2) * 0.8 + warp * 0.35
        }
        default: {
            // Topographic
            return fbm(n, x + 0.035 * t, y + 0.075 * t, 4)
        }
    }
}


        const canvas = document.getElementById("topo")
        
        const ctx = canvas.getContext("2d", { alpha: false })
        

        
        /* There is no Framer canvas to freeze for here. The only reason to
           hold still is somebody who has asked not to be moved. */
        const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches

        let noise = makeNoise(P.seed)

        let W = 0
        let H = 0
        let dpr = 1

        // grid
        let cell = 8
        let cols = 0
        let rows = 0
        let field = new Float32Array(0)
        let cellW = 0
        let cellH = 0

        // edge buffers for marching squares
        let nH = 0
        let px = new Float32Array(0)
        let py = new Float32Array(0)
        let nbrA = new Int32Array(0)
        let nbrB = new Int32Array(0)
        let stamp = new Int32Array(0)
        let seen = new Int32Array(0)
        let active = new Int32Array(0)
        let activeLen = 0
        let tick = 0

        function allocate() {
            cell = Math.max(4, 13 - P.detail)
            cols = Math.max(3, Math.ceil(W / cell) + 1)
            rows = Math.max(3, Math.ceil(H / cell) + 1)
            cellW = W / (cols - 1)
            cellH = H / (rows - 1)
            field = new Float32Array(cols * rows)

            nH = (cols - 1) * rows
            const total = nH + cols * (rows - 1)
            px = new Float32Array(total)
            py = new Float32Array(total)
            nbrA = new Int32Array(total)
            nbrB = new Int32Array(total)
            stamp = new Int32Array(total).fill(-1)
            seen = new Int32Array(total).fill(-1)
            active = new Int32Array(total)
        }

        function resize() {
            const r = { width: innerWidth, height: innerHeight }
            W = Math.max(1, Math.round(r.width))
            H = Math.max(1, Math.round(r.height))
            dpr = Math.min(window.devicePixelRatio || 1, 2)
            canvas.width = Math.round(W * dpr)
            canvas.height = Math.round(H * dpr)
            canvas.style.width = W + "px"
            canvas.style.height = H + "px"
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            allocate()
        }

        function computeField(t) {
            const f = 0.0035 * P.scale
            for (let j = 0; j < rows; j++) {
                const y = j * cellH * f
                const base = j * cols
                for (let i = 0; i < cols; i++) {
                    field[base + i] = sampleField(
                        P.pattern,
                        noise,
                        i * cellW * f,
                        y,
                        t,
                        W,
                        H
                    )
                }
            }
        }

        function link(e, o, id) {
            if (stamp[e] !== id) {
                stamp[e] = id
                nbrA[e] = -1
                nbrB[e] = -1
                active[activeLen++] = e
            }
            if (nbrA[e] === -1) nbrA[e] = o
            else if (nbrB[e] === -1) nbrB[e] = o
        }

        function point(e, level) {
            if (e < nH) {
                const j = (e / (cols - 1)) | 0
                const i = e - j * (cols - 1)
                const a = field[j * cols + i]
                const b = field[j * cols + i + 1]
                const t = (level - a) / (b - a || 1e-6)
                px[e] = (i + t) * cellW
                py[e] = j * cellH
            } else {
                const k = e - nH
                const j = (k / cols) | 0
                const i = k - j * cols
                const a = field[j * cols + i]
                const b = field[(j + 1) * cols + i]
                const t = (level - a) / (b - a || 1e-6)
                px[e] = i * cellW
                py[e] = (j + t) * cellH
            }
        }

        function trace(level, id, emit) {
            activeLen = 0
            for (let j = 0; j < rows - 1; j++) {
                const row0 = j * cols
                const row1 = row0 + cols
                for (let i = 0; i < cols - 1; i++) {
                    const va = field[row0 + i]
                    const vb = field[row0 + i + 1]
                    const vc = field[row1 + i + 1]
                    const vd = field[row1 + i]
                    let idx = 0
                    if (va >= level) idx |= 8
                    if (vb >= level) idx |= 4
                    if (vc >= level) idx |= 2
                    if (vd >= level) idx |= 1
                    if (idx === 0 || idx === 15) continue

                    const TOP = j * (cols - 1) + i
                    const BOTTOM = (j + 1) * (cols - 1) + i
                    const LEFT = nH + j * cols + i
                    const RIGHT = nH + j * cols + i + 1

                    const pair = (e1, e2) => {
                        link(e1, e2, id)
                        link(e2, e1, id)
                    }

                    switch (idx) {
                        case 1:
                            pair(LEFT, BOTTOM)
                            break
                        case 2:
                            pair(BOTTOM, RIGHT)
                            break
                        case 3:
                            pair(LEFT, RIGHT)
                            break
                        case 4:
                            pair(TOP, RIGHT)
                            break
                        case 5:
                            pair(TOP, LEFT)
                            pair(BOTTOM, RIGHT)
                            break
                        case 6:
                            pair(TOP, BOTTOM)
                            break
                        case 7:
                            pair(TOP, LEFT)
                            break
                        case 8:
                            pair(TOP, LEFT)
                            break
                        case 9:
                            pair(TOP, BOTTOM)
                            break
                        case 10:
                            pair(TOP, RIGHT)
                            pair(LEFT, BOTTOM)
                            break
                        case 11:
                            pair(TOP, RIGHT)
                            break
                        case 12:
                            pair(LEFT, RIGHT)
                            break
                        case 13:
                            pair(BOTTOM, RIGHT)
                            break
                        case 14:
                            pair(LEFT, BOTTOM)
                            break
                    }
                }
            }

            for (let k = 0; k < activeLen; k++) point(active[k], level)

            const walk = (start) => {
                const pts = []
                let prev = -1
                let cur = start
                while (cur !== -1) {
                    if (seen[cur] === id) {
                        pts.push(px[cur], py[cur]) // close the loop
                        break
                    }
                    seen[cur] = id
                    pts.push(px[cur], py[cur])
                    const a = nbrA[cur]
                    const b = nbrB[cur]
                    const nxt = a !== prev && a !== -1 ? a : b
                    prev = cur
                    cur = nxt === undefined ? -1 : nxt
                }
                if (pts.length >= 4) emit(pts)
            }

            // open chains first (they touch the edge of the frame)
            for (let k = 0; k < activeLen; k++) {
                const e = active[k]
                if (nbrB[e] === -1 && seen[e] !== id) walk(e)
            }
            // then closed loops
            for (let k = 0; k < activeLen; k++) {
                const e = active[k]
                if (seen[e] !== id) walk(e)
            }
        }

        function draw(time) {
            const t = still ? 12 : time * 0.001 * P.speed

            ctx.fillStyle = P.background
            ctx.fillRect(0, 0, W, H)

            computeField(t)

            ctx.lineJoin = "round"
            ctx.lineCap = "round"
            ctx.strokeStyle = P.lineColor

            const span = P.pattern === "Topographic" ? 0.72 : 0.9
            const phase = (t * 0.035) % 1
            const drift = Math.floor(t * 0.035)

            for (let i = 0; i < P.lines; i++) {
                const u = (i / P.lines + phase) % 1
                const level = -span + u * span * 2
                const band = i + drift // travels with the line, so styling is stable
                const hv = hash(band)
                const isIndex = ((band % 5) + 5) % 5 === 0

                let w = P.weight * (isIndex ? 1.9 : 1)
                let alpha = isIndex ? 0.92 : 0.34 + hv * 0.22

                // fade P.lines in and out at the ends of the range
                const fade = Math.min(1, Math.min(u, 1 - u) * 8)
                ctx.globalAlpha = alpha * fade
                ctx.lineWidth = w

                if (!isIndex && hv < P.dashed) {
                    ctx.setLineDash([w * 2.6, w * 3.4])
                    ctx.lineDashOffset = hv * 40
                } else if (!isIndex && hv > 1 - P.broken) {
                    ctx.setLineDash([46 + hv * 90, 16 + hv * 26])
                    ctx.lineDashOffset = hv * 200 - t * 4
                } else {
                    ctx.setLineDash([])
                }

                tick++
                trace(level, tick, (pts) => {
                    if (pts.length < 8) return // drop specks
                    ctx.beginPath()
                    ctx.moveTo(pts[0], pts[1])
                    for (let k = 2; k < pts.length; k += 2)
                        ctx.lineTo(pts[k], pts[k + 1])
                    ctx.stroke()
                })
            }

            // survey crosshairs
            if (P.markers > 0) {
                ctx.setLineDash([])
                ctx.globalAlpha = 0.85
                ctx.lineWidth = Math.max(1, P.weight)
                for (let m = 0; m < P.markers; m++) {
                    const hx = hash(m * 3.1 + P.seed)
                    const hy = hash(m * 7.7 + P.seed + 5)
                    const x = (0.12 + hx * 0.76) * W
                    const y = (0.1 + hy * 0.8) * H
                    const r = 7
                    ctx.beginPath()
                    ctx.moveTo(x - r, y)
                    ctx.lineTo(x + r, y)
                    ctx.moveTo(x, y - r)
                    ctx.lineTo(x, y + r)
                    ctx.stroke()
                }
            }
            ctx.globalAlpha = 1
        }

        let raf = 0
        const loop = (time) => {
            draw(time)
            raf = requestAnimationFrame(loop)
        }

        /* Detail resizes every buffer marching squares walks and seed
           reshuffles the permutation table, so both are structural rather
           than a value the next frame can just read. The panel calls this. */
        rebuild = function () {
          noise = makeNoise(P.seed);
          resize();
          if (still) draw(0);
        };

        resize()
        if (still) draw(0)
        else raf = requestAnimationFrame(loop)

        const ro = new ResizeObserver(() => {
            resize()
            if (still) draw(0)
        })
        ro.observe(document.documentElement)




  /* ── the panel ────────────────────────────────────────────────────────
     The Framer property controls, in this repo's own furniture: same names,
     same ranges, same defaults. */
  const el = document.createElement('div');
  el.id = 'tune';
  el.innerHTML = `
    <div id="tune-head"><b>Topo Lines</b><button id="tune-hide" title="Hide (H)">–</button></div>

    <p class="tune-sub">Field</p>
    <div class="seg" id="v-pat">
      ${PATTERNS.map((n, i) => `<button data-p="${n}"${i ? '' : ' class="on"'}>${n.split(' ')[0]}</button>`).join('')}
    </div>
    <div class="row"><label>Speed<i id="v-speed">1.00</i></label>
      <input type="range" id="s-speed" min="0" max="400" value="100"></div>
    <div class="row"><label>Scale<i id="v-scale">1.00</i></label>
      <input type="range" id="s-scale" min="30" max="300" value="100"></div>
    <div class="row"><label>Detail<i id="v-detail">5</i></label>
      <input type="range" id="s-detail" min="1" max="9" value="5"></div>

    <p class="tune-sub">Lines</p>
    <div class="row"><label>Count<i id="v-lines">26</i></label>
      <input type="range" id="s-lines" min="6" max="60" value="26"></div>
    <div class="row"><label>Thickness<i id="v-weight">1.10</i></label>
      <input type="range" id="s-weight" min="40" max="300" value="110"></div>
    <div class="row"><label>Dotted<i id="v-dashed">0.18</i></label>
      <input type="range" id="s-dashed" min="0" max="60" value="18"></div>
    <div class="row"><label>Broken<i id="v-broken">0.16</i></label>
      <input type="range" id="s-broken" min="0" max="60" value="16"></div>
    <div class="row"><label>Crosshairs<i id="v-markers">1</i></label>
      <input type="range" id="s-markers" min="0" max="8" value="1"></div>

    <p class="tune-sub">Colour</p>
    <div class="row"><label>Lines<i id="v-lc">#FFFFFF</i></label>
      <input type="color" id="s-lc" value="#ffffff"></div>
    <div class="row"><label>Ground<i id="v-bg">#232324</i></label>
      <input type="color" id="s-bg" value="#232324"></div>

    <p class="tune-sub">Seed</p>
    <div class="row"><label>Field seed<i id="v-seed">7</i></label>
      <input type="range" id="s-seed" min="1" max="999" value="7"></div>`;
  document.body.appendChild(el);

  const q = id => el.querySelector('#' + id);
  const two = x => x.toFixed(2);
  const int = x => String(Math.round(x));

  const bind = (sid, vid, map, fmt, key) => {
    const sl = q(sid), v = q(vid);
    sl.addEventListener('input', () => {
      const x = map(+sl.value); v.textContent = fmt(x); P[key] = x;
    });
  };
  /* the two structural ones wait for a pause in the drag */
  const bindSlow = (sid, vid, key) => {
    const sl = q(sid), v = q(vid); let t = null;
    sl.addEventListener('input', () => {
      v.textContent = sl.value;
      clearTimeout(t);
      t = setTimeout(() => { P[key] = +sl.value; rebuild(); }, 220);
    });
  };

  bind('s-speed',   'v-speed',   n => n / 100, two, 'speed');
  bind('s-scale',   'v-scale',   n => n / 100, two, 'scale');
  bind('s-lines',   'v-lines',   n => n,       int, 'lines');
  bind('s-weight',  'v-weight',  n => n / 100, two, 'weight');
  bind('s-dashed',  'v-dashed',  n => n / 100, two, 'dashed');
  bind('s-broken',  'v-broken',  n => n / 100, two, 'broken');
  bind('s-markers', 'v-markers', n => n,       int, 'markers');
  bindSlow('s-detail', 'v-detail', 'detail');
  bindSlow('s-seed',   'v-seed',   'seed');

  q('s-lc').addEventListener('input', e => {
    P.lineColor = e.target.value; q('v-lc').textContent = e.target.value.toUpperCase();
  });
  q('s-bg').addEventListener('input', e => {
    P.background = e.target.value; q('v-bg').textContent = e.target.value.toUpperCase();
    document.body.style.background = e.target.value;
  });
  q('v-pat').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    [...q('v-pat').children].forEach(c => c.classList.toggle('on', c === b));
    P.pattern = b.dataset.p;
  });

  q('tune-hide').addEventListener('click', () => el.classList.toggle('hidden'));
  if (window.wb && window.wb.adopt) window.wb.adopt();
})();
