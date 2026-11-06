/* ══════════════════════════════════════════════════════════════════════════
   The odometer
   ─────────────────────────────────────────────────────────────────────────
   The site's one piece of signature motion, and the only thing on the page
   that is allowed to be a flourish. Two mechanisms, because a word and a
   measurement do not roll the same way.

   ── roll() · the ring, for type ────────────────────────────────────────────
   Every character becomes a reel in a 1em window and rolls a fixed distance
   onto itself. The glyphs it passes through on the way are not random: the
   reference runs a 36-glyph ring, A–Z then 0–9, and steps it by SEVEN. Read
   the live site's DOM and a T comes out as T·0·7·E·T, an A as A·H·O·V·A, an
   S as S·Z·6·D·S — each of those is +7, +14, +21 around that ring and back.

       "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
        T = 19 → 26 '0' → 33 '7' → 40 mod 36 = 4 'E' → back to 19 'T'

   That is why it reads the way it does rather than like a slot machine: a
   fixed stride around a fixed ring gives every character in a word the same
   rhythm, and the strip opens and closes on the real glyph, so the word is
   never briefly wrong — it is only ever briefly in motion.

   ── count() · place value, for measurements ───────────────────────────────
   Reels of 0–9, each column offset by its own place's continuous value, so a
   column turns over at the moment the one to its right passes nine. The units
   wheel turns continuously and every wheel above it stands still until it is
   carried. Roll them all at once and it is a slot machine again; carry them
   and it reads as a number being measured rather than written. Lifted from
   tibba-peak.html, where the summit's elevation does the same thing.

   ── when it runs ──────────────────────────────────────────────────────────
   Nothing rolls off-screen. Both mechanisms arm an IntersectionObserver and
   fire once, the first time the element is actually in front of someone —
   except where a caller drives it by hand, which is what the loader does.

   Under prefers-reduced-motion both land on their final state immediately.
   The type is still built as reels so the layout is identical either way.
   ═════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  const RING   = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const STRIDE = 7;    // measured off the reference, not chosen
  const STEPS  = 3;    // glyphs passed through before landing back on the target

  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* One glyph of travel is one reel window, and the window is --odo-h rather
     than 1em so a descender is not clipped. The distance therefore has to be
     expressed in that same unit rather than in ems, or the strip lands between
     two glyphs at any window height but 1em. */
  const travel = n =>
    `translate(-50%, calc(var(--odo-h, 1.2em) * ${(-n).toFixed(4)}))`;

  /* ────────────────────────────────────────────────────────────────────────
     A reel for one character.

     Non-alphanumerics have no place on the ring, so they enter it at a stable
     pseudo-random point instead — stable so a re-roll of the same word passes
     through the same glyphs, which a truly random pick would not.
     ──────────────────────────────────────────────────────────────────────── */
  function buildCell(ch, seed) {
    const cell = document.createElement('span');
    cell.className = 'odo-cell';

    /* The reel is as wide as the character it stands in for, and no wider.
       Sizing it to its widest glyph instead is what turns a word into
       "Ti bba Desi gn" — an i would take a 0's width and the spacing comes
       apart. So the real character is set once, invisibly, to hold the box
       open, and the moving strip is laid over the top of it. A wide glyph
       passing through a narrow cell is clipped, symmetrically, for the tenth
       of a second it is in there; that is invisible, and a word whose letters
       are spaced wrong is not. */
    const sizer = document.createElement('span');
    sizer.className = 'odo-size';
    sizer.textContent = ch;
    sizer.setAttribute('aria-hidden', 'true');
    cell.appendChild(sizer);

    let idx = RING.indexOf(ch.toUpperCase());
    const onRing = idx >= 0;
    if (!onRing) idx = (seed * 13 + 5) % RING.length;

    const strip = document.createElement('span');
    strip.className = 'odo-strip';

    /* target, then STEPS glyphs around the ring, then the target again */
    const glyphs = [ch];
    for (let s = 1; s <= STEPS; s++) {
      const g = RING[(idx + s * STRIDE) % RING.length];
      glyphs.push(onRing && ch === ch.toLowerCase() && ch !== ch.toUpperCase()
        ? g.toLowerCase() : g);
    }
    glyphs.push(ch);

    for (const g of glyphs) {
      const s = document.createElement('span');
      s.className = 'odo-glyph';
      s.textContent = g;
      strip.appendChild(s);
    }

    cell.appendChild(strip);
    cell._strip = strip;
    cell._travel = glyphs.length - 1;     // in em, one glyph per em
    return cell;
  }

  /* Split into words so a line can still wrap between them — a flat run of
     inline-block cells breaks mid-word and a headline comes apart. */
  function build(el) {
    if (el._odoBuilt) return el._odoCells;

    const text = (el.dataset.odoText || el.textContent).replace(/\s+/g, ' ').trim();
    el.dataset.odoText = text;
    el.textContent = '';
    el.classList.add('odo');

    const cells = [];
    let seed = 0;
    text.split(' ').forEach((word, w, all) => {
      const wrap = document.createElement('span');
      wrap.className = 'odo-word';
      for (const ch of word) {
        const cell = buildCell(ch, seed++);
        wrap.appendChild(cell);
        cells.push(cell);
      }
      el.appendChild(wrap);
      if (w < all.length - 1) el.appendChild(document.createTextNode(' '));
    });

    el._odoBuilt = true;
    el._odoCells = cells;
    return cells;
  }

  /* ── roll() ─────────────────────────────────────────────────────────────
     dur   how long one character takes to travel its strip
     stag  how far apart consecutive characters start
     delay before the first one moves
     ───────────────────────────────────────────────────────────────────── */
  function roll(el, opts) {
    const o = opts || {};
    const cells = build(el);
    const dur   = o.duration != null ? o.duration : 0.62;
    const stag  = o.stagger  != null ? o.stagger  : 0.026;
    const delay = o.delay    != null ? o.delay    : 0;

    el.classList.add('is-rolled');

    if (REDUCED) {
      cells.forEach(c => { c._strip.style.transform = travel(c._travel); });
      if (o.onComplete) o.onComplete();
      return (cells.length - 1) * stag + dur;
    }

    cells.forEach((c, i) => {
      const s = c._strip;
      s.style.transition = 'none';
      s.style.transform = travel(0);
      void s.offsetHeight;                        // commit the reset
      s.style.transition =
        `transform ${dur}s cubic-bezier(.19,.86,.28,1) ${delay + i * stag}s`;
      s.style.transform = travel(c._travel);
    });

    const total = delay + (cells.length - 1) * stag + dur;
    if (o.onComplete) setTimeout(o.onComplete, total * 1000);
    return total;
  }

  /* ── count() ────────────────────────────────────────────────────────────
     Builds digit reels for a numeric string and runs them from zero to the
     value. Anything that is not a digit — a $, a +, an M, a comma — is set
     as a static character in place, so "$400M" keeps its shape while only
     the 400 actually counts.
     ───────────────────────────────────────────────────────────────────── */
  function count(el, opts) {
    const o = opts || {};
    const text = (el.dataset.odoText || el.textContent).trim();
    el.dataset.odoText = text;

    const digits = [];
    el.textContent = '';
    el.classList.add('odo', 'odo-count');

    /* place value is counted across the digits of this string only, so the
       400 in "$400M" is a three-digit number and not a fragment of one */
    const digitChars = text.replace(/[^0-9]/g, '');
    const value = parseInt(digitChars || '0', 10);
    let seen = 0;

    for (const ch of text) {
      if (ch >= '0' && ch <= '9') {
        const place = Math.pow(10, digitChars.length - 1 - seen);
        seen++;
        const cell = document.createElement('span');
        cell.className = 'odo-cell';
        const strip = document.createElement('span');
        strip.className = 'odo-strip';
        const sizer = document.createElement('span');
        sizer.className = 'odo-size';
        sizer.textContent = '0';
        sizer.setAttribute('aria-hidden', 'true');
        cell.appendChild(sizer);
        for (let d = 0; d <= 10; d++) {        // 0–9 plus a repeat of 0 to wrap
          const s = document.createElement('span');
          s.className = 'odo-glyph';
          s.textContent = String(d % 10);
          strip.appendChild(s);
        }
        cell.appendChild(strip);
        el.appendChild(cell);
        digits.push({ strip, pv: place });
      } else {
        const s = document.createElement('span');
        s.className = 'odo-fixed';
        s.textContent = ch;
        el.appendChild(s);
      }
    }

    const state = { v: 0 };
    function paint() {
      for (const d of digits) {
        const v = state.v / d.pv;
        const f = v - Math.floor(v);
        /* the units wheel turns continuously; every wheel above it holds
           still until the one to its right is about to pass nine */
        const rollAmt = d.pv === 1 ? f : (f < 0.86 ? 0 : (f - 0.86) / 0.14);
        d.strip.style.transform = travel((Math.floor(v) % 10) + rollAmt);
      }
    }
    paint();

    const dur   = (o.duration != null ? o.duration : 1.6) * 1000;
    const delay = (o.delay    != null ? o.delay    : 0)   * 1000;

    if (REDUCED || !value) { state.v = value; paint(); return; }

    let t0 = null;
    function step(now) {
      if (t0 === null) t0 = now;
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);          // out-cubic: quick, then settles
      state.v = value * e;
      paint();
      if (p < 1) requestAnimationFrame(step);
      else { state.v = value; paint(); if (o.onComplete) o.onComplete(); }
    }
    setTimeout(() => requestAnimationFrame(step), delay);
  }

  /* ────────────────────────────────────────────────────────────────────────
     Arming

     [data-odo]        roll the type when it comes into view
     [data-odo-count]  count the number when it comes into view
     data-odo-delay    seconds, added to whichever it is
     data-odo-hover    roll again on hover — for buttons and links

     [data-odo-hold] on an element (or any ancestor) means the observer leaves
     it alone: something else owns its timing. The loader holds the hero that
     way and rolls it itself.
     ──────────────────────────────────────────────────────────────────────── */
  const io = 'IntersectionObserver' in global
    ? new IntersectionObserver((entries, obs) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          obs.unobserve(e.target);
          fire(e.target);
        }
      }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 })
    : null;

  function fire(el) {
    /* switched off for this block, from the tuning panel — it still builds as
       reels so the layout is identical, it simply never rolls */
    if (el.dataset.odoOff === '1') {
      const cells = build(el);
      cells.forEach(c => { c._strip.style.transform = travel(c._travel); });
      return;
    }
    const delay = parseFloat(el.dataset.odoDelay || '0') || 0;
    if (el.hasAttribute('data-odo-count')) count(el, { delay });
    else roll(el, { delay });
  }

  function arm(root) {
    const scope = root || document;
    scope.querySelectorAll('[data-odo], [data-odo-count]').forEach(el => {
      if (el._odoArmed) return;
      if (el.closest('[data-odo-hold]')) { build(el); return; }
      el._odoArmed = true;

      /* build immediately so the element takes its final size before it is
         ever looked at — rolling in cannot be allowed to reflow the page */
      if (!el.hasAttribute('data-odo-count')) build(el);

      if (io) io.observe(el); else fire(el);
    });

    /* hover re-rolls, for buttons and nav links */
    scope.querySelectorAll('[data-odo-hover]').forEach(el => {
      if (el._odoHover) return;
      el._odoHover = true;
      const target = el.matches('[data-odo]') ? el : el.querySelector('[data-odo]');
      if (!target) return;
      build(target);
      el.addEventListener('pointerenter', () => {
        if (target._odoBusy) return;
        target._odoBusy = true;
        const t = roll(target, { duration: .46, stagger: .018 });
        setTimeout(() => { target._odoBusy = false; }, t * 1000);
      });
    });
  }

  global.Odometer = { roll, count, build, arm, RING, STRIDE, REDUCED };

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', () => arm());
  else arm();

})(window);
