/* ══════════════════════════════════════════════════════════════════════════
   Prototype — screens shown inside the iPhone and MacBook frames
   ─────────────────────────────────────────────────────────────────────────
   The two frames are PNGs whose screen openings are already transparent, so
   a screen sits UNDERNEATH its frame rather than on top of it. That is what
   keeps the Dynamic Island and the MacBook notch in front of the content,
   the way they are on the real devices — an image laid over the frame would
   paint straight across both.

   The openings were measured off the PNGs by flood-filling the transparent
   region from the centre, not eyeballed:

     iPhone   978 × 2000 frame, opening x52–925 y50–1949   (874 × 1900)
     MacBook 2000 × 1304 frame, opening x205–1794 y135–1168 (1590 × 1034)

   Everything below positions the screens as percentages of those numbers,
   so the frames can be drawn at any size and the screens stay registered.
   ═════════════════════════════════════════════════════════════════════════ */

export const FRAMES = {
  phone: {
    src: 'assets/mockups/iphone.png', w: 978, h: 2000,
    screen: { x: 52, y: 50, w: 874, h: 1900 },
    radius: 130,             // corner radius of the opening, in frame pixels
    recommend: '1179 × 2556',
    ratio: 874 / 1900,
  },
  desktop: {
    src: 'assets/mockups/macbook.png', w: 2000, h: 1304,
    screen: { x: 205, y: 135, w: 1590, h: 1034 },
    radius: 12,
    recommend: '2880 × 1872',
    ratio: 1590 / 1034,
  },
};

/* ── which frame an image belongs in ──────────────────────────────────────
   By WIDTH, not by shape. Shape cannot tell them apart: a full-page desktop
   capture is taller than it is wide, exactly like a phone screen. What does
   tell them apart is that phone captures come in a small set of widths —
   the iPhone point widths at 1x, 2x or 3x. 1179 is 393 × 3; 1290 is 430 × 3.
   No common desktop width lands on one of those. */
const PHONE_POINTS = [320, 360, 375, 390, 393, 402, 412, 414, 428, 430, 440];

export function classify(w, h) {
  for (const k of [1, 2, 3]) {
    if (w % k === 0 && PHONE_POINTS.includes(w / k)) return 'phone';
  }
  /* Anything else: narrow and portrait reads as a phone, the rest as desktop. */
  return (w < 1000 && w / h < 0.75) ? 'phone' : 'desktop';
}

/* ── the transitions between before and after ──────────────────────────── */
const clamp01 = t => (t < 0 ? 0 : t > 1 ? 1 : t);
const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/* Contour bloom: the after screen grows out of the middle of the view as a
   solid disc with a band of contour rings running ahead of it — the same
   line language as the terrain everywhere else on the site. Built as one
   radial gradient with the ring stops written out, because CSS mask
   compositing cannot express "rings, but only near the edge of a disc". */
function contourMask(t, ox, oy, reach) {
  const r = t * reach * 1.25;
  const band = reach * 0.16;
  const stops = [`#000 0px`, `#000 ${Math.max(0, r).toFixed(1)}px`];
  const rings = 7;
  for (let i = 0; i < rings; i++) {
    const a = r + (i / rings) * band;
    const w = Math.max(0.6, 2.2 * (1 - i / rings));   // rings thin as they lead
    stops.push(`transparent ${(a + 0.01).toFixed(1)}px`,
               `transparent ${(a + band / rings - w).toFixed(1)}px`,
               `#000 ${(a + band / rings - w + 0.01).toFixed(1)}px`,
               `#000 ${(a + band / rings).toFixed(1)}px`);
  }
  stops.push(`transparent ${(r + band + 0.02).toFixed(1)}px`);
  return `radial-gradient(circle at ${ox}px ${oy}px, ${stops.join(', ')})`;
}

/* Ink wipe: a soft front travelling across the screen — ink soaking over
   rather than a blind coming down. Square to the screen on purpose: a
   slanted gradient's stops are measured along its own diagonal, which on a
   screen several viewports tall is nowhere near the horizontal position the
   glow line is drawn at, and the two drift apart. */
function wipeFront(t, w) {
  const f = Math.max(18, w * 0.06);
  return { x: -f + t * (w + f * 2), f };
}
function inkMask(t, w) {
  const { x, f } = wipeFront(t, w);
  return `linear-gradient(90deg, #000 ${x - f}px, rgba(0,0,0,.55) ${x}px, transparent ${x + f}px)`;
}

export function mountPrototype(root, panel) {
  const S = {
    mode: 'single',          // 'single' | 'compare'
    show: 'after',           // which one is on screen outside a transition
    style: 'contour',        // 'contour' | 'ink' | 'glow'
    duration: 1.6,
    t: 1,                    // 0 = before, 1 = after
    frames: 'both',          // 'both' | 'phone' | 'desktop'
  };

  const slots = {};          // `${frame}:${which}` → object URL

  /* ── build the two devices ──────────────────────────────────────────── */
  root.innerHTML = ['phone', 'desktop'].map(kind => {
    const F = FRAMES[kind], s = F.screen;
    const pct = (v, of) => (v / of * 100).toFixed(4) + '%';
    const rad = `${pct(F.radius, s.w)} / ${pct(F.radius, s.h)}`;
    return `
      <figure class="proto-device proto-${kind}" data-kind="${kind}"
              style="aspect-ratio:${F.w} / ${F.h}">
        <div class="proto-screen" style="left:${pct(s.x, F.w)};top:${pct(s.y, F.h)};
             width:${pct(s.w, F.w)};height:${pct(s.h, F.h)};border-radius:${rad}">
          <div class="proto-scroll" tabindex="0" aria-label="${kind} screen, scrollable">
            <div class="proto-stack">
              <div class="proto-layer proto-before"></div>
              <div class="proto-layer proto-after"></div>
            </div>
          </div>
          <div class="proto-glow" aria-hidden="true"></div>
        </div>
        <img class="proto-frame" src="${F.src}" alt="" draggable="false">
        <figcaption>${kind === 'phone' ? 'iPhone' : 'MacBook'}
          <span>${F.recommend}</span></figcaption>
      </figure>`;
  }).join('');

  const dev = kind => root.querySelector(`.proto-${kind}`);

  /* ── placeholders until something is uploaded ───────────────────────── */
  function placeholder(kind, which) {
    const F = FRAMES[kind];
    return `<div class="proto-empty ${which}">
        <b>${which === 'before' ? 'Before' : 'After'}</b>
        <span>${kind === 'phone' ? 'iPhone' : 'MacBook'} screen</span>
        <em>${F.recommend}px · or any width, taller scrolls</em>
      </div>`;
  }

  function paint(kind, which) {
    const layer = dev(kind).querySelector(`.proto-${which}`);
    const url = slots[`${kind}:${which}`];
    layer.innerHTML = url ? `<img src="${url}" alt="">` : placeholder(kind, which);
    layer.classList.toggle('has-img', !!url);
  }

  /* ── the transition ─────────────────────────────────────────────────── */
  function applyMask(kind) {
    const d = dev(kind);
    const after = d.querySelector('.proto-after');
    const scroll = d.querySelector('.proto-scroll');
    const glow = d.querySelector('.proto-glow');

    if (S.mode !== 'compare') {
      after.style.maskImage = after.style.webkitMaskImage = '';
      after.style.opacity = '1';
      /* display, not visibility: a hidden before-screen that is taller than
         the after would still add its length to the scroll */
      d.querySelector('.proto-before').style.display = 'none';
      glow.style.opacity = '0';
      return;
    }
    d.querySelector('.proto-before').style.display = '';

    const t = ease(clamp01(S.t));
    const w = scroll.clientWidth, h = scroll.clientHeight;
    /* the bloom centres on what is VISIBLE, not on the middle of a screen
       that may be several viewports tall */
    const ox = w / 2, oy = scroll.scrollTop + h / 2;

    let m;
    if (t <= 0.0001) m = 'linear-gradient(transparent, transparent)';
    else if (t >= 0.9999) m = 'none';
    else if (S.style === 'contour') m = contourMask(t, ox, oy, Math.hypot(w, h) / 2);
    else m = inkMask(t, w);

    after.style.maskImage = after.style.webkitMaskImage = m === 'none' ? '' : m;
    after.style.maskSize = after.style.webkitMaskSize = '100% 100%';
    after.style.opacity = '1';

    /* Glow: the ink wipe with a line of the accent running along its front */
    if (S.style === 'glow' && t > 0.0001 && t < 0.9999) {
      glow.style.opacity = '1';
      glow.style.transform = `translateX(${wipeFront(t, w).x}px)`;
    } else {
      glow.style.opacity = '0';
    }
  }

  const applyAll = () => { applyMask('phone'); applyMask('desktop'); };

  let anim = null;
  function play(to) {
    if (anim) cancelAnimationFrame(anim);
    const from = S.t, t0 = performance.now(), dur = S.duration * 1000;
    const step = now => {
      const k = clamp01((now - t0) / dur);
      S.t = from + (to - from) * k;
      applyAll();
      if (panel) panel.onT && panel.onT(S.t);
      if (k < 1) anim = requestAnimationFrame(step);
      else { anim = null; S.show = to >= 0.5 ? 'after' : 'before'; }
    };
    anim = requestAnimationFrame(step);
  }

  /* keep the bloom's centre on the view while a tall screen scrolls */
  root.querySelectorAll('.proto-scroll').forEach(s =>
    s.addEventListener('scroll', () => applyMask(s.closest('.proto-device').dataset.kind),
                       { passive: true }));
  addEventListener('resize', applyAll);

  /* ── storage: uploads survive a reload ──────────────────────────────────
     IndexedDB rather than localStorage, because a 2880-pixel screenshot is
     several megabytes and localStorage tops out around five. Failing
     silently is right here — private windows refuse it, and the page still
     works for the session. */
  const DB = 'tibba-prototype', STORE = 'screens';
  function db() {
    return new Promise((res, rej) => {
      try {
        const r = indexedDB.open(DB, 1);
        r.onupgradeneeded = () => r.result.createObjectStore(STORE);
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      } catch (e) { rej(e); }
    });
  }
  async function save(key, blob) {
    try {
      const d = await db();
      const tx = d.transaction(STORE, 'readwrite');
      blob ? tx.objectStore(STORE).put(blob, key) : tx.objectStore(STORE).delete(key);
    } catch (e) { /* session only */ }
  }
  async function restore() {
    try {
      const d = await db();
      const tx = d.transaction(STORE, 'readonly');
      const st = tx.objectStore(STORE);
      await Promise.all(['phone', 'desktop'].flatMap(k => ['before', 'after'].map(w =>
        new Promise(res => {
          const g = st.get(`${k}:${w}`);
          g.onsuccess = () => { if (g.result) setSlot(k, w, g.result, false); res(); };
          g.onerror = () => res();
        }))));
    } catch (e) { /* nothing stored */ }
  }

  function setSlot(kind, which, blob, persist = true) {
    const key = `${kind}:${which}`;
    if (slots[key]) URL.revokeObjectURL(slots[key]);
    slots[key] = blob ? URL.createObjectURL(blob) : null;
    paint(kind, which);
    if (persist) save(key, blob || null);
    requestAnimationFrame(applyAll);
    if (panel && panel.onSlots) panel.onSlots(status());
  }

  function status() {
    const out = {};
    for (const k of ['phone', 'desktop']) for (const w of ['before', 'after'])
      out[`${k}:${w}`] = !!slots[`${k}:${w}`];
    return out;
  }

  /* Several files at once: sort each into its frame by width, then fill
     that frame's "after" slot first and "before" second. */
  function readSize(file) {
    return new Promise(res => {
      const u = URL.createObjectURL(file), im = new Image();
      im.onload = () => { res({ w: im.naturalWidth, h: im.naturalHeight }); URL.revokeObjectURL(u); };
      im.onerror = () => { res(null); URL.revokeObjectURL(u); };
      im.src = u;
    });
  }
  async function autoPlace(files) {
    const report = [];
    const used = { phone: 0, desktop: 0 };
    for (const f of files) {
      const size = await readSize(f);
      if (!size) { report.push(`${f.name}: not an image`); continue; }
      const kind = classify(size.w, size.h);
      const which = used[kind] === 0 ? 'after' : 'before';
      used[kind]++;
      if (used[kind] > 2) { report.push(`${f.name}: ${kind} already has two screens`); continue; }
      setSlot(kind, which, f);
      report.push(`${f.name} (${size.w}×${size.h}) → ${kind === 'phone' ? 'iPhone' : 'MacBook'} · ${which}`);
    }
    return report;
  }

  for (const k of ['phone', 'desktop']) { paint(k, 'before'); paint(k, 'after'); }
  restore();
  applyAll();

  return {
    S, FRAMES, status, setSlot, autoPlace, classify,
    setMode(m) { S.mode = m; S.t = S.show === 'after' ? 1 : 0; applyAll(); },
    setStyle(s) { S.style = s; applyAll(); },
    setT(t) { if (anim) cancelAnimationFrame(anim); S.t = t; applyAll(); },
    toBefore() { play(0); },
    toAfter() { play(1); },
    toggle() { play(S.t >= 0.5 ? 0 : 1); },
    setFrames(v) {
      S.frames = v;
      dev('phone').style.display = v === 'desktop' ? 'none' : '';
      dev('desktop').style.display = v === 'phone' ? 'none' : '';
      requestAnimationFrame(applyAll);
    },
    clear() {
      for (const k of ['phone', 'desktop']) for (const w of ['before', 'after']) setSlot(k, w, null);
    },
  };
}
