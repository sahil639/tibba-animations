/* ══════════════════════════════════════════════════════════════════════════
   Our Studio — seven photographs around a title
   ─────────────────────────────────────────────────────────────────────────
   The photos look scattered and are not. Each has an authored slot: a
   position, a width, its own aspect ratio and a depth. Together they keep a
   clear field around the title, put more weight top-left and bottom-right
   than anywhere else (the diagonal the eye reads a spread along), and never
   let two photos of the same shape sit side by side. Random placement gets
   none of that — it clumps, and a clump reads as a mistake.

   Depth is what makes it feel alive: every photo moves at its own rate as
   the page scrolls and as the pointer drifts, so the arrangement has layers
   rather than being one flat collage.
   ═════════════════════════════════════════════════════════════════════════ */

export const PHOTOS = [
  { src: 'assets/studio/01-dawn.jpg',   ratio: 4 / 5, x:  7,   y:  7, w: 15,   d: 0.9,
    cap: 'Dawn above the valley',  at: '27°59′N 86°55′E' },
  { src: 'assets/studio/02-mist.jpg',   ratio: 1,     x: 31,   y:  2, w: 10.5, d: 0.4,
    cap: 'Mist on the lower ridges', at: '46°33′N 7°58′E' },
  { src: 'assets/studio/03-ridge.jpg',  ratio: 3 / 2, x: 64,   y:  5, w: 21,   d: 1.1,
    cap: 'The long ridge at dusk', at: '35°52′N 76°30′E' },
  { src: 'assets/studio/04-forest.jpg', ratio: 3 / 4, x:  1.5, y: 44, w: 12.5, d: 0.55,
    cap: 'Forest line',            at: '61°13′N 7°05′E' },
  { src: 'assets/studio/05-lake.jpg',   ratio: 3 / 2, x: 19,   y: 70, w: 19,   d: 1.2,
    cap: 'Blue hour over the lake', at: '51°25′N 116°13′W' },
  { src: 'assets/studio/06-night.jpg',  ratio: 4 / 5, x: 61,   y: 64, w: 13.5, d: 0.7,
    cap: 'Night at base camp',     at: '28°00′N 86°51′E' },
  { src: 'assets/studio/07-summit.jpg', ratio: 2 / 3, x: 86,   y: 36, w: 11,   d: 0.45,
    cap: 'First light on the summit', at: '45°49′N 6°51′E' },
];

/* the order they arrive in — around the title, not left to right */
const ORDER = [2, 0, 5, 3, 1, 6, 4];

export const P = {
  scroll: 1,        // how far photos travel with the scroll
  pointer: 1,       // how far they drift toward the pointer
  shuffle: 0,       // 0 = authored positions; more = jittered from them
  seed: 3,
};

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export function mountStudioPhotos(root) {
  const field = root.querySelector('.sp-field');
  field.innerHTML = PHOTOS.map((p, i) => `
    <figure class="sp-photo" data-i="${i}" style="--r:${p.ratio}">
      <div class="sp-frame"><img src="${p.src}" alt="${p.cap}" loading="lazy" draggable="false"></div>
      <figcaption><span>${String(i + 1).padStart(2, '0')}</span>${p.cap}<em>${p.at}</em></figcaption>
    </figure>`).join('');
  const figs = [...field.querySelectorAll('.sp-photo')];
  const imgs = [...field.querySelectorAll('.sp-photo img')];

  /* ── placement ───────────────────────────────────────────────────────── */
  function place() {
    let s = (P.seed * 9301 + 49297) >>> 0;
    const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
    figs.forEach((f, i) => {
      const p = PHOTOS[i];
      const j = P.shuffle * 3.2;
      f.style.left = clamp(p.x + rnd() * j, 0, 100 - p.w) + '%';
      f.style.top  = clamp(p.y + rnd() * j, 0, 88) + '%';
      f.style.width = p.w + '%';
    });
  }
  place();

  /* ── the entrance ────────────────────────────────────────────────────── */
  function reveal() {
    root.classList.remove('sp-in'); void root.offsetWidth;
    ORDER.forEach((i, k) => figs[i].style.setProperty('--delay', (0.15 + k * 0.09) + 's'));
    root.classList.add('sp-in');
  }
  new IntersectionObserver(([e], io) => {
    if (e.isIntersecting) { reveal(); io.disconnect(); }
  }, { threshold: 0.2 }).observe(root);

  /* ── depth: scroll and pointer ───────────────────────────────────────── */
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tgt = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
  let sp = 0;
  addEventListener('pointermove', e => {
    tgt.x = e.clientX / innerWidth * 2 - 1;
    tgt.y = e.clientY / innerHeight * 2 - 1;
  }, { passive: true });

  function frame() {
    requestAnimationFrame(frame);
    if (reduced) return;
    const r = root.getBoundingClientRect();
    /* -1 as the section enters from below, +1 as it leaves the top */
    const p = clamp((innerHeight / 2 - (r.top + r.height / 2)) / (innerHeight / 2 + r.height / 2), -1, 1);
    sp += (p - sp) * 0.12;
    cur.x += (tgt.x - cur.x) * 0.06;
    cur.y += (tgt.y - cur.y) * 0.06;
    figs.forEach((f, i) => {
      const d = PHOTOS[i].d;
      const y = -sp * d * 90 * P.scroll + cur.y * d * -14 * P.pointer;
      const x = cur.x * d * -18 * P.pointer;
      f.style.setProperty('--px', x.toFixed(2) + 'px');
      f.style.setProperty('--py', y.toFixed(2) + 'px');
    });
    root.style.setProperty('--tx', (cur.x * 6 * P.pointer).toFixed(2) + 'px');
    root.style.setProperty('--ty', (cur.y * 4 * P.pointer).toFixed(2) + 'px');
  }
  requestAnimationFrame(frame);

  /* ── swapping in real photographs ────────────────────────────────────── */
  const DB = 'tibba-studio-photos';
  const db = () => new Promise((res, rej) => {
    try { const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore('p');
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    } catch (e) { rej(e); }
  });
  function setPhoto(i, blob, persist = true) {
    const url = blob ? URL.createObjectURL(blob) : PHOTOS[i].src;
    imgs[i].src = url;
    if (persist) db().then(d => {
      const st = d.transaction('p', 'readwrite').objectStore('p');
      blob ? st.put(blob, i) : st.delete(i);
    }).catch(() => {});
  }
  db().then(d => {
    const st = d.transaction('p', 'readonly').objectStore('p');
    PHOTOS.forEach((_, i) => { const g = st.get(i); g.onsuccess = () => { if (g.result) setPhoto(i, g.result, false); }; });
  }).catch(() => {});

  return {
    P, PHOTOS, reveal, place,
    setPhoto,
    fill(files) { [...files].slice(0, 7).forEach((f, i) => setPhoto(i, f)); },
    reset() { PHOTOS.forEach((_, i) => setPhoto(i, null)); },
  };
}
