/* ══════════════════════════════════════════════════════════════════════════
   The site footer, for phones — one component, every page
   ─────────────────────────────────────────────────────────────────────────
   Home (website-v3-mobile), About (about-mobile) and the four case studies
   all mount this on a phone, so they show the same footer: the form, the
   email, the logo with the still flame, Pages and Social, the copyright.
   (Desktop pages keep their framed footer-dusk-grid.html.)

     <footer id="footer" data-site-footer></footer>
     <link rel="stylesheet" href="assets/site-footer.css">
     import { mountSiteFooter } from './assets/site-footer.js';
     mountSiteFooter(document.getElementById('footer'));

   Light on purpose: plain markup in the page — no frame, no canvas, no
   resize or scroll listeners, nothing running while the page scrolls. The
   only script is the form's thank-you and the Pages links.
   ═════════════════════════════════════════════════════════════════════════ */
const HOME = 'website-v3-mobile.html';
const LOGO = `<svg class="sf-logo" viewBox="8 8 96 21" aria-hidden="true"> <path fill-rule="evenodd" clip-rule="evenodd" d="M39.0383 28H8L28.2219 8L39.0383 28ZM15.0685 24.6037L26.2673 20.151L34.3324 24.5768L27.5681 12.0807L15.0685 24.6037Z" fill="currentColor"/> <path d="M52.1765 19.1546H49.2938V23.8402C49.2938 24.2745 49.2938 25.2116 50.7123 25.2116C51.1699 25.2116 51.6732 25.1201 52.1765 24.9601L52.1536 27.6343C51.4215 27.8858 50.6894 28 49.8887 28C47.761 28 45.8621 27.0401 45.8621 24.1602V19.1546H44.0547V16.4804H45.8621V14.8119L49.2938 12.2749V16.4804H52.1765V19.1546Z" fill="currentColor"/> <path d="M54.0722 14.9262V11.8177H57.5955V14.9262H54.0722ZM54.0951 27.7486V16.4804H57.5497V27.7486H54.0951Z" fill="currentColor"/> <path d="M66.6026 16.229C69.0735 16.229 71.1326 18.3318 71.1326 22.1031C71.1326 25.4858 69.4624 28 66.534 28C65.5502 28 64.3605 27.7029 63.5827 26.9029V27.7486H60.128V11.8177H63.5827V17.3718C64.269 16.6861 65.4358 16.229 66.6026 16.229ZM65.6189 24.7773C67.0831 24.7773 67.7008 23.9316 67.7008 22.1488C67.7008 20.3889 67.1288 19.3832 65.5731 19.3832C63.7886 19.3832 63.2624 20.7546 63.2624 22.1488C63.2624 23.5888 63.8572 24.7773 65.6189 24.7773Z" fill="currentColor"/> <path d="M79.3377 16.229C81.8086 16.229 83.8676 18.3318 83.8676 22.1031C83.8676 25.4858 82.1975 28 79.269 28C78.2853 28 77.0956 27.7029 76.3177 26.9029V27.7486H72.8631V11.8177H76.3177V17.3718C77.0041 16.6861 78.1709 16.229 79.3377 16.229ZM78.3539 24.7773C79.8181 24.7773 80.4359 23.9316 80.4359 22.1488C80.4359 20.3889 79.8639 19.3832 78.3082 19.3832C76.5236 19.3832 75.9974 20.7546 75.9974 22.1488C75.9974 23.5888 76.5923 24.7773 78.3539 24.7773Z" fill="currentColor"/> <path d="M90.1738 16.229C93.3768 16.229 95.2986 17.9204 95.2986 20.5946V27.7486H92.1414L91.9126 26.6287C90.9975 27.84 89.7849 28 88.9613 28C86.4218 28 84.5915 26.4229 84.5915 24.1145C84.5915 22.8116 85.1863 21.8745 86.1472 21.3488C86.8565 20.9603 87.7487 20.7774 88.7554 20.7774H91.8668V20.5946C91.8668 19.7946 91.1805 19.2232 89.9222 19.2232C89.0757 19.2232 88.2063 19.4746 87.1996 20.4346L84.7059 18.3547C86.1244 16.869 88.2063 16.229 90.1738 16.229ZM89.5104 25.2344C90.7458 25.2344 91.7982 24.4344 91.8668 23.3145H89.2587C88.8926 23.3145 88.5952 23.3831 88.3893 23.5202C88.1605 23.6802 88.0461 23.9088 88.0461 24.183C88.0461 24.7544 88.5266 25.2344 89.5104 25.2344Z" fill="currentColor"/> </svg>`;
const MAIL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="5" width="19" height="14" rx="1.5"/><path d="m3 6 9 7 9-7"/></svg>';
const ARROW = '<svg viewBox="0 0 18 18" aria-hidden="true"><path d="M2 9h13M10 4l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
const PAGES = [['Home', HOME, 'top'], ['Work', HOME + '#work', 'work'], ['Services', HOME + '#services', 'services'],
  ['About', 'about.html'], ['Case studies', HOME + '#more', 'more'], ['Studio', HOME + '#studio', 'studio']];
const SOCIAL = [['Instagram', 'https://www.instagram.com/tibba.design/'], ['LinkedIn', 'https://www.linkedin.com/company/tibba-design-studio/'],
  ['Medium', 'https://medium.com/@tibbadesignstudio'], ['Email', 'mailto:hello@tibba.design']];
export const CASES = [
  ['Groww', 'case-groww-figma.html', 'Boosting engagement on the app'],
  ['Firstpost', 'case-firstpost-figma.html', '2x traffic through a strategic redesign'],
  ['Breathe ESG', 'case-breathe-esg-figma.html', 'Faster sales, smoother releases'],
];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function mountSiteFooter(host) {
  if (!host || host.dataset.mounted) return;
  host.dataset.mounted = '1';
  host.classList.add('sf');
  host.setAttribute('aria-label', 'Footer');
  host.innerHTML = `
  <section class="sf-talk" aria-labelledby="sf-talk-h">
    <h2 id="sf-talk-h">Let’s get to know<br>you and your idea!</h2>
    <form class="sf-form" novalidate>
      <label class="sf-fld"><input type="text" name="name" placeholder="Your name" aria-label="Your name" autocomplete="name" required></label>
      <label class="sf-fld"><input type="email" name="email" placeholder="Email" aria-label="Email" autocomplete="email" required></label>
      <label class="sf-fld"><textarea name="idea" maxlength="500" placeholder="Tell us about your project" aria-label="Tell us about your project"></textarea></label>
      <a class="sf-mail" href="mailto:hello@tibba.design">${MAIL}hello@tibba.design</a>
      <button type="submit" class="sf-btn">Submit form${ARROW}</button>
    </form>
    <div class="sf-done" role="status" aria-live="polite" tabindex="-1"></div>
  </section>
  <section class="sf-word" aria-label="Tibba">
    ${LOGO}
    <p>Tibba Design Studio<br>India, and remote</p>
    <img class="sf-flame" src="assets/icons/campfire-still-92.webp" width="46" height="55" alt="" loading="lazy" decoding="async">
  </section>
  <nav class="sf-col" aria-label="Pages"><p class="sf-k">Pages</p>
    <ul>${PAGES.map(([n, h, s]) => `<li><a href="${h}"${s ? ` data-sec="${s}"` : ''}>${n}</a></li>`).join('')}</ul></nav>
  <nav class="sf-col" aria-label="Social"><p class="sf-k">Social</p>
    <ul>${SOCIAL.map(([n, h]) => `<li><a href="${h}"${h.startsWith('http') ? ' rel="noopener"' : ''}>${n}</a></li>`).join('')}</ul></nav>
  <p class="sf-legal">© ${new Date().getFullYear()} Tibba Design Studio. All rights reserved.</p>`;

  /* Pages: on the home page itself, travel to the section in place */
  host.addEventListener('click', e => {
    const a = e.target.closest('a[data-sec]'); if (!a) return;
    const onHome = /website-v3(-mobile)?\.html$|\/$/.test(location.pathname);
    if (!onHome) return;
    const id = a.dataset.sec, el = id === 'top' ? null : document.getElementById(id);
    if (id !== 'top' && !el) return;
    e.preventDefault();
    const smooth = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    if (!el) scrollTo({ top: 0, behavior: smooth });
    else scrollTo({ top: el.getBoundingClientRect().top + scrollY - 64, behavior: smooth });
  });

  /* the form: no back end yet, so it answers in place */
  const talk = host.querySelector('.sf-talk'), form = host.querySelector('.sf-form'), done = host.querySelector('.sf-done');
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const d = new FormData(form), first = String(d.get('name') || '').trim().split(/\s+/)[0], mail = String(d.get('email') || '').trim();
    done.innerHTML = `
      <span class="sf-tick" aria-hidden="true"><svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="22"/><path d="M14 24.5l7 7 13-14"/></svg></span>
      <h2>Thanks${first ? ', ' + esc(first) : ''}.<br>Your idea is with us.</h2>
      <ol class="sf-next">
        <li><b>Now</b><span>Your message is in our inbox${mail ? ', with <i>' + esc(mail) + '</i> to reply to' : ''}.</span></li>
        <li><b>Within 2 working days</b><span>We read it and write back.</span></li>
        <li><b>Then</b><span>A call to talk through your idea and where you want to take it.</span></li>
      </ol>
      <p class="sf-k sf-wait">While you wait, see how we have helped others reach their next peak</p>
      <ul class="sf-cases">${CASES.map(([n, h, l]) => `<li><a href="${h}"><b>${esc(n)}</b><span>${esc(l)}</span><i aria-hidden="true">→</i></a></li>`).join('')}</ul>
      <button type="button" class="sf-again">Send another message</button>`;
    talk.classList.add('is-sent');
    form.reset();
    done.focus({ preventScroll: true });
    const r = talk.getBoundingClientRect();
    if (r.top < 0) scrollTo({ top: r.top + scrollY - 72, behavior: 'smooth' });
  });
  done.addEventListener('click', e => {
    if (!e.target.closest('.sf-again')) return;
    talk.classList.remove('is-sent');
    form.querySelector('input').focus();
  });
}
