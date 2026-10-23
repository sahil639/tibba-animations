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
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8794;

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.otf': 'font/otf', '.woff2': 'font/woff2', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.zip': 'application/zip',
  '.webp': 'image/webp', '.wasm': 'application/wasm', '.riv': 'application/octet-stream',
  '.mp4': 'video/mp4', '.webm': 'video/webm',
};

createServer(async (req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);

  /* local tools only: POST /__save/<name>.png writes into tools/out/ (the
     frame-by-frame renders, e.g. tools/render-hero.html). One flat folder,
     plain file names — nothing else on disk can be reached. */
  if (req.method === 'POST' && url.startsWith('/__save/')) {
    const name = url.slice(8);
    if (!/^[\w.-]+\.(png|jpg|json)$/.test(name)) { res.writeHead(400); return res.end('bad name'); }
    const chunks = []; for await (const c of req) chunks.push(c);
    await mkdir(join(ROOT, 'tools/out'), { recursive: true });
    await writeFile(join(ROOT, 'tools/out', name), Buffer.concat(chunks));
    res.writeHead(200); return res.end('ok');
  }

  /* a folder serves its index.html, as on Vercel (the sandbox lives in one) */
  let p = url.endsWith('/') ? url + 'index.html' : url;
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
