/* ══════════════════════════════════════════════════════════════════════════
   Rive slots — a box that plays the studio's Rive file
   ─────────────────────────────────────────────────────────────────────────
   The Our Summits layouts keep one or more boxes for the shared Rive
   animation. Put the file at

     assets/rive/summits.riv                 the one animation, every box
     assets/rive/<client folder>.riv         optional: a project's own
                                             (groww, firstpost, breathe-esg,
                                             shyft-mindhouse) — tried first

   and every slot plays it: the runtime (@rive-app/canvas) loads only when a
   file is actually there. If the file's state machine has a number input
   named "project" (or "summit"), it is set to the project in view, 0–3, so
   one file can follow the scroll. Until a file exists the slot shows the
   placeholder it was given — the box stays laid out either way.

     TibbaRive.mount(el, { names: ['groww', 'summits'], project: 0 })
       → { setProject(i), swap(names) }
   ═════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  const DIR = 'assets/rive/';
  const RUNTIME = 'https://cdn.jsdelivr.net/npm/@rive-app/canvas@2.21.6/rive.js';
  let runtime = null;
  const have = new Map();                         // name → Promise<bool>

  function exists(name) {
    if (!have.has(name)) have.set(name, fetch(DIR + name + '.riv', { method: 'HEAD' }).then(r => r.ok).catch(() => false));
    return have.get(name);
  }
  function loadRuntime() {
    if (global.rive) return Promise.resolve(global.rive);
    if (!runtime) runtime = new Promise((ok, no) => {
      const s = document.createElement('script'); s.src = RUNTIME; s.async = true;
      s.onload = () => ok(global.rive); s.onerror = no; document.head.appendChild(s);
    });
    return runtime;
  }
  async function first(names) { for (const n of names) if (await exists(n)) return n; return null; }

  function mount(el, opts = {}) {
    let project = opts.project || 0, r = null, input = null, cur = null, alive = true;
    const set = () => { if (input) input.value = project; };
    async function play(names) {
      const name = await first(names);
      if (!alive || name === cur) return;
      cur = name;
      if (!name) { el.classList.remove('rv-live'); return; }
      try {
        const R = await loadRuntime();
        if (r) { r.cleanup(); r = null; }
        let cv = el.querySelector('canvas.rv-canvas');
        if (!cv) { cv = document.createElement('canvas'); cv.className = 'rv-canvas'; el.appendChild(cv); }
        r = new R.Rive({
          src: DIR + name + '.riv', canvas: cv, autoplay: true, stateMachines: opts.stateMachine,
          layout: new R.Layout({ fit: R.Fit.Cover, alignment: R.Alignment.Center }),
          onLoad: () => {
            r.resizeDrawingSurfaceToCanvas();
            const sm = (r.stateMachineNames || [])[0];
            if (sm) { if (!opts.stateMachine) r.play(sm); input = (r.stateMachineInputs(sm) || []).find(i => /^(project|summit)$/i.test(i.name)) || null; set(); }
            el.classList.add('rv-live');
          },
        });
      } catch (e) { el.classList.remove('rv-live'); }
    }
    play(opts.names || ['summits']);
    if (global.ResizeObserver) new ResizeObserver(() => { if (r) r.resizeDrawingSurfaceToCanvas(); }).observe(el);
    return {
      setProject(i) { project = i; set(); },
      swap(names) { play(names); },
      destroy() { alive = false; if (r) r.cleanup(); },
    };
  }
  global.TibbaRive = { mount, exists, DIR };
})(window);
