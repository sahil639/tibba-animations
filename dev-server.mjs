/* ══════════════════════════════════════════════════════════════════════════
   The local server
   ─────────────────────────────────────────────────────────────────────────
   Static files, served the way Vercel serves them: cleanUrls, so /topo-hero
   resolves to topo-hero.html, and no caching, so an edit shows on reload.
   (It used to take comments too, at /api/notes; the comments feature is
   gone, and with it the one thing this server did that a static host
   could not.)

       node dev-server.mjs            → http://localhost:8794
       PORT=3000 node dev-server.mjs
   ═════════════════════════════════════════════════════════════════════════ */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8794;

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.otf': 'font/otf', '.woff2': 'font/woff2', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.zip': 'application/zip',
};

createServer(async (req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);

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
