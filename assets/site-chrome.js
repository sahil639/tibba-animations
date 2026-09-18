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
    /* The work is the summits section now — the card grid that used to sit
       under it has gone, and the walk through the four peaks is what the link
       should land on. */
    { label: 'Work',     href: 'final-website.html#range' },
    { label: 'Services', href: 'final-website.html#services' },
  ];

  /* The studio's mark and wordmark, from assets/brand/tibba-black.svg.

     Inlined rather than an <img>, for two reasons. The nav is the first thing
     painted and an external logo arrives a frame or two after the words beside
     it, which reads as the header assembling itself. And the file ships in two
     colourways — black and white — where the only difference is the fill; as
     `currentColor` one copy serves both, and the plate it sits on decides.

     The viewBox is cropped to the ink. The export's own box is 104 × 37, but
     the artwork inside it runs x 8 → 95.3 and y 8 → 28 — the rest is padding
     from whatever it was exported out of. Left alone, a height set in CSS
     would be sizing that padding rather than the logo, and the mark would sit
     low in its plate. Cropped, the height in CSS is the height of the mark. */
  const MARK = `
    <svg viewBox="8 8 87.3 20" fill="none" xmlns="http://www.w3.org/2000/svg"
         role="img" aria-label="Tibba">
      <path fill-rule="evenodd" clip-rule="evenodd" d="M39.0383 28H8L28.2219 8L39.0383 28ZM15.0685 24.6037L26.2673 20.151L34.3324 24.5768L27.5681 12.0807L15.0685 24.6037Z" fill="currentColor"/>
      <path d="M52.1765 19.1546H49.2938V23.8402C49.2938 24.2745 49.2938 25.2116 50.7123 25.2116C51.1699 25.2116 51.6732 25.1201 52.1765 24.9601L52.1536 27.6343C51.4215 27.8858 50.6894 28 49.8887 28C47.761 28 45.8621 27.0401 45.8621 24.1602V19.1546H44.0547V16.4804H45.8621V14.8119L49.2938 12.2749V16.4804H52.1765V19.1546Z" fill="currentColor"/>
      <path d="M54.0722 14.9262V11.8177H57.5955V14.9262H54.0722ZM54.0951 27.7486V16.4804H57.5497V27.7486H54.0951Z" fill="currentColor"/>
      <path d="M66.6026 16.229C69.0735 16.229 71.1326 18.3318 71.1326 22.1031C71.1326 25.4858 69.4624 28 66.534 28C65.5502 28 64.3605 27.7029 63.5827 26.9029V27.7486H60.128V11.8177H63.5827V17.3718C64.269 16.6861 65.4358 16.229 66.6026 16.229ZM65.6189 24.7773C67.0831 24.7773 67.7008 23.9316 67.7008 22.1488C67.7008 20.3889 67.1288 19.3832 65.5731 19.3832C63.7886 19.3832 63.2624 20.7546 63.2624 22.1488C63.2624 23.5888 63.8572 24.7773 65.6189 24.7773Z" fill="currentColor"/>
      <path d="M79.3377 16.229C81.8086 16.229 83.8676 18.3318 83.8676 22.1031C83.8676 25.4858 82.1975 28 79.269 28C78.2853 28 77.0956 27.7029 76.3177 26.9029V27.7486H72.8631V11.8177H76.3177V17.3718C77.0041 16.6861 78.1709 16.229 79.3377 16.229ZM78.3539 24.7773C79.8181 24.7773 80.4359 23.9316 80.4359 22.1488C80.4359 20.3889 79.8639 19.3832 78.3082 19.3832C76.5236 19.3832 75.9974 20.7546 75.9974 22.1488C75.9974 23.5888 76.5923 24.7773 78.3539 24.7773Z" fill="currentColor"/>
      <path d="M90.1738 16.229C93.3768 16.229 95.2986 17.9204 95.2986 20.5946V27.7486H92.1414L91.9126 26.6287C90.9975 27.84 89.7849 28 88.9613 28C86.4218 28 84.5915 26.4229 84.5915 24.1145C84.5915 22.8116 85.1863 21.8745 86.1472 21.3488C86.8565 20.9603 87.7487 20.7774 88.7554 20.7774H91.8668V20.5946C91.8668 19.7946 91.1805 19.2232 89.9222 19.2232C89.0757 19.2232 88.2063 19.4746 87.1996 20.4346L84.7059 18.3547C86.1244 16.869 88.2063 16.229 90.1738 16.229ZM89.5104 25.2344C90.7458 25.2344 91.7982 24.4344 91.8668 23.3145H89.2587C88.8926 23.3145 88.5952 23.3831 88.3893 23.5202C88.1605 23.6802 88.0461 23.9088 88.0461 24.183C88.0461 24.7544 88.5266 25.2344 89.5104 25.2344Z" fill="currentColor"/>
    </svg>`;

  /* Two plates, not a bar.

     The header does not paint a background across the page: a white strip the
     full width of a 1600px layout is a band of furniture over the top of the
     animation, and the animation is the site. What is painted is the shape of
     the content itself — one plate holding the mark and the links, another
     holding the call to action — so the header reads as two objects resting on
     the scene rather than a shelf built across it. */
  function navHTML(current) {
    const links = NAV.map(n => {
      const here = current && n.page === current;
      return `<a class="nav-link" href="${n.href}"${here ? ' aria-current="page"' : ''}
                 data-odo-hover><span class="br">[</span>&nbsp;<span
                 data-odo>${n.label}</span>&nbsp;<span class="br">]</span></a>`;
    }).join('');

    return `
      <div class="wrap">
        <div class="nav-plate">
          <a class="nav-mark" href="final-website.html"
             aria-label="Tibba Design Studio — home">${MARK}</a>
          <nav class="nav-links" aria-label="Primary">${links}</nav>
        </div>
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

  /* The two bars down the sides of the page. Injected rather than written into
     every file for the same reason the nav and footer are: one definition. */
  function mountEdges() {
    if (document.querySelector('.page-edge')) return;
    for (const side of ['left', 'right']) {
      const el = document.createElement('div');
      el.className = 'page-edge is-' + side;
      el.setAttribute('aria-hidden', 'true');
      document.body.appendChild(el);
    }
  }

  function mount() {
    const current = document.body.dataset.page || '';
    mountEdges();

    const header = document.querySelector('[data-site-nav]');
    if (header) {
      header.className = 'site-nav';
      header.innerHTML = navHTML(current);

      /* No scrolled state. The plates are opaque on the first frame and on the
         last, so there is nothing for a scroll listener to switch. */
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
