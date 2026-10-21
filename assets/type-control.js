/* ══════════════════════════════════════════════════════════════════════════
   Typography control — primary and secondary type, site-wide
   ─────────────────────────────────────────────────────────────────────────
   On every page of Website v3 (the shell and each section it frames), the
   About page and its sections, and the case study pages. One <script
   type="module" src="assets/type-control.js"> per page.

   Two roles:
     Primary     headings and display type — h1–h4, and any text set at
                 28px or larger (statements, big numbers, titles)
     Secondary   everything else — body copy, labels, links, buttons, the
                 navbar, form fields

   Each role has: font family, size (a scale on what the page already sets,
   so the hierarchy survives), line height, letter spacing, weight, and text
   transform. Any setting left at "Default" leaves the page alone.

   Fonts: the site's own F37 Analog (default); Miriam Libre, Vend Sans,
   Cairo, Sofia Sans and Didactic Gothic from Google Fonts (loaded only once
   one is chosen); Brixela from assets/fonts/BrixelaDEMO-Regular.ttf (the
   demo cut).

   ── how it reaches every section ─────────────────────────────────────────
   Settings live in localStorage ('tibba.type'). Every page applies them on
   load and again whenever they change — a change made in one page's panel
   reaches every other open page and every framed section through the
   storage event. The panel itself is drawn only on the top page, so Website
   v3 and About show one panel that drives all their sections.

   ── how it is applied ─────────────────────────────────────────────────────
   Inline styles with !important on each text element, so it wins over each
   page's own stylesheet; the size scale multiplies each element's own size
   as the page set it (re-measured on resize, as many sizes are fluid).
   Text drawn on canvas or in WebGL (the fire, the mountains) is not type
   and is not touched. Control panels (#tune, the workbench, this panel)
   are left in the UI face.
   ═════════════════════════════════════════════════════════════════════════ */
const KEY = 'tibba.type';
const DISPLAY_PX = 28;               // at or above this, text counts as primary

export const FONTS = {
  default:  { label: 'Site default — F37 Analog', stack: null, w: [100, 700] },
  miriam:   { label: 'Miriam Libre',    stack: "'Miriam Libre', sans-serif",    google: 'Miriam+Libre:wght@400..700', w: [400, 700] },
  vend:     { label: 'Vend Sans',       stack: "'Vend Sans', sans-serif",       google: 'Vend+Sans:wght@300..700',    w: [300, 700] },
  cairo:    { label: 'Cairo',           stack: "'Cairo', sans-serif",           google: 'Cairo:wght@200..1000',       w: [200, 1000] },
  sofia:    { label: 'Sofia Sans',      stack: "'Sofia Sans', sans-serif",      google: 'Sofia+Sans:wght@1..1000',    w: [100, 1000] },
  brixela:  { label: 'Brixela',         stack: "'Brixela', sans-serif",         file: 'BrixelaDEMO-Regular.ttf',      w: [400, 400] },
  didactic: { label: 'Didactic Gothic', stack: "'Didactic Gothic', sans-serif", google: 'Didactic+Gothic',            w: [400, 400] },
};
const ROLE = () => ({ font: 'default', size: 1, lh: null, ls: null, weight: null, transform: null });
const DEFAULTS = () => ({ primary: ROLE(), secondary: ROLE() });

function read() {
  try { const v = JSON.parse(localStorage.getItem(KEY)); if (v && v.primary && v.secondary) return { primary: { ...ROLE(), ...v.primary }, secondary: { ...ROLE(), ...v.secondary } }; } catch (e) {}
  return DEFAULTS();
}
function write(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} }
let T = read();

/* ── fonts, loaded only once asked for ───────────────────────────────────── */
const loaded = new Set();
function ensureFont(id) {
  const f = FONTS[id]; if (!f || loaded.has(id) || (!f.google && !f.file)) return;
  loaded.add(id);
  if (f.google) {
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = `https://fonts.googleapis.com/css2?family=${f.google}&display=swap`;
    document.head.appendChild(l);
  } else {
    const s = document.createElement('style');
    s.textContent = `@font-face { font-family: 'Brixela'; src: url('${new URL('./fonts/' + f.file, import.meta.url)}') format('truetype'); font-weight: 400; font-style: normal; font-display: swap; }`;
    document.head.appendChild(s);
  }
}

/* ── which elements, in which role ─────────────────────────────────────── */
const SKIP = '#tune, .tune, #wb-nav, #wb-dock, .wb-new, #tc-root, .ml-panel, .ml-tools, .ml-time, script, style, svg, canvas, noscript, code, pre, kbd';
const HEAD = /^H[1-4]$/;
const base = new WeakMap();          // element → its own font size, as the page set it
let touched = new Set();

function hasText(el) {
  for (const n of el.childNodes) if (n.nodeType === 3 && n.nodeValue.trim()) return true;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'BUTTON' || el.tagName === 'SELECT';
}
function targets(root = document.body) {
  const out = [];
  if (!root) return out;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
    acceptNode: el => el.matches(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
  });
  for (let el = w.currentNode; el; el = w.nextNode()) if (el.nodeType === 1 && el !== document.body && hasText(el)) out.push(el);
  return out;
}
const PROPS = ['font-family', 'font-size', 'line-height', 'letter-spacing', 'font-weight', 'text-transform'];
function clear(el) { PROPS.forEach(p => el.style.removeProperty(p)); }

function measure(el) {
  if (!base.has(el)) { clear(el); base.set(el, parseFloat(getComputedStyle(el).fontSize) || 16); }
  return base.get(el);
}
function roleOf(el, px) {
  if (HEAD.test(el.tagName) || el.closest('h1, h2, h3, h4')) return 'primary';
  return px >= DISPLAY_PX ? 'primary' : 'secondary';
}

function styleEl(el) {
  const px = measure(el), R = T[roleOf(el, px)];
  const set = (p, v) => v == null ? el.style.removeProperty(p) : el.style.setProperty(p, v, 'important');
  set('font-family', FONTS[R.font] && FONTS[R.font].stack);
  set('font-size', R.size !== 1 ? (px * R.size).toFixed(2) + 'px' : null);
  set('line-height', R.lh != null ? String(R.lh) : null);
  set('letter-spacing', R.ls != null ? R.ls + 'em' : null);
  set('font-weight', R.weight != null ? String(R.weight) : null);
  set('text-transform', R.transform || null);
  touched.add(el);
}
const isDefault = () => ['primary', 'secondary'].every(r => { const R = T[r]; return R.font === 'default' && R.size === 1 && R.lh == null && R.ls == null && R.weight == null && !R.transform; });

let applying = false;
export function apply() {
  if (!document.body) return;
  applying = true;
  ensureFont(T.primary.font); ensureFont(T.secondary.font);
  if (isDefault()) { touched.forEach(clear); touched = new Set(); }
  else targets().forEach(styleEl);
  applying = false;
}

/* new content (pages that build themselves, sections that re-render) */
let pend = 0;
const mo = new MutationObserver(muts => {
  if (applying || isDefault()) return;
  if (muts.every(m => m.target.closest && m.target.closest('#tc-root'))) return;
  cancelAnimationFrame(pend); pend = requestAnimationFrame(apply);
});
/* fluid sizes change with the window: measure again */
let rz = 0;
addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { touched.forEach(el => { clear(el); base.delete(el); }); touched = new Set(); apply(); }, 150); });
/* another page or the shell changed the settings */
addEventListener('storage', e => { if (e.key === KEY) { T = read(); apply(); syncPanel(); } });

function start() {
  apply();
  mo.observe(document.body, { childList: true, subtree: true, characterData: true });
  document.fonts && document.fonts.ready.then(() => { touched.forEach(el => base.delete(el)); apply(); });
  if (window.top === window) panel();
}

/* ══════════════════════════════════════════════════════════════════════════
   The panel — top page only
   ═════════════════════════════════════════════════════════════════════════ */
let syncPanel = () => {};
function panel() {
  const root = document.createElement('div');
  root.id = 'tc-root';
  root.innerHTML = `<style>
    #tc-root { --o: #FF4B1F; font: 400 12px/1.4 'F37 Analog', system-ui, sans-serif; color: #E9ECF2; }
    #tc-root * { box-sizing: border-box; font-family: inherit; }
    .tc-btn { position: fixed; z-index: 2147483000; left: 12px; bottom: 12px; display: inline-flex; align-items: center; gap: 8px; padding: 8px 12px 8px 10px;
      background: rgba(10,10,11,.92); border: 1px solid rgba(233,236,242,.16); color: #fff; cursor: pointer; font-size: 11px; letter-spacing: .14em; text-transform: uppercase; backdrop-filter: blur(8px); }
    .tc-btn b { font-size: 15px; letter-spacing: 0; text-transform: none; font-weight: 500; }
    .tc-btn i { width: 6px; height: 6px; background: var(--o); display: none; }
    .tc-btn.changed i { display: block; }
    .tc-btn:hover { border-color: #fff; }
    .tc-panel { position: fixed; z-index: 2147483000; left: 12px; bottom: 52px; width: min(330px, calc(100vw - 24px)); max-height: calc(100vh - 120px); overflow-y: auto;
      background: rgba(10,10,11,.96); border: 1px solid rgba(233,236,242,.16); backdrop-filter: blur(10px); display: none; scrollbar-width: thin; }
    #tc-root.open .tc-panel { display: block; }
    .tc-head { display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; border-bottom: 1px solid rgba(233,236,242,.12); position: sticky; top: 0; background: #0a0a0b; z-index: 1; }
    .tc-head h2 { margin: 0; font-size: 14px; font-weight: 400; }
    .tc-head button { background: none; border: 1px solid rgba(233,236,242,.2); color: #E9ECF2; padding: 5px 9px; font-size: 10.5px; letter-spacing: .1em; text-transform: uppercase; cursor: pointer; }
    .tc-head button:hover { border-color: #fff; }
    .tc-role { padding: 12px 14px 16px; border-bottom: 1px solid rgba(233,236,242,.12); display: grid; gap: 11px; }
    .tc-role h3 { margin: 0; display: flex; justify-content: space-between; align-items: baseline; font-size: 10.5px; font-weight: 400; letter-spacing: .16em; text-transform: uppercase; color: #fff; }
    .tc-role h3 span { color: rgba(233,236,242,.45); letter-spacing: .06em; text-transform: none; font-size: 11px; }
    .tc-role h3 b { font-weight: 400; color: var(--o); margin-right: 6px; }
    .tc-sample { margin: 0; padding: 10px 12px; background: #141416; color: #fff; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
    .tc-row { display: grid; gap: 4px; }
    .tc-row > div { display: flex; justify-content: space-between; align-items: center; font-size: 11.5px; color: rgba(233,236,242,.75); }
    .tc-row output { color: #fff; font-variant-numeric: tabular-nums; }
    .tc-row button.tc-x { margin-left: 8px; padding: 0 5px; background: none; border: 0; color: rgba(233,236,242,.4); cursor: pointer; font-size: 13px; line-height: 1; }
    .tc-row button.tc-x:hover { color: var(--o); }
    .tc-row button.tc-x[hidden] { display: none; }
    #tc-root select { width: 100%; padding: 7px 8px; background: #141416; border: 1px solid rgba(233,236,242,.2); color: #fff; font-size: 12px; border-radius: 0; }
    #tc-root input[type=range] { -webkit-appearance: none; appearance: none; width: 100%; height: 16px; background: transparent; margin: 0; }
    #tc-root input[type=range]::-webkit-slider-runnable-track { height: 1px; background: rgba(233,236,242,.25); }
    #tc-root input[type=range]::-moz-range-track { height: 1px; background: rgba(233,236,242,.25); }
    #tc-root input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 11px; height: 11px; margin-top: -5px; background: #fff; }
    #tc-root input[type=range]::-moz-range-thumb { width: 11px; height: 11px; background: #fff; border: 0; border-radius: 0; }
    #tc-root input[type=range].unset::-webkit-slider-thumb { background: rgba(233,236,242,.35); }
    .tc-seg { display: flex; gap: 2px; padding: 2px; background: #141416; border: 1px solid rgba(233,236,242,.16); }
    .tc-seg button { flex: 1; padding: 6px 4px; border: 0; background: none; color: rgba(233,236,242,.6); cursor: pointer; font-size: 11px; }
    .tc-seg button:hover { color: #fff; }
    .tc-seg button.on { background: #fff; color: #000; }
    .tc-note { margin: 0; padding: 12px 14px 14px; font-size: 11px; color: rgba(233,236,242,.5); line-height: 1.45; }
  </style>
  <button type="button" class="tc-btn" aria-expanded="false" aria-controls="tc-panel" title="Typography"><b>Aa</b>Type<i></i></button>
  <div class="tc-panel" id="tc-panel" role="dialog" aria-label="Typography">
    <div class="tc-head"><h2>Typography</h2><button type="button" data-reset-all>Reset all</button></div>
    ${role('primary', 'Primary', 'Headings & display')}
    ${role('secondary', 'Secondary', 'Body, labels & UI')}
    <p class="tc-note">Primary is headings and anything set at ${DISPLAY_PX}px or larger; secondary is the rest. Size scales what each page already sets, so the hierarchy holds. Settings apply to every section and page that carries this control, and are kept in this browser.</p>
  </div>`;
  document.body.appendChild(root);

  function role(r, name, sub) {
    const fonts = Object.entries(FONTS).map(([k, f]) => `<option value="${k}">${f.label}</option>`).join('');
    const rng = (p, label, min, max, step) => `<div class="tc-row" data-p="${p}"><div><span>${label}</span><span><output></output><button type="button" class="tc-x" title="Back to default" aria-label="Reset ${label}">×</button></span></div>
      <input type="range" min="${min}" max="${max}" step="${step}" aria-label="${name} ${label}"></div>`;
    return `<section class="tc-role" data-role="${r}">
      <h3><span style="color:#fff;letter-spacing:.16em;text-transform:uppercase;font-size:10.5px"><b>${r === 'primary' ? '01' : '02'}</b>${name}</span><span>${sub}</span></h3>
      <p class="tc-sample">${r === 'primary' ? 'Moving what matters.' : 'We design products for founders and teams — research, strategy and design.'}</p>
      <div class="tc-row"><div><span>Font</span></div><select aria-label="${name} font">${fonts}</select></div>
      ${rng('size', 'Font size', .5, 2, .01)}
      ${rng('lh', 'Line height', .7, 2.4, .01)}
      ${rng('ls', 'Letter spacing', -.12, .4, .005)}
      ${rng('weight', 'Weight', 100, 900, 100)}
      <div class="tc-row" data-p="transform"><div><span>Text transform</span></div>
        <div class="tc-seg">${[['', 'Default'], ['none', 'None'], ['uppercase', 'AA'], ['lowercase', 'aa'], ['capitalize', 'Aa']].map(([v, l]) => `<button type="button" data-v="${v}" title="${v || 'default'}">${l}</button>`).join('')}</div></div>
    </section>`;
  }

  const btn = root.querySelector('.tc-btn');
  /* the shells keep their refresh button bottom left: sit beside it */
  if (document.querySelector('.site-refresh')) { btn.style.left = root.querySelector('.tc-panel').style.left = '64px'; btn.style.bottom = '16px'; }
  btn.addEventListener('click', () => { const o = root.classList.toggle('open'); btn.setAttribute('aria-expanded', o); });
  addEventListener('keydown', e => { if (e.key === 'Escape') { root.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); } });

  const FMT = {
    size: v => Math.round(v * 100) + '%', lh: v => v == null ? 'Default' : (+v).toFixed(2),
    ls: v => v == null ? 'Default' : (v >= 0 ? '+' : '') + (+v).toFixed(3) + 'em', weight: v => v == null ? 'Default' : String(v),
  };
  const DEF = { size: 1, lh: null, ls: null, weight: null };
  const START = { size: 1, lh: 1.2, ls: 0, weight: 400 };
  function commit() { write(T); apply(); syncPanel(); }

  root.querySelectorAll('.tc-role').forEach(sec => {
    const r = sec.dataset.role;
    sec.querySelector('select').addEventListener('change', e => {
      T[r].font = e.target.value;
      /* a weight the new face does not have would be faked: clamp it */
      const w = FONTS[T[r].font].w;
      if (T[r].weight != null) T[r].weight = Math.min(w[1], Math.max(w[0], T[r].weight));
      commit();
    });
    sec.querySelectorAll('.tc-row[data-p]').forEach(row => {
      const p = row.dataset.p;
      if (p === 'transform') {
        row.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; T[r].transform = b.dataset.v || null; commit(); });
        return;
      }
      const inp = row.querySelector('input');
      inp.addEventListener('input', () => { T[r][p] = +inp.value; write(T); apply(); syncPanel(); });
      row.querySelector('.tc-x').addEventListener('click', () => { T[r][p] = DEF[p]; commit(); });
    });
  });
  root.querySelector('[data-reset-all]').addEventListener('click', () => { T = DEFAULTS(); commit(); });

  syncPanel = () => {
    root.querySelectorAll('.tc-role').forEach(sec => {
      const r = sec.dataset.role, R = T[r];
      sec.querySelector('select').value = R.font;
      const sample = sec.querySelector('.tc-sample');
      ensureFont(R.font);
      sample.style.fontFamily = FONTS[R.font].stack || "'F37 Analog', system-ui, sans-serif";
      sample.style.fontWeight = R.weight || (r === 'primary' ? 300 : 400);
      sample.style.letterSpacing = R.ls != null ? R.ls + 'em' : '';
      sample.style.textTransform = R.transform || '';
      sample.style.fontSize = (r === 'primary' ? 22 : 13) * Math.min(R.size, 1.4) + 'px';
      sec.querySelectorAll('.tc-row[data-p]').forEach(row => {
        const p = row.dataset.p;
        if (p === 'transform') { row.querySelectorAll('button').forEach(b => b.classList.toggle('on', (b.dataset.v || null) === (R.transform || null))); return; }
        const inp = row.querySelector('input'), v = R[p];
        inp.value = v == null ? START[p] : v;
        inp.classList.toggle('unset', v == null || (p === 'size' && v === 1));
        row.querySelector('output').textContent = FMT[p](v);
        row.querySelector('.tc-x').hidden = (p === 'size' ? v === 1 : v == null);
      });
    });
    btn.classList.toggle('changed', !isDefault());
  };
  syncPanel();
}

/* last, so everything above is declared before the first apply */
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
