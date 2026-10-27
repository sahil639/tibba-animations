/* ══════════════════════════════════════════════════════════════════════════
   The phone page's two scenes, as video — website-v3-mobile.html
   ─────────────────────────────────────────────────────────────────────────
   The 3D scenes of the desktop site, pre-rendered (tools/render-basecamp.html,
   tools/render-bags.html → tools/encode-videos.sh → assets/video/):

   1. The summits (#dock): one flight across the four summits, with a rest
      on each (summits.json has the times). The box is docked to the foot
      of the screen for the length of the cards; the card crossing the upper
      third of the screen is the one in focus, and the video plays to its
      summit and stops there — forwards, or the reversed copy backwards.
      The summit's dot is drawn over the paused frame, pulsing.

   2. The packs (#pack): each stage's bag as a seamless loop; picking a
      stage shrinks the bag away and grows the next in, as misc-bags.html
      does.

   Smooth or not at all: the videos are downloaded whole, within a time
   limit, before any of them is shown — a slow connection never sees one
   stall half-loaded. Until then, and for good if the download is too slow,
   the data is to be saved, the link is 2G, or less motion is asked for,
   each state is a still (the same frame, as a JPEG), switched with a fade.
   ═════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NET = navigator.connection || {};
  const STILLS = REDUCED || NET.saveData || /2g$/.test(NET.effectiveType || '');
  const LIMIT = 6000;                       // ms for the whole download, or stills it is

  /* every file whole within the limit (object URLs), or null */
  function fetchAll(urls) {
    if (STILLS) return Promise.resolve(null);
    const ac = new AbortController(), t = setTimeout(() => ac.abort(), LIMIT);
    return Promise.all(urls.map(u => fetch(u, { signal: ac.signal }).then(r => { if (!r.ok) throw new Error(u); return r.blob(); })))
      .then(bs => bs.map(b => URL.createObjectURL(b)), () => null)
      .finally(() => clearTimeout(t));
  }
  function video(src) {
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
    v.preload = 'auto'; v.disablePictureInPicture = true; v.setAttribute('aria-hidden', 'true');
    v.src = src;
    return v;
  }
  const once = (v, ev) => new Promise((res, rej) => { v.addEventListener(ev, res, { once: true }); v.addEventListener('error', rej, { once: true }); });
  const meta = v => v.readyState >= 1 ? Promise.resolve() : once(v, 'loadedmetadata');
  const seek = (v, t) => Math.abs(v.currentTime - t) < .01 ? Promise.resolve() : (v.currentTime = t, once(v, 'seeked'));
  const within = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(rej, ms))]);
  const until = test => new Promise(res => { const f = () => test() ? res() : requestAnimationFrame(f); f(); });
  /* run once, when el comes within a screen and a half */
  const near = (el, fn) => { const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); fn(); } }, { rootMargin: '150% 0px' }); io.observe(el); };

  /* ── 1. the summits ────────────────────────────────────────────────── */
  const dock = document.getElementById('dock');
  if (dock) {
    const view = dock.querySelector('.dock-view'), stills = [...view.querySelectorAll('img')];
    const btns = [...dock.querySelectorAll('button')], cards = [...document.querySelectorAll('#work .case')];
    let at = 0, want = 0, live = false, fv = null, rv = null, cur = null, busy = false, R = [], T = 0, DOT = [];

    function mark(i) {
      dock.style.setProperty('--c', cards[i].style.getPropertyValue('--c'));
      btns.forEach((b, k) => b.classList.toggle('on', k === i));
      if (DOT[i]) dock.style.setProperty('--dy', (DOT[i][1] * 100).toFixed(2) + '%');
    }
    function go(i) {
      if (i === want) return;
      want = i; mark(i);
      if (!live) { at = i; stills.forEach((s, k) => s.classList.toggle('on', k === i)); return; }
      run();
    }
    /* summit to summit along the video, never reversing mid-flight: a
       change of mind is taken up at the next summit */
    async function run() {
      if (busy) return;
      busy = true; dock.classList.remove('rest');
      try {
        while (at !== want) {
          const fwd = want > at, v = fwd ? fv : rv, next = at + (fwd ? 1 : -1);
          if (v !== cur) {
            await seek(v, fwd ? R[at] : T - R[at]);
            v.classList.add('on'); if (cur) cur.classList.remove('on'); cur = v;
          }
          v.playbackRate = Math.abs(want - at) > 1 ? 1.8 : 1;
          if (v.paused) await v.play();
          const stop = fwd ? R[next] : T - R[next];
          /* (a hidden tab pauses it; it picks up again on coming back) */
          await until(() => { if (v.paused && !document.hidden) v.play().catch(() => {}); return v.currentTime >= stop || v.ended; });
          at = next;
          if (at === want || (want > at) !== fwd) v.pause();
        }
      } catch (e) { still(); }                // no inline playback (Low Power Mode): back to the stills
      busy = false;
      if (at !== want) run(); else dock.classList.add('rest');
    }
    function still() {
      live = false; at = want; dock.classList.remove('live'); dock.classList.add('rest');
      stills.forEach((s, k) => s.classList.toggle('on', k === at));
      [fv, rv].forEach(v => v && v.remove());
    }

    /* the card crossing the upper third is the one in focus */
    const focusNow = () => { const line = innerHeight * .34; let f = 0; cards.forEach((c, i) => { if (c.getBoundingClientRect().top <= line) f = i; }); return f; };
    let queued = false;
    const onScroll = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; go(focusNow()); }); };
    const work = document.getElementById('work');
    new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? (addEventListener('scroll', onScroll, { passive: true }), onScroll()) : removeEventListener('scroll', onScroll))).observe(work);
    btns.forEach((b, i) => b.addEventListener('click', () => scrollTo({ top: cards[i].getBoundingClientRect().top + scrollY - innerHeight * .12, behavior: REDUCED ? 'auto' : 'smooth' })));
    mark(0);

    near(work, async () => {
      const [urls, tl] = await Promise.all([fetchAll(['assets/video/summits.mp4', 'assets/video/summits-rev.mp4']),
        fetch('assets/video/summits.json').then(r => r.json()).catch(() => null)]);
      if (!urls || !tl) return;
      /* rest in the middle of each hold, so stopping a frame late (or
         early, backwards) still lands on the still part */
      R = tl.rests.map(r => r.t + .15); T = tl.frames / tl.fps; DOT = tl.rests.map(r => r.dot);
      fv = video(urls[0]); rv = video(urls[1]);
      view.append(fv, rv);
      try {
        await within(Promise.all([meta(fv), meta(rv)]), 4000);
        await within(seek(fv, R[want]), 3000);
      } catch (e) { fv.remove(); rv.remove(); return; }
      at = want; cur = fv; fv.classList.add('on'); live = true;
      dock.classList.add('live', 'rest'); mark(at);
    });
  }

  /* ── 2. the packs ──────────────────────────────────────────────────── */
  const pack = document.getElementById('pack');
  if (pack) {
    const layers = [...pack.querySelectorAll('.pk')], name = document.getElementById('pack-name');
    let cur = 0, vids = null, seen = false;
    const play = () => vids && vids.forEach((v, k) => { if (k === cur && seen) v.play().catch(() => {}); else v.pause(); });
    function pick(i) {
      if (i === cur) return;
      layers[cur].classList.replace('on', 'off'); layers[i].classList.remove('off'); layers[i].classList.add('on');
      cur = i; name.textContent = layers[i].dataset.name;
      if (vids) { vids[i].currentTime = 0; play(); }
    }
    document.querySelectorAll('.stages button').forEach(b => b.addEventListener('click', () => pick(+b.dataset.i)));
    new IntersectionObserver(es => { seen = es[0].isIntersecting; play(); }).observe(pack);
    near(pack, async () => {
      const urls = await fetchAll(layers.map(l => l.dataset.src));
      if (!urls) return;
      vids = urls.map((u, k) => { const v = video(u); v.loop = true; layers[k].append(v); return v; });
      play();
    });
  }
})();
