/* ══════════════════════════════════════════════════════════════════════════
   Base Camp — the range, one summit in focus
   ─────────────────────────────────────────────────────────────────────────
   summits-basecamp.html's scene, its state and its panel.

   ── the scene ─────────────────────────────────────────────────────────────
   One range (range-scene via summits-v2.js), the four project summits in
   it. One summit is in focus at a time: it is lit, inked in its own pen,
   drawn at full weight and full height, and carries the only live mark —
   a glowing, pulsing dot at its peak. Everything else recedes: dimmer,
   thinner, cooler and darker, with every other ring dropped, and lowered
   toward the horizon (range-scene setFocusStyle). The camera is this
   file's own: front-on and close to the summit in focus, aimed above it so
   it stands low in the frame, right on the progress bar; between summits
   it lifts and pulls back a little, so a change of focus reads as a short
   flight from one top to the next.

   ── the state machine ─────────────────────────────────────────────────────
   focus      a number, 0 … 3, from the page (desktop: how far through the
              stacking cards; phones: which card crosses the middle of the scroll area)
   each summit is in one of
     idle       not in focus — receding, no dot, no trail, Rive paused
     arriving   the camera is flying to it (|focus − i| < .5, not settled)
     focused    settled on it (|focus − i| < .06) — dot on, trail if wanted,
                card active, its Rive playing
   each card is  inactive · active · hovered (pointer over it, any state)
   and its Rive file follows: active or hovered plays, inactive holds a
   frame; files with "active" / "hover" boolean inputs get them set too.

   ── the panel ─────────────────────────────────────────────────────────────
   BASECAMP_CONFIG is every tunable; the panel writes it live, Bake keeps
   it in the browser (assets/bake.js). Contours, depth and position, style,
   animation, focus behaviour, Rive.
   ═════════════════════════════════════════════════════════════════════════ */
import { SUMMITS2_CONFIG } from './summits-v2.js';
import { applyBaked, bakeControls } from './bake.js';
import { S, N, clamp, pad, mountRange, scrollToY, pinned, links } from './summits-layouts.js';

export const BASECAMP_CONFIG = {
  contours: { levels: 44, weight: 1.0, spacing: 1.0 },       // ridge lines, stroke weight, vertical spacing (height scale)
  depth: {
    focusDist: 34,        // world units from the summit in focus
    elev: 11,             // degrees above the horizon
    aim: 0.86,            // where the camera looks, × the summit's height: above 1 sits the summit lower, nearer the bar
    fgScale: 1.18,        // the summit in focus, × its height
    bgScale: 0.5,         // the rest of the range's height while one is in focus
    spread: 1.22,         // the summits' spacing, × as built
    offsets: [0, 0, 0, 0],// each summit sideways, world units
    fog: 0.6,             // atmospheric fade on the far range (0 … 1), measured from the camera
    view: 'angled',       // 'angled' — from a little above, a short flight between · 'front' — straight on, near-orthographic
    frontFov: 6,          // degrees: the long lens the front view is taken with (lower = flatter)
    frontFill: 0.62,      // front view: the summit's height, as a share of the scene's
    frontBase: 0.18,      // front view: how far up from the bottom edge the foot sits (share of the scene)
    desk: { frontFill: 0.49, frontBase: 0.23 },   // the same two on desktop (frontFill / frontBase above are phones')
  },
  style: {
    activeInk: '#EEF1F8', activeInkMix: 0.45, activeBoost: 0.5,
    dim: 0.62,            // how far the rest recede (opacity)
    thin: 0.5,            // how much thinner the rest draw
    cool: 0.55, coolTint: '#26304C',
    sparse: 0.5,          // share of the rest's rings dropped
    fill: '#2B3550', fillGrad: 0.0,
    contrast: 1.0,        // overall line opacity
  },
  anim: { on: true, camSpeed: 2.6, fly: 0.5, pulse: 1.8, pulseAmp: 1.0 },
  focus: { dot: true, trail: false, hoverRings: false },
  rive: { tint: 0.0, playAll: false },
  dock: 46,               // vh — the scene's share of the screen under the cards
};
const C = BASECAMP_CONFIG;
const KEY = 'tibba.bake.basecamp';
applyBaked(KEY, C);
/* phones: locked to these, over the defaults and any bake — desktop never uses them */
const PHONE_LOCK = {
  contours: { levels: 27, weight: 0.8, spacing: 1.0 },
  depth: { view: 'front', frontFov: 17, frontFill: 0.51, frontBase: 0.18, focusDist: 34, elev: 11, fgScale: 1.11, bgScale: 0.99 },
  style: { dim: 0.59, thin: 0.05, cool: 0.03, sparse: 0.03 },
};
const lock = (t, src) => Object.keys(src).forEach(k => typeof src[k] === 'object' ? lock(t[k], src[k]) : (t[k] = src[k]));
const PHONE_AT_LOAD = matchMedia('(max-width: 900px)').matches;
if (PHONE_AT_LOAD) lock(C, PHONE_LOCK);
/* ?view=front (or angled) picks the view from the address, for use inside the site */
{ const v = /[?&]view=(front|angled)\b/.exec(location.search); if (v && !PHONE_AT_LOAD) C.depth.view = v[1]; }

const rad = d => d * Math.PI / 180;
const lerp = (a, b, t) => a + (b - a) * t;

export function mountBasecamp() {
  const root = document.documentElement;
  const sec = document.getElementById('bc'), stack = document.getElementById('stack'), dock = document.getElementById('dock'),
        panelEl = document.getElementById('bc-panel'), tabsEl = document.getElementById('tabs');
  const phone = matchMedia('(max-width: 900px)');
  const P = pinned(sec);

  /* ── the cards ─────────────────────────────────────────────────────── */
  stack.innerHTML = S.map((s, i) => `
    <article class="pn" style="--c:${s.colour}" data-i="${i}" aria-label="${s.client}">
      <div class="in">
        <div class="txt">
          <p class="sl-k"><b>Summit ${pad(i)}</b><i></i><span>${s.sector} · ${s.year}</span></p>
          <h3 class="sl-title">${s.title}</h3>
          <ul class="sl-tags">${s.tagList.map(t => `<li>${t}</li>`).join('')}</ul>
          <p class="sl-body">${s.body}</p>
          <a class="sl-cta" href="${s.file}">View case study<i></i></a>
        </div>
        <div class="media">
          <a class="rv" href="${s.file}" data-rive="${s.folder}" aria-label="${s.client} — the work">${S.slot(s, 0, '928 / 486')}<i class="tint"></i><span class="cap">${s.client} · Alt ${s.alt} m</span></a>
          <div class="sl-stats">${s.stats.map(t => `<div><b>${t.n}</b><span>${t.l}</span></div>`).join('')}</div>
        </div>
      </div>
    </article>`).join('');
  tabsEl.innerHTML = S.map(s => `<button type="button" style="--c:${s.colour}">${s.client.replace(' & Mindhouse', '')}</button>`).join('');
  const cards = [...stack.children], tabs = [...tabsEl.children];
  links(sec);

  /* the Rive files load as their card comes near, never all at once */
  const rv = cards.map(() => null);
  const io = new IntersectionObserver(es => es.forEach(e => {
    const i = +e.target.dataset.i;
    if (e.isIntersecting && !rv[i] && window.TibbaRive) {
      rv[i] = window.TibbaRive.mount(e.target.querySelector('.rv'), { names: [S[i].folder], autoplay: false });
      cardState();
    }
  }), { rootMargin: '100% 0px' });
  cards.forEach(c => io.observe(c));
  let hovered = -1;
  cards.forEach((c, i) => {
    c.addEventListener('pointerenter', () => { hovered = i; cardState(); });
    c.addEventListener('pointerleave', () => { if (hovered === i) hovered = -1; cardState(); });
  });

  /* ── where the reader is ───────────────────────────────────────────── */
  const top = el => el.getBoundingClientRect().top + scrollY;          // page position, whatever the offset parent
  /* desktop: a rest on each card, the flight while the next one rises */
  const focusNow = () => {
    if (phone.matches) {
      /* the card crossing the middle of the scroll area (the top two-thirds)
         is the one in focus; the flight to the next starts as it leaves */
      const line = innerHeight * .34;
      let f = 0;
      cards.forEach((c, i) => { const r = c.getBoundingClientRect(); if (r.top <= line) { const p = clamp((line - r.top) / Math.max(1, r.height + 48), 0, 1), g = clamp((p - .72) / .28, 0, 1); f = i + g * g * (3 - 2 * g); } });
      return clamp(f, 0, N - 1);
    }
    const p = clamp((scrollY - top(stack)) / innerHeight, 0, N - 1), k = Math.min(N - 2, Math.floor(p)), f = clamp((p - k - .18) / .64, 0, 1);
    return k + f * f * (3 - 2 * f);
  };
  const jump = i => phone.matches ? scrollToY(top(cards[i]) - innerHeight * .1) : scrollToY(top(stack) + i * innerHeight + 2);
  tabs.forEach((b, i) => b.addEventListener('click', () => jump(i)));

  /* ── the camera: close on the summit in focus, a short flight between ─ */
  const BEAR = [-10, -4, 4, 10];
  function camera({ fi, now, tops, pointer, shift }) {
    const D = C.depth, sy = C.contours.spacing;
    const fill = phone.matches ? D.frontFill : D.desk.frontFill, base = phone.matches ? D.frontBase : D.desk.frontBase;
    const i0 = Math.floor(fi), i1 = Math.min(N - 1, i0 + 1), f = fi - i0, fs = f * f * (3 - 2 * f);
    const A = tops[i0], B = tops[i1];
    const tx = lerp(A.x + shift[i0], B.x + shift[i1], fs), tz = lerp(A.z, B.z, fs), top = lerp(A.y, B.y, fs) * sy * D.fgScale;
    const front = D.view === 'front';
    const lift = C.anim.on && !front ? Math.sin(Math.PI * fs) * C.anim.fly : 0;
    const asp = clamp((range.scene.canvas.clientWidth || 1) / (range.scene.canvas.clientHeight || 1), .5, 4);
    /* the front view keeps the summit the same size on screen, taken from far
       back with a long lens, so near and far ridges stay in proportion */
    /* front: framed by height — the base on the bar, the summit filling
       D.frontFill of the scene, whatever the lens */
    const half = Math.tan(rad(D.frontFov / 2));
    const dist = front ? top / (2 * fill * half) : D.focusDist * (1 + lift * .7) * Math.max(1, 1.9 / asp);
    const elev = front ? 0 : rad(D.elev + lift * 16 - pointer.y * 1.5);
    const drift = C.anim.on && !front ? Math.sin(now / 1000 * .11) * .5 : 0;
    const yaw = front ? 0 : rad(lerp(BEAR[i0], BEAR[i1], fs) + pointer.x * 2.5 + drift);
    const ty = front ? dist * half * (1 - 2 * base) : top * D.aim;
    /* the haze is measured from the camera, so the far country fades to
       nothing instead of ending in a hard horizon */
    const near = dist + lerp(320, 15, D.fog) * (front ? 1.6 : 1);
    range.scene.setFog(near, near + lerp(420, 110, D.fog) * (front ? 1.6 : 1));
    return { tgt: [tx, ty, tz], pos: [tx + Math.sin(yaw) * Math.cos(elev) * dist, ty + Math.sin(elev) * dist, tz + Math.cos(yaw) * Math.cos(elev) * dist] };
  }

  let shown = -1, settled = false;
  const range = mountRange(document.getElementById('range'), {
    focus: focusNow, camera, trails: C.focus.trail ? 'focus' : 'none', levels: C.contours.levels, quality: 'high', onPick: jump,
    onCase: i => { shown = i; settled = false; summitState(); },
  });
  const scene = range.scene;
  /* the summit marks: only the one in focus shows, as the pulsing dot */
  range.peakEls.forEach(el => el.classList.add('bc-mark'));

  /* ── state: summits, cards, tabs ───────────────────────────────────── */
  function summitState() {
    const f = range.focus;
    settled = Math.abs(f - shown) < .06;
    range.peakEls.forEach((el, i) => { el.classList.toggle('focused', i === shown && settled); el.classList.toggle('arriving', i === shown && !settled); });
    root.style.setProperty('--ac', S[Math.max(0, shown)].colour);
    tabs.forEach((b, i) => b.classList.toggle('on', i === shown));
    cardState();
  }
  function cardState() {
    cards.forEach((c, i) => {
      const active = i === shown, hov = i === hovered;
      c.classList.toggle('active', active); c.classList.toggle('hovered', hov);
      const r = rv[i]; if (!r) return;
      r.setBool('active', active); r.setBool('hover', hov);
      if (C.anim.on && (active || hov || C.rive.playAll)) r.play(); else r.pause();
    });
  }

  /* ── applying the config ───────────────────────────────────────────── */
  function apply() {
    const D = C.depth, St = C.style;
    SUMMITS2_CONFIG.focus.chase = C.anim.on ? C.anim.camSpeed : 30;
    scene.setFocusDepth(St.dim);
    scene.setInk({ weight: C.contours.weight, opacity: .95 * St.contrast });
    scene.setGroundVisible(false);                     // its far edge drew a hard line across the cards
    scene.setLens(D.view === 'front' ? { fov: D.frontFov, far: 4000 } : { fov: 50, far: 600 });
    scene.group.scale.y = C.contours.spacing;
    const ext = range.ext;
    const shift = range.tops.map((t, i) => (t.x - ext.cx) * (D.spread - 1) + (D.offsets[i] || 0));
    scene.setFocusStyle({ local: true, thin: St.thin, cool: St.cool, coolTint: St.coolTint, sparse: St.sparse, litInk: St.activeInk,
      litInkMix: St.activeInkMix, litBoost: St.activeBoost, bgScale: D.bgScale, fgScale: D.fgScale, shift, fill: St.fill, fillGrad: St.fillGrad });
    if (shift.join() !== lastShift) { lastShift = shift.join(); range.setShift(shift); }
    range.setTrails(C.focus.trail ? 'focus' : 'none');
    if (scene.setHover) scene.setHover(!!C.focus.hoverRings);
    root.classList.toggle('bc-nodot', !C.focus.dot);
    root.classList.toggle('bc-still', !C.anim.on);
    root.style.setProperty('--pulse-s', (C.anim.pulse || 1.8) + 's');
    root.style.setProperty('--pulse-k', C.anim.pulseAmp);
    root.style.setProperty('--rv-tint', C.rive.tint);
    root.style.setProperty('--dock', C.dock + 'vh');
    cardState();
  }
  let lastShift = '';
  apply();

  /* ── the loop: tabs fill, cards sink, settle is noticed ────────────── */
  let raf = 0, wasSettled = false;
  function frame() {
    raf = requestAnimationFrame(frame);
    const f = focusNow();
    tabs.forEach((b, i) => b.style.setProperty('--f', clamp(f - i + 1, 0, 1).toFixed(3)));
    if (!phone.matches) cards.forEach((c, i) => c.querySelector('.in').style.setProperty('--sink', clamp(f - i, 0, 1).toFixed(3)));
    const s = shown >= 0 && Math.abs(range.focus - shown) < .06;
    if (s !== wasSettled) { wasSettled = s; summitState(); }
  }
  frame();

  /* ── phones: one container under the scene holds the cards ─────────── */
  function layout() {
    const m = phone.matches;
    root.classList.toggle('bc-phone', m);
    if (!m && stack.parentNode !== sec) sec.appendChild(stack);
  }
  phone.addEventListener('change', layout); layout();
  /* the range ends exactly on the progress line, whatever the bar's height */
  const bar = tabsEl.parentNode;
  new ResizeObserver(() => root.style.setProperty('--barh', bar.offsetHeight + 'px')).observe(bar);

  buildPanel(apply, range);
  return { range, apply, config: C };
}

/* ══ the panel ═══════════════════════════════════════════════════════════ */
const SCHEMA = [
  ['Mountain contours'],
  ['contours.levels', 'Contour ridge lines', 16, 80, 1, '', 'rebuild'],
  ['contours.weight', 'Stroke weight', .3, 2.5, .05, '×'],
  ['contours.spacing', 'Vertical spacing', .6, 1.8, .02, '×'],
  ['View'],
  ['depth.view', 'View', 'select', [['angled', 'Angled — from above, flying between summits'], ['front', 'Front — straight on, orthographic']]],
  ['depth.frontFov', 'Front view — lens (lower = flatter)', 2, 20, .5, '°'],
  ['depth.frontFill', 'Front view — summit height in the scene', .3, .95, .01],
  ['depth.frontBase', 'Front view — foot above the bottom edge', 0, .5, .01],
  ['Depth and position'],
  ['depth.focusDist', 'Focused summit — distance', 30, 200, 1],
  ['depth.elev', 'Camera height', 0, 40, 1, '°'],
  ['depth.aim', 'Summit framing (higher = lower, nearer the bar)', .4, 1.6, .01],
  ['depth.fgScale', 'Focused summit — scale', .8, 1.6, .01, '×'],
  ['depth.bgScale', 'Background summits — scale', .2, 1, .01, '×'],
  ['depth.spread', 'Spread the summits', .6, 1.6, .01, '×'],
  ['depth.offsets.0', 'Groww — offset', -60, 60, 1],
  ['depth.offsets.1', 'Firstpost — offset', -60, 60, 1],
  ['depth.offsets.2', 'Breathe ESG — offset', -60, 60, 1],
  ['depth.offsets.3', 'Shyft — offset', -60, 60, 1],
  ['Visual style'],
  ['style.activeInk', 'Active — stroke colour', 'color'],
  ['style.activeInkMix', 'Active — stroke colour strength', 0, 1, .01],
  ['style.activeBoost', 'Active — extra opacity', 0, 1.5, .01],
  ['style.dim', 'Inactive — dim', 0, .95, .01],
  ['style.thin', 'Inactive — thinner strokes', 0, .9, .01],
  ['style.coolTint', 'Inactive — tint', 'color'],
  ['style.cool', 'Inactive — tint strength', 0, 1, .01],
  ['style.sparse', 'Inactive — fewer contours', 0, .9, .01],
  ['style.fill', 'Fill colour', 'color'],
  ['style.fillGrad', 'Fill gradient strength', 0, 1, .01],
  ['style.contrast', 'Scene contrast', .3, 1.6, .01, '×'],
  ['depth.fog', 'Atmospheric fade on far peaks', 0, 1, .01],
  ['Animation'],
  ['anim.on', 'Animation on', 'check'],
  ['anim.camSpeed', 'Camera transition speed', .5, 8, .1],
  ['anim.fly', 'Flight lift between summits', 0, 1.5, .01],
  ['anim.pulse', 'Peak dot — pulse period', .6, 4, .05, 's'],
  ['anim.pulseAmp', 'Peak dot — pulse intensity', 0, 2, .01, '×'],
  ['Focus'],
  ['focus.dot', 'Glowing dot on the focused summit', 'check'],
  ['focus.trail', 'Peak animation (trail) on the focused summit', 'check'],
  ['focus.hoverRings', 'Hover rings on the range', 'check'],
  ['Cards and Rive'],
  ['rive.tint', 'Rive — accent tint', 0, 1, .01],
  ['rive.playAll', 'Rive — play every card', 'check'],
  ['dock', 'Scene height under the cards', 30, 70, 1, 'vh'],
];
/* the front view's framing has its own values on desktop */
const PHONE = matchMedia('(max-width: 900px)');
const at = p => !PHONE.matches && /^depth\.front(Fill|Base)$/.test(p) ? p.replace('depth.', 'depth.desk.') : p;
const get = p => at(p).split('.').reduce((o, k) => o[k], C);
const set = (p, v) => { const ks = at(p).split('.'), last = ks.pop(); ks.reduce((o, k) => o[k], C)[last] = v; };

function buildPanel(apply, range) {
  const el = document.createElement('div');
  el.id = 'tune';
  el.innerHTML = `<div id="tune-head"><b>Base Camp</b><button id="tune-hide" title="Hide (H)">–</button></div>` + SCHEMA.map(([p, label, a, b, step, unit = '', how]) => {
    if (label == null) return `<p class="tune-sub">${p}</p>`;
    const id = 'bc-' + p.replace(/\./g, '-'), v = get(p);
    if (a === 'color') return `<div class="row"><label>${label}<i></i></label><input type="color" id="${id}" value="${v}"></div>`;
    if (a === 'check') return `<div class="row inline"><label for="${id}">${label}<i></i></label><input type="checkbox" id="${id}"${v ? ' checked' : ''}></div>`;
    if (a === 'select') return `<div class="row"><label>${label}<i></i></label><select id="${id}">${b.map(([k, t]) => `<option value="${k}"${k === v ? ' selected' : ''}>${t}</option>`).join('')}</select></div>`;
    return `<div class="row"><label>${label}<i id="v-${id}">${v}${unit}</i></label><input type="range" id="${id}" min="${a}" max="${b}" step="${step}" value="${v}" data-unit="${unit}"${how ? ` data-how="${how}"` : ''}></div>`;
  }).join('') + bakeControls.html;
  document.body.appendChild(el);
  SCHEMA.forEach(([p, label, a]) => {
    if (label == null) return;
    const inp = el.querySelector('#bc-' + p.replace(/\./g, '-'));
    if (a === 'check') { inp.addEventListener('change', () => { set(p, inp.checked); apply(); }); return; }
    if (a === 'color') { inp.addEventListener('input', () => { set(p, inp.value); apply(); }); return; }
    if (a === 'select') { inp.addEventListener('change', () => { set(p, inp.value); apply(); }); return; }
    const out = el.querySelector('#v-bc-' + p.replace(/\./g, '-'));
    inp.addEventListener('input', () => { out.textContent = inp.value + inp.dataset.unit; if (inp.dataset.how !== 'rebuild') { set(p, +inp.value); apply(); } });
    /* the contour count is a re-survey of the ground: on release */
    if (inp.dataset.how === 'rebuild') inp.addEventListener('change', () => { set(p, +inp.value); range.setTerrain({ levels: +inp.value }); apply(); });
  });
  bakeControls.bind(el, KEY, C, 'BASECAMP_CONFIG');
  el.querySelector('#tune-hide').addEventListener('click', () => el.classList.toggle('hidden'));
  if (window.wb && window.wb.adopt) window.wb.adopt();
}
