# Archive

Earlier versions of the website, kept for reference and never deployed
(`.vercelignore` uploads only `v5.1/`).

| File | What it was |
| --- | --- |
| `final-website.html` | Website v1 |
| `final-website-v2.html` | Website v2 |

Each opens from the dev server (`node dev-server.mjs`, then
`/archive/final-website.html`); a `<base href="../">` in its head keeps its
`assets/` links working from this folder.

Website v5.1 (`v5.1/`) is the one live version. It is built from Website v3's
working files at the repo root with `node tools/make-sandbox.mjs`, then copied
into `v5.1/`.
