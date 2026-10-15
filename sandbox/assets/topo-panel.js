/* ══════════════════════════════════════════════════════════════════════════
   Topo panel — per-card contour controls for a page's #tune
   ─────────────────────────────────────────────────────────────────────────
   For pages whose cards each carry a CardTopo field (assets/card-topo.js):
   pick a card, then set its contours — on/off, landform, speed, density,
   scale, opacity, line weight, colour and how far the colour reaches down.
   "All cards" writes the same value to every card at once.

     const tp = topoPanel({ names: ['Agile', 'Creating value'], list: CONFIG.topo, onChange: i => … });
     panel.innerHTML += tp.html;   tp.bind(panel);

   `list` is the page's array of per-card settings (the same objects the
   bake saves); onChange(i) is called after card i's settings change.
   ═════════════════════════════════════════════════════════════════════════ */
const PATTERNS = ['peak', 'ridge', 'basin', 'twin', 'drift'];
const SLIDERS = [
  ['speed', 'Speed', 0, 2, 0.01, ''],
  ['levels', 'Density (lines)', 2, 30, 1, ''],
  ['scale', 'Landform scale', 0.4, 3, 0.05, '×'],
  ['opacity', 'Opacity', 0, 1, 0.01, ''],
  ['width', 'Line weight', 0.5, 3, 0.1, 'px'],
  ['tint', 'Colour reach', 0, 1, 0.01, ''],
];

export function topoPanel({ names, list, onChange }) {
  let cur = 0;                          // the card being edited; -1 = all
  const S = () => list[Math.max(0, cur)];
  const html = `<p class="tune-sub">Contours — per card</p>
    <div class="seg" id="tp-card">${names.map((n, i) => `<button data-i="${i}"${i ? '' : ' class="on"'}>${n}</button>`).join('')}<button data-i="-1">All</button></div>
    <div class="seg" id="tp-on"><button data-v="1">On</button><button data-v="0">Off</button></div>
    <div class="seg" id="tp-pat">${PATTERNS.map(p => `<button data-p="${p}">${p}</button>`).join('')}</div>
    ${SLIDERS.map(([k, label, min, max, step, u]) => `<div class="row"><label>${label}<i id="tpv-${k}"></i></label><input type="range" id="tp-${k}" min="${min}" max="${max}" step="${step}" data-u="${u}"></div>`).join('')}
    <div class="row inline"><label>Colour<i></i></label><input type="color" id="tp-col"></div>
    <div class="row inline"><label>Ground<i></i></label><button class="tune-btn" id="tp-seed">New ground</button></div>`;

  function bind(el) {
    const q = id => el.querySelector('#' + id);
    const targets = () => cur < 0 ? list.map((_, i) => i) : [cur];
    const set = (key, v) => targets().forEach(i => { list[i][key] = v; onChange && onChange(i); });
    function show() {
      const s = S();
      [...q('tp-on').children].forEach(b => b.classList.toggle('on', (b.dataset.v === '1') === !!s.on));
      [...q('tp-pat').children].forEach(b => b.classList.toggle('on', b.dataset.p === s.pattern));
      SLIDERS.forEach(([k]) => { const inp = q('tp-' + k); inp.value = s[k]; q('tpv-' + k).textContent = s[k] + inp.dataset.u; });
      q('tp-col').value = s.colour;
    }
    q('tp-card').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      [...q('tp-card').children].forEach(c => c.classList.toggle('on', c === b));
      cur = +b.dataset.i; show();
    });
    q('tp-on').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; set('on', b.dataset.v === '1'); show(); });
    q('tp-pat').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; set('pattern', b.dataset.p); show(); });
    SLIDERS.forEach(([k]) => q('tp-' + k).addEventListener('input', e => {
      const v = +e.target.value; q('tpv-' + k).textContent = v + e.target.dataset.u; set(k, v);
    }));
    q('tp-col').addEventListener('input', e => set('colour', e.target.value));
    q('tp-seed').addEventListener('click', () => targets().forEach(i => { list[i].seed = Math.floor(Math.random() * 999); onChange && onChange(i); }));
    show();
  }
  return { html, bind };
}
