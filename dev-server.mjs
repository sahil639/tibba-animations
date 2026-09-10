/* ══════════════════════════════════════════════════════════════════════════
   The local server
   ─────────────────────────────────────────────────────────────────────────
   Static files, plus the one endpoint the workbench needs: POST /api/notes
   appends a comment to notes.js. That is what makes the comments a repo
   artefact rather than something living in one person's browser — a note is
   written to a tracked file, and the dev commits it with the change it is
   about, so the next person to pull sees it.

   Committed on purpose, unlike .claude/serve.mjs: a collaborator cloning this
   needs the same endpoint or their notes stay stuck in localStorage.

       node dev-server.mjs            → http://localhost:8794
       PORT=3000 node dev-server.mjs
   ═════════════════════════════════════════════════════════════════════════ */
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const NOTES = join(ROOT, 'notes.js');
const PORT = process.env.PORT || 8794;

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.otf': 'font/otf', '.woff2': 'font/woff2', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.zip': 'application/zip',
};

/* notes.js is a script, not JSON, so it can be read with a <script> tag over
   file:// as well as over http. Reading it back means pulling the array
   literal out again — the file is only ever written by the code below, so the
   shape is known. */
async function readNotes() {
  try {
    const src = await readFile(NOTES, 'utf8');
    const i = src.indexOf('=');
    const j = src.lastIndexOf(';');
    if (i < 0 || j < i) return [];
    const parsed = JSON.parse(src.slice(i + 1, j).trim());
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

async function writeNotes(list) {
  const text =
    '/* Comments left in the workbench dock. Written by the dev server when a\n' +
    '   note is saved; commit it with the change the note is about. */\n' +
    'window.TIBBA_NOTES = ' + JSON.stringify(list, null, 2) + ';\n';
  await writeFile(NOTES, text);
}

function body(req) {
  return new Promise((resolve, reject) => {
    let b = '';
    req.on('data', c => {
      b += c;
      if (b.length > 1e6) { reject(new Error('too big')); req.destroy(); }
    });
    req.on('end', () => resolve(b));
    req.on('error', reject);
  });
}

createServer(async (req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);

  if (url === '/api/notes') {
    try {
      if (req.method === 'GET') {
        const notes = await readNotes();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ notes }));
      }
      if (req.method === 'POST') {
        const note = JSON.parse(await body(req));
        if (!note || typeof note.text !== 'string' || !note.text.trim()) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'a note needs text' }));
        }
        const notes = await readNotes();
        /* saving the same note twice — a retry, a double submit — must not
           put it in the file twice */
        if (!notes.some(n => n.id === note.id)) notes.push(note);
        await writeNotes(notes);
        console.log(`note from ${note.author || 'anon'} on ${note.page} → notes.js`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ notes }));
      }
      res.writeHead(405); return res.end();
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: String(err && err.message || err) }));
    }
  }

  let p = url === '/' ? '/index.html' : url;
  let file = join(ROOT, normalize(p).replace(/^(\.\.[/\\])+/, ''));
  let buf;
  try { buf = await readFile(file); }
  catch {
    /* cleanUrls in production, so /topo-hero has to resolve here too */
    try { buf = await readFile(file + '.html'); file += '.html'; }
    catch { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('404'); }
  }
  res.writeHead(200, {
    'Content-Type': TYPES[extname(file)] || 'application/octet-stream',
    'Cache-Control': 'no-cache',
  });
  res.end(buf);
}).listen(PORT, () => console.log(`tibba — serving ${ROOT} on http://localhost:${PORT}`));
