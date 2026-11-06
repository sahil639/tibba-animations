/* ══════════════════════════════════════════════════════════════════════════
   Services
   ─────────────────────────────────────────────────────────────────────────
   The content of the Framer component, lifted out of it. What came across is
   the data — three company stages, the outcome each is chasing, and the
   services that get it there, each with the three things it actually
   delivers. What did not come across is the component: no React, no
   framer-motion, no inline style objects, no property controls. This repo has
   no build step, so a .tsx file is not something it can run, and the pieces
   that file brought with it all have plain equivalents here — its
   AnimatePresence cross-fade is a class and a transition, its Font controls
   are the type scale in assets/site.css, its accentColor is --accent.

   Rendered by assets/services.js into whichever element asks for it, so the
   section on the home page and the slide-over panel share one implementation
   rather than two that drift.
   ═════════════════════════════════════════════════════════════════════════ */
window.TIBBA_SERVICES = [
  {
    id: 'early', n: 'N001', label: 'Early stage startup',
    blurb: 'Design an MVP, secure funding, achieve market validation, and achieve product–market fit.',
    services: [
      { name: 'User research', points: [
        'Generate an understanding of your market including competitors and customers',
        'Gather insights with surveys, interviews and market analysis',
        'Attain a deep understanding of your market to guide product development'] },
      { name: 'Marketing and growth design', points: [
        'Market your business and grow your audience by using product design and research',
        'Optimize and test landing pages to improve conversions and lead generation',
        'Improve customer metrics and scale marketing with confidence'] },
      { name: 'Usability testing', points: [
        'Identify usability issues that are costing you business and creating customer churn',
        'Gather real user feedback through tests and heuristic analysis',
        'Improve conversion rates on your product and reduce user frustration'] },
      { name: 'Design systems and style guides', points: [
        'Create a standardized UI framework to ensure efficiency and uniformity in future development',
        'Implement a design system with standardized reusable components',
        'Iterate and ship features faster with consistent UI quality'] },
      { name: 'Product strategy consulting', points: [
        'Identify business opportunities that can be unlocked via your product',
        'Conduct research to gain insight into your market and audience',
        'Get a clear product roadmap and strategic direction that aligns with business goals'] },
      { name: 'User interface (UI) design', points: [
        'Design easy to use interfaces that help enhance brand identity and boost recognition',
        'Craft detailed and visually appealing interfaces that scale seamlessly across devices and screen sizes',
        'Improved user satisfaction resulting in higher retention rates and an edge over competitors'] },
      { name: 'User experience (UX) design', points: [
        'Improve customer experience to boost retention and conversion rates',
        'Optimize navigation, resolve usability issues and design interactive elements to enhance user satisfaction',
        'Increase customer loyalty and improve key metrics across the customer journey'] },
      { name: 'Product design and prototyping', points: [
        'Create interactive prototypes to help visualise product ideas',
        'Develop basic structural layouts to outline key features and user flows',
        'Test and share ideas quickly and cost-effectively with customers and stakeholders'] },
      { name: 'Development support and handoff', points: [
        'Provide design support to your development teams to ensure accurate implementation',
        'Get ongoing support to address design related issues that arise during development and post launch',
        'Deliver high quality experiences to your customers'] },
      { name: 'Optimization and iteration', points: [
        'Set up tools and processes to collect and analyze user behaviour and product performance',
        'Improve product based on data and user feedback',
        'Innovate to jumpstart user growth and engagement'] },
    ],
  },
  {
    id: 'mid', n: 'N002', label: 'Mid stage startup',
    blurb: 'Scale operations, increase revenue, achieve market validation, and drive growth and conversions.',
    services: [
      { name: 'Marketing and growth design', points: [
        'Market your business and grow your audience by using product design and research',
        'Optimize and test landing pages to improve conversions and lead generation',
        'Improve customer metrics and scale marketing with confidence'] },
      { name: 'User interface (UI) design', points: [
        'Ensure consistency across products, speed up design and development and optimize your product',
        'Develop a cohesive design system, iteratively improve design elements and optimise the interface for different screen sizes',
        'Ensure seamless UX as your product grows, maintain design consistency, and stay ahead of the competition'] },
      { name: 'User experience (UX) design', points: [
        'Identify and resolve usability issues to increase user engagement and satisfaction',
        'Test for product usability with diverse groups to make UX improvements based on feedback',
        'Enhancing user retention and satisfaction by reducing friction in the user journey'] },
      { name: 'Product design and prototyping', points: [
        'Validate concepts with prototypes, aid the addition of new features and business avenues',
        'Develop interactive prototypes, create modular design systems and strategically design for new products or major features',
        'Expand product features and capabilities while balancing innovation with user needs'] },
      { name: 'Development support and handoff', points: [
        'Provide design support to your development teams to ensure accurate implementation',
        'Get ongoing support to address design related issues that arise during development and post launch',
        'Deliver high quality experiences to your customers'] },
      { name: 'Optimization and iteration', points: [
        'Ensure the product evolves by aligning design enhancements with actual user needs',
        'Gather user feedback and data to regularly iterate based on analysis',
        'Preventing product stagnation and ensure sustained growth by keeping up with user feedback and market trends'] },
      { name: 'Market research and user analysis', points: [
        'Uncover deeper insights into evolving customer needs and preferences',
        'Update customer profiles and analyze different market segments with high potential for growth',
        'Identify new market opportunities for expansion and refine product-market fit'] },
    ],
  },
  {
    id: 'established', n: 'N003', label: 'Established company',
    blurb: 'Maintain market share, future-proof existing offerings, and innovate and launch new offerings.',
    services: [
      { name: 'User interface (UI) design', points: [
        'Ensure consistency across applications and ensure your UI stays modern and competitive',
        'Establish a robust UI framework, perform accessibility audits, and update designs to reflect current trends',
        'Maintain high UI standards, ensure inclusivity, and keep your UI fresh and engaging'] },
      { name: 'User experience (UX) design', points: [
        'Provide users with seamless experiences to ensure the product evolves with user expectations and industry trends',
        'Design cohesive experiences based on identified user needs to enhance user loyalty and retention',
        'Ensuring a seamless experience across products and integrating new user insights continuously'] },
      { name: 'Product design and prototyping', points: [
        'Foster innovation within the company while keeping the products at the forefront of technological advancements',
        'Conduct design workshops to ideate and prototype new product concepts and developing scalable design frameworks',
        'Innovate while maintaining existing products and integrating new technologies'] },
      { name: 'Development support and handoff', points: [
        'Ensuring accurate and efficient implementation by enhancing communication and alignment throughout the development process',
        'Provide detailed design documentation along with assets and have regular syncs with the developers',
        'Coordinate large, multi-disciplinary teams while ensuring design intent is maintained'] },
      { name: 'Optimization and iteration', points: [
        'Increase the effectiveness of user acquisition and sales funnels',
        'Optimise product performance by conducting detailed analysis and testing to improve conversion rates and user retention',
        'Maximizing product efficiency and performance, and reducing operation cost while maintaining high quality'] },
      { name: 'Market research and user analysis', points: [
        'Identify opportunities and challenges for market expansion',
        'Analyze data and map customer journeys across multiple touchpoints',
        'Explore new markets and customer segments via innovation'] },
    ],
  },
];

/* ──────────────────────────────────────────────────────────────────────────
   Render one instance into a host element.

   Two things use this — the section on the home page and the slide-over panel
   — so it takes its host rather than reaching for an id. Returns nothing: the
   host owns the markup afterwards, and the only state is which stage is
   selected, which lives on the element as a data attribute so a second
   instance cannot see it.
   ────────────────────────────────────────────────────────────────────────── */
window.mountServices = function mountServices(host) {
  const S = window.TIBBA_SERVICES;
  host.classList.add('svc');
  host.innerHTML = `
    <div class="svc-stages" role="tablist" aria-label="Company stage"></div>
    <div class="svc-body">
      <p class="svc-blurb"></p>
      <div class="svc-grid"></div>
    </div>`;

  const stages = host.querySelector('.svc-stages');
  const blurb = host.querySelector('.svc-blurb');
  const grid = host.querySelector('.svc-grid');

  S.forEach((st, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'svc-stage';
    b.setAttribute('role', 'tab');
    b.innerHTML = `<span class="n">${st.n}</span><span class="l">${st.label}</span>`;
    b.addEventListener('click', () => pick(i));
    stages.appendChild(b);
  });

  function pick(i) {
    [...stages.children].forEach((b, k) => b.setAttribute('aria-selected', String(k === i)));
    blurb.textContent = S[i].blurb;

    /* The grid is swapped rather than cross-faded. Two lists of services
       dissolving through each other is unreadable for the whole transition,
       and these lists differ in length — so the old one would also be
       reflowing under the new one as it went. */
    grid.classList.add('is-swapping');
    clearTimeout(host._svcT);
    host._svcT = setTimeout(() => {
      grid.innerHTML = S[i].services.map(sv => `
        <article class="svc-card">
          <h3><i></i><span data-odo>${sv.name}</span></h3>
          <ul>${sv.points.map(p => `<li>${p}</li>`).join('')}</ul>
        </article>`).join('');
      grid.classList.remove('is-swapping');
      if (window.Odometer) window.Odometer.arm(grid);
    }, 170);
  }

  pick(0);
};
