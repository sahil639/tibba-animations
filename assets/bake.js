/* ══════════════════════════════════════════════════════════════════════════
   Bake — keep a page's panel settings, the way the Polaroids page does
   ─────────────────────────────────────────────────────────────────────────
   A page's config object is its defaults. "Bake" saves the current values
   in this browser (localStorage), and the next time the page loads they
   are merged over the defaults BEFORE the page mounts — so the scene opens
   as baked, and the panel's sliders open where they were left. "Clear
   baked" drops them and reloads onto the defaults. The same values are
   also copied to the clipboard, ready to paste over the config object in
   the source to make them everyone's defaults.

     import { applyBaked, bakeControls } from './assets/bake.js';
     applyBaked('tibba.bake.summits-four', CONFIG);        // before mounting
     panel.insertAdjacentHTML('beforeend', bakeControls.html);
     bakeControls.bind(panel, 'tibba.bake.summits-four', CONFIG, 'SUMMITS_CONFIG');
   ═════════════════════════════════════════════════════════════════════════ */

/* merge saved values into the live object, key by key — arrays and nested
   objects are walked, so a config that gained a key since the bake keeps
   its default for it, and a key the panel added (a per-summit easing, say)
   comes back too */
function merge(target, src) {
  if (!src || typeof src !== 'object') return;
  for (const k of Object.keys(src)) {
    if (!(k in target)) { target[k] = src[k]; continue; }
    const t = target[k], v = src[k];
    if (t && typeof t === 'object' && v && typeof v === 'object') merge(t, v);
    else if (typeof t === typeof v) target[k] = v;
  }
}

export function applyBaked(key, config) {
  try { merge(config, JSON.parse(localStorage.getItem(key) || 'null')); } catch {}
  return isBaked(key);
}
export function isBaked(key) { try { return !!localStorage.getItem(key); } catch { return false; } }

export const bakeControls = {
  html: `<p class="tune-sub">Layout</p>
    <div class="tune-acts"><button class="tune-btn" id="bk-bake">Bake settings</button><button class="tune-btn" id="bk-clear">Clear baked</button></div>
    <p class="why" id="bk-state"></p>`,
  bind(panel, key, config, name) {
    const q = id => panel.querySelector('#' + id);
    const state = msg => { q('bk-state').textContent = msg || (isBaked(key)
      ? 'This browser is showing baked settings.' : `Showing the defaults in ${name}.`); };
    q('bk-bake').addEventListener('click', async () => {
      try { localStorage.setItem(key, JSON.stringify(config)); } catch {}
      const txt = `export const ${name} = ` + JSON.stringify(config, null, 2) + ';';
      try { await navigator.clipboard.writeText(txt); state(`Baked — they load on the next refresh. Also copied: paste over ${name} to make them the default.`); }
      catch { console.log(txt); state(`Baked — they load on the next refresh. The config is in the console to paste over ${name}.`); }
    });
    q('bk-clear').addEventListener('click', () => { try { localStorage.removeItem(key); } catch {} location.reload(); });
    state();
  },
};
