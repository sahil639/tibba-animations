/* A video's controls on hover (Nov 2026): the Groww Stories recap plays
   muted on its own; hover it (or, on a touch screen, they are simply
   there) and a slim bar comes up — play/pause, where it is, and the
   sound, which is how a reader hears it. Mark a video's box with
   data-controls. Styles: assets/case-figma.css (.vc). */
(function () {
  const ICON = {
    play:  '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11l9-5.5z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5h3v11H4zM9 2.5h3v11H9z" fill="currentColor"/></svg>',
    muted: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6h3l4-3.5v11L5 10H2z" fill="currentColor"/><path d="M11 6l4 4M15 6l-4 4" stroke="currentColor" stroke-width="1.4" fill="none"/></svg>',
    sound: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6h3l4-3.5v11L5 10H2z" fill="currentColor"/><path d="M11 5.2a4 4 0 0 1 0 5.6M12.8 3.4a6.5 6.5 0 0 1 0 9.2" stroke="currentColor" stroke-width="1.3" fill="none"/></svg>',
  };
  document.querySelectorAll('[data-controls]').forEach(box => {
    const v = box.querySelector('video'); if (!v) return;
    const bar = document.createElement('div'); bar.className = 'vc';
    bar.innerHTML = `<button type="button" class="vc-play" aria-label="Pause">${ICON.pause}</button>
      <div class="vc-track" role="slider" tabindex="0" aria-label="Position" aria-valuemin="0" aria-valuemax="100"><i></i></div>
      <button type="button" class="vc-sound" aria-label="Turn sound on">${ICON.muted}</button>`;
    box.appendChild(bar);
    const play = bar.querySelector('.vc-play'), sound = bar.querySelector('.vc-sound'), track = bar.querySelector('.vc-track'), fill = track.querySelector('i');
    const sync = () => {
      play.innerHTML = v.paused ? ICON.play : ICON.pause; play.setAttribute('aria-label', v.paused ? 'Play' : 'Pause');
      sound.innerHTML = v.muted ? ICON.muted : ICON.sound; sound.setAttribute('aria-label', v.muted ? 'Turn sound on' : 'Turn sound off');
      box.classList.toggle('vc-live', !v.muted);
    };
    play.addEventListener('click', () => { v.paused ? v.play() : v.pause(); });
    sound.addEventListener('click', () => { v.muted = !v.muted; if (!v.muted) { v.volume = 1; if (v.paused) v.play(); } sync(); });
    v.addEventListener('play', sync); v.addEventListener('pause', sync); v.addEventListener('volumechange', sync);
    /* where it is: drawn every frame while it plays */
    let raf = 0;
    const tick = () => { if (v.duration) { const p = v.currentTime / v.duration; fill.style.transform = `scaleX(${p})`; track.setAttribute('aria-valuenow', Math.round(p * 100)); } raf = requestAnimationFrame(tick); };
    new IntersectionObserver(([e]) => { cancelAnimationFrame(raf); if (e.isIntersecting) tick();
      /* off screen with the sound on: stop talking */
      else if (!v.muted) { v.muted = true; sync(); } }).observe(box);
    const seek = x => { const r = track.getBoundingClientRect(); if (v.duration) v.currentTime = Math.min(1, Math.max(0, (x - r.left) / r.width)) * v.duration; };
    track.addEventListener('pointerdown', e => { track.setPointerCapture(e.pointerId); seek(e.clientX);
      const mv = ev => seek(ev.clientX), up = () => { track.removeEventListener('pointermove', mv); track.removeEventListener('pointerup', up); };
      track.addEventListener('pointermove', mv); track.addEventListener('pointerup', up); });
    track.addEventListener('keydown', e => { if (!v.duration) return;
      if (e.key === 'ArrowRight') v.currentTime = Math.min(v.duration, v.currentTime + 5);
      if (e.key === 'ArrowLeft') v.currentTime = Math.max(0, v.currentTime - 5); });
    sync();
  });
})();
