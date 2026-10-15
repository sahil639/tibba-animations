/* ══════════════════════════════════════════════════════════════════════════
   The sandbox — a frozen copy of Website v3
   ─────────────────────────────────────────────────────────────────────────
   Copies website-v3.html and every page it can reach into sandbox/, with
   the whole assets/ folder beside them, so the sandbox renders exactly what
   v3 renders today and keeps rendering it while the playground pages go on
   changing. sandbox/index.html is v3 itself, so /sandbox opens on it.

   The playground chrome is switched off inside it: no site menu, no dock,
   no New tags — it is the site, for review and testing.

       node tools/make-sandbox.mjs        (re-run to refresh the snapshot)
   ═════════════════════════════════════════════════════════════════════════ */
import { readFile, writeFile, mkdir, rm, cp, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'sandbox');

/* where v3 starts, and the registry it reads its sections from */
const sections = await import(join(ROOT, 'assets/site-sections.js'));
/* what v3 actually shows: each section's own page (the first variant) and
   its phone page; and the About page it links to, with its sections and
   the one footer the site uses */
const first = s => s.variants[0].file.split('?')[0];
const seeds = new Set(['website-v3.html', 'about.html']);
for (const s of sections.V3_SECTIONS) { seeds.add(first(s)); if (s.mobile) seeds.add(s.mobile.file.split('?')[0]); }
for (const s of sections.ABOUT_SECTIONS) if (s.id !== 'footer') seeds.add(first(s));
/* never follow a link out into another version of the site, or the playground */
const SKIP = /^(index|final-website(-v2)?|modular-website|website-v[124]|footer(?!-dusk-grid)[\w-]*)\.html$/;

/* follow every page reference inside the pages (not the manifest: that
   lists the whole playground) */
const pages = new Set();
const queue = [...seeds];
while (queue.length) {
  const f = queue.shift();
  if (pages.has(f) || !existsSync(join(ROOT, f))) continue;
  pages.add(f);
  const src = await readFile(join(ROOT, f), 'utf8');
  for (const m of src.matchAll(/['"(=]([\w.-]+\.html)(?=[?#'")\s])/g)) {
    const g = m[1];
    if (SKIP.test(g) || pages.has(g)) continue;
    queue.push(g);
  }
}
/* pages linked from the shared scripts v3 uses (case studies, the bags) */
for (const js of ['assets/site-chrome.js', 'assets/work.js', 'assets/cases.js', 'assets/summits-data.js', 'assets/case-v2.js']) {
  if (!existsSync(join(ROOT, js))) continue;
  const src = await readFile(join(ROOT, js), 'utf8');
  for (const m of src.matchAll(/['"]([\w.-]+\.html)/g)) if (existsSync(join(ROOT, m[1])) && !SKIP.test(m[1])) pages.add(m[1]);
}

/* the chrome off: one stylesheet appended after every page's own */
const OFF = `<style data-sandbox>#wb-nav, #wb-dock, .wb-new, .wb-new-dot { display: none !important; }
html[data-wb-dock] body { padding-right: 0 !important; }</style>`;
const STAMP = `<!-- sandbox: a frozen copy of Website v3, made ${new Date().toISOString()} by tools/make-sandbox.mjs -->`;

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
await cp(join(ROOT, 'assets'), join(OUT, 'assets'), { recursive: true });
for (const f of pages) {
  let html = await readFile(join(ROOT, f), 'utf8');
  html = html.replace('</head>', OFF + '\n</head>').replace(/<html[^>]*>/, m => m + '\n' + STAMP);
  await writeFile(join(OUT, f), html);
}
await writeFile(join(OUT, 'index.html'), await readFile(join(OUT, 'website-v3.html'), 'utf8'));
console.log(`sandbox: ${pages.size} pages + assets → sandbox/`);
console.log([...pages].sort().join('\n'));
