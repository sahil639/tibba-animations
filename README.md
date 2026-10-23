# Tibba Design Studio — Website v3 (staging)

This branch is **only** Website v3: a frozen build of it and the pages it
links to (About, the case studies), with `index.html` as the home page.
The design playground — the index, every other design, the archive — lives on
`main` and its own domain, untouched by this branch.

To refresh it from `main`: on `main` run `node tools/make-sandbox.mjs`, then
replace this branch's files with the contents of `sandbox/` (keep this README
and `vercel.json`), commit and push.
