/* ══════════════════════════════════════════════════════════════════════════
   The Firstpost player (Firstpost case study, "Creating Firstpost's Video
   Experience")
   ─────────────────────────────────────────────────────────────────────────
   The player UI from the Figma frame (Sahil's workspace, node 1867:35267) —
   the related-books pill, the scrubber with its chapter ticks, time, volume,
   pause, ±10, quality, captions, audio, language, full screen — with a
   YouTube video in place of the red block: muted, autoplaying, no YouTube
   controls, only the first `data-loop` seconds, round and round. The
   scrubber follows the clip's own time. The controls are a picture of the
   design: they do not act on the video.

   <figure class="fp-player" data-yt="VIDEO_ID" data-loop="20"></figure>
   ═════════════════════════════════════════════════════════════════════════ */
const I = {
  vol:   '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/>',
  pause: '<path d="M8 5h3v14H8zM13 5h3v14h-3z" fill="currentColor" stroke="none"/>',
  back:  '<path d="M9 5 5 9l4 4"/><path d="M5 9h9a5 5 0 1 1-5 5"/>',
  fwd:   '<path d="m15 5 4 4-4 4"/><path d="M19 9h-9a5 5 0 1 0 5 5"/>',
  tune:  '<path d="M6 4v16M12 4v16M18 4v16"/><path d="M4 8h4M10 15h4M16 10h4"/>',
  cc:    '<rect x="3.5" y="6" width="17" height="12" rx="1.5"/><path d="M10 10.5a2 2 0 1 0 0 3M16 10.5a2 2 0 1 0 0 3"/>',
  head:  '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="4" y="14" width="4" height="6" rx="1"/><rect x="16" y="14" width="4" height="6" rx="1"/>',
  lang:  '<path d="M4 6h8M8 4v2M6 6c0 4 2 6 5 7M10 6c0 3-2 6-6 7"/><path d="m13 20 3.5-8 3.5 8M14.2 17h4.6"/>',
  full:  '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  book:  '<path d="M6 4h9a2 2 0 0 1 2 2v14H8a2 2 0 0 1-2-2z" fill="currentColor" stroke="none"/><path d="M9 4v12" stroke="#5a1611"/>',
};
const ico = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[k]}</svg>`;
const mmss = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

const boxes = [...document.querySelectorAll('.fp-player')];
boxes.forEach(box => {
  const id = box.dataset.yt, LOOP = +box.dataset.loop || 20;
  box.innerHTML = `
    <div class="fp-screen">
      <div class="fp-video" id="fp-${id}-${Math.random().toString(36).slice(2, 7)}"></div>
      <p class="fp-pill">${ico('book')}<span>2 Related books found</span><b>›</b></p>
      <div class="fp-bar">
        <div class="fp-track"><i class="fp-done"></i><i class="fp-knob"></i>${[.2, .26, .37, .5, .72].map(x => `<em style="left:${x * 100}%"></em>`).join('')}</div>
        <div class="fp-ctrls">
          <span class="fp-time">0:00 / ${mmss(LOOP)}</span>${ico('vol')}${ico('pause')}
          <span class="fp-skip">${ico('back')}<small>10</small>${ico('fwd')}</span>
          <span class="fp-q">${ico('tune')}<small>1080p</small></span><span class="fp-cc">${ico('cc')}</span>
          <span class="fp-r">${ico('head')}${ico('lang')}${ico('full')}</span>
        </div>
      </div>
    </div>`;
  box._loop = LOOP;
});

if (boxes.length) {
  /* the IFrame API, once; each player is made when its box comes near */
  const api = new Promise(res => {
    if (window.YT && window.YT.Player) return res(window.YT);
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev && prev(); res(window.YT); };
    const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(s);
  });
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { io.unobserve(e.target); make(e.target); } }), { rootMargin: '400px 0px' });
  boxes.forEach(b => io.observe(b));

  async function make(box) {
    const YT = await api, LOOP = box._loop, el = box.querySelector('.fp-video');
    const done = box.querySelector('.fp-done'), knob = box.querySelector('.fp-knob'), time = box.querySelector('.fp-time');
    const p = new YT.Player(el.id, {
      videoId: box.dataset.yt, host: 'https://www.youtube-nocookie.com',
      playerVars: { autoplay: 1, mute: 1, controls: 0, disablekb: 1, fs: 0, rel: 0, modestbranding: 1, playsinline: 1, iv_load_policy: 3, start: 0, end: LOOP + 1 },
      events: {
        onReady: e => { e.target.mute(); e.target.playVideo(); tick(); },
        /* at the end of the clip (or if it stops), back to the start */
        onStateChange: e => { if (e.data === YT.PlayerState.ENDED) { p.seekTo(0, true); p.playVideo(); } },
      },
    });
    function tick() {
      let t = 0;
      try { t = p.getCurrentTime() || 0; } catch (e) {}
      if (t >= LOOP) { p.seekTo(0, true); t = 0; }
      const k = Math.min(1, t / LOOP);
      done.style.transform = `scaleX(${k})`; knob.style.left = (k * 100) + '%';
      time.textContent = `${mmss(t)} / ${mmss(LOOP)}`;
      requestAnimationFrame(tick);
    }
    /* off screen, it rests */
    new IntersectionObserver(([e]) => { try { e.isIntersecting ? p.playVideo() : p.pauseVideo(); } catch (er) {} }).observe(box);
  }
}
