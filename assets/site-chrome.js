/* ══════════════════════════════════════════════════════════════════════════
   Nav and footer
   ─────────────────────────────────────────────────────────────────────────
   One definition, rendered into every page. The repo has no build step, so a
   shared partial has to be JavaScript — the same reasoning that made the site
   map assets/manifest.js rather than a template.

   A page opts in by putting an empty <header data-site-nav> and
   <footer data-site-footer> where it wants them. The nav marks the current
   page from <body data-page="...">.

   Styling lives in assets/site.css. This file only produces the markup, so a
   change to how the footer looks does not mean touching a script.
   ═════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  /* Case studies are listed here because three places need the same list in
     the same order: the footer, the "other projects" rail at the foot of a
     case study, and the summits section on the home page. */
  const CASES = [
    { id: 'groww',     name: 'Groww',              file: 'case-groww.html' },
    { id: 'firstpost', name: 'Firstpost',          file: 'case-firstpost.html' },
    { id: 'breathe',   name: 'Breathe ESG',        file: 'case-breathe-esg.html' },
    { id: 'shyft',     name: 'Shyft & Mindhouse',  file: 'case-shyft-mindhouse.html' },
  ];

  const NAV = [
    { label: 'About',    href: 'about.html',            page: 'about' },
    { label: 'Work',     href: 'final-website.html#work' },
    { label: 'Services', href: 'final-website.html#services' },
  ];

  /* The tibba mark: three stacked contour strokes, which is the logo and also
     the whole site's one idea. Inline rather than a file so the nav cannot
     render a beat before its own logo. */
  const MARK = `
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M2 15.5h16" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
      <path d="M5 11.2h10" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
      <path d="M7.6 7h4.8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
      <path d="M10 3.4v.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    </svg>`;

  function navHTML(current) {
    const links = NAV.map(n => {
      const here = current && n.page === current;
      return `<a class="nav-link" href="${n.href}"${here ? ' aria-current="page"' : ''}
                 data-odo-hover><span class="br">[</span>&nbsp;<span
                 data-odo>${n.label}</span>&nbsp;<span class="br">]</span></a>`;
    }).join('');

    return `
      <div class="wrap">
        <a class="nav-mark" href="final-website.html" aria-label="Tibba Design Studio — home">
          ${MARK}<span data-odo>tibba</span>
        </a>
        <nav class="nav-links" aria-label="Primary">${links}</nav>
        <a class="nav-cta" href="mailto:hello@tibba.design" data-odo-hover>
          <span data-odo>Contact us</span>
        </a>
      </div>`;
  }

  function footerHTML() {
    const caseLinks = CASES.map(c =>
      `<li><a href="${c.file}" data-odo-hover><span data-odo>${c.name}</span></a></li>`).join('');

    return `
      <div class="wrap">
        <div class="footer-top">
          <div class="footer-call">
            <h2 data-odo style="--odo-h:1.08em">Let's get to know you and your idea!</h2>
            <a class="footer-send" href="mailto:hello@tibba.design?subject=Project%20enquiry"
               data-odo-hover><span data-odo>Send request</span></a>
            <p class="footer-mail">Drop us a line at
              <a href="mailto:hello@tibba.design">hello@tibba.design</a></p>
          </div>

          <div class="footer-cols">
            <div class="footer-col">
              <h3>Studio</h3>
              <ul>
                <li><a href="final-website.html#services" data-odo-hover><span data-odo>Services</span></a></li>
                <li><a href="final-website.html#testimonials" data-odo-hover><span data-odo>Testimonials</span></a></li>
                <li><a href="about.html" data-odo-hover><span data-odo>About us</span></a></li>
              </ul>
            </div>
            <div class="footer-col">
              <h3>Case studies</h3>
              <ul>${caseLinks}</ul>
            </div>
            <div class="footer-col">
              <h3>Elsewhere</h3>
              <ul>
                <li><a href="https://medium.com/@tibbadesignstudio" rel="noopener" data-odo-hover><span data-odo>Medium</span></a></li>
                <li><a href="https://www.instagram.com/tibba.design/" rel="noopener" data-odo-hover><span data-odo>Instagram</span></a></li>
                <li><a href="https://www.linkedin.com/company/tibba-design-studio/" rel="noopener" data-odo-hover><span data-odo>LinkedIn</span></a></li>
              </ul>
            </div>
          </div>
        </div>

        <div class="footer-base">
          <p class="footer-word">Tibba<br>Design<br>Studio</p>
          <p class="footer-copy">© Tibba Design Studio ${new Date().getFullYear()}</p>
        </div>
      </div>`;
  }

  function mount() {
    const current = document.body.dataset.page || '';

    const header = document.querySelector('[data-site-nav]');
    if (header) {
      header.className = 'site-nav';
      header.innerHTML = navHTML(current);

      /* The nav's only state. Read passively and written only on a change, so
         a scroll does not touch the class list sixty times a second. */
      let scrolled = null;
      const sync = () => {
        const now = window.scrollY > 8;
        if (now !== scrolled) { scrolled = now; header.classList.toggle('is-scrolled', now); }
      };
      addEventListener('scroll', sync, { passive: true });
      sync();
    }

    const foot = document.querySelector('[data-site-footer]');
    if (foot) { foot.className = 'site-footer'; foot.innerHTML = footerHTML(); }

    /* chrome is injected after odometer.js has already armed the document, so
       it arms its own */
    if (global.Odometer) global.Odometer.arm(document);
  }

  global.SiteChrome = { mount, CASES, NAV };

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', mount);
  else mount();

})(window);
