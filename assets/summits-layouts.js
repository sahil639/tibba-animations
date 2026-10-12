/* ══════════════════════════════════════════════════════════════════════════
   Our Summits — the five layouts' shared parts (script)
   ─────────────────────────────────────────────────────────────────────────
   mountRange(box, …)   the Summits v3 range (assets/summits-v2.js) in any
                        box: a canvas and its summit marks, the focus given
                        by the layout (its own scroll, its own controls),
                        side view ('range') or riding summit to summit
                        ('ride'). A click on a summit asks the layout what
                        to do (onPick), by default its case study.
   words(s)             a project's words, in the shared classes
   riveBox(s, …)        a box that plays the shared Rive file (assets/
                        rive-slot.js), the project's image until it exists
   go(href) / scrollToY(y)   navigation that works framed in the site
   Needs: work.js, cases.js, summits-data.js (and rive-slot.js for boxes).
   ═════════════════════════════════════════════════════════════════════════ */
import { mountSummitsV2, SUMMITS2_CONFIG as C } from './summits-v2.js';

export const S = window.TIBBA_SUMMITS;
export const N = S.length;
export const LITE = matchMedia('(max-width: 760px), (pointer: coarse)').matches;
export const pad = i => String(i + 1).padStart(2, '0');
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function go(href) {
  const url = new URL(href, location.href).href;
  if (window.top !== window) window.top.location.href = url; else location.href = url;
}
/* framed in the site the site's own scroll is the one to move */
export function scrollToY(y, smooth = true) {
  if (window.wb && window.wb.scrollTo) window.wb.scrollTo(y, smooth);
  else scrollTo({ top: y, behavior: smooth ? 'smooth' : 'auto' });
}

/* Summits v3's ground: more country round the summits; lighter on phones */
let ground = false;
function setGround() {
  if (ground) return; ground = true;
  Object.assign(C.fill, LITE ? { count: 24, height: 0.72, spacing: 18, relief: 14 } : { count: 46, height: 0.72, spacing: 18, relief: 14 });
  C.terrain = { levels: LITE ? 30 : 44, width: 1 };
}

export function mountRange(box, { focus, frame = 'range', view = null, onCase = null, onPick = null, mini = false } = {}) {
  setGround();
  box.classList.add('sl-range'); if (mini) box.classList.add('sl-mini');
  const canvas = document.createElement('canvas'); canvas.className = 'sl-canvas';
  box.prepend(canvas);
  const pick = onPick || (i => go(S[i].file));
  const m = mountSummitsV2({ layout: 'text', canvas, stage: box, focus, frame, view, onCase, onPeakClick: pick });
  m.peakEls.forEach((el, i) => { el.insertAdjacentHTML('beforeend', '<b></b>'); el.addEventListener('click', () => pick(i)); });
  return m;
}

export const tags = s => `<ul class="sl-tags">${s.tagList.map(t => `<li>${t}</li>`).join('')}</ul>`;
export const stats = s => `<div class="sl-stats">${s.stats.map(t => `<div><b data-odo-count>${t.n}</b><span>${t.l}</span></div>`).join('')}</div>`;
export const cta = (s, label = 'View case study') => `<a class="sl-cta" href="${s.file}">${label}<i></i></a>`;

/* a box for the shared Rive file; the project's image (k) until it arrives */
export function riveBox(s, k = 0, cls = '') {
  return `<div class="sl-box sl-rive ${cls}" data-rive="${s.folder}">${S.slot(s, k)}<span class="rv-tag">Rive · assets/rive/summits.riv</span></div>`;
}
export function armRive(root, project = null) {
  if (!window.TibbaRive) return [];
  return [...root.querySelectorAll('[data-rive]')].map(el => {
    const r = window.TibbaRive.mount(el, { names: [el.dataset.rive, 'summits'] });
    if (project != null) r.setProject(project);
    return r;
  });
}
export const box = (s, k, cls = '') => `<div class="sl-box ${cls}">${S.slot(s, k)}</div>`;

/* every link inside goes to the top window when framed */
export function links(root) { S.link(root); }

/* words that change with the project: out, swap, back in */
export function swap(el, html) {
  el.classList.add('out');
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.innerHTML = html; el.classList.remove('out'); if (window.Odometer) window.Odometer.arm(el); }, 260);
}

/* a pinned stage stepped through by the scroll: a short rest on each
   project, an eased move between. Returns focus() (0 … 3) and jump(i). */
export function pinned(scope) {
  const span = () => Math.max(1, scope.offsetHeight - innerHeight);
  return {
    focus() {
      const p = clamp((scrollY - scope.offsetTop) / span(), 0, 1) * (N - 1);
      const k = Math.min(N - 2, Math.floor(p)), f = clamp((p - k - .2) / .6, 0, 1);
      return k + f * f * (3 - 2 * f);
    },
    jump(i) { scrollToY(scope.offsetTop + span() * (clamp(i, 0, N - 1) / (N - 1)) + (i > 0 ? 2 : 0)); },
  };
}
