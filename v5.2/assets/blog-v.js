/* Blog layout explorations: the site navbar, the version switcher and the
   site footer, shared by blog-v1 … blog-v8 (see assets/blog-v.css).
   A page sets <body data-v="3"> and has <header id="ca-header">,
   <div id="bv-switch">, and <div id="bv-foot"> where the footer goes. */
import { mountSiteNav } from './site-nav.js?v=13';

export const VERSIONS = [
  ['1', 'Fold', 'blog-v1-fold.html'],
  ['2', 'Paper', 'blog-v2-paper.html'],
  ['3', 'Wojtek', 'blog-v3-wojtek.html'],
  ['4', 'New Industrials', 'blog-v4-new-industrials.html'],
  ['5', 'Framer', 'blog-v5-framer.html'],
  ['6', 'Modash', 'blog-v6-modash.html'],
  ['7', 'ChainGPT', 'blog-v7-chaingpt.html'],
  ['8', 'Stripe Dev', 'blog-v8-stripe-dev.html'],
];

const v = document.body.dataset.v;
const sw = document.getElementById('bv-switch');
if (sw) {
  sw.className = 'bv-switch';
  sw.setAttribute('aria-label', 'Layout versions');
  sw.innerHTML = '<span>Blog layouts</span><a href="blog-versions.html">All</a>' + VERSIONS.map(([n, name, href]) =>
    `<a href="${href}"${n === v ? ' aria-current="page"' : ''}>V${n} ${name}</a>`).join('');
}

const foot = document.getElementById('bv-foot');
if (foot) {
  const anchor = document.createElement('div'); anchor.id = 'contact'; foot.before(anchor);
  if (matchMedia('(max-width: 760px)').matches) {
    const f = document.createElement('footer'); f.id = 'footer'; f.setAttribute('data-site-footer', ''); foot.replaceWith(f);
    document.head.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="assets/site-footer.css?v=11">');
    import('./site-footer.js?v=7').then(m => m.mountSiteFooter(f));
  } else {
    const f = document.createElement('iframe'); f.id = 'footer'; f.className = 'bv-foot-frame'; f.title = 'Contact'; f.loading = 'lazy';
    f.src = 'footer-dusk-grid.html?embed=1&v=4'; foot.replaceWith(f);
  }
}

mountSiteNav(document.getElementById('ca-header'));

/* small shared helpers pages may opt into */
// copy-link buttons: [data-copy]
document.addEventListener('click', e => {
  const b = e.target.closest('[data-copy]'); if (!b) return;
  e.preventDefault();
  navigator.clipboard?.writeText(location.href).then(() => { const t = b.dataset.copyLabel || b.textContent; b.dataset.copyLabel = t; b.textContent = 'Copied'; setTimeout(() => b.textContent = t, 1400); });
});
// videos play only while on screen
const io = new IntersectionObserver(es => es.forEach(en => { const vd = en.target; en.isIntersecting ? vd.play().catch(() => {}) : vd.pause(); }), { threshold: .25 });
document.querySelectorAll('video[data-autoplay]').forEach(vd => io.observe(vd));
